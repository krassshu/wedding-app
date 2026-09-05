import "server-only";

import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import archiver from "archiver";
import type { ArchiveFile } from "@/lib/archiveParts";
import { internalObjectUrl } from "@/lib/adminSupabase";

const ARCHIVE_DIR = process.env.GALLERY_ARCHIVE_DIR || "/archives";
const KEEP_ARCHIVES = 2;

export type GalleryArchiveState = {
  id: string;
  status: "building" | "ready" | "error";
  completedFiles: number;
  totalFiles: number;
  totalBytes: number;
  message?: string;
};

let activeBuild: Promise<void> | null = null;
let activeState: GalleryArchiveState | null = null;

function archiveId(files: ArchiveFile[]): string {
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(String(file.size));
    hash.update("\0");
    hash.update(file.createdAt);
    hash.update("\n");
  }
  return hash.digest("hex").slice(0, 24);
}

function archivePath(id: string): string {
  return path.join(ARCHIVE_DIR, `${id}.zip`);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function cleanupOldArchives(currentId: string): Promise<void> {
  const entries = await readdir(ARCHIVE_DIR, { withFileTypes: true });
  const archives = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && /^[a-f0-9]{24}\.zip$/.test(entry.name))
      .map(async (entry) => ({
        name: entry.name,
        modified: (await stat(path.join(ARCHIVE_DIR, entry.name))).mtimeMs,
      })),
  );
  archives.sort((left, right) => right.modified - left.modified);

  const keep = new Set([
    `${currentId}.zip`,
    ...archives.slice(0, KEEP_ARCHIVES).map((entry) => entry.name),
  ]);
  await Promise.all(
    archives
      .filter((entry) => !keep.has(entry.name))
      .map((entry) => rm(path.join(ARCHIVE_DIR, entry.name), { force: true })),
  );
}

async function buildArchive(files: ArchiveFile[], state: GalleryArchiveState): Promise<void> {
  await mkdir(ARCHIVE_DIR, { recursive: true });
  const finalPath = archivePath(state.id);
  const temporaryPath = path.join(ARCHIVE_DIR, `.${state.id}-${process.pid}.tmp`);
  await rm(temporaryPath, { force: true });

  const output = createWriteStream(temporaryPath, { flags: "wx" });
  const archive = archiver("zip", { store: true, forceZip64: true });
  const outputFinished = finished(output);
  archive.on("error", (error) => output.destroy(error));
  archive.pipe(output);

  try {
    for (const file of files) {
      const response = await fetch(internalObjectUrl(file.path), { cache: "no-store" });
      if (!response.ok || !response.body) {
        throw new Error(`Nie udało się odczytać pliku (${response.status}).`);
      }

      const source = Readable.fromWeb(response.body as never);
      const consumed = new Promise<void>((resolve, reject) => {
        source.once("end", resolve);
        source.once("error", reject);
      });
      const timestamp = Date.parse(file.createdAt);
      archive.append(source, {
        name: file.path.replace(/^gallery\//, ""),
        date: Number.isFinite(timestamp) ? new Date(timestamp) : new Date(0),
      });
      await consumed;
      state.completedFiles += 1;
    }

    await archive.finalize();
    await outputFinished;
    await rename(temporaryPath, finalPath);
    state.status = "ready";
    await cleanupOldArchives(state.id).catch((error) => {
      console.warn("[gallery/archive] nie udało się usunąć starego cache", error);
    });
  } catch (error) {
    archive.abort();
    output.destroy();
    await outputFinished.catch(() => undefined);
    await rm(temporaryPath, { force: true });
    state.status = "error";
    state.message = error instanceof Error ? error.message : "Nie udało się utworzyć ZIP-a.";
  }
}

export async function prepareGalleryArchive(
  files: ArchiveFile[],
): Promise<GalleryArchiveState> {
  const id = archiveId(files);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  await mkdir(ARCHIVE_DIR, { recursive: true });

  if (await exists(archivePath(id))) {
    return {
      id,
      status: "ready",
      completedFiles: files.length,
      totalFiles: files.length,
      totalBytes,
    };
  }

  if (activeBuild && activeState) {
    return { ...activeState };
  }

  const state: GalleryArchiveState = {
    id,
    status: "building",
    completedFiles: 0,
    totalFiles: files.length,
    totalBytes,
  };
  activeState = state;
  activeBuild = buildArchive(files, state).finally(() => {
    activeBuild = null;
  });
  return { ...state };
}

export async function galleryArchiveStatus(id: string): Promise<GalleryArchiveState | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  if (activeState?.id === id) return { ...activeState };
  if (!(await exists(archivePath(id)))) return null;
  return {
    id,
    status: "ready",
    completedFiles: 0,
    totalFiles: 0,
    totalBytes: 0,
  };
}

export async function galleryArchiveResponse(id: string, request: Request): Promise<Response | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const filePath = archivePath(id);
  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    return null;
  }
  if (!fileStats.isFile()) return null;

  const size = fileStats.size;
  const range = request.headers.get("range");
  let start = 0;
  let end = size - 1;
  let status = 200;

  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    status = 206;
  }

  const stream = createReadStream(filePath, { start, end });
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": 'attachment; filename="wesele-ania-oskar.zip"',
    "Content-Length": String(end - start + 1),
    "Content-Type": "application/zip",
    ETag: `"${id}"`,
    "X-Content-Type-Options": "nosniff",
  });
  if (status === 206) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);

  return new Response(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, {
    status,
    headers,
  });
}

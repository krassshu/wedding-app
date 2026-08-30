import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  PHOTOS_BUCKET,
  PHOTOS_FOLDER,
  PREVIEW_TRANSFORM,
  THUMB_TRANSFORM,
  bingoTaskIdOf,
  mediaKind,
  type Photo,
} from "@/lib/photos";
import { MAX_UPLOAD_BYTES } from "@/lib/uploadPolicy";
import type { ArchiveFile } from "@/lib/archiveParts";

const INTERNAL_URL =
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || INTERNAL_URL;

export function adminConfigured(): boolean {
  return Boolean(INTERNAL_URL && SERVICE_KEY);
}

function adminClient() {
  return createClient(INTERNAL_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function publicUrlFor(path: string): string {
  return `${PUBLIC_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${path}`;
}

function renderUrlFor(
  path: string,
  transform: typeof THUMB_TRANSFORM | typeof PREVIEW_TRANSFORM,
): string {
  const query = new URLSearchParams(
    Object.entries(transform).map(([key, value]) => [key, String(value)]),
  );
  return `${PUBLIC_URL}/storage/v1/render/image/public/${PHOTOS_BUCKET}/${path}?${query}`;
}

export function internalObjectUrl(path: string): string {
  return `${INTERNAL_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${path}`;
}

export function isSafePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith(`${PHOTOS_FOLDER}/`) &&
    !path.includes("..") &&
    path.length < 512
  );
}

export async function adminListPhotos(): Promise<Photo[]> {
  const supabase = adminClient();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .list(PHOTOS_FOLDER, {
      limit: 10000,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw error;

  return (data ?? [])
    .filter((item) => item.id !== null)
    .map((item) => {
      const path = `${PHOTOS_FOLDER}/${item.name}`;
      const url = publicUrlFor(path);
      const kind = mediaKind(item.name);
      return {
        name: item.name,
        path,
        url,
        thumbUrl: kind === "image" ? renderUrlFor(path, THUMB_TRANSFORM) : url,
        previewUrl: kind === "image" ? renderUrlFor(path, PREVIEW_TRANSFORM) : url,
        downloadUrl: `${url}?download=${encodeURIComponent(item.name)}`,
        createdAt: item.created_at ?? "",
        bingoTaskId: bingoTaskIdOf(item.name),
        kind,
      };
    });
}

export async function adminListArchiveFiles(): Promise<ArchiveFile[]> {
  const supabase = adminClient();
  const files: ArchiveFile[] = [];
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .list(PHOTOS_FOLDER, {
        limit: pageSize,
        offset,
        sortBy: { column: "created_at", order: "desc" },
      });
    if (error) throw error;

    const page = data ?? [];
    for (const item of page) {
      if (item.id === null) continue;
      const rawSize = (item.metadata as { size?: unknown } | null)?.size;
      const size = Number(rawSize);
      files.push({
        path: `${PHOTOS_FOLDER}/${item.name}`,
        // Brak metadanych nie może spowodować zbyt dużej części.
        size: Number.isFinite(size) && size > 0 ? size : MAX_UPLOAD_BYTES,
        createdAt: item.created_at ?? "",
      });
    }

    offset += page.length;
    if (page.length < pageSize) break;
  }

  return files.sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt) || left.path.localeCompare(right.path),
  );
}

export async function adminDeletePhotos(paths: string[]): Promise<number> {
  const safe = paths.filter(isSafePath);
  if (safe.length === 0) return 0;
  const supabase = adminClient();
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(safe);
  if (error) throw error;
  return safe.length;
}

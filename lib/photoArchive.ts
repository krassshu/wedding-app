import "server-only";

import archiver from "archiver";
import { Readable } from "node:stream";
import { internalObjectUrl } from "@/lib/adminSupabase";

type ArchiveOptions = {
  filename: string;
  logPrefix: string;
};

class ArchiveCancelledError extends Error {}

function waitUntilConsumed(stream: Readable, archive: archiver.Archiver): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.off("end", onEnd);
      stream.off("error", onError);
      archive.off("close", onArchiveClose);
    };
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onArchiveClose = () => {
      cleanup();
      stream.destroy();
      reject(new ArchiveCancelledError());
    };

    stream.once("end", onEnd);
    stream.once("error", onError);
    archive.once("close", onArchiveClose);
  });
}

/**
 * Każdy obiekt jest pobierany dopiero po zapisaniu poprzedniego w ZIP-ie.
 * Dzięki temu nawet duża galeria nie otwiera setek połączeń i nie trafia do RAM-u.
 */
export function streamPhotoZip(paths: string[], options: ArchiveOptions): Response {
  // ZIP64 jest konieczny, gdy galeria przekroczy 4 GB.
  const archive = archiver("zip", { store: true, forceZip64: true });

  archive.on("error", (error) => {
    console.error(`${options.logPrefix} błąd archiwum`, error);
  });
  archive.on("warning", (error) => {
    console.warn(`${options.logPrefix} ostrzeżenie archiwum`, error);
  });

  void (async () => {
    const failed: string[] = [];

    for (const path of paths) {
      if (archive.destroyed) break;
      try {
        const response = await fetch(internalObjectUrl(path), { cache: "no-store" });
        if (!response.ok || !response.body) {
          failed.push(`${path} — serwer odpowiedział ${response.status}`);
          continue;
        }

        const stream = Readable.fromWeb(response.body as never);
        const consumed = waitUntilConsumed(stream, archive);
        archive.append(stream, { name: path.replace(/^gallery\//, "") });
        await consumed;
      } catch (error) {
        if (archive.destroyed || error instanceof ArchiveCancelledError) break;
        failed.push(
          `${path} — ${error instanceof Error ? error.message : "błąd pobierania"}`,
        );
      }
    }

    if (archive.destroyed) return;

    if (failed.length > 0) {
      console.error(`${options.logPrefix} nie pobrano plików:`, failed);
      archive.append(
        `Nie udało się dodać ${failed.length} plików do paczki:\n\n${failed.join("\n")}\n`,
        { name: "NIEPOBRANE-PLIKI.txt" },
      );
    }

    void archive.finalize();
  })();

  const body = Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${options.filename}"`,
      "Content-Type": "application/zip",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import "server-only";

import archiver from "archiver";
import { Readable } from "node:stream";
import { internalObjectUrl } from "@/lib/adminSupabase";

type ArchiveOptions = {
  filename: string;
  logPrefix: string;
};

function waitUntilConsumed(stream: Readable): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.once("end", resolve);
    stream.once("error", reject);
  });
}

/**
 * Każdy obiekt jest pobierany dopiero po zapisaniu poprzedniego w ZIP-ie.
 * Dzięki temu nawet duża galeria nie otwiera setek połączeń i nie trafia do RAM-u.
 */
export function streamPhotoZip(paths: string[], options: ArchiveOptions): Response {
  const archive = archiver("zip", { store: true });

  archive.on("error", (error) => {
    console.error(`${options.logPrefix} błąd archiwum`, error);
  });
  archive.on("warning", (error) => {
    console.warn(`${options.logPrefix} ostrzeżenie archiwum`, error);
  });

  void (async () => {
    const failed: string[] = [];

    for (const path of paths) {
      try {
        const response = await fetch(internalObjectUrl(path), { cache: "no-store" });
        if (!response.ok || !response.body) {
          failed.push(`${path} — serwer odpowiedział ${response.status}`);
          continue;
        }

        const stream = Readable.fromWeb(response.body as never);
        const consumed = waitUntilConsumed(stream);
        archive.append(stream, { name: path.replace(/^gallery\//, "") });
        await consumed;
      } catch (error) {
        failed.push(
          `${path} — ${error instanceof Error ? error.message : "błąd pobierania"}`,
        );
      }
    }

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

import archiver from "archiver";
import { Readable } from "node:stream";
import { isAuthed } from "@/lib/adminAuth";
import {
  adminConfigured,
  adminListPhotos,
  internalObjectUrl,
  isSafePath,
} from "@/lib/adminSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function streamZip(paths: string[]): Response {
  const archive = archiver("zip", { store: true });

  archive.on("error", (err) => {
    console.error("[admin/download] błąd archiwum", err);
  });
  archive.on("warning", (err) => {
    console.warn("[admin/download] ostrzeżenie archiwum", err);
  });

  void (async () => {
    const failed: string[] = [];

    for (const path of paths) {
      try {
        const res = await fetch(internalObjectUrl(path));
        if (res.ok && res.body) {
          const name = path.replace(/^gallery\//, "");
          archive.append(Readable.fromWeb(res.body as never), { name });
        } else {
          failed.push(`${path} — serwer odpowiedział ${res.status}`);
        }
      } catch (err) {
        failed.push(`${path} — ${err instanceof Error ? err.message : "błąd pobierania"}`);
      }
    }

    // Zamiast po cichu gubić pliki, dokładamy do paczki raport z powodami.
    if (failed.length > 0) {
      console.error("[admin/download] nie pobrano plików:", failed);
      archive.append(
        `Nie udało się dodać ${failed.length} plików do paczki:\n\n${failed.join("\n")}\n`,
        { name: "NIEPOBRANE-PLIKI.txt" },
      );
    }

    void archive.finalize();
  })();

  const webStream = Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="wesele-zdjecia.zip"',
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return textResponse("Sesja wygasła. Zaloguj się ponownie.", 401);
  }
  if (!adminConfigured()) {
    return textResponse("Serwer zdjęć nie jest skonfigurowany.", 503);
  }

  const url = new URL(req.url);
  if (url.searchParams.get("all") !== "1") {
    return textResponse("Użyj ?all=1 albo POST z listą plików.", 400);
  }

  let paths: string[];
  try {
    paths = (await adminListPhotos()).map((p) => p.path);
  } catch (err) {
    console.error("[admin/download] listowanie nie powiodło się", err);
    return textResponse("Nie udało się pobrać listy plików z serwera zdjęć.", 502);
  }

  if (paths.length === 0) return textResponse("Nie ma jeszcze żadnych plików.", 404);
  return streamZip(paths);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return textResponse("Sesja wygasła. Zaloguj się ponownie.", 401);
  }
  if (!adminConfigured()) {
    return textResponse("Serwer zdjęć nie jest skonfigurowany.", 503);
  }

  const body = (await req.json().catch(() => null)) as { paths?: unknown } | null;
  const paths = Array.isArray(body?.paths)
    ? (body.paths as unknown[]).filter(isSafePath)
    : [];

  if (paths.length === 0) {
    return textResponse("Nie wybrano poprawnych plików do pobrania.", 400);
  }

  return streamZip(paths);
}

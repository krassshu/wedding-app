import archiver from "archiver";
import { Readable } from "node:stream";
import { isAuthed } from "@/lib/adminAuth";
import { adminListPhotos, internalObjectUrl, isSafePath } from "@/lib/adminSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function streamZip(paths: string[]): Response {
  const archive = archiver("zip", { store: true });
  archive.on("error", () => {});

  void (async () => {
    for (const path of paths) {
      try {
        const res = await fetch(internalObjectUrl(path));
        if (res.ok && res.body) {
          const name = path.replace(/^gallery\//, "");
          archive.append(Readable.fromWeb(res.body as never), { name });
        }
      } catch {}
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
  if (!(await isAuthed())) return new Response("Brak dostępu", { status: 401 });
  const url = new URL(req.url);
  if (url.searchParams.get("all") !== "1") {
    return new Response("Użyj ?all=1 lub POST z listą plików", { status: 400 });
  }
  const paths = (await adminListPhotos()).map((p) => p.path);
  if (paths.length === 0) return new Response("Brak plików", { status: 404 });
  return streamZip(paths);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return new Response("Brak dostępu", { status: 401 });
  const body = (await req.json().catch(() => null)) as { paths?: unknown } | null;
  const paths = Array.isArray(body?.paths)
    ? (body.paths as unknown[]).filter(isSafePath)
    : [];
  if (paths.length === 0) return new Response("Nie wybrano plików", { status: 400 });
  return streamZip(paths);
}

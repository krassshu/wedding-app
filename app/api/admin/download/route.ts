import { isAuthed } from "@/lib/adminAuth";
import {
  adminConfigured,
  adminListPhotos,
  isSafePath,
} from "@/lib/adminSupabase";
import { streamPhotoZip } from "@/lib/photoArchive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function streamZip(paths: string[]): Response {
  return streamPhotoZip(paths, {
    filename: "wesele-zdjecia.zip",
    logPrefix: "[admin/download]",
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

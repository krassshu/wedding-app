import { internalObjectUrl, isSafePath } from "@/lib/adminSupabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function encodedFilename(path: string): string {
  return encodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
}

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path");
  if (!isSafePath(path)) return textResponse("Nieprawidłowy plik.", 400);

  let upstream: Response;
  try {
    upstream = await fetch(internalObjectUrl(path), { cache: "no-store" });
  } catch {
    return textResponse("Nie udało się połączyć z magazynem zdjęć.", 502);
  }

  if (!upstream.ok || !upstream.body) {
    return textResponse(
      upstream.status === 400 || upstream.status === 404
        ? "Nie znaleziono zdjęcia."
        : "Nie udało się pobrać zdjęcia.",
      upstream.status === 400 ? 404 : upstream.status,
    );
  }

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename*=UTF-8''${encodedFilename(path)}`,
    "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { headers });
}

import { adminConfigured, adminListArchiveFiles } from "@/lib/adminSupabase";
import { hasUploadAccess } from "@/lib/uploadAuth";
import { streamPhotoZip } from "@/lib/photoArchive";
import { clientIp, takeRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textResponse(message: string, status: number, retryAfter?: number): Response {
  const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8" });
  if (retryAfter) headers.set("Retry-After", String(retryAfter));
  return new Response(message, { status, headers });
}

export async function GET(req: Request) {
  if (!(await hasUploadAccess())) {
    return textResponse("Podaj kod weselny, aby pobrać archiwum.", 401);
  }
  if (!adminConfigured()) {
    return textResponse("Serwer zdjęć nie jest skonfigurowany.", 503);
  }

  const rate = takeRateLimit(`gallery-archive:${clientIp(req)}`, 120, 60 * 60 * 1000);
  if (!rate.allowed) {
    return textResponse(
      "Za dużo pobrań archiwum. Spróbuj ponownie później.",
      429,
      rate.retryAfterSeconds,
    );
  }

  let files;
  try {
    files = await adminListArchiveFiles();
  } catch (error) {
    console.error("[gallery/archive] listowanie nie powiodło się", error);
    return textResponse("Nie udało się pobrać listy zdjęć.", 502);
  }

  if (files.length === 0) return textResponse("Galeria jest jeszcze pusta.", 404);

  return streamPhotoZip(files.map((file) => file.path), {
    filename: "wesele-ania-oskar.zip",
    logPrefix: "[gallery/archive]",
  });
}

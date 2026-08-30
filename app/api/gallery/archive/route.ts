import { adminConfigured, adminListArchiveFiles } from "@/lib/adminSupabase";
import { partitionArchiveFiles } from "@/lib/archiveParts";
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

  const url = new URL(req.url);
  const manifestRequested = url.searchParams.get("manifest") === "1";
  const requestedPart = Number(url.searchParams.get("part"));
  const requestedSnapshot = url.searchParams.get("snapshot") ?? "";
  const snapshotTime = Date.parse(requestedSnapshot);
  const snapshotValid =
    Number.isFinite(snapshotTime) &&
    snapshotTime <= Date.now() + 5 * 60 * 1000 &&
    snapshotTime >= Date.now() - 24 * 60 * 60 * 1000;

  if (!manifestRequested && (!Number.isInteger(requestedPart) || !snapshotValid)) {
    return textResponse("Najpierw odśwież listę paczek ZIP.", 400);
  }

  let files;
  try {
    files = await adminListArchiveFiles();
  } catch (error) {
    console.error("[gallery/archive] listowanie nie powiodło się", error);
    return textResponse("Nie udało się pobrać listy zdjęć.", 502);
  }

  const snapshot = manifestRequested ? new Date().toISOString() : requestedSnapshot;
  const snapshotFiles = files.filter(
    (file) => file.createdAt && Date.parse(file.createdAt) <= Date.parse(snapshot),
  );
  const parts = partitionArchiveFiles(snapshotFiles);
  if (parts.length === 0) return textResponse("Galeria jest jeszcze pusta.", 404);

  if (manifestRequested) {
    return Response.json(
      {
        snapshot,
        totalFiles: snapshotFiles.length,
        totalBytes: snapshotFiles.reduce((sum, file) => sum + file.size, 0),
        parts: parts.map((part, index) => ({
          number: index + 1,
          files: part.files.length,
          bytes: part.bytes,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const part = parts[requestedPart - 1];
  if (!part) return textResponse("Nie ma takiej części archiwum.", 404);

  // Limit dotyczy pobieranych części, nie lekkiego odczytu manifestu.
  const rate = takeRateLimit(`gallery-archive:${clientIp(req)}`, 120, 60 * 60 * 1000);
  if (!rate.allowed) {
    return textResponse(
      "Za dużo pobrań archiwum. Spróbuj ponownie później.",
      429,
      rate.retryAfterSeconds,
    );
  }

  return streamPhotoZip(part.files.map((file) => file.path), {
    filename: `wesele-ania-oskar-czesc-${requestedPart}-z-${parts.length}.zip`,
    logPrefix: "[gallery/archive]",
  });
}

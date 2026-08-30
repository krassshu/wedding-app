import type { Photo } from "@/lib/photos";

export const MAX_SHARED_PHOTOS = 20;

export class FileShareUnsupportedError extends Error {
  constructor() {
    super("To urządzenie nie pozwala przekazać tych plików do galerii zdjęć.");
    this.name = "FileShareUnsupportedError";
  }
}

export function supportsFileShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function prepareMediaFile(
  photo: Pick<Photo, "name" | "path">,
  signal?: AbortSignal,
): Promise<File> {
  const response = await fetch(`/api/gallery/file?path=${encodeURIComponent(photo.path)}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Nie udało się przygotować zdjęcia.");
  }

  const blob = await response.blob();
  return new File([blob], photo.name, {
    type: blob.type || "application/octet-stream",
    lastModified: Date.now(),
  });
}

/** Musi zostać wywołane bezpośrednio po dotknięciu przycisku. */
export function sharePreparedFiles(files: File[]): Promise<void> {
  if (!supportsFileShare()) throw new FileShareUnsupportedError();

  const data: ShareData = { files };
  if (typeof navigator.canShare === "function" && !navigator.canShare(data)) {
    throw new FileShareUnsupportedError();
  }
  return navigator.share(data);
}

export function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

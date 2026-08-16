import { DetailedError, Upload } from "tus-js-client";
import {
  ConfigError,
  HttpError,
  NetworkError,
  UploadAuthError,
  UploadValidationError,
} from "@/lib/errors";
import {
  isSupabaseConfigured,
  supabase,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase";
import {
  PHOTOS_BUCKET,
  PHOTOS_FOLDER,
  TUS_CHUNK_BYTES,
  extensionForMedia,
  normalizedMediaType,
} from "@/lib/uploadPolicy";

export { PHOTOS_BUCKET, PHOTOS_FOLDER } from "@/lib/uploadPolicy";
export const BINGO_PREFIX = "bingo__";

export type MediaKind = "image" | "video";

export type Photo = {
  name: string;
  path: string;
  url: string;
  thumbUrl: string;
  previewUrl: string;
  downloadUrl: string;
  createdAt: string;
  bingoTaskId: string | null;
  kind: MediaKind;
};

export const THUMB_TRANSFORM = {
  width: 400,
  height: 533,
  resize: "cover",
  quality: 60,
} as const;

export const PREVIEW_TRANSFORM = {
  width: 1600,
  resize: "contain",
  quality: 78,
} as const;

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "m4v",
  "webm",
  "ogv",
  "avi",
  "mkv",
  "3gp",
  "quicktime",
]);

export function mediaKind(name: string): MediaKind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.has(ext) ? "video" : "image";
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createUploadPath(file: File, bingoTaskId?: string): string {
  const extension = extensionForMedia(file);
  if (!extension) throw new UploadValidationError("Ten format pliku nie jest obsługiwany.");
  if (bingoTaskId && !/^[a-z0-9-]{1,80}$/.test(bingoTaskId)) {
    throw new UploadValidationError("Nieprawidłowe zadanie bingo.");
  }

  const name = bingoTaskId
    ? `${BINGO_PREFIX}${bingoTaskId}__${randomId()}.${extension}`
    : `${randomId()}.${extension}`;
  return `${PHOTOS_FOLDER}/${name}`;
}

export function bingoTaskIdOf(name: string) {
  if (!name.startsWith(BINGO_PREFIX)) return null;
  const rest = name.slice(BINGO_PREFIX.length);
  const separator = rest.indexOf("__");
  return separator === -1 ? null : rest.slice(0, separator);
}

function publicUrl(path: string) {
  return supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

function renderUrl(path: string, transform: typeof THUMB_TRANSFORM | typeof PREVIEW_TRANSFORM) {
  return supabase.storage
    .from(PHOTOS_BUCKET)
    .getPublicUrl(path, { transform: { ...transform } }).data.publicUrl;
}

function errorMessageFrom(responseText: string, status: number) {
  try {
    const parsed = JSON.parse(responseText) as { message?: string; error?: string };
    return parsed.message || parsed.error || `HTTP ${status}`;
  } catch {
    return responseText || `HTTP ${status}`;
  }
}

async function uploadToken(path: string, file: File): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/upload/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path,
        size: file.size,
        type: normalizedMediaType(file),
      }),
    });
  } catch {
    throw new NetworkError("Nie udało się połączyć z serwerem wysyłania.");
  }

  const text = await response.text().catch(() => "");
  if (response.status === 401) {
    window.dispatchEvent(new Event("upload-auth-required"));
    throw new UploadAuthError();
  }
  if (!response.ok) {
    throw new HttpError(response.status, errorMessageFrom(text, response.status));
  }

  const data = JSON.parse(text) as { token?: unknown };
  if (typeof data.token !== "string" || !data.token) {
    throw new NetworkError("Serwer nie zwrócił zezwolenia na wysyłanie.");
  }
  return data.token;
}

function resumableUpload(
  path: string,
  file: File,
  token: string,
  onProgress?: UploadProgress,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const contentType = normalizedMediaType(file);
    if (!contentType) {
      reject(new UploadValidationError("Ten format pliku nie jest obsługiwany."));
      return;
    }

    const upload = new Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      chunkSize: TUS_CHUNK_BYTES,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onShouldRetry: (error) => {
        const status = error.originalResponse?.getStatus() ?? 0;
        return (
          navigator.onLine &&
          (status === 0 || status === 423 || status === 429 || status >= 500)
        );
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      fingerprint: async (selected) =>
        [
          selected.name,
          selected.type,
          selected.size,
          selected.lastModified,
          path,
        ].join("-"),
      headers: {
        authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      metadata: {
        bucketName: PHOTOS_BUCKET,
        objectName: path,
        contentType,
        cacheControl: "31536000",
      },
      onProgress: (sent, total) => {
        if (total > 0) onProgress?.(sent / total);
      },
      onSuccess: () => {
        onProgress?.(1);
        resolve();
      },
      onError: (error) => {
        if (error instanceof DetailedError && error.originalResponse) {
          const status = error.originalResponse.getStatus();
          reject(new HttpError(status, error.originalResponse.getBody() || error.message));
          return;
        }
        reject(new NetworkError(error.message));
      },
    });

    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch(() => upload.start());
  });
}

export type UploadProgress = (fraction: number) => void;

export async function uploadPhoto(
  path: string,
  file: File,
  onProgress?: UploadProgress,
) {
  if (!isSupabaseConfigured) {
    throw new ConfigError(
      "Wysyłanie zdjęć jest chwilowo niedostępne (brak konfiguracji serwera). Daj znać Parze Młodej.",
    );
  }

  const token = await uploadToken(path, file);
  try {
    await resumableUpload(path, file, token, onProgress);
  } catch (error) {
    // Serwer mógł zapisać cały plik, a odpowiedź mogła zginąć po drodze.
    // Stała ścieżka pozwala potwierdzić sukces bez tworzenia duplikatu.
    if (error instanceof HttpError && error.status === 409) {
      try {
        const response = await fetch(publicUrl(path), { method: "HEAD", cache: "no-store" });
        if (response.ok) {
          onProgress?.(1);
          return { name: path.slice(`${PHOTOS_FOLDER}/`.length), path, url: publicUrl(path) };
        }
      } catch {
        // Zachowujemy pierwotny błąd; kolejka ponowi próbę po odzyskaniu sieci.
      }
    }
    throw error;
  }

  return { name: path.slice(`${PHOTOS_FOLDER}/`.length), path, url: publicUrl(path) };
}

async function listRaw(limit: number, offset: number) {
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .list(PHOTOS_FOLDER, {
      limit,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    const status = Number(
      (error as { status?: unknown; statusCode?: unknown }).status ??
        (error as { statusCode?: unknown }).statusCode,
    );
    throw Number.isFinite(status) && status > 0
      ? new HttpError(status, error.message)
      : error;
  }

  return data ?? [];
}

export function toPhoto(name: string, createdAt: string | null): Photo {
  const path = `${PHOTOS_FOLDER}/${name}`;
  const url = publicUrl(path);
  const kind = mediaKind(name);
  return {
    name,
    path,
    url,
    thumbUrl: kind === "image" ? renderUrl(path, THUMB_TRANSFORM) : url,
    previewUrl: kind === "image" ? renderUrl(path, PREVIEW_TRANSFORM) : url,
    downloadUrl: supabase.storage
      .from(PHOTOS_BUCKET)
      .getPublicUrl(path, { download: name }).data.publicUrl,
    createdAt: createdAt ?? "",
    bingoTaskId: bingoTaskIdOf(name),
    kind,
  };
}

function requireConfig() {
  if (!isSupabaseConfigured) {
    throw new ConfigError(
      "Galeria jest chwilowo niedostępna (brak konfiguracji serwera). Daj znać Parze Młodej.",
    );
  }
}

export async function listPhotos(limit = 100): Promise<Photo[]> {
  requireConfig();

  return (await listRaw(limit, 0))
    .filter((item) => item.id !== null)
    .map((item) => toPhoto(item.name, item.created_at));
}

export type PhotoPage = {
  photos: Photo[];
  nextOffset: number;
  hasMore: boolean;
};

export const PHOTOS_PAGE_SIZE = 18;

type PhotoPageOptions = {
  limit?: number;
  offset?: number;
  bingoOnly?: boolean;
};

export async function listPhotosPage({
  limit = PHOTOS_PAGE_SIZE,
  offset = 0,
  bingoOnly = false,
}: PhotoPageOptions = {}): Promise<PhotoPage> {
  requireConfig();

  const photos: Photo[] = [];
  const rawLimit = bingoOnly ? Math.max(limit, 100) : limit;
  let cursor = offset;
  let hasMore = true;

  while (photos.length < limit && hasMore) {
    const raw = await listRaw(rawLimit, cursor);
    cursor += raw.length;
    if (raw.length < rawLimit) hasMore = false;

    for (const item of raw) {
      if (item.id === null) continue;
      const photo = toPhoto(item.name, item.created_at);
      if (bingoOnly && photo.bingoTaskId === null) continue;
      photos.push(photo);
    }
  }

  return { photos, nextOffset: cursor, hasMore };
}

export type GalleryStats = {
  total: number;
  bingoTotal: number;
  cover: Photo | null;
  bingoCover: Photo | null;
};

const STATS_PAGE_SIZE = 1000;

export async function galleryStats(): Promise<GalleryStats> {
  const stats: GalleryStats = {
    total: 0,
    bingoTotal: 0,
    cover: null,
    bingoCover: null,
  };

  requireConfig();

  let offset = 0;

  for (;;) {
    const raw = await listRaw(STATS_PAGE_SIZE, offset);

    for (const item of raw) {
      if (item.id === null) continue;
      const isBingo = bingoTaskIdOf(item.name) !== null;
      stats.total += 1;
      if (isBingo) stats.bingoTotal += 1;

      if (mediaKind(item.name) !== "image") continue;
      if (!stats.cover) stats.cover = toPhoto(item.name, item.created_at);
      if (isBingo && !stats.bingoCover) {
        stats.bingoCover = toPhoto(item.name, item.created_at);
      }
    }

    offset += raw.length;
    if (raw.length < STATS_PAGE_SIZE) return stats;
  }
}

export async function listLatestPhotos(count = 9): Promise<Photo[]> {
  return listPhotos(count);
}

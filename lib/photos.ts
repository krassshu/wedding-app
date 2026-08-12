import { ConfigError, HttpError, NetworkError } from "@/lib/errors";
import {
  isSupabaseConfigured,
  supabase,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase";

export const PHOTOS_BUCKET = "photos";
export const PHOTOS_FOLDER = "gallery";
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

function extensionOf(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType ? fromType.toLowerCase() : "jpg";
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

function putObject(path: string, file: File, onProgress?: UploadProgress) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${supabaseUrl}/storage/v1/object/${PHOTOS_BUCKET}/${encodeURI(path)}`,
    );
    xhr.setRequestHeader("authorization", `Bearer ${supabaseAnonKey}`);
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000, immutable");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded / event.total);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
      } else {
        reject(
          new HttpError(xhr.status, errorMessageFrom(xhr.responseText, xhr.status)),
        );
      }
    };
    xhr.onerror = () => reject(new NetworkError("Przerwane połączenie z serwerem"));
    xhr.onabort = () => reject(new NetworkError("Wysyłanie zostało przerwane"));
    xhr.ontimeout = () => reject(new NetworkError("Serwer nie odpowiedział na czas"));

    try {
      xhr.send(file);
    } catch (err) {
      reject(err instanceof Error ? err : new NetworkError());
    }
  });
}

export type UploadProgress = (fraction: number) => void;

export async function uploadPhoto(
  file: File,
  bingoTaskId?: string,
  onProgress?: UploadProgress,
) {
  if (!isSupabaseConfigured) {
    throw new ConfigError(
      "Wysyłanie zdjęć jest chwilowo niedostępne (brak konfiguracji serwera). Daj znać Parze Młodej.",
    );
  }

  const name = bingoTaskId
    ? `${BINGO_PREFIX}${bingoTaskId}__${randomId()}.${extensionOf(file)}`
    : `${randomId()}.${extensionOf(file)}`;

  const path = `${PHOTOS_FOLDER}/${name}`;

  await putObject(path, file, onProgress);

  return { name, path, url: publicUrl(path) };
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

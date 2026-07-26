import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const PHOTOS_BUCKET = "photos";
export const PHOTOS_FOLDER = "gallery";
export const BINGO_PREFIX = "bingo__";

export type MediaKind = "image" | "video";

export type Photo = {
  name: string;
  path: string;
  url: string;
  createdAt: string;
  bingoTaskId: string | null;
  kind: MediaKind;
};

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

export async function uploadPhoto(file: File, bingoTaskId?: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Brak konfiguracji Supabase");
  }

  const name = bingoTaskId
    ? `${BINGO_PREFIX}${bingoTaskId}__${randomId()}.${extensionOf(file)}`
    : `${randomId()}.${extensionOf(file)}`;

  const path = `${PHOTOS_FOLDER}/${name}`;

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) throw error;

  return { name, path, url: publicUrl(path) };
}

export async function listPhotos(limit = 100): Promise<Photo[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .list(PHOTOS_FOLDER, {
      limit,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) throw error;

  return (data ?? [])
    .filter((item) => item.id !== null)
    .map((item) => {
      const path = `${PHOTOS_FOLDER}/${item.name}`;
      return {
        name: item.name,
        path,
        url: publicUrl(path),
        createdAt: item.created_at ?? "",
        bingoTaskId: bingoTaskIdOf(item.name),
        kind: mediaKind(item.name),
      };
    });
}

export async function listBingoPhotos(limit = 100): Promise<Photo[]> {
  const photos = await listPhotos(limit);
  return photos.filter((photo) => photo.bingoTaskId !== null);
}

export async function listLatestPhotos(count = 9): Promise<Photo[]> {
  const photos = await listPhotos(count);
  return photos.slice(0, count);
}

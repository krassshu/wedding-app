import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  PHOTOS_BUCKET,
  PHOTOS_FOLDER,
  PREVIEW_TRANSFORM,
  THUMB_TRANSFORM,
  bingoTaskIdOf,
  mediaKind,
  type Photo,
} from "@/lib/photos";

const INTERNAL_URL =
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || INTERNAL_URL;

export function adminConfigured(): boolean {
  return Boolean(INTERNAL_URL && SERVICE_KEY);
}

function adminClient() {
  return createClient(INTERNAL_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function publicUrlFor(path: string): string {
  return `${PUBLIC_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${path}`;
}

function renderUrlFor(
  path: string,
  transform: typeof THUMB_TRANSFORM | typeof PREVIEW_TRANSFORM,
): string {
  const query = new URLSearchParams(
    Object.entries(transform).map(([key, value]) => [key, String(value)]),
  );
  return `${PUBLIC_URL}/storage/v1/render/image/public/${PHOTOS_BUCKET}/${path}?${query}`;
}

export function internalObjectUrl(path: string): string {
  return `${INTERNAL_URL}/storage/v1/object/public/${PHOTOS_BUCKET}/${path}`;
}

export function isSafePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith(`${PHOTOS_FOLDER}/`) &&
    !path.includes("..") &&
    path.length < 512
  );
}

export async function adminListPhotos(): Promise<Photo[]> {
  const supabase = adminClient();
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .list(PHOTOS_FOLDER, {
      limit: 10000,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw error;

  return (data ?? [])
    .filter((item) => item.id !== null)
    .map((item) => {
      const path = `${PHOTOS_FOLDER}/${item.name}`;
      const url = publicUrlFor(path);
      const kind = mediaKind(item.name);
      return {
        name: item.name,
        path,
        url,
        thumbUrl: kind === "image" ? renderUrlFor(path, THUMB_TRANSFORM) : url,
        previewUrl: kind === "image" ? renderUrlFor(path, PREVIEW_TRANSFORM) : url,
        downloadUrl: `${url}?download=${encodeURIComponent(item.name)}`,
        createdAt: item.created_at ?? "",
        bingoTaskId: bingoTaskIdOf(item.name),
        kind,
      };
    });
}

export async function adminDeletePhotos(paths: string[]): Promise<number> {
  const safe = paths.filter(isSafePath);
  if (safe.length === 0) return 0;
  const supabase = adminClient();
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(safe);
  if (error) throw error;
  return safe.length;
}

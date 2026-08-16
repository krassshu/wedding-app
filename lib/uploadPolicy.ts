export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
export const PHOTOS_BUCKET = "photos";
export const PHOTOS_FOLDER = "gallery";

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/tiff",
  "image/bmp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/ogg",
  "video/x-msvideo",
  "video/x-matroska",
  "video/3gpp",
] as const;

const ALLOWED_TYPE_SET = new Set<string>(ALLOWED_MEDIA_TYPES);
const SAFE_UPLOAD_PATH =
  /^gallery\/(?:bingo__[a-z0-9-]{1,80}__)?[a-zA-Z0-9_-]{8,100}\.[a-z0-9]{2,5}$/;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "image/tiff": "tiff",
  "image/bmp": "bmp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
  "video/3gpp": "3gp",
};

const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ogv: "video/ogg",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
};

export function normalizedMediaType(file: Pick<File, "name" | "type">): string | null {
  const declared = file.type.toLowerCase().split(";", 1)[0]?.trim();
  if (declared && ALLOWED_TYPE_SET.has(declared)) return declared;

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPE_BY_EXTENSION[extension] ?? null;
}

export function extensionForMedia(file: Pick<File, "name" | "type">): string | null {
  const type = normalizedMediaType(file);
  return type ? EXTENSION_BY_TYPE[type] ?? null : null;
}

export function isAllowedMediaType(type: string): boolean {
  return ALLOWED_TYPE_SET.has(type.toLowerCase().split(";", 1)[0]?.trim() ?? "");
}

export function isValidUploadDescriptor(path: string, size: number, type: string): boolean {
  const expectedExtension = extensionForMedia({ name: path, type });
  const actualExtension = path.split(".").pop()?.toLowerCase();
  return (
    SAFE_UPLOAD_PATH.test(path) &&
    path.startsWith(`${PHOTOS_FOLDER}/`) &&
    Number.isFinite(size) &&
    size > 0 &&
    size <= MAX_UPLOAD_BYTES &&
    Boolean(expectedExtension) &&
    actualExtension === expectedExtension
  );
}

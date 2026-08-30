export const ARCHIVE_PART_MAX_BYTES = 2 * 1024 * 1024 * 1024;

export type ArchiveFile = {
  path: string;
  size: number;
  createdAt: string;
};

export type ArchivePart = {
  files: ArchiveFile[];
  bytes: number;
};

export function partitionArchiveFiles(
  files: ArchiveFile[],
  maxBytes = ARCHIVE_PART_MAX_BYTES,
): ArchivePart[] {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) return [];

  const parts: ArchivePart[] = [];
  let current: ArchivePart = { files: [], bytes: 0 };

  for (const file of files) {
    const size = Number.isFinite(file.size) && file.size > 0 ? file.size : 0;
    if (current.files.length > 0 && current.bytes + size > maxBytes) {
      parts.push(current);
      current = { files: [], bytes: 0 };
    }
    current.files.push(file);
    current.bytes += size;
  }

  if (current.files.length > 0) parts.push(current);
  return parts;
}

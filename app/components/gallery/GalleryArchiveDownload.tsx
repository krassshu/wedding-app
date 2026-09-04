"use client";

import { FileArchive } from "lucide-react";

export default function GalleryArchiveDownload() {
  return (
    <a
      href="/api/gallery/archive"
      download="wesele-ania-oskar.zip"
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted"
    >
      <FileArchive size={15} />
      Pobierz wszystko (ZIP)
    </a>
  );
}

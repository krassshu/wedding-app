"use client";

import MediaThumb from "@/app/components/gallery/MediaThumb";
import type { Photo } from "@/lib/photos";

type PhotoCardProps = {
  photo: Photo;
  priority?: boolean;
  onOpen?: () => void;
};

export default function PhotoCard({ photo, priority = false, onOpen }: PhotoCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Powiększ"
      className="relative aspect-[3/4] overflow-hidden rounded-md bg-black/5 transition-transform active:scale-[0.98]"
    >
      <MediaThumb photo={photo} priority={priority} />
    </button>
  );
}

"use client";

import { Check } from "lucide-react";
import MediaThumb from "@/app/components/gallery/MediaThumb";
import type { Photo } from "@/lib/photos";

type PhotoCardProps = {
  photo: Photo;
  priority?: boolean;
  onOpen?: () => void;
  selecting?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

export default function PhotoCard({
  photo,
  priority = false,
  onOpen,
  selecting = false,
  selected = false,
  onSelect,
}: PhotoCardProps) {
  const selectable = selecting && photo.kind === "image";

  return (
    <button
      type="button"
      onClick={selectable ? onSelect : onOpen}
      aria-label={selectable ? (selected ? "Odznacz zdjęcie" : "Zaznacz zdjęcie") : "Powiększ"}
      aria-pressed={selectable ? selected : undefined}
      className={`relative aspect-[3/4] overflow-hidden rounded-md bg-black/5 transition active:scale-[0.98] ${
        selected ? "ring-3 ring-plum ring-offset-2" : ""
      } ${selecting && photo.kind === "video" ? "opacity-55" : ""}`}
    >
      <MediaThumb photo={photo} priority={priority} />
      {selectable ? (
        <span
          className={`absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow ${
            selected ? "bg-plum text-white" : "bg-black/35 text-transparent"
          }`}
        >
          <Check size={17} strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

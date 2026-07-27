"use client";

import { useState } from "react";
import PhotoCard from "@/app/components/cards/PhotoCard";
import Lightbox from "@/app/components/gallery/Lightbox";
import type { Photo } from "@/lib/photos";

type PhotoGridProps = {
  photos: Photo[];
  emptyLabel?: string;
  onNeedMore?: () => void;
};

export default function PhotoGrid({
  photos,
  emptyLabel = "Nie ma tu jeszcze żadnych zdjęć",
  onNeedMore,
}: PhotoGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">{emptyLabel}</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.path}
            photo={photo}
            priority={index < 3}
            onOpen={() => setOpenIndex(index)}
          />
        ))}
      </div>

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onNeedMore={onNeedMore}
        />
      ) : null}
    </>
  );
}

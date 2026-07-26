"use client";

import { useEffect, useState } from "react";
import PhotoGrid from "@/app/components/gallery/PhotoGrid";
import { listLatestPhotos, type Photo } from "@/lib/photos";

type LastPhotosProps = {
  refreshToken?: number;
  count?: number;
};

export default function LastPhotos({
  refreshToken = 0,
  count = 9,
}: LastPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    listLatestPhotos(count)
      .then((result) => {
        if (!active) return;
        setPhotos(result);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setError("Nie udało się wczytać zdjęć");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshToken, count]);

  if (loading && photos.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="aspect-[3/4] animate-pulse rounded-md bg-black/5"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="py-10 text-center text-sm text-muted">{error}</p>;
  }

  return (
    <PhotoGrid
      photos={photos}
      emptyLabel="Bądź pierwszy i dodaj zdjęcie!"
    />
  );
}

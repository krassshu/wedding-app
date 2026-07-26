"use client";

import { useEffect, useState } from "react";
import PhotoGrid from "@/app/components/gallery/PhotoGrid";
import { PhotoGridSkeleton } from "@/app/components/gallery/GallerySkeleton";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import { listLatestPhotos, type Photo } from "@/lib/photos";

type LastPhotosProps = {
  refreshToken?: number;
  count?: number;
};

export default function LastPhotos({
  refreshToken = 0,
  count = 9,
}: LastPhotosProps) {
  const { completedAt } = useUploadQueue();
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
  }, [refreshToken, count, completedAt]);

  if (loading && photos.length === 0) {
    return <PhotoGridSkeleton count={count} />;
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

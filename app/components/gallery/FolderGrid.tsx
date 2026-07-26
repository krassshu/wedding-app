"use client";

import { useEffect, useState } from "react";
import FolderCard from "@/app/components/cards/FolderCard";
import { listPhotos, type Photo } from "@/lib/photos";

export default function FolderGrid() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    listPhotos(1000)
      .then((result) => {
        if (active) setPhotos(result);
      })
      .catch(() => {
        if (active) setPhotos([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const bingoPhotos = photos.filter((photo) => photo.bingoTaskId !== null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-lg bg-black/5"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <FolderCard
        href="/galeria/wszystkie"
        title="Galeria"
        count={photos.length}
        coverUrl={photos[0]?.url ?? null}
      />
      <FolderCard
        href="/galeria/bingo"
        title="Bingo"
        count={bingoPhotos.length}
        coverUrl={bingoPhotos[0]?.url ?? null}
      />
    </div>
  );
}

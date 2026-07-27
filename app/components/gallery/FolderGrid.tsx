"use client";

import { useEffect, useState } from "react";
import FolderCard from "@/app/components/cards/FolderCard";
import { FolderGridSkeleton } from "@/app/components/gallery/GallerySkeleton";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import { readStats, writeStats } from "@/lib/galleryCache";
import { galleryStats, type GalleryStats } from "@/lib/photos";
import { useHydrated } from "@/lib/useHydrated";

export default function FolderGrid() {
  const hydrated = useHydrated();
  return hydrated ? <Folders /> : <FolderGridSkeleton />;
}

function Folders() {
  const { completedAt } = useUploadQueue();
  const [stats, setStats] = useState<GalleryStats | null>(() => readStats());

  useEffect(() => {
    let active = true;

    galleryStats()
      .then((result) => {
        writeStats(result);
        if (active) setStats(result);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [completedAt]);

  if (!stats) {
    return <FolderGridSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <FolderCard
        href="/galeria/wszystkie"
        title="Galeria"
        count={stats.total}
        coverUrl={stats.cover?.thumbUrl ?? null}
      />
      <FolderCard
        href="/galeria/bingo"
        title="Bingo"
        count={stats.bingoTotal}
        coverUrl={stats.bingoCover?.thumbUrl ?? null}
      />
    </div>
  );
}

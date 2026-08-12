"use client";

import { useCallback, useEffect, useState } from "react";
import FolderCard from "@/app/components/cards/FolderCard";
import { FolderGridSkeleton } from "@/app/components/gallery/GallerySkeleton";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import Notice from "@/app/components/ui/Notice";
import RefreshButton from "@/app/components/ui/RefreshButton";
import { describeError } from "@/lib/errors";
import { readStats, writeStats } from "@/lib/galleryCache";
import { galleryStats, type GalleryStats } from "@/lib/photos";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { useHydrated } from "@/lib/useHydrated";

export default function FolderGrid() {
  const hydrated = useHydrated();
  return hydrated ? <Folders /> : <FolderGridSkeleton />;
}

const STATS_INTERVAL = 60_000;

function Folders() {
  const { completedAt } = useUploadQueue();
  const [stats, setStats] = useState<GalleryStats | null>(() => readStats());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      galleryStats().then(
        (result) => {
          writeStats(result);
          setStats(result);
          setError(null);
        },
        (err: unknown) => {
          setError(describeError(err, "Nie udało się wczytać folderów."));
          throw err;
        },
      ),
    [],
  );

  const { refreshing, refresh } = useAutoRefresh(load, {
    intervalMs: STATS_INTERVAL,
  });

  useEffect(() => {
    void load().catch(() => {});
  }, [load, completedAt]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <RefreshButton onRefresh={refresh} refreshing={refreshing} />
      </div>

      {error ? (
        <Notice onRetry={refresh}>
          {error}
          {stats ? " Pokazujemy ostatnio zapisane liczby." : ""}
        </Notice>
      ) : null}

      {stats ? (
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
      ) : error ? null : (
        <FolderGridSkeleton />
      )}
    </div>
  );
}

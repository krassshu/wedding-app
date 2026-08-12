"use client";

import { useCallback, useEffect, useState } from "react";
import PhotoGrid from "@/app/components/gallery/PhotoGrid";
import { PhotoGridSkeleton } from "@/app/components/gallery/GallerySkeleton";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import Notice from "@/app/components/ui/Notice";
import RefreshButton from "@/app/components/ui/RefreshButton";
import { describeError } from "@/lib/errors";
import { listLatestPhotos, type Photo } from "@/lib/photos";
import { useAutoRefresh } from "@/lib/useAutoRefresh";

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

  const load = useCallback(
    () =>
      listLatestPhotos(count).then(
        (result) => {
          setPhotos(result);
          setError(null);
          setLoading(false);
        },
        (err: unknown) => {
          setError(describeError(err, "Nie udało się wczytać zdjęć."));
          setLoading(false);
        },
      ),
    [count],
  );

  const { refreshing, refresh } = useAutoRefresh(load);

  useEffect(() => {
    void load();
  }, [load, refreshToken, completedAt]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Ostatnio dodane</h2>
        <RefreshButton onRefresh={refresh} refreshing={refreshing} />
      </div>

      {error ? (
        <Notice onRetry={refresh}>{error}</Notice>
      ) : null}

      {loading && photos.length === 0 ? (
        <PhotoGridSkeleton count={count} />
      ) : error && photos.length === 0 ? null : (
        <PhotoGrid photos={photos} emptyLabel="Bądź pierwszy i dodaj zdjęcie!" />
      )}
    </section>
  );
}

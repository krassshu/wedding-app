"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PhotoGrid from "@/app/components/gallery/PhotoGrid";
import { PhotoGridSkeleton } from "@/app/components/gallery/GallerySkeleton";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import Notice from "@/app/components/ui/Notice";
import RefreshButton from "@/app/components/ui/RefreshButton";
import SectionTitle from "@/app/components/ui/SectionTitle";
import { describeError } from "@/lib/errors";
import { readFeed, writeFeed } from "@/lib/galleryCache";
import { listPhotosPage, PHOTOS_PAGE_SIZE, type Photo } from "@/lib/photos";
import { useAutoRefresh } from "@/lib/useAutoRefresh";
import { useHydrated } from "@/lib/useHydrated";

type FolderPhotosProps = {
  slug: "wszystkie" | "bingo";
  title: string;
  subtitle: string;
};

export default function FolderPhotos({
  slug,
  title,
  subtitle,
}: FolderPhotosProps) {
  const { completedAt } = useUploadQueue();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <TopBar />
        <SectionTitle title={title} subtitle={subtitle} />
        <PhotoGridSkeleton count={PHOTOS_PAGE_SIZE} />
      </div>
    );
  }

  return (
    <PhotoFeed
      key={slug}
      bingoOnly={slug === "bingo"}
      refreshToken={completedAt}
      title={title}
      subtitle={subtitle}
    />
  );
}

type TopBarProps = {
  refreshing?: boolean;
  onRefresh?: () => void;
};

function TopBar({ refreshing, onRefresh }: TopBarProps) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href="/galeria"
        className="inline-flex items-center gap-1 text-sm text-muted"
      >
        <ChevronLeft size={16} />
        Foldery
      </Link>

      {onRefresh ? (
        <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
      ) : null}
    </div>
  );
}

type PhotoFeedProps = {
  bingoOnly: boolean;
  refreshToken: number;
  title: string;
  subtitle: string;
};

function PhotoFeed({ bingoOnly, refreshToken, title, subtitle }: PhotoFeedProps) {
  const cacheKey = bingoOnly ? "bingo" : "wszystkie";
  const [cached] = useState(() => readFeed(cacheKey));

  const [photos, setPhotos] = useState<Photo[]>(cached?.photos ?? []);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? true);
  const [failed, setFailed] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const offsetRef = useRef(cached?.offset ?? 0);
  const pendingRef = useRef(false);
  const knownPaths = useRef(
    new Set((cached?.photos ?? []).map((photo) => photo.path)),
  );
  const lastRefresh = useRef(refreshToken);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function keepNew(incoming: Photo[]) {
    const fresh = incoming.filter((photo) => !knownPaths.current.has(photo.path));
    fresh.forEach((photo) => knownPaths.current.add(photo.path));
    return fresh;
  }

  const loadMore = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    try {
      const page = await listPhotosPage({
        limit: PHOTOS_PAGE_SIZE,
        offset: offsetRef.current,
        bingoOnly,
      });

      offsetRef.current = page.nextOffset;
      const fresh = keepNew(page.photos);
      if (fresh.length > 0) setPhotos((current) => [...current, ...fresh]);
      setHasMore(page.hasMore);
      setFailed(null);
    } catch (err) {
      setFailed(describeError(err, "Nie udało się wczytać zdjęć."));
    } finally {
      pendingRef.current = false;
      setLoadingMore(false);
      setLoading(false);
    }
  }, [bingoOnly]);

  const refreshHead = useCallback(async () => {
    try {
      const page = await listPhotosPage({
        limit: PHOTOS_PAGE_SIZE,
        offset: 0,
        bingoOnly,
      });

      setRefreshError(null);
      const fresh = keepNew(page.photos);
      if (fresh.length === 0) return;
      offsetRef.current += fresh.length;
      setPhotos((current) => [...fresh, ...current]);
    } catch (err) {
      setRefreshError(describeError(err, "Nie udało się odświeżyć galerii."));
      throw err;
    }
  }, [bingoOnly]);

  const { refreshing, refresh } = useAutoRefresh(refreshHead);

  useEffect(() => {
    if (offsetRef.current === 0) {
      void loadMore();
      return;
    }
    void refreshHead().catch(() => {});
  }, [loadMore, refreshHead]);

  useEffect(() => {
    if (lastRefresh.current === refreshToken) return;
    lastRefresh.current = refreshToken;
    void refreshHead().catch(() => {});
  }, [refreshToken, refreshHead]);

  useEffect(() => {
    if (photos.length === 0) return;
    writeFeed(cacheKey, {
      photos,
      offset: offsetRef.current,
      hasMore,
    });
  }, [cacheKey, photos, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || failed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || pendingRef.current) return;
        setLoadingMore(true);
        void loadMore();
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, failed, loading, photos.length]);

  function retry() {
    setFailed(null);
    setLoadingMore(true);
    void loadMore();
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <TopBar refreshing={refreshing} onRefresh={refresh} />
      <SectionTitle title={title} subtitle={subtitle} />

      {refreshError && photos.length > 0 ? (
        <Notice onRetry={refresh} retryLabel="Odśwież">
          {refreshError}
        </Notice>
      ) : null}

      {loading ? (
        <PhotoGridSkeleton count={PHOTOS_PAGE_SIZE} />
      ) : failed && photos.length === 0 ? (
        <Notice onRetry={retry}>{failed}</Notice>
      ) : (
        <>
          <PhotoGrid
            photos={photos}
            onNeedMore={hasMore ? loadMore : undefined}
          />

          {hasMore ? (
            <div ref={sentinelRef}>
              {failed ? (
                <Notice onRetry={retry}>
                  {failed} Pokazujemy zdjęcia wczytane do tej pory.
                </Notice>
              ) : loadingMore ? (
                <PhotoGridSkeleton count={6} />
              ) : (
                <div className="h-8" />
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

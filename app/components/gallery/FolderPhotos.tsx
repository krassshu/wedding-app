"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PhotoGrid from "@/app/components/gallery/PhotoGrid";
import { PhotoGridSkeleton } from "@/app/components/gallery/GallerySkeleton";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import SectionTitle from "@/app/components/ui/SectionTitle";
import { readFeed, writeFeed } from "@/lib/galleryCache";
import { listPhotosPage, PHOTOS_PAGE_SIZE, type Photo } from "@/lib/photos";
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

  return (
    <div className="flex flex-col gap-4 pt-2">
      <Link
        href="/galeria"
        className="inline-flex items-center gap-1 self-start text-sm text-muted"
      >
        <ChevronLeft size={16} />
        Foldery
      </Link>

      <SectionTitle title={title} subtitle={subtitle} />

      {hydrated ? (
        <PhotoFeed
          key={slug}
          bingoOnly={slug === "bingo"}
          refreshToken={completedAt}
        />
      ) : (
        <PhotoGridSkeleton count={PHOTOS_PAGE_SIZE} />
      )}
    </div>
  );
}

type PhotoFeedProps = {
  bingoOnly: boolean;
  refreshToken: number;
};

function PhotoFeed({ bingoOnly, refreshToken }: PhotoFeedProps) {
  const cacheKey = bingoOnly ? "bingo" : "wszystkie";
  const [cached] = useState(() => readFeed(cacheKey));

  const [photos, setPhotos] = useState<Photo[]>(cached?.photos ?? []);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? true);
  const [failed, setFailed] = useState(false);

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
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      pendingRef.current = false;
      setLoadingMore(false);
      setLoading(false);
    }
  }, [bingoOnly]);

  const refreshHead = useCallback(() => {
    let active = true;

    listPhotosPage({ limit: PHOTOS_PAGE_SIZE, offset: 0, bingoOnly })
      .then((page) => {
        if (!active) return;
        const fresh = keepNew(page.photos);
        if (fresh.length === 0) return;
        offsetRef.current += fresh.length;
        setPhotos((current) => [...fresh, ...current]);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [bingoOnly]);

  useEffect(() => {
    if (offsetRef.current === 0) {
      void loadMore();
      return;
    }
    return refreshHead();
  }, [loadMore, refreshHead]);

  useEffect(() => {
    if (lastRefresh.current === refreshToken) return;
    lastRefresh.current = refreshToken;
    return refreshHead();
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
  }, [loadMore, failed, photos.length]);

  function retry() {
    setFailed(false);
    setLoadingMore(true);
    void loadMore();
  }

  if (loading) {
    return <PhotoGridSkeleton count={PHOTOS_PAGE_SIZE} />;
  }

  if (failed && photos.length === 0) {
    return <LoadError onRetry={retry} />;
  }

  return (
    <>
      <PhotoGrid photos={photos} onNeedMore={hasMore ? loadMore : undefined} />

      {hasMore ? (
        <div ref={sentinelRef}>
          {failed ? (
            <LoadError onRetry={retry} />
          ) : loadingMore ? (
            <PhotoGridSkeleton count={6} />
          ) : (
            <div className="h-8" />
          )}
        </div>
      ) : null}
    </>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-sm text-muted">Nie udało się wczytać zdjęć</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full bg-plum px-4 py-1.5 text-sm font-medium text-white"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}

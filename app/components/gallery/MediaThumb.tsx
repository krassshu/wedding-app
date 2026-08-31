"use client";

import { ImageOff, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import BingoCaption from "@/app/components/gallery/BingoCaption";
import type { Photo } from "@/lib/photos";

type MediaThumbProps = {
  photo: Photo;
  priority?: boolean;
  sizes?: string;
  showCaption?: boolean;
};

type Source = "thumb" | "original" | "broken";

type VisibilityListener = (visible: boolean) => void;

const visibilityListeners = new Map<Element, VisibilityListener>();
let sharedObserver: IntersectionObserver | null = null;

function observeVisibility(element: Element, listener: VisibilityListener): () => void {
  if (typeof IntersectionObserver === "undefined") {
    const timer = window.setTimeout(() => listener(true), 0);
    return () => window.clearTimeout(timer);
  }

  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibilityListeners.get(entry.target)?.(entry.isIntersecting);
        }
      },
      // Kilka rzędów zapasu zapobiega miganiu podczas szybkiego scrollowania,
      // a odległe zdjęcia i filmy nie zajmują pamięci telefonu.
      { rootMargin: "1000px 0px" },
    );
  }

  visibilityListeners.set(element, listener);
  sharedObserver.observe(element);

  return () => {
    sharedObserver?.unobserve(element);
    visibilityListeners.delete(element);
    if (visibilityListeners.size === 0) {
      sharedObserver?.disconnect();
      sharedObserver = null;
    }
  };
}

export default function MediaThumb({
  photo,
  priority = false,
  sizes = "(max-width: 640px) 33vw, 200px",
  showCaption = true,
}: MediaThumbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(priority);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<Source>("thumb");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    return observeVisibility(container, (visible) => {
      setNearViewport(visible);
      if (!visible) setLoaded(false);
    });
  }, []);

  const caption = showCaption ? (
    // Filmy mają w rogu ikonę odtwarzania — robimy jej miejsce.
    <BingoCaption
      taskId={photo.bingoTaskId}
      className={photo.kind === "video" ? "pr-9" : undefined}
    />
  ) : null;

  function handleImageError() {
    setSource((current) => (current === "thumb" ? "original" : "broken"));
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${nearViewport && !loaded ? "shimmer" : ""}`}
    >
      {!nearViewport ? null : source === "broken" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/5 px-1 text-center text-muted">
          <ImageOff size={20} />
          <span className="text-[10px] leading-tight">Nie wczytano</span>
        </div>
      ) : photo.kind === "video" ? (
        <>
          <video
            src={`${photo.url}#t=0.1`}
            muted
            playsInline
            preload="metadata"
            onLoadedData={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className="media-fade h-full w-full object-cover"
            data-loaded={loaded}
          />
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
            <Play size={12} fill="currentColor" />
          </span>
        </>
      ) : (
        <Image
          key={source}
          src={source === "thumb" ? photo.thumbUrl : photo.url}
          alt="Zdjęcie z wesela"
          fill
          unoptimized
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={handleImageError}
          className="media-fade object-cover"
          data-loaded={loaded}
        />
      )}

      {nearViewport ? caption : null}
    </div>
  );
}

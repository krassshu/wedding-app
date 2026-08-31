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

type Source = "thumb" | "broken";

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
      // Niewielki zapas zapobiega miganiu, ale ogranicza liczbę obrazów
      // dekodowanych jednocześnie przez przeglądarkę telefonu.
      { rootMargin: "400px 0px" },
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
    // W siatce nigdy nie pobieramy wielomegabajtowego oryginału. Gdy usługa
    // miniaturek odrzuci bardzo duże zdjęcie, lekki placeholder chroni telefon
    // przed skokiem pamięci. Oryginał pozostaje dostępny po otwarciu pliku.
    setSource("broken");
    setLoaded(true);
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${nearViewport && photo.kind === "image" && !loaded ? "shimmer" : ""}`}
    >
      {!nearViewport ? null : source === "broken" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/5 px-1 text-center text-muted">
          <ImageOff size={20} />
          <span className="text-[10px] leading-tight">Nie wczytano</span>
        </div>
      ) : photo.kind === "video" ? (
        <>
          {/* Nie tworzymy odtwarzacza w siatce. Sam preload metadanych uruchamiał
              wiele dekoderów naraz i potrafił zamknąć galerię na telefonie. */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-950 text-white">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 shadow-sm backdrop-blur-sm">
              <Play size={22} fill="currentColor" className="translate-x-px" />
            </span>
          </div>
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Film
          </span>
        </>
      ) : (
        <Image
          src={photo.thumbUrl}
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

"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Photo } from "@/lib/photos";

type LightboxProps = {
  photos: Photo[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

const ZOOM = 2.5;

export default function Lightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: LightboxProps) {
  const photo = photos[index];
  const containerRef = useRef<HTMLDivElement>(null);
  const start = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const moved = useRef(false);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setDragX(0);
    setLoaded(false);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (next < 0 || next >= photos.length) return;
      reset();
      onIndexChange(next);
    },
    [photos.length, onIndexChange, reset],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (scale === 1 && e.key === "ArrowLeft") go(index - 1);
      else if (scale === 1 && e.key === "ArrowRight") go(index + 1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, scale, go, onClose]);

  function clampOffset(x: number, y: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    const maxX = rect ? ((scale - 1) * rect.width) / 2 : 0;
    const maxY = rect ? ((scale - 1) * rect.height) / 2 : 0;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  function onPointerDown(e: ReactPointerEvent) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    moved.current = false;
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 8) moved.current = true;
    if (scale > 1) {
      setOffset(clampOffset(start.current.ox + dx, start.current.oy + dy));
    } else {
      setDragX(dx);
    }
  }

  function onPointerUp(e: ReactPointerEvent) {
    setDragging(false);
    const dx = e.clientX - start.current.x;
    if (scale === 1) {
      if (Math.abs(dx) > 60) {
        go(dx > 0 ? index - 1 : index + 1);
      } else if (!moved.current) {
        setScale(ZOOM);
        setOffset({ x: 0, y: 0 });
      }
      setDragX(0);
    } else if (!moved.current) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  }

  if (!photo) return null;
  const canPrev = index > 0;
  const canNext = index < photos.length - 1;
  const zoomed = scale > 1;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm tabular-nums text-white/70">
          {index + 1} / {photos.length}
        </span>
        <button type="button" aria-label="Zamknij" onClick={onClose} className="p-2">
          <X size={24} />
        </button>
      </div>

      <div ref={containerRef} className="relative flex-1 select-none overflow-hidden">
        {!zoomed ? (
          <button
            type="button"
            aria-label="Zamknij"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={onClose}
          />
        ) : null}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-2">
          {photo.kind === "video" ? (
            <video
              src={photo.url}
              controls
              autoPlay
              playsInline
              onLoadedData={() => setLoaded(true)}
              className="pointer-events-auto max-h-full max-w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.url}
              alt="Zdjęcie z wesela"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                transform: `translate(${offset.x + dragX}px, ${offset.y}px) scale(${scale})`,
                transition: dragging ? "none" : "transform 200ms ease, opacity 300ms ease",
                touchAction: "none",
                cursor: zoomed ? "grab" : "zoom-in",
              }}
              className="media-fade pointer-events-auto max-h-full max-w-full object-contain"
              data-loaded={loaded}
            />
          )}
        </div>

        {!loaded ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
          </div>
        ) : null}

        {!zoomed && canPrev ? (
          <button
            type="button"
            aria-label="Poprzednie"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur active:bg-white/20"
          >
            <ChevronLeft size={26} />
          </button>
        ) : null}
        {!zoomed && canNext ? (
          <button
            type="button"
            aria-label="Następne"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white backdrop-blur active:bg-white/20"
          >
            <ChevronRight size={26} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

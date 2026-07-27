"use client";

import { ImageOff, Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/lib/photos";

type MediaThumbProps = {
  photo: Photo;
  priority?: boolean;
  sizes?: string;
};

type Source = "thumb" | "original" | "broken";

export default function MediaThumb({
  photo,
  priority = false,
  sizes = "(max-width: 640px) 33vw, 200px",
}: MediaThumbProps) {
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<Source>("thumb");

  function handleImageError() {
    setSource((current) => (current === "thumb" ? "original" : "broken"));
  }

  if (source === "broken") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-muted">
        <ImageOff size={20} />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 ${loaded ? "" : "shimmer"}`}>
      {photo.kind === "video" ? (
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
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
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
    </div>
  );
}

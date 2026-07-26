"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/lib/photos";

type MediaThumbProps = {
  photo: Photo;
  priority?: boolean;
  sizes?: string;
};

export default function MediaThumb({
  photo,
  priority = false,
  sizes = "(max-width: 640px) 33vw, 200px",
}: MediaThumbProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`absolute inset-0 ${loaded ? "" : "shimmer"}`}>
      {photo.kind === "video" ? (
        <>
          <video
            src={photo.url}
            muted
            playsInline
            preload="metadata"
            onLoadedData={() => setLoaded(true)}
            className="media-fade h-full w-full object-cover"
            data-loaded={loaded}
          />
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
            <Play size={12} fill="currentColor" />
          </span>
        </>
      ) : (
        <Image
          src={photo.url}
          alt="Zdjęcie z wesela"
          fill
          unoptimized
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          className="media-fade object-cover"
          data-loaded={loaded}
        />
      )}
    </div>
  );
}

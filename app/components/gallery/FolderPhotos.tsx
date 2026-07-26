"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import PhotoGrid from "@/app/components/gallery/PhotoGrid";
import SectionTitle from "@/app/components/ui/SectionTitle";
import { listBingoPhotos, listPhotos, type Photo } from "@/lib/photos";

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = slug === "bingo" ? listBingoPhotos : listPhotos;

    load(1000)
      .then((result) => {
        if (active) setPhotos(result);
      })
      .catch(() => {
        if (active) setPhotos([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

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

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[3/4] animate-pulse rounded-md bg-black/5"
            />
          ))}
        </div>
      ) : (
        <PhotoGrid photos={photos} />
      )}
    </div>
  );
}

import Image from "next/image";
import type { Photo } from "@/lib/photos";

type PhotoCardProps = {
  photo: Photo;
  priority?: boolean;
};

export default function PhotoCard({ photo, priority = false }: PhotoCardProps) {
  return (
    <figure className="relative aspect-[3/4] overflow-hidden rounded-md bg-black/5">
      <Image
        src={photo.url}
        alt="Zdjęcie z wesela"
        fill
        unoptimized
        priority={priority}
        sizes="(max-width: 640px) 33vw, 200px"
        className="object-cover"
      />
    </figure>
  );
}

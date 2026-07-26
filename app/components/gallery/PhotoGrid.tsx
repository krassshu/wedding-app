import PhotoCard from "@/app/components/cards/PhotoCard";
import type { Photo } from "@/lib/photos";

type PhotoGridProps = {
  photos: Photo[];
  emptyLabel?: string;
};

export default function PhotoGrid({
  photos,
  emptyLabel = "Nie ma tu jeszcze żadnych zdjęć",
}: PhotoGridProps) {
  if (photos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">{emptyLabel}</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo, index) => (
        <PhotoCard key={photo.path} photo={photo} priority={index < 3} />
      ))}
    </div>
  );
}

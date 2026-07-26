import { TitleSkeleton } from "@/app/components/gallery/GallerySkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <TitleSkeleton />
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="shimmer aspect-square" />
        ))}
      </div>
    </div>
  );
}

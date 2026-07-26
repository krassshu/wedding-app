import { PhotoGridSkeleton, TitleSkeleton } from "@/app/components/gallery/GallerySkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <TitleSkeleton />
      <PhotoGridSkeleton count={12} />
    </div>
  );
}

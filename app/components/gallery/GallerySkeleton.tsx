export function PhotoGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shimmer aspect-[3/4] rounded-md" />
      ))}
    </div>
  );
}

export function FolderGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="shimmer aspect-square rounded-lg" />
      ))}
    </div>
  );
}

export function TitleSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="shimmer h-6 w-40 rounded" />
      <div className="shimmer h-4 w-56 rounded" />
    </div>
  );
}

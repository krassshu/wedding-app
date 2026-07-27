import Image from "next/image";
import Link from "next/link";

function photoPlural(count: number) {
  if (count === 1) return "zdjęcie";
  const rest = count % 10;
  const teens = count % 100;
  if (rest >= 2 && rest <= 4 && (teens < 12 || teens > 14)) return "zdjęcia";
  return "zdjęć";
}

type FolderCardProps = {
  href: string;
  title: string;
  count: number;
  coverUrl?: string | null;
};

export default function FolderCard({
  href,
  title,
  count,
  coverUrl,
}: FolderCardProps) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-lg border border-line"
    >
      <div className="relative aspect-square bg-plum-dark">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, 320px"
            className="object-cover opacity-70 transition-opacity group-hover:opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/25 px-3 text-center">
          <span className="text-base font-medium text-white">{title}</span>
          <span className="text-xs text-white/80">
            {count} {photoPlural(count)}
          </span>
        </div>
      </div>
    </Link>
  );
}

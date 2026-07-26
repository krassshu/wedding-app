import { notFound } from "next/navigation";
import FolderPhotos from "@/app/components/gallery/FolderPhotos";

const folders = {
  wszystkie: {
    title: "Galeria",
    subtitle: "Wszystkie zdjęcia dodane przez gości",
  },
  bingo: {
    title: "Bingo",
    subtitle: "Zdjęcia przesłane w ramach zadań bingo",
  },
} as const;

type FolderSlug = keyof typeof folders;

export function generateStaticParams() {
  return Object.keys(folders).map((folder) => ({ folder }));
}

export default async function FolderPage({
  params,
}: {
  params: Promise<{ folder: string }>;
}) {
  const { folder } = await params;

  if (!(folder in folders)) notFound();

  const slug = folder as FolderSlug;
  const config = folders[slug];

  return (
    <FolderPhotos
      slug={slug}
      title={config.title}
      subtitle={config.subtitle}
    />
  );
}

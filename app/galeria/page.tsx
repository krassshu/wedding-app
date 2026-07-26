import FolderGrid from "@/app/components/gallery/FolderGrid";
import SectionTitle from "@/app/components/ui/SectionTitle";

export const metadata = {
  title: "Galeria",
};

export default function GalleryPage() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <SectionTitle
        title="Galeria"
        subtitle="Wybierz folder, żeby zobaczyć zdjęcia"
      />
      <FolderGrid />
    </div>
  );
}

import BingoGrid from "@/app/components/bingo/BingoGrid";
import SectionTitle from "@/app/components/ui/SectionTitle";

export const metadata = {
  title: "Bingo zdjęć",
};

export default function BingoPage() {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <SectionTitle
        title="Bingo zdjęć"
        subtitle="Wykonaj zadania! Kliknij w nie i prześlij zdjęcie, trafi także do głównej galerii"
      />
      <BingoGrid />
    </div>
  );
}

import { bingoTaskTitle } from "@/lib/bingoTasks";

type BingoCaptionProps = {
  taskId: string | null;
  /** "thumb" — kafelek w siatce, "full" — podgląd na pełnym ekranie. */
  variant?: "thumb" | "full";
  className?: string;
};

/**
 * Podpis z treścią zadania bingo, nałożony na dolną część zdjęcia.
 * Nic nie renderuje dla zwykłych zdjęć i dla zadań, których już nie ma na liście.
 */
export default function BingoCaption({
  taskId,
  variant = "thumb",
  className = "",
}: BingoCaptionProps) {
  const title = bingoTaskTitle(taskId);
  if (!title) return null;

  const size =
    variant === "thumb"
      ? "px-1.5 py-1 text-[10px] leading-tight line-clamp-2"
      : "px-4 py-2.5 text-center text-sm leading-snug";

  return (
    <span
      className={`pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 text-white backdrop-blur-[2px] ${size} ${className}`}
    >
      {title}
    </span>
  );
}

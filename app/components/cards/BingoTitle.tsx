"use client";

import { Check } from "lucide-react";
import type { BingoTask } from "@/app/types/bingo";

type BingoTitleProps = {
  task: BingoTask;
  index: number;
  done: boolean;
  onSelect: (task: BingoTask) => void;
};

export default function BingoTitle({
  task,
  index,
  done,
  onSelect,
}: BingoTitleProps) {
  const shade = (index + Math.floor(index / 3)) % 2 === 0 ? "bg-plum" : "bg-plum-dark";

  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={`relative flex aspect-square items-center justify-center p-3 text-center transition-opacity hover:opacity-90 ${shade}`}
    >
      {done ? (
        <span className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-plum-dark">
          <Check size={14} strokeWidth={3} />
        </span>
      ) : null}
      <span className="text-xs font-medium leading-snug text-white sm:text-sm">
        {task.title}
      </span>
    </button>
  );
}

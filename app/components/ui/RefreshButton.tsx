"use client";

import { RotateCw } from "lucide-react";

type RefreshButtonProps = {
  onRefresh: () => void;
  refreshing?: boolean;
  label?: string;
  className?: string;
};

export default function RefreshButton({
  onRefresh,
  refreshing = false,
  label = "Odśwież",
  className = "",
}: RefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] disabled:opacity-60 ${className}`}
    >
      <RotateCw size={14} className={refreshing ? "animate-spin" : undefined} />
      <span>{label}</span>
    </button>
  );
}

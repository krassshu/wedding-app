import { AlertTriangle, CheckCircle2, Info, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "error" | "info" | "success";

type NoticeProps = {
  tone?: Tone;
  children: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  error: {
    box: "border-plum bg-plum/10 text-foreground",
    icon: <AlertTriangle size={16} className="shrink-0 text-plum" />,
  },
  info: {
    box: "border-line bg-black/[0.02] text-foreground",
    icon: <Info size={16} className="shrink-0 text-muted" />,
  },
  success: {
    box: "border-plum bg-plum/10 text-foreground",
    icon: <CheckCircle2 size={16} className="shrink-0 text-plum" />,
  },
};

/** Jeden wygląd dla wszystkich komunikatów w aplikacji. */
export default function Notice({
  tone = "error",
  children,
  onRetry,
  retryLabel = "Spróbuj ponownie",
  className = "",
}: NoticeProps) {
  const style = tones[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm leading-snug ${style.box} ${className}`}
    >
      {style.icon}
      <span className="min-w-0 flex-1">{children}</span>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-plum px-3 py-1 text-xs font-medium text-white"
        >
          <RotateCw size={13} />
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

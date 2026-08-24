"use client";

import { CloudOff, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";

export default function PendingUploads() {
  const {
    pending,
    errored,
    online,
    flushing,
    progress,
    persistent,
    errorMessage,
    retryAll,
    discardFailed,
  } = useUploadQueue();

  if (pending === 0 && errored === 0) return null;

  const plural = (n: number) => (n === 1 ? "plik" : n < 5 ? "pliki" : "plików");
  const percent = Math.round(progress * 100);
  const uploading = flushing && errored === 0 && online;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex max-w-full flex-col gap-1.5 rounded-2xl border border-line bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur"
      >
        <div className="flex flex-wrap items-center gap-2">
          {errored > 0 ? (
            <>
              <CloudOff size={16} className="shrink-0 text-plum" />
              <span className="text-foreground">
                {errored} {plural(errored)} nie wysłano
              </span>
              <button
                type="button"
                onClick={retryAll}
                className="ml-1 inline-flex items-center gap-1 rounded-full bg-plum px-3 py-1 text-xs font-medium text-white"
              >
                <RefreshCw size={13} />
                Ponów
              </button>
              <button
                type="button"
                onClick={discardFailed}
                aria-label="Odrzuć pliki, których nie udało się wysłać"
                className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-muted"
              >
                <Trash2 size={13} />
                Odrzuć
              </button>
            </>
          ) : !online ? (
            <>
              <CloudOff size={16} className="shrink-0 text-muted" />
              <span className="text-muted">
                Brak internetu — {pending} {plural(pending)} czeka na wysłanie
              </span>
            </>
          ) : (
            <>
              {flushing ? (
                <Loader2 size={16} className="shrink-0 animate-spin text-plum" />
              ) : (
                <UploadCloud size={16} className="shrink-0 text-plum" />
              )}
              <span className="text-foreground">
                {flushing ? "Wysyłanie" : "W kolejce"}
                {pending > 1 ? ` · ${pending} ${plural(pending)}` : ""}
              </span>
              {uploading ? (
                <span className="tabular-nums text-muted">{percent}%</span>
              ) : null}
            </>
          )}
        </div>

        {errored > 0 && errorMessage ? (
          <p className="max-w-xs text-xs leading-snug text-muted">{errorMessage}</p>
        ) : null}

        {errored === 0 && !persistent && pending > 0 ? (
          <p className="max-w-xs text-xs leading-snug text-muted">
            Nie zamykaj tej strony — na tym urządzeniu nie możemy zapisać kolejki.
          </p>
        ) : null}

        {uploading ? (
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Postęp wysyłania"
            className="h-1 w-full overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-plum transition-[width] duration-200 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

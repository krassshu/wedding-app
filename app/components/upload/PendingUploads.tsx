"use client";

import { CloudOff, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";

export default function PendingUploads() {
  const { pending, errored, online, flushing, progress, retryAll } =
    useUploadQueue();

  if (pending === 0 && errored === 0) return null;

  const plural = (n: number) => (n === 1 ? "plik" : n < 5 ? "pliki" : "plików");
  const percent = Math.round(progress * 100);
  const uploading = flushing && errored === 0 && online;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full flex-col gap-1.5 rounded-2xl border border-line bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          {errored > 0 ? (
            <>
              <CloudOff size={16} className="text-plum" />
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
            </>
          ) : !online ? (
            <>
              <CloudOff size={16} className="text-muted" />
              <span className="text-muted">
                Brak internetu — {pending} {plural(pending)} czeka na wysłanie
              </span>
            </>
          ) : (
            <>
              {flushing ? (
                <Loader2 size={16} className="animate-spin text-plum" />
              ) : (
                <UploadCloud size={16} className="text-plum" />
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

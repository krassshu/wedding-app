"use client";

import { CloudOff, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";

// Fixed status pill above the bottom nav. Only visible while uploads are waiting,
// in flight, or failed. Reassures guests that photos taken offline are safe.
export default function PendingUploads() {
  const { pending, errored, online, flushing, retryAll } = useUploadQueue();

  if (pending === 0 && errored === 0) return null;

  const plural = (n: number) => (n === 1 ? "plik" : n < 5 ? "pliki" : "plików");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
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
              Wysyłanie… {pending} {plural(pending)} w kolejce
            </span>
          </>
        )}
      </div>
    </div>
  );
}

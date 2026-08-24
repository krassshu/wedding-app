"use client";

import { CloudOff, RefreshCw, Trash2 } from "lucide-react";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";

export default function PendingUploads() {
  const {
    pending,
    errored,
    online,
    persistent,
    errorMessage,
    retryAll,
    discardFailed,
  } = useUploadQueue();

  // Prawidłowo trwający upload nie pokazuje żadnego loadera ani paska.
  // Komunikat zostaje tylko wtedy, gdy użytkownik musi zareagować.
  if (errored === 0 && (online || pending === 0)) return null;

  const plural = (n: number) => (n === 1 ? "plik" : n < 5 ? "pliki" : "plików");

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
          ) : (
            <>
              <CloudOff size={16} className="shrink-0 text-muted" />
              <span className="text-muted">
                Brak internetu — {pending} {plural(pending)} czeka na wysłanie
              </span>
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
      </div>
    </div>
  );
}

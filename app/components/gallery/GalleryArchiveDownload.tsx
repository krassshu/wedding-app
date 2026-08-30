"use client";

import { Download, FileArchive, Loader2, X } from "lucide-react";
import { useState } from "react";
import Notice from "@/app/components/ui/Notice";

type ArchiveManifest = {
  snapshot: string;
  totalFiles: number;
  totalBytes: number;
  parts: Array<{ number: number; files: number; bytes: number }>;
};

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;
}

export default function GalleryArchiveDownload() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manifest, setManifest] = useState<ArchiveManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<Set<number>>(new Set());

  async function showDownloads() {
    setOpen(true);
    if (manifest || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gallery/archive?manifest=1", {
        cache: "no-store",
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || "Nie udało się przygotować listy archiwów.");
      }
      setManifest((await response.json()) as ArchiveManifest);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Nie udało się przygotować archiwów.",
      );
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void showDownloads()}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted"
      >
        <FileArchive size={15} />
        Pobierz wszystko (ZIP)
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center">
          <button
            type="button"
            aria-label="Zamknij"
            onClick={close}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-background p-5 pb-8 sm:rounded-2xl sm:pb-5">
            <button
              type="button"
              aria-label="Zamknij"
              onClick={close}
              className="absolute right-4 top-4 p-1 text-muted"
            >
              <X size={20} />
            </button>

            <h2 className="pr-8 text-lg font-semibold">Pobierz całą galerię</h2>

            {loading ? (
              <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted">
                <Loader2 size={17} className="animate-spin" />
                Liczenie plików…
              </p>
            ) : null}

            {error ? (
              <Notice className="mt-4" onRetry={showDownloads} retryLabel="Spróbuj ponownie">
                {error}
              </Notice>
            ) : null}

            {manifest ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {manifest.totalFiles} plików · około {formatSize(manifest.totalBytes)}.
                  Galeria jest podzielona na mniejsze paczki, aby zerwane połączenie nie
                  wymagało pobierania wszystkiego od początku.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {manifest.parts.map((part) => {
                    const href = `/api/gallery/archive?part=${part.number}&snapshot=${encodeURIComponent(manifest.snapshot)}`;
                    return (
                      <a
                        key={part.number}
                        href={href}
                        download
                        onClick={() =>
                          setStarted((current) => new Set(current).add(part.number))
                        }
                        className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm active:bg-black/5"
                      >
                        <span className="inline-flex items-center gap-2 font-medium">
                          <Download size={17} className="text-plum" />
                          Część {part.number} z {manifest.parts.length}
                        </span>
                        <span className="text-right text-xs text-muted">
                          {part.files} plików · {formatSize(part.bytes)}
                          {started.has(part.number) ? " · rozpoczęto" : ""}
                        </span>
                      </a>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs leading-snug text-muted">
                  Na telefonie archiwa trafią do „Plików” lub „Pobranych”. Pobierz każdą
                  część osobno.
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

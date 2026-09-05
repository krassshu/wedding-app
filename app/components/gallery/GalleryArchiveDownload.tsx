"use client";

import { FileArchive, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ArchiveState = {
  id: string;
  status: "building" | "ready" | "error";
  completedFiles: number;
  totalFiles: number;
  message?: string;
};

export default function GalleryArchiveDownload() {
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => () => {
    cancelled.current = true;
  }, []);

  async function responseState(response: Response): Promise<ArchiveState> {
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "Nie udało się przygotować archiwum.");
    }
    return (await response.json()) as ArchiveState;
  }

  async function startDownload() {
    if (preparing) return;
    cancelled.current = false;
    setPreparing(true);
    setError(null);
    setProgress("Sprawdzanie galerii…");

    try {
      let state = await responseState(
        await fetch("/api/gallery/archive", { method: "POST", cache: "no-store" }),
      );

      while (state.status === "building" && !cancelled.current) {
        setProgress(
          state.totalFiles > 0
            ? `Przygotowanie ${state.completedFiles} z ${state.totalFiles}…`
            : "Przygotowanie ZIP-a…",
        );
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        state = await responseState(
          await fetch(`/api/gallery/archive?id=${encodeURIComponent(state.id)}`, {
            cache: "no-store",
          }),
        );
      }

      if (cancelled.current) return;
      if (state.status === "error") {
        throw new Error(state.message || "Nie udało się przygotować ZIP-a.");
      }

      setProgress("Pobieranie rozpoczęte");
      const link = document.createElement("a");
      link.href = `/api/gallery/archive?download=1&id=${encodeURIComponent(state.id)}`;
      link.download = "wesele-ania-oskar.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (reason) {
      if (!cancelled.current) {
        setError(reason instanceof Error ? reason.message : "Nie udało się pobrać ZIP-a.");
      }
    } finally {
      if (!cancelled.current) setPreparing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void startDownload()}
      disabled={preparing}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted"
    >
      {preparing ? <Loader2 size={15} className="animate-spin" /> : <FileArchive size={15} />}
      {preparing ? progress : error || "Pobierz wszystko (ZIP)"}
    </button>
  );
}

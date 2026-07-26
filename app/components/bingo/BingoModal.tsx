"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import CameraButton from "@/app/components/buttons/CameraButton";
import GalleryButton from "@/app/components/buttons/GalleryButton";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import type { BingoTask } from "@/app/types/bingo";

type BingoModalProps = {
  task: BingoTask | null;
  onClose: () => void;
  onUploaded: (task: BingoTask) => void;
};

export default function BingoModal({
  task,
  onClose,
  onUploaded,
}: BingoModalProps) {
  const { add } = useUploadQueue();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!task) return null;

  async function handleFile(file: File) {
    if (!task) return;

    setUploading(true);
    setError(null);

    try {
      await add(file, task.id);
      onUploaded(task);
      onClose();
    } catch {
      setError("Nie udało się dodać zdjęcia. Spróbuj ponownie.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <button
        type="button"
        aria-label="Zamknij"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-t-2xl bg-background p-5 pb-8 sm:rounded-2xl sm:pb-5">
        <button
          type="button"
          aria-label="Zamknij"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted"
        >
          <X size={20} />
        </button>

        <p className="pr-8 text-center text-xs uppercase tracking-wide text-muted">
          Zadanie
        </p>
        <h2 className="mt-1 pr-8 text-center text-lg font-semibold leading-snug">
          {task.title}
        </h2>

        <div className="mt-5 flex flex-col gap-3">
          <CameraButton onSelect={handleFile} disabled={uploading} />
          <GalleryButton
            onSelect={handleFile}
            disabled={uploading}
            label="Wybierz z galerii"
          />
        </div>

        {uploading ? (
          <p className="mt-4 text-center text-sm text-muted">Wysyłanie…</p>
        ) : null}

        {error ? (
          <p className="mt-4 text-center text-sm text-plum">{error}</p>
        ) : null}
      </div>
    </div>
  );
}

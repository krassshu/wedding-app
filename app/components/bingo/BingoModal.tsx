"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import CameraButton from "@/app/components/buttons/CameraButton";
import GalleryButton from "@/app/components/buttons/GalleryButton";
import Notice from "@/app/components/ui/Notice";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import type { BingoTask } from "@/app/types/bingo";
import { describeError, validateUploadFile } from "@/lib/errors";

type BingoModalProps = {
  task: BingoTask | null;
  done: boolean;
  onClose: () => void;
  onUploaded: (task: BingoTask) => void;
};

export default function BingoModal({
  task,
  done,
  onClose,
  onUploaded,
}: BingoModalProps) {
  const { add, addMany, online } = useUploadQueue();
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
    await handleFiles([file]);
  }

  async function handleFiles(files: File[]) {
    if (!task || uploading) return;

    const problems = files
      .map(validateUploadFile)
      .filter((problem): problem is string => problem !== null);
    if (problems.length > 0) {
      setError(
        problems.length === 1
          ? problems[0]
          : `Nie dodano ${problems.length} nieprawidłowych plików. ${problems[0]}`,
      );
      return;
    }

    setUploading(true);
    setError(null);

    try {
      if (files.length === 1) await add(files[0], task.id);
      else await addMany(files, task.id);
      onUploaded(task);
      onClose();
    } catch (err) {
      setError(describeError(err, "Nie udało się dodać zdjęcia. Spróbuj ponownie."));
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

        {done ? (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-sm text-plum">
            <Check size={15} strokeWidth={3} />
            To zadanie masz już zaliczone — możesz dodać kolejne zdjęcie.
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3">
          <CameraButton onSelect={handleFile} disabled={uploading} />
          <GalleryButton
            onSelect={handleFiles}
            disabled={uploading}
            label="Wybierz zdjęcia z galerii"
          />
        </div>

        {!online ? (
          <p className="mt-4 text-center text-sm text-muted">
            Jesteś offline — zdjęcie poczeka w kolejce i wyśle się samo, gdy wróci
            internet.
          </p>
        ) : null}

        {uploading ? (
          <p className="mt-4 text-center text-sm text-muted">Wysyłanie…</p>
        ) : null}

        {error ? <Notice className="mt-4">{error}</Notice> : null}
      </div>
    </div>
  );
}

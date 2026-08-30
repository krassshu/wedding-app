"use client";

import { useState } from "react";
import CameraButton from "@/app/components/buttons/CameraButton";
import GalleryButton from "@/app/components/buttons/GalleryButton";
import LastPhotos from "@/app/components/gallery/LastPhotos";
import Notice from "@/app/components/ui/Notice";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import { describeError, validateUploadFile } from "@/lib/errors";

export default function Home() {
  const { add, addMany, online } = useUploadQueue();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    await handleFiles([file]);
  }

  async function handleFiles(files: File[]) {
    setError(null);

    const valid: File[] = [];
    const problems: string[] = [];
    for (const file of files) {
      const problem = validateUploadFile(file);
      if (problem) problems.push(problem);
      else valid.push(file);
    }

    if (valid.length === 0) {
      setNote(null);
      setError(problems[0] ?? "Nie udało się odczytać wybranych plików.");
      return;
    }

    try {
      if (valid.length === 1) await add(valid[0]);
      else await addMany(valid);

      const count = valid.length;
      const filesLabel = count === 1 ? "plik" : count < 5 ? "pliki" : "plików";
      setNote(
        online
          ? `Dodano ${count} ${filesLabel} do wysyłki ❤️`
          : `Dodano ${count} ${filesLabel} do kolejki — wyślemy, gdy wróci internet ❤️`,
      );
      if (problems.length > 0) {
        const skipped = problems.length;
        const skippedLabel = skipped === 1 ? "plik" : skipped < 5 ? "pliki" : "plików";
        setError(
          `Pominięto ${skipped} ${skippedLabel}. ${problems[0]}`,
        );
      }
      window.setTimeout(() => setNote(null), 2500);
    } catch (err) {
      setError(describeError(err, "Nie udało się dodać pliku. Spróbuj ponownie."));
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <p className="text-center text-sm leading-relaxed text-muted">
        Pokaż nam, jak się bawisz! Pozwól, by Twoje zdjęcia i filmy były częścią
        wspomnień z tego wyjątkowego dla nas dnia ❤️
      </p>

      <div className="flex flex-col gap-3">
        <CameraButton onSelect={handleFile} />
        <GalleryButton
          onSelect={handleFiles}
          label="Dodaj zdjęcia i filmy z galerii"
        />
      </div>

      {note ? <p className="text-center text-sm text-plum">{note}</p> : null}

      {error ? <Notice>{error}</Notice> : null}

      <LastPhotos count={9} />
    </div>
  );
}

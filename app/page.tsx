"use client";

import { useState } from "react";
import CameraButton from "@/app/components/buttons/CameraButton";
import GalleryButton from "@/app/components/buttons/GalleryButton";
import LastPhotos from "@/app/components/gallery/LastPhotos";
import Notice from "@/app/components/ui/Notice";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import { describeError, validateUploadFile } from "@/lib/errors";

export default function Home() {
  const { add, online } = useUploadQueue();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    const problem = validateUploadFile(file);
    if (problem) {
      setNote(null);
      setError(problem);
      return;
    }

    try {
      await add(file);
      setNote(
        online
          ? "Dodano do wysyłki ❤️"
          : "Dodano do kolejki — wyślemy, gdy wróci internet ❤️",
      );
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
        <GalleryButton onSelect={handleFile} />
      </div>

      {note ? <p className="text-center text-sm text-plum">{note}</p> : null}

      {error ? <Notice>{error}</Notice> : null}

      <LastPhotos count={9} />
    </div>
  );
}

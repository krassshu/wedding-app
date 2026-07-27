"use client";

import { useState } from "react";
import CameraButton from "@/app/components/buttons/CameraButton";
import GalleryButton from "@/app/components/buttons/GalleryButton";
import LastPhotos from "@/app/components/gallery/LastPhotos";
import { useUploadQueue } from "@/app/components/upload/UploadQueueProvider";
import { FileTooLargeError } from "@/lib/uploadQueue";

export default function Home() {
  const { add } = useUploadQueue();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      await add(file);
      setNote("Dodano do wysyłki ❤️");
      window.setTimeout(() => setNote(null), 2500);
    } catch (err) {
      setError(
        err instanceof FileTooLargeError
          ? err.message
          : "Nie udało się dodać pliku. Spróbuj ponownie.",
      );
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

      {note ? (
        <p className="text-center text-sm text-plum">{note}</p>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-plum">{error}</p>
      ) : null}

      <LastPhotos count={9} />
    </div>
  );
}

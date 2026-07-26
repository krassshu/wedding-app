"use client";

import { useState } from "react";
import CameraButton from "@/app/components/buttons/CameraButton";
import GalleryButton from "@/app/components/buttons/GalleryButton";
import LastPhotos from "@/app/components/gallery/LastPhotos";
import { uploadPhoto } from "@/lib/photos";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);

    try {
      await uploadPhoto(file);
      setRefreshToken((token) => token + 1);
    } catch {
      setError("Nie udało się wysłać pliku. Spróbuj ponownie.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pt-2">
      <p className="text-center text-sm leading-relaxed text-muted">
        Pokaż nam, jak się bawisz! Pozwól, by Twoje zdjęcia i filmy były częścią
        wspomnień z tego wyjątkowego dla nas dnia ❤️
      </p>

      <div className="flex flex-col gap-3">
        <CameraButton onSelect={handleFile} disabled={uploading} />
        <GalleryButton onSelect={handleFile} disabled={uploading} />
      </div>

      {uploading ? (
        <p className="text-center text-sm text-muted">Wysyłanie…</p>
      ) : null}

      {error ? (
        <p className="text-center text-sm text-plum">{error}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">Ostatnio dodane</h2>
        <LastPhotos refreshToken={refreshToken} count={9} />
      </section>
    </div>
  );
}

"use client";

import { Check, Download, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import PhotoCard from "@/app/components/cards/PhotoCard";
import Lightbox from "@/app/components/gallery/Lightbox";
import Notice from "@/app/components/ui/Notice";
import {
  MAX_SHARED_PHOTOS,
  isShareCancelled,
  prepareMediaFile,
  sharePreparedFiles,
} from "@/lib/mediaSave";
import type { Photo } from "@/lib/photos";
import { useFileShareSupport } from "@/lib/useFileShareSupport";

type PhotoGridProps = {
  photos: Photo[];
  emptyLabel?: string;
  onNeedMore?: () => void;
  showArchiveDownload?: boolean;
};

export default function PhotoGrid({
  photos,
  emptyLabel = "Nie ma tu jeszcze żadnych zdjęć",
  onNeedMore,
  showArchiveDownload = false,
}: PhotoGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const shareSupported = useFileShareSupport();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prepared, setPrepared] = useState<File[] | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [preparedCount, setPreparedCount] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const preparationRef = useRef<AbortController | null>(null);

  useEffect(() => () => preparationRef.current?.abort(), []);

  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selected.has(photo.path) && photo.kind === "image"),
    [photos, selected],
  );

  function resetSelection() {
    preparationRef.current?.abort();
    preparationRef.current = null;
    setSelecting(false);
    setSelected(new Set());
    setPrepared(null);
    setPreparing(false);
    setPreparedCount(0);
    setSaveError(null);
  }

  function toggleSelection(photo: Photo) {
    if (preparing || prepared || photo.kind !== "image") return;
    setSaveError(null);
    if (!selected.has(photo.path) && selected.size >= MAX_SHARED_PHOTOS) {
      setSaveError(`Jednorazowo możesz zapisać do ${MAX_SHARED_PHOTOS} zdjęć.`);
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photo.path)) next.delete(photo.path);
      else next.add(photo.path);
      return next;
    });
  }

  async function prepareSelection() {
    if (selectedPhotos.length === 0 || preparing) return;
    const controller = new AbortController();
    preparationRef.current?.abort();
    preparationRef.current = controller;
    setPreparing(true);
    setPreparedCount(0);
    setSaveError(null);

    try {
      const files: File[] = [];
      for (const photo of selectedPhotos) {
        files.push(await prepareMediaFile(photo, controller.signal));
        if (controller.signal.aborted) return;
        setPreparedCount(files.length);
      }
      setPrepared(files);
    } catch (error) {
      if (!isShareCancelled(error)) {
        setPrepared(null);
        setSaveError(
          error instanceof Error ? error.message : "Nie udało się przygotować zdjęć.",
        );
      }
    } finally {
      if (preparationRef.current === controller) {
        preparationRef.current = null;
        setPreparing(false);
      }
    }
  }

  function saveSelection() {
    if (!prepared) return;
    setSaveError(null);
    void sharePreparedFiles(prepared)
      .then(resetSelection)
      .catch((error) => {
        if (!isShareCancelled(error)) {
          setSaveError(
            error instanceof Error ? error.message : "Nie udało się otworzyć galerii.",
          );
        }
      });
  }

  if (photos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">{emptyLabel}</p>
    );
  }

  return (
    <>
      {showArchiveDownload ||
      (shareSupported && photos.some((photo) => photo.kind === "image")) ? (
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {showArchiveDownload ? (
            <a
              href="/api/gallery/archive"
              download="wesele-ania-oskar.zip"
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted"
            >
              <Download size={15} />
              Pobierz wszystko (ZIP)
            </a>
          ) : null}

          {shareSupported && photos.some((photo) => photo.kind === "image") ? (
          <button
            type="button"
            onClick={() => (selecting ? resetSelection() : setSelecting(true))}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-muted"
          >
            {selecting ? <X size={15} /> : <Check size={15} />}
            {selecting ? "Anuluj" : "Wybierz zdjęcia"}
          </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.path}
            photo={photo}
            priority={index < 3}
            onOpen={() => setOpenIndex(index)}
            selecting={selecting}
            selected={selected.has(photo.path)}
            onSelect={() => toggleSelection(photo)}
          />
        ))}
      </div>

      {selecting ? (
        <div className="sticky bottom-24 z-30 mt-4 flex flex-col items-center gap-2 rounded-2xl border border-line bg-background/95 p-3 text-center shadow-lg backdrop-blur">
          <p className="text-sm text-foreground">
            Zaznaczono {selectedPhotos.length} z {MAX_SHARED_PHOTOS} zdjęć
          </p>

          {prepared ? (
            <button
              type="button"
              onClick={saveSelection}
              className="inline-flex items-center gap-2 rounded-full bg-plum px-5 py-2 text-sm font-medium text-white"
            >
              <Download size={17} />
              Zapisz {prepared.length} w galerii
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void prepareSelection()}
              disabled={selectedPhotos.length === 0 || preparing}
              className="inline-flex items-center gap-2 rounded-full bg-plum px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {preparing ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
              {preparing
                ? `Przygotowywanie ${preparedCount}/${selectedPhotos.length}`
                : `Przygotuj ${selectedPhotos.length || ""} zdjęć`}
            </button>
          )}

          <p className="max-w-sm text-xs leading-snug text-muted">
            {prepared
              ? "Po dotknięciu wybierz w telefonie „Zapisz obrazy” lub aplikację Zdjęcia."
              : "Zdjęcia zostaną przygotowane w pełnej jakości. Filmy zapisuj pojedynczo."}
          </p>
          {saveError ? <Notice>{saveError}</Notice> : null}
        </div>
      ) : null}

      {openIndex !== null ? (
        <Lightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onNeedMore={onNeedMore}
        />
      ) : null}
    </>
  );
}

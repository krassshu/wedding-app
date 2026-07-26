"use client";

import { CheckCircle2, Download, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MediaThumb from "@/app/components/gallery/MediaThumb";
import { PhotoGridSkeleton } from "@/app/components/gallery/GallerySkeleton";
import type { Photo } from "@/lib/photos";

export default function AdminPanel() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/photos", { cache: "no-store" });
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      setPhotos(data.photos ?? []);
      setError(null);
    } catch {
      setError("Nie udało się wczytać zdjęć.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  const allSelected = photos.length > 0 && selected.size === photos.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.path)));
  }

  function downloadAll() {
    window.location.href = "/api/admin/download?all=1";
  }

  async function downloadSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paths: [...selected] }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wesele-zdjecia.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Nie udało się pobrać paczki.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Usunąć ${selected.size} ${selected.size === 1 ? "plik" : "plików"}? Tej operacji nie można cofnąć.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paths: [...selected] }),
      });
      if (!res.ok) throw new Error();
      const removed = new Set(selected);
      setPhotos((prev) => prev.filter((p) => !removed.has(p.path)));
      setSelected(new Set());
    } catch {
      setError("Nie udało się usunąć plików.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Panel administratora</h1>
          <p className="text-sm text-muted">
            {photos.length} {photos.length === 1 ? "plik" : "plików"}
            {selected.size > 0 ? ` · zaznaczono ${selected.size}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted"
        >
          <LogOut size={16} />
          Wyloguj
        </button>
      </div>

      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b border-line bg-background/95 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={toggleAll}
          disabled={photos.length === 0}
          className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40"
        >
          {allSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
        </button>

        <button
          type="button"
          onClick={downloadSelected}
          disabled={busy || selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40"
        >
          <Download size={16} />
          Pobierz zaznaczone
        </button>

        <button
          type="button"
          onClick={downloadAll}
          disabled={photos.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40"
        >
          <Download size={16} />
          Pobierz wszystkie
        </button>

        <button
          type="button"
          onClick={deleteSelected}
          disabled={busy || selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-plum px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          <Trash2 size={16} />
          Usuń zaznaczone
        </button>
      </div>

      {error ? <p className="text-center text-sm text-plum">{error}</p> : null}

      {loading ? (
        <PhotoGridSkeleton count={12} />
      ) : photos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Brak zdjęć.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => {
            const isSelected = selected.has(photo.path);
            return (
              <button
                type="button"
                key={photo.path}
                onClick={() => toggle(photo.path)}
                aria-pressed={isSelected}
                className={`relative aspect-[3/4] overflow-hidden rounded-md bg-black/5 transition ${
                  isSelected ? "ring-2 ring-plum ring-offset-2" : ""
                }`}
              >
                <MediaThumb photo={photo} priority={index < 3} />
                <span
                  className={`absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    isSelected
                      ? "border-plum bg-plum text-white"
                      : "border-white/80 bg-black/25 text-transparent"
                  }`}
                >
                  <CheckCircle2 size={14} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

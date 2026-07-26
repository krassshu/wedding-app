"use client";

import { RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type FacingMode = "environment" | "user";

type CameraViewProps = {
  onCapture: (file: File) => void;
  onClose: () => void;
  onUnavailable: () => void;
};

export default function CameraView({
  onCapture,
  onClose,
  onUnavailable,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      const supported =
        typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        window.isSecureContext;

      if (!supported) {
        if (!cancelled) {
          setError(
            "Podgląd z kamery wymaga połączenia HTTPS lub adresu localhost.",
          );
        }
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        if (!cancelled) {
          setError("Brak dostępu do kamery. Sprawdź uprawnienia w przeglądarce.");
        }
        return;
      }

      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          return;
        }
      }

      if (!cancelled) {
        setError(null);
        setReady(true);
      }
    }

    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    if (facingMode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `zdjecie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }, [facingMode, onCapture]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          aria-label="Zamknij"
          onClick={onClose}
          className="p-2 text-white"
        >
          <X size={24} />
        </button>
        <button
          type="button"
          aria-label="Przełącz kamerę"
          onClick={() =>
            setFacingMode((mode) =>
              mode === "environment" ? "user" : "environment",
            )
          }
          className="p-2 text-white disabled:opacity-40"
          disabled={!ready}
        >
          <RefreshCw size={22} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-cover ${
            facingMode === "user" ? "-scale-x-100" : ""
          }`}
        />

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
            <p className="text-sm leading-relaxed text-white/80">{error}</p>
            <button
              type="button"
              onClick={onUnavailable}
              className="rounded-lg border border-white/40 px-4 py-2 text-sm text-white"
            >
              Użyj aparatu systemowego
            </button>
          </div>
        ) : null}

        {!ready && !error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <p className="text-sm text-white/70">Uruchamianie kamery…</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center py-8">
        <button
          type="button"
          aria-label="Zrób zdjęcie"
          onClick={capture}
          disabled={!ready}
          className="h-18 w-18 rounded-full border-4 border-white/70 bg-white p-1 transition-transform active:scale-95 disabled:opacity-40"
        >
          <span className="block h-full w-full rounded-full border-2 border-black/20 bg-white" />
        </button>
      </div>
    </div>
  );
}

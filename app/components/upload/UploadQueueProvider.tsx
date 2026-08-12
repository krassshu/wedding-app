"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addToQueue,
  discardFailed,
  initQueue,
  retryAll,
  subscribe,
  type QueueSnapshot,
} from "@/lib/uploadQueue";

type UploadQueueValue = {
  pending: number;
  errored: number;
  online: boolean;
  flushing: boolean;
  completedAt: number;
  progress: number;
  uploadingName: string | null;
  /** false = kolejka nie przetrwa zamknięcia strony. */
  persistent: boolean;
  /** Powód pierwszego nieudanego wysłania, po polsku. */
  errorMessage: string | null;
  add: (file: File, bingoTaskId?: string) => Promise<void>;
  retryAll: () => void;
  discardFailed: () => void;
};

const UploadQueueContext = createContext<UploadQueueValue | null>(null);

const EMPTY: QueueSnapshot = {
  items: [],
  online: true,
  flushing: false,
  completedAt: 0,
  uploadingId: null,
  progress: 0,
  persistent: true,
};

export default function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<QueueSnapshot>(EMPTY);

  useEffect(() => {
    const unsubscribe = subscribe(setSnap);
    void initQueue();
    return unsubscribe;
  }, []);

  const value = useMemo<UploadQueueValue>(() => {
    const pending = snap.items.filter((it) => it.status === "pending").length;
    const failed = snap.items.filter((it) => it.status === "error");
    const uploading = snap.items.find((it) => it.id === snap.uploadingId);
    const firstError =
      failed.find((it) => it.error)?.error ??
      snap.items.find((it) => it.error)?.error ??
      null;

    return {
      pending,
      errored: failed.length,
      online: snap.online,
      flushing: snap.flushing,
      completedAt: snap.completedAt,
      progress: snap.progress,
      uploadingName: uploading?.file?.name ?? null,
      persistent: snap.persistent,
      errorMessage: firstError,
      add: addToQueue,
      retryAll,
      discardFailed,
    };
  }, [snap]);

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

export function useUploadQueue(): UploadQueueValue {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) {
    throw new Error("useUploadQueue must be used within UploadQueueProvider");
  }
  return ctx;
}

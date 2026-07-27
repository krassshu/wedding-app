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
  add: (file: File, bingoTaskId?: string) => Promise<void>;
  retryAll: () => void;
};

const UploadQueueContext = createContext<UploadQueueValue | null>(null);

const EMPTY: QueueSnapshot = {
  items: [],
  online: true,
  flushing: false,
  completedAt: 0,
  uploadingId: null,
  progress: 0,
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
    const errored = snap.items.filter((it) => it.status === "error").length;
    const uploading = snap.items.find((it) => it.id === snap.uploadingId);
    return {
      pending,
      errored,
      online: snap.online,
      flushing: snap.flushing,
      completedAt: snap.completedAt,
      progress: snap.progress,
      uploadingName: uploading?.file.name ?? null,
      add: addToQueue,
      retryAll,
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

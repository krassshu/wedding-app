import { uploadPhoto } from "@/lib/photos";

export type QueueStatus = "pending" | "error";

export type QueueItem = {
  id: string;
  file: File;
  bingoTaskId?: string;
  createdAt: number;
  attempts: number;
  status: QueueStatus;
  error?: string;
};

export type QueueSnapshot = {
  items: QueueItem[];
  online: boolean;
  flushing: boolean;
  completedAt: number;
};

const DB_NAME = "wedding-uploads";
const STORE = "pending";
const MAX_ATTEMPTS = 5;

let dbPromise: Promise<IDBDatabase> | null = null;
let items: QueueItem[] = [];
let flushing = false;
let completedAt = 0;
let initialized = false;
const listeners = new Set<(snap: QueueSnapshot) => void>();

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function idbAll(): Promise<QueueItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueueItem[]);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(item: QueueItem): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function snapshot(): QueueSnapshot {
  return {
    items: items.slice().sort((a, b) => a.createdAt - b.createdAt),
    online: isBrowser() ? navigator.onLine : true,
    flushing,
    completedAt,
  };
}

function emit() {
  const snap = snapshot();
  listeners.forEach((cb) => cb(snap));
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function looksLikeNetworkError(err: unknown): boolean {
  if (!isBrowser() || !navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed") ||
    msg.includes("timeout")
  );
}

export async function addToQueue(file: File, bingoTaskId?: string): Promise<void> {
  const item: QueueItem = {
    id: randomId(),
    file,
    bingoTaskId,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };
  items = [...items, item];
  emit();
  await idbPut(item);
  void flush();
}

export async function flush(): Promise<void> {
  if (!isBrowser() || flushing) return;
  if (!navigator.onLine) return;

  const ready = items.filter((it) => it.status === "pending");
  if (ready.length === 0) return;

  flushing = true;
  emit();

  for (const item of ready) {
    try {
      await uploadPhoto(item.file, item.bingoTaskId);
      items = items.filter((it) => it.id !== item.id);
      await idbDelete(item.id);
      completedAt = Date.now();
      emit();
    } catch (err) {
      const networkError = looksLikeNetworkError(err);
      const attempts = item.attempts + 1;
      const next: QueueItem = {
        ...item,
        attempts,
        status: !networkError && attempts >= MAX_ATTEMPTS ? "error" : "pending",
        error: err instanceof Error ? err.message : String(err),
      };
      items = items.map((it) => (it.id === item.id ? next : it));
      await idbPut(next);
      emit();
      if (networkError) break;
    }
  }

  flushing = false;
  emit();
}

export async function retry(id: string): Promise<void> {
  const item = items.find((it) => it.id === id);
  if (!item) return;
  const next: QueueItem = { ...item, status: "pending", attempts: 0, error: undefined };
  items = items.map((it) => (it.id === id ? next : it));
  await idbPut(next);
  emit();
  void flush();
}

export function retryAll(): void {
  items = items.map((it) =>
    it.status === "error" ? { ...it, status: "pending", attempts: 0, error: undefined } : it,
  );
  emit();
  void Promise.all(items.map((it) => idbPut(it))).then(() => flush());
}

export function subscribe(cb: (snap: QueueSnapshot) => void): () => void {
  listeners.add(cb);
  cb(snapshot());
  return () => listeners.delete(cb);
}

export async function initQueue(): Promise<void> {
  if (!isBrowser() || initialized) return;
  initialized = true;

  try {
    items = await idbAll();
  } catch {
    items = [];
  }
  emit();

  window.addEventListener("online", () => {
    emit();
    void flush();
  });
  window.addEventListener("offline", () => emit());

  window.setInterval(() => {
    if (navigator.onLine && items.some((it) => it.status === "pending")) void flush();
  }, 15000);

  void flush();
}

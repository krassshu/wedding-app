import {
  describeError,
  HttpError,
  isNetworkError,
  UploadAuthError,
  UploadValidationError,
  validateUploadFile,
} from "@/lib/errors";
import { createUploadPath, uploadPhoto } from "@/lib/photos";

export type QueueStatus = "pending" | "error";

export type QueueItem = {
  id: string;
  file: File;
  /** Docelowa ścieżka jest stała dla wszystkich ponowień. */
  path: string;
  bingoTaskId?: string;
  createdAt: number;
  attempts: number;
  status: QueueStatus;
  /** Komunikat po polsku, gotowy do pokazania gościowi. */
  error?: string;
};

export type QueueSnapshot = {
  items: QueueItem[];
  online: boolean;
  flushing: boolean;
  completedAt: number;
  uploadingId: string | null;
  progress: number;
  /** false = kolejka żyje tylko w pamięci, zamknięcie strony ją skasuje. */
  persistent: boolean;
};

const DB_NAME = "wedding-uploads";
const STORE = "pending";
const MAX_ATTEMPTS = 5;
const FLUSH_LOCK = "wedding-upload-flush";

let dbPromise: Promise<IDBDatabase> | null = null;
let items: QueueItem[] = [];
let flushing = false;
let completedAt = 0;
let initialized = false;
let uploadingId: string | null = null;
let progress = 0;
let persistent = true;
const listeners = new Set<(snap: QueueSnapshot) => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

/** Brak IndexedDB nie blokuje wysyłki — kolejka działa wtedy tylko w pamięci. */
function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!isBrowser() || !hasIndexedDb()) {
        reject(new Error("IndexedDB niedostępne"));
        return;
      }

      let req: IDBOpenDBRequest;
      try {
        req = indexedDB.open(DB_NAME, 1);
      } catch (err) {
        // Tryb prywatny w części przeglądarek rzuca już przy otwarciu bazy.
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Błąd IndexedDB"));
      req.onblocked = () => reject(new Error("Baza kolejki jest zablokowana"));
    });

    dbPromise.catch(() => {
      // Bez bazy kolejka nadal działa, ale tylko do zamknięcia strony.
      persistent = false;
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

/** Zapis do bazy nie może wywrócić wysyłki — w razie awarii gramy z pamięci. */
async function persistItem(item: QueueItem): Promise<void> {
  try {
    await idbPut(item);
  } catch {
    persistent = false;
    emit();
  }
}

async function forgetItem(id: string): Promise<void> {
  try {
    await idbDelete(id);
  } catch {
    persistent = false;
  }
}

function snapshot(): QueueSnapshot {
  return {
    items: items.slice().sort((a, b) => a.createdAt - b.createdAt),
    online: isBrowser() ? navigator.onLine : true,
    flushing,
    completedAt,
    uploadingId,
    progress,
    persistent,
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

export async function addToQueue(file: File, bingoTaskId?: string): Promise<void> {
  const problem = validateUploadFile(file);
  if (problem) throw new UploadValidationError(problem);

  const item: QueueItem = {
    id: randomId(),
    file,
    path: createUploadPath(file, bingoTaskId),
    bingoTaskId,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };
  items = [...items, item];
  emit();
  await persistItem(item);
  void flush();
}

async function syncWithPersistentQueue(): Promise<void> {
  if (!persistent) return;
  try {
    const raw = await idbAll();
    const stored = raw
      .filter(
        (item) =>
          Boolean(item) &&
          typeof item.id === "string" &&
          item.file instanceof Blob &&
          typeof item.file.name === "string",
      )
      .map((item) => ({
        ...item,
        path:
          typeof item.path === "string" && item.path
            ? item.path
            : createUploadPath(item.file, item.bingoTaskId),
      }));
    const upgraded = stored.filter(
      (item) => raw.find((candidate) => candidate.id === item.id)?.path !== item.path,
    );
    if (upgraded.length > 0) await Promise.all(upgraded.map(idbPut));
    const storedIds = new Set(stored.map((item) => item.id));
    const localIds = new Set(items.map((item) => item.id));
    items = [
      ...items.filter((item) => storedIds.has(item.id)),
      ...stored.filter((item) => !localIds.has(item.id)),
    ];
  } catch {
    persistent = false;
  }
}

function shouldStopImmediately(err: unknown): boolean {
  return (
    err instanceof HttpError &&
    [400, 401, 403, 404, 409, 413, 415].includes(err.status)
  );
}

async function flushUnlocked(): Promise<void> {
  if (!isBrowser() || flushing) return;
  if (!navigator.onLine) return;

  await syncWithPersistentQueue();

  const ready = items.filter((it) => it.status === "pending");
  if (ready.length === 0) return;

  flushing = true;
  emit();

  for (const item of ready) {
    // Plik mógł przepaść przy przywracaniu kolejki z bazy — nie ma czego wysyłać.
    if (!(item.file instanceof Blob) || item.file.size === 0) {
      const broken: QueueItem = {
        ...item,
        status: "error",
        error: "Plik nie jest już dostępny na urządzeniu. Dodaj go jeszcze raz.",
      };
      items = items.map((it) => (it.id === item.id ? broken : it));
      await persistItem(broken);
      emit();
      continue;
    }

    uploadingId = item.id;
    progress = 0;
    emit();

    try {
      await uploadPhoto(item.path, item.file, (fraction) => {
        if (fraction - progress < 0.02 && fraction < 1) return;
        progress = fraction;
        emit();
      });
      items = items.filter((it) => it.id !== item.id);
      await forgetItem(item.id);
      completedAt = Date.now();
      emit();
    } catch (err) {
      if (err instanceof UploadAuthError) {
        const waiting: QueueItem = { ...item, error: describeError(err) };
        items = items.map((it) => (it.id === item.id ? waiting : it));
        await persistItem(waiting);
        emit();
        break;
      }

      const networkError = isNetworkError(err);
      const attempts = item.attempts + 1;
      const next: QueueItem = {
        ...item,
        attempts,
        status:
          shouldStopImmediately(err) || (!networkError && attempts >= MAX_ATTEMPTS)
            ? "error"
            : "pending",
        error: describeError(err, "Nie udało się wysłać pliku."),
      };
      items = items.map((it) => (it.id === item.id ? next : it));
      await persistItem(next);
      emit();
      if (networkError) break;
    }
  }

  uploadingId = null;
  progress = 0;
  flushing = false;
  emit();
}

export async function flush(): Promise<void> {
  if (!isBrowser() || flushing || !navigator.onLine) return;

  if (navigator.locks) {
    await navigator.locks.request(
      FLUSH_LOCK,
      { mode: "exclusive", ifAvailable: true },
      async (lock) => {
        if (lock) await flushUnlocked();
      },
    );
    return;
  }

  await flushUnlocked();
}

export async function retry(id: string): Promise<void> {
  const item = items.find((it) => it.id === id);
  if (!item) return;
  const next: QueueItem = { ...item, status: "pending", attempts: 0, error: undefined };
  items = items.map((it) => (it.id === id ? next : it));
  await persistItem(next);
  emit();
  void flush();
}

export function retryAll(): void {
  items = items.map((it) =>
    it.status === "error" ? { ...it, status: "pending", attempts: 0, error: undefined } : it,
  );
  emit();
  void Promise.all(items.map(persistItem)).then(() => flush());
}

/** Usuwa pliki, których nie da się wysłać — gość sam decyduje, że odpuszcza. */
export function discardFailed(): void {
  const failed = items.filter((it) => it.status === "error");
  if (failed.length === 0) return;
  items = items.filter((it) => it.status !== "error");
  emit();
  void Promise.all(failed.map((it) => forgetItem(it.id)));
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
    const restored = await idbAll();
    // Gość mógł już coś dorzucić, zanim baza odpowiedziała — nie gubimy tego.
    const known = new Set(items.map((item) => item.id));
    items = [
      ...items,
      ...restored.filter(
        (item): item is QueueItem =>
          Boolean(item) &&
          typeof item.id === "string" &&
          !known.has(item.id) &&
          item.file instanceof Blob &&
          typeof item.file.name === "string",
      ).map((item) => ({
        ...item,
        path:
          typeof item.path === "string" && item.path
            ? item.path
            : createUploadPath(item.file, item.bingoTaskId),
      })),
    ];
  } catch {
    // Bez trwałej kolejki działamy dalej — informuje o tym flaga `persistent`.
    persistent = false;
  }
  emit();

  window.addEventListener("online", () => {
    emit();
    void flush();
  });
  window.addEventListener("offline", () => emit());
  window.addEventListener("upload-auth-granted", () => void flush());

  window.setInterval(() => {
    if (navigator.onLine && items.some((it) => it.status === "pending")) void flush();
  }, 15000);

  void flush();
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const MEDIA_TYPE = /^(image|video)\//i;

/** Błąd HTTP z serwera zdjęć — niesie status, żeby dało się go opisać po polsku. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Zerwane połączenie, brak internetu, przerwany transfer. */
export class NetworkError extends Error {
  constructor(message = "Brak połączenia z internetem.") {
    super(message);
    this.name = "NetworkError";
  }
}

/** Plik odrzucony jeszcze przed wysyłką — komunikat jest gotowy do pokazania. */
export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/** Brak zmiennych środowiskowych Supabase. */
export class ConfigError extends Error {
  constructor(
    message = "Aplikacja nie jest poprawnie skonfigurowana. Daj znać Parze Młodej.",
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/**
 * Sprawdza plik wybrany przez gościa. Zwraca polski komunikat albo null,
 * gdy plik nadaje się do wysłania.
 */
export function validateUploadFile(file: File | null | undefined): string | null {
  if (!file) return "Nie udało się odczytać wybranego pliku. Spróbuj ponownie.";

  if (typeof file.size !== "number" || Number.isNaN(file.size)) {
    return "Nie udało się odczytać wybranego pliku. Spróbuj ponownie.";
  }

  if (file.size === 0) {
    return "Wybrany plik jest pusty. Wybierz go jeszcze raz.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `Plik jest za duży (${formatBytes(file.size)}). Maksymalnie ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }

  // Część telefonów nie podaje typu pliku — wtedy nie blokujemy wysyłki.
  if (file.type && !MEDIA_TYPE.test(file.type)) {
    return "To nie jest zdjęcie ani film. Wybierz plik ze zdjęciem lub filmem.";
  }

  return null;
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function statusOf(err: unknown): number | null {
  if (err instanceof HttpError) return err.status;
  if (err && typeof err === "object") {
    const raw =
      (err as { status?: unknown }).status ??
      (err as { statusCode?: unknown }).statusCode;
    const status = typeof raw === "string" ? Number(raw) : raw;
    if (typeof status === "number" && Number.isFinite(status)) return status;
  }
  return null;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

/** Rozpoznaje błędy sieci — takie ponawiamy zamiast pokazywać jako awarię. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  if (isOffline()) return true;
  if (err instanceof TypeError) return true;

  const message = messageOf(err).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("timeout") ||
    message.includes("aborted")
  );
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Serwer odrzucił plik. Spróbuj wybrać inne zdjęcie.",
  401: "Brak uprawnień do zapisu zdjęć. Odśwież stronę i spróbuj ponownie.",
  403: "Brak uprawnień do zapisu zdjęć. Odśwież stronę i spróbuj ponownie.",
  404: "Nie znaleziono miejsca na zdjęcia na serwerze. Daj znać Parze Młodej.",
  409: "Taki plik już tam jest. Spróbuj wysłać go jeszcze raz.",
  413: "Plik jest za duży dla serwera. Wybierz mniejsze zdjęcie lub krótszy film.",
  415: "Ten format pliku nie jest obsługiwany.",
  429: "Za dużo prób naraz. Odczekaj chwilę i spróbuj ponownie.",
};

/**
 * Zamienia dowolny błąd na jedno zdanie po polsku, gotowe do pokazania gościowi.
 */
export function describeError(
  err: unknown,
  fallback = "Coś poszło nie tak. Spróbuj ponownie.",
): string {
  if (err instanceof UploadValidationError || err instanceof ConfigError) {
    return err.message;
  }

  if (isOffline()) {
    return "Brak internetu. Sprawdź połączenie i spróbuj ponownie.";
  }

  if (err instanceof NetworkError) {
    return "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
  }

  const status = statusOf(err);
  if (status !== null) {
    const known = STATUS_MESSAGES[status];
    if (known) return known;
    if (status >= 500) {
      return "Serwer zdjęć chwilowo nie odpowiada. Spróbuj ponownie za chwilę.";
    }
  }

  if (isNetworkError(err)) {
    return "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
  }

  const message = messageOf(err).toLowerCase();
  if (message.includes("quota") || message.includes("storage full")) {
    return "Brak miejsca w pamięci przeglądarki. Zwolnij miejsce i spróbuj ponownie.";
  }

  return fallback;
}

"use client";

import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pl">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <title>Coś poszło nie tak</title>

        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <h1 className="text-lg font-semibold">Aplikacja się zawiesiła</h1>
          <p className="text-sm leading-relaxed text-muted">
            Przepraszamy! Odśwież stronę, a jeśli błąd wróci — daj znać Parze
            Młodej.
          </p>

          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-lg bg-plum px-5 py-3 text-base font-medium text-white"
          >
            Spróbuj ponownie
          </button>

          {error.digest ? (
            <p className="text-xs text-muted">Kod błędu: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}

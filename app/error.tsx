"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import Button from "@/app/components/ui/Button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app] nieobsłużony błąd", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-plum/10 text-plum">
        <AlertTriangle size={20} />
      </span>

      <h1 className="text-lg font-semibold">Coś poszło nie tak</h1>
      <p className="text-sm leading-relaxed text-muted">
        Ta część aplikacji się nie wczytała. Spróbuj jeszcze raz — Twoje zdjęcia
        czekające w kolejce są bezpieczne.
      </p>

      <div className="flex w-full flex-col gap-2">
        <Button variant="solid" onClick={() => unstable_retry()}>
          Spróbuj ponownie
        </Button>
        <Link
          href="/"
          className="text-sm text-muted underline underline-offset-4"
        >
          Wróć na stronę główną
        </Link>
      </div>

      {error.digest ? (
        <p className="text-xs text-muted">Kod błędu: {error.digest}</p>
      ) : null}
    </div>
  );
}

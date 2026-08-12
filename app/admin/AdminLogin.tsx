"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Button from "@/app/components/ui/Button";
import Notice from "@/app/components/ui/Notice";
import { describeError } from "@/lib/errors";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (password.trim().length === 0) {
      setError("Podaj hasło.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.refresh();
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      setError(
        typeof data.error === "string" && data.error
          ? data.error
          : res.status >= 500
            ? "Serwer nie odpowiada. Spróbuj ponownie za chwilę."
            : "Nie udało się zalogować.",
      );
    } catch (err) {
      setError(describeError(err, "Nie udało się zalogować."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-plum/10 text-plum">
          <Lock size={20} />
        </span>
        <h1 className="text-lg font-semibold">Panel administratora</h1>
        <p className="text-sm text-muted">Zaloguj się, aby zarządzać zdjęciami.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Hasło"
          autoFocus
          className="rounded-lg border border-line bg-background px-4 py-3 text-base outline-none focus:border-plum"
        />
        <Button type="submit" variant="solid" disabled={busy || password.length === 0}>
          {busy ? "Logowanie…" : "Zaloguj"}
        </Button>
        {error ? <Notice>{error}</Notice> : null}
      </form>
    </div>
  );
}

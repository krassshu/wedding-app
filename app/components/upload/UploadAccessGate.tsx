"use client";

import { LockKeyhole } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import Button from "@/app/components/ui/Button";
import Notice from "@/app/components/ui/Notice";

type AccessState = "checking" | "authorized" | "required" | "unavailable";

export default function UploadAccessGate() {
  const [state, setState] = useState<AccessState>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/upload/access", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as {
          authorized?: unknown;
        };
        if (!active) return;
        if (!response.ok) setState("unavailable");
        else setState(data.authorized === true ? "authorized" : "required");
      })
      .catch(() => {
        if (active) setState("unavailable");
      });

    const requireAccess = () => setState("required");
    window.addEventListener("upload-auth-required", requireAccess);
    return () => {
      active = false;
      window.removeEventListener("upload-auth-required", requireAccess);
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (code.trim().length === 0) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/upload/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Nie udało się sprawdzić kodu.",
        );
        return;
      }

      setCode("");
      setState("authorized");
      window.dispatchEvent(new Event("upload-auth-granted"));
    } catch {
      setError("Brak połączenia z serwerem. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking" || state === "authorized") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 px-5 backdrop-blur">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-line bg-background p-6 shadow-xl">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-plum/10 text-plum">
            <LockKeyhole size={22} />
          </span>
          <h2 className="text-lg font-semibold">Kod weselny</h2>
          <p className="text-sm leading-relaxed text-muted">
            Podaj kod z zaproszenia. Dzięki temu zdjęcia mogą dodawać tylko nasi goście.
          </p>
        </div>

        {state === "unavailable" ? (
          <Notice onRetry={() => window.location.reload()} retryLabel="Odśwież">
            Wysyłanie zdjęć nie jest jeszcze skonfigurowane lub serwer nie odpowiada.
          </Notice>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              autoCapitalize="none"
              placeholder="Kod"
              aria-label="Kod weselny"
              className="rounded-xl border border-line bg-background px-4 py-3 text-center text-base outline-none focus:border-plum"
            />
            <Button type="submit" variant="solid" disabled={busy || code.trim().length === 0}>
              {busy ? "Sprawdzanie…" : "Wejdź"}
            </Button>
            {error ? <Notice>{error}</Notice> : null}
          </form>
        )}
      </div>
    </div>
  );
}


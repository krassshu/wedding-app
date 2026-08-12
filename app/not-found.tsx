import { Compass } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Nie znaleziono strony",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-plum/10 text-plum">
        <Compass size={20} />
      </span>

      <h1 className="text-lg font-semibold">Nie ma takiej strony</h1>
      <p className="text-sm leading-relaxed text-muted">
        Link mógł być nieaktualny albo zawierać literówkę.
      </p>

      <Link
        href="/"
        className="rounded-lg bg-plum px-5 py-3 text-base font-medium text-white"
      >
        Wróć na stronę główną
      </Link>
    </div>
  );
}

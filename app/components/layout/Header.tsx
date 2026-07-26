import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full pt-6 pb-2 px-4">
      <Link
        href="/"
        className="block text-center font-script text-3xl sm:text-4xl text-foreground"
      >
        Wesele Ani i Oskara
      </Link>
    </header>
  );
}

"use client";

import { Camera, Gamepad2, Images } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Zdjęcie", Icon: Camera },
  { href: "/bingo", label: "Bingo", Icon: Gamepad2 },
  { href: "/galeria", label: "Galeria", Icon: Images },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-line bg-background">
      <ul className="mx-auto flex w-full max-w-2xl">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full w-full flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  active ? "text-plum" : "text-muted"
                }`}
              >
                <Icon size={22} strokeWidth={1.6} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

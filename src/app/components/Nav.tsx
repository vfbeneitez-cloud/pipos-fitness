"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/week", label: "Semana" },
  { href: "/onboarding", label: "Perfil" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      aria-label="Navegación principal"
    >
      <ul className="flex justify-around py-2">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={`block px-4 py-2 text-sm font-medium ${
                pathname.startsWith(href)
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function NotificationBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((res) => {
        if (res.status === 404) return null;
        return res.json();
      })
      .then((data: { unreadCount?: number } | null) => {
        setCount(data?.unreadCount ?? null);
      })
      .catch(() => setCount(null));
  }, []);

  if (count === null) return null;

  return (
    <li>
      <Link
        href="/notifications"
        className="relative block px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
        aria-label={count > 0 ? `${count} notificaciones sin leer` : "Notificaciones"}
      >
        Notificaciones
        {count > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white"
            aria-hidden
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </li>
  );
}

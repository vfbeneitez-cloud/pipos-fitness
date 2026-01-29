"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDemoUserId } from "@/src/app/lib/demo";

const ONBOARDING = "/onboarding";

export function DemoGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [hasUserId, setHasUserId] = useState(false);

  useEffect(() => {
    const id = getDemoUserId();
    const timer = setTimeout(() => {
      setHasUserId(!!id);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    if (pathname === ONBOARDING) return;
    if (!hasUserId) router.replace(ONBOARDING);
  }, [ready, hasUserId, pathname, router]);

  if (pathname === ONBOARDING) return <>{children}</>;
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <p className="text-zinc-500">Cargando…</p>
      </div>
    );
  }

  return <>{children}</>;
}

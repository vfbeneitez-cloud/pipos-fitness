"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isDemoMode && status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (!isDemoMode && status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isDemoMode && status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}

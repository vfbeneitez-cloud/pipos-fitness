"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VerifyPage() {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/auth/signin");
  }, [router]);
  return null;
}

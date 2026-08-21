"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refetch periódico dos dados do server component pai (poll leve, sem estado próprio). */
export function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return null;
}

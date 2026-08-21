"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ClearNovoParam({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => {
      router.replace("/tickets");
    }, 4000);
    return () => clearTimeout(timeout);
  }, [active, router]);

  return null;
}

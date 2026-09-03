"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/** Some o parâmetro "novo" da URL depois de um tempo, preservando os demais filtros ativos. */
export function ClearNovoParam({ active }: { active: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      params.delete("novo");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 4000);
    return () => clearTimeout(timeout);
  }, [active, router, pathname]);

  return null;
}

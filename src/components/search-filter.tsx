"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Busca por texto livre, gravada num parâmetro de URL com debounce. */
export function SearchFilter({
  paramName,
  placeholder,
  className,
}: {
  paramName: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(() => searchParams.get(paramName) ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(novo: string) {
    setValor(novo);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (novo.trim()) params.set(paramName, novo.trim());
      else params.delete(paramName);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={valor}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? "Buscar..."}
        className="h-9 pl-8"
      />
    </div>
  );
}

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string; dotClassName?: string };

export function MultiSelectFilter({
  paramName,
  label,
  options,
  className,
}: {
  paramName: string;
  label: string;
  options: MultiSelectOption[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selecionados = new Set((searchParams.get(paramName) ?? "").split(",").filter(Boolean));

  function toggle(value: string, checked: boolean) {
    const proximo = new Set(selecionados);
    if (checked) proximo.add(value);
    else proximo.delete(value);

    const params = new URLSearchParams(searchParams.toString());
    if (proximo.size > 0) params.set(paramName, Array.from(proximo).join(","));
    else params.delete(paramName);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium hover:text-foreground",
          selecionados.size > 0 && "text-primary",
          className
        )}
      >
        {label}
        {selecionados.size > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 text-xs font-normal text-primary">
            {selecionados.size}
          </span>
        )}
        <ChevronDown className="size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o.value}
              checked={selecionados.has(o.value)}
              onCheckedChange={(checked) => toggle(o.value, checked === true)}
            >
              {o.dotClassName && (
                <span className={cn("inline-block size-2 shrink-0 rounded-full", o.dotClassName)} />
              )}
              {o.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

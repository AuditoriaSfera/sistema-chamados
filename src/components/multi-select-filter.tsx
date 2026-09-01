"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown, Check } from "lucide-react";
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

  const selecionadosIds = new Set((searchParams.get(paramName) ?? "").split(",").filter(Boolean));
  const selecionados = options.filter((o) => selecionadosIds.has(o.value));

  function handleChange(proximo: MultiSelectOption[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (proximo.length > 0) params.set(paramName, proximo.map((o) => o.value).join(","));
    else params.delete(paramName);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Combobox.Root
      items={options}
      multiple
      value={selecionados}
      onValueChange={handleChange}
      itemToStringLabel={(o) => o.label}
      itemToStringValue={(o) => o.value}
    >
      <Combobox.Trigger
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium hover:text-foreground",
          selecionados.length > 0 && "text-primary",
          className
        )}
      >
        {label}
        {selecionados.length > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 text-xs font-normal text-primary">
            {selecionados.length}
          </span>
        )}
        <ChevronDown className="size-3.5 shrink-0" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner align="start" sideOffset={4} className="isolate z-50 outline-none">
          <Combobox.Popup className="z-50 max-h-(--available-height) w-64 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="border-b border-border p-1.5">
              <Combobox.Input
                placeholder={`Buscar ${label.toLowerCase()}...`}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <Combobox.Empty className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto p-1">
              {(option: MultiSelectOption) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className="relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {option.dotClassName && (
                    <span className={cn("inline-block size-2 shrink-0 rounded-full", option.dotClassName)} />
                  )}
                  {option.label}
                  <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex items-center justify-center">
                    <Check className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

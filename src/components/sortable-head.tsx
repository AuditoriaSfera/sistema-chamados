import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Monta a URL preservando os demais parâmetros, trocando sort/dir. Primeiro clique ordena desc. */
export function sortHref(
  basePath: string,
  sp: Record<string, string | undefined>,
  campo: string
): string {
  const ativo = sp.sort === campo;
  const novaDirecao = ativo && sp.dir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "sort" && k !== "dir") params.set(k, v);
  }
  params.set("sort", campo);
  params.set("dir", novaDirecao);
  return `${basePath}?${params.toString()}`;
}

/** Ícone de ordenação isolado — usado ao lado de um MultiSelectFilter no mesmo cabeçalho. */
export function SortToggle({
  basePath,
  sp,
  campo,
}: {
  basePath: string;
  sp: Record<string, string | undefined>;
  campo: string;
}) {
  const ativo = sp.sort === campo;
  const Icone = ativo ? (sp.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <Link
      href={sortHref(basePath, sp, campo)}
      scroll={false}
      className={cn(
        "inline-flex items-center text-muted-foreground hover:text-foreground",
        ativo && "text-primary"
      )}
      aria-label="Ordenar"
    >
      <Icone className="size-3.5" />
    </Link>
  );
}

/** Cabeçalho de coluna inteiro clicável para ordenar — usado quando não há filtro na mesma coluna. */
export function SortableHead({
  basePath,
  sp,
  campo,
  children,
}: {
  basePath: string;
  sp: Record<string, string | undefined>;
  campo: string;
  children: React.ReactNode;
}) {
  const ativo = sp.sort === campo;
  return (
    <TableHead className="text-center">
      <Link
        href={sortHref(basePath, sp, campo)}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 hover:underline",
          ativo && "text-primary"
        )}
      >
        {children}
        {ativo && <span className="text-xs">{sp.dir === "asc" ? "▲" : "▼"}</span>}
      </Link>
    </TableHead>
  );
}

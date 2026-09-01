import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CAMPOS_PROPRIOS = ["de", "ate", "periodo"];

function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasAtras(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoLocal(d);
}

/**
 * Atalhos de período (Todos/Hoje/7/15/30 dias) + opção "Personalizado" que
 * revela o formulário manual de De/Até. Tudo via link (sem JS de cliente),
 * reaproveitado no Monitoramento e nos Relatórios.
 */
export function DateRangeFilter({
  basePath,
  sp,
}: {
  basePath: string;
  sp: Record<string, string | undefined>;
}) {
  const hoje = isoLocal(new Date());
  const presets = [
    { key: "todos", label: "Todos", de: undefined as string | undefined, ate: undefined as string | undefined },
    { key: "hoje", label: "Hoje", de: hoje, ate: hoje },
    { key: "7d", label: "Últimos 7 dias", de: diasAtras(6), ate: hoje },
    { key: "15d", label: "Últimos 15 dias", de: diasAtras(14), ate: hoje },
    { key: "30d", label: "Últimos 30 dias", de: diasAtras(29), ate: hoje },
  ];

  function hrefFor(de: string | undefined, ate: string | undefined, personalizado = false) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "de" && k !== "ate" && k !== "periodo") params.set(k, v);
    }
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    if (personalizado) params.set("periodo", "personalizado");
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  const presetAtivo = presets.find(
    (p) => (p.de ?? "") === (sp.de ?? "") && (p.ate ?? "") === (sp.ate ?? "")
  );
  const personalizadoAtivo = sp.periodo === "personalizado" || (!presetAtivo && !!(sp.de || sp.ate));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((p) => {
          const ativo = !personalizadoAtivo && presetAtivo?.key === p.key;
          return (
            <Link
              key={p.key}
              href={hrefFor(p.de, p.ate)}
              scroll={false}
              className={buttonVariants({ variant: ativo ? "default" : "outline", size: "sm" })}
            >
              {p.label}
            </Link>
          );
        })}
        <Link
          href={hrefFor(sp.de, sp.ate, true)}
          scroll={false}
          className={buttonVariants({ variant: personalizadoAtivo ? "default" : "outline", size: "sm" })}
        >
          Personalizado
        </Link>
      </div>

      {personalizadoAtivo && (
        <form method="get" action={basePath} className="flex flex-wrap items-end gap-3">
          {Object.entries(sp)
            .filter(([k, v]) => v && !CAMPOS_PROPRIOS.includes(k))
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" name="de" defaultValue={sp.de ?? ""} className="w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" name="ate" defaultValue={sp.ate ?? ""} className="w-36" />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Filtrar
          </Button>
        </form>
      )}
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelectFilter } from "@/components/multi-select-filter";

const CAMPOS_PROPRIOS = ["de", "ate"];

export function ReportFilters({
  pdvs,
  servicos,
  searchParams,
}: {
  pdvs: { id: string; codigo: string }[];
  servicos: { id: string; nome: string }[];
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-4 pt-6">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">PDV</label>
          <div className="flex h-9 items-center rounded-md border border-input px-3">
            <MultiSelectFilter
              paramName="pdvId"
              label="Todos"
              options={pdvs.map((p) => ({ value: p.id, label: p.codigo }))}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Serviço</label>
          <div className="flex h-9 items-center rounded-md border border-input px-3">
            <MultiSelectFilter
              paramName="servicoId"
              label="Todos"
              options={servicos.map((s) => ({ value: s.id, label: s.nome }))}
            />
          </div>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3">
          {Object.entries(searchParams)
            .filter(([k, v]) => v && !CAMPOS_PROPRIOS.includes(k))
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" name="de" defaultValue={searchParams.de ?? ""} className="w-36" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" name="ate" defaultValue={searchParams.ate ?? ""} className="w-36" />
          </div>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import { DateRangeFilter } from "@/components/date-range-filter";
import { SEM_RESPONSAVEL_VALUE } from "@/lib/tickets";

export function ReportFilters({
  pdvs,
  servicos,
  solicitantes,
  operadores,
  searchParams,
}: {
  pdvs: { id: string; codigo: string }[];
  servicos: { id: string; nome: string }[];
  solicitantes: { id: string; nome: string }[];
  operadores: { id: string; nome: string }[];
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-end gap-4">
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
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Solicitante</label>
            <div className="flex h-9 items-center rounded-md border border-input px-3">
              <MultiSelectFilter
                paramName="solicitanteId"
                label="Todos"
                options={solicitantes.map((u) => ({ value: u.id, label: u.nome }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Responsável</label>
            <div className="flex h-9 items-center rounded-md border border-input px-3">
              <MultiSelectFilter
                paramName="operadorId"
                label="Todos"
                options={[
                  { value: SEM_RESPONSAVEL_VALUE, label: "Sem responsável" },
                  ...operadores.map((u) => ({ value: u.id, label: u.nome })),
                ]}
              />
            </div>
          </div>
        </div>
        <DateRangeFilter basePath="/relatorios" sp={searchParams} />
      </CardContent>
    </Card>
  );
}

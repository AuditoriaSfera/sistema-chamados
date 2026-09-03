import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/date-range-filter";

const CAMPOS_PROPRIOS = ["numero", "pedido", "codigoRevendedor"];

export function TicketFilters({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          {Object.entries(searchParams)
            .filter(([k, v]) => v && !CAMPOS_PROPRIOS.includes(k))
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nº do chamado</label>
            <Input
              type="text"
              name="numero"
              placeholder="Ex: 0001"
              defaultValue={searchParams.numero ?? ""}
              className="w-28 placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nº do pedido</label>
            <Input
              type="text"
              name="pedido"
              placeholder="Ex: 6544"
              defaultValue={searchParams.pedido ?? ""}
              className="w-32 placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Código do revendedor</label>
            <Input
              type="text"
              name="codigoRevendedor"
              placeholder="Ex: 7889"
              defaultValue={searchParams.codigoRevendedor ?? ""}
              className="w-36 placeholder:text-muted-foreground/40"
            />
          </div>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
          <Link href="/tickets" className={buttonVariants({ variant: "ghost" })}>
            Limpar
          </Link>
        </form>
        <DateRangeFilter basePath="/tickets" sp={searchParams} />
      </CardContent>
    </Card>
  );
}

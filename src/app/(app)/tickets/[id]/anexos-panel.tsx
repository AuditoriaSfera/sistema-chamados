import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Anexo = { id: string; nomeArquivo: string; tipo: string; tamanho: number };

export function AnexosPanel({ anexos }: { anexos: Anexo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anexos</CardTitle>
      </CardHeader>
      <CardContent>
        {anexos.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {anexos.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/anexos/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {a.nomeArquivo}
                </a>{" "}
                <span className="text-xs text-muted-foreground">
                  ({a.tipo.toLowerCase()}, {(a.tamanho / 1024 / 1024).toFixed(1)}MB)
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
        )}
      </CardContent>
    </Card>
  );
}

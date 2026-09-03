import { FileText, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnexoImagem } from "./anexo-imagem";

type Anexo = { id: string; nomeArquivo: string; tipo: string; tamanho: number };

export function AnexosPanel({ anexos }: { anexos: Anexo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anexos</CardTitle>
      </CardHeader>
      <CardContent>
        {anexos.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {anexos.map((a) =>
              a.tipo === "IMAGEM" ? (
                <AnexoImagem key={a.id} id={a.id} nomeArquivo={a.nomeArquivo} />
              ) : (
                <a
                  key={a.id}
                  href={`/api/anexos/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={a.nomeArquivo}
                  className="flex w-56 items-center gap-2 rounded-lg border border-black/10 bg-black/5 p-2 text-xs"
                >
                  {a.tipo === "VIDEO" ? (
                    <Video className="size-5 shrink-0" />
                  ) : (
                    <FileText className="size-5 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{a.nomeArquivo}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {(a.tamanho / 1024 / 1024).toFixed(1)}MB
                  </span>
                </a>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum anexo.</p>
        )}
      </CardContent>
    </Card>
  );
}

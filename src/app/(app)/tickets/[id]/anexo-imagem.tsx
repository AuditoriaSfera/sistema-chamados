"use client";

import { useState } from "react";
import { FileWarning } from "lucide-react";

/** Miniatura de anexo-imagem, com fallback pra quando o arquivo já não existe mais no disco. */
export function AnexoImagem({ id, nomeArquivo }: { id: string; nomeArquivo: string }) {
  const [indisponivel, setIndisponivel] = useState(false);

  if (indisponivel) {
    return (
      <div
        className="flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-center text-[11px] italic text-muted-foreground"
        title={nomeArquivo}
      >
        <FileWarning className="size-5 shrink-0" />
        <span className="line-clamp-2">{nomeArquivo}</span>
      </div>
    );
  }

  return (
    <a href={`/api/anexos/${id}`} target="_blank" rel="noopener noreferrer" title={nomeArquivo}>
      <img
        src={`/api/anexos/${id}`}
        alt={nomeArquivo}
        onError={() => setIndisponivel(true)}
        className="h-32 w-32 rounded-lg border object-cover"
      />
    </a>
  );
}

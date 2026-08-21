"use client";

import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setUsuarioPdvVinculoTodos } from "../actions";
import { PdvVinculoCheckbox } from "./pdv-vinculo-checkbox";

export function PdvVinculoBusca({
  usuarioId,
  pdvs,
  vinculadasIds,
}: {
  usuarioId: string;
  pdvs: { id: string; codigo: string; nome: string }[];
  vinculadasIds: string[];
}) {
  const [busca, setBusca] = useState("");
  const [pending, startTransition] = useTransition();
  const vinculadas = new Set(vinculadasIds);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pdvs;
    return pdvs.filter(
      (pdv) => pdv.codigo.toLowerCase().includes(termo) || pdv.nome.toLowerCase().includes(termo)
    );
  }, [busca, pdvs]);

  const marcarTodos = (vinculado: boolean) => {
    startTransition(() =>
      setUsuarioPdvVinculoTodos(
        usuarioId,
        filtradas.map((pdv) => pdv.id),
        vinculado
      )
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar PDV por código ou nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1"
        />
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || filtradas.length === 0}
            onClick={() => marcarTodos(true)}
          >
            Marcar todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || filtradas.length === 0}
            onClick={() => marcarTodos(false)}
          >
            Desmarcar todos
          </Button>
        </div>
      </div>
      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
        {filtradas.map((pdv) => (
          <PdvVinculoCheckbox
            key={pdv.id}
            usuarioId={usuarioId}
            pdvId={pdv.id}
            label={`${pdv.codigo} — ${pdv.nome}`}
            vinculado={vinculadas.has(pdv.id)}
          />
        ))}
        {filtradas.length === 0 && (
          <p className="col-span-2 text-sm text-muted-foreground sm:col-span-3">
            Nenhum PDV encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

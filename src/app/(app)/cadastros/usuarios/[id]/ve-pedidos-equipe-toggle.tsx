"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { setUsuarioVePedidosDaEquipe } from "../actions";
import { useTransition } from "react";

export function VePedidosEquipeToggle({
  usuarioId,
  valor,
}: {
  usuarioId: string;
  valor: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={valor}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(() => setUsuarioVePedidosDaEquipe(usuarioId, checked === true))
        }
      />
      Vê chamados abertos por toda a equipe (não só os próprios)
    </label>
  );
}

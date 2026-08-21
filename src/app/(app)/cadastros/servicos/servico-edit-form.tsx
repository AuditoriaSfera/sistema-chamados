"use client";

import { useActionState, useState } from "react";
import { updateServico } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIA_LABELS, CATEGORIAS_SERVICO, type CategoriaServico } from "@/lib/constants";
import { formatarDuracaoSla } from "@/lib/sla-format";

type SlaPreset = { id: string; nome: string; duracao: number; unidade: string };

export function ServicoEditForm({
  servico,
  slaPresets,
  defaultOpen,
}: {
  servico: {
    id: string;
    nome: string;
    categoria: string;
    textoOrientacao: string | null;
    slaPresetId: string;
  };
  slaPresets: SlaPreset[];
  defaultOpen?: boolean;
}) {
  const [editando, setEditando] = useState(defaultOpen ?? false);
  const [state, formAction, pending] = useActionState(updateServico, undefined);
  const [stateProcessado, setStateProcessado] = useState(state);

  if (state !== stateProcessado) {
    setStateProcessado(state);
    if (state && !state.error) setEditando(false);
  }

  if (!editando) {
    return (
      <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
        Editar
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Editar serviço</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="servicoId" value={servico.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nome">Nome do serviço</Label>
              <Input id="edit-nome" name="nome" defaultValue={servico.nome} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Select
                name="categoria"
                required
                defaultValue={servico.categoria}
                items={CATEGORIA_LABELS}
              >
                <SelectTrigger id="edit-categoria" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_SERVICO.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIA_LABELS[c as CategoriaServico]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-textoOrientacao">Descreva o ocorrido</Label>
            <Textarea
              id="edit-textoOrientacao"
              name="textoOrientacao"
              rows={2}
              defaultValue={servico.textoOrientacao ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-slaPresetId">SLA</Label>
              <Select
                name="slaPresetId"
                required
                defaultValue={servico.slaPresetId}
                items={Object.fromEntries(
                  slaPresets.map((s) => [s.id, `${s.nome} — ${formatarDuracaoSla(s.duracao, s.unidade)}`])
                )}
              >
                <SelectTrigger id="edit-slaPresetId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slaPresets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} — {formatarDuracaoSla(s.duracao, s.unidade)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState, useRef, useEffect } from "react";
import { createServico } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarDuracaoSla } from "@/lib/sla-format";

type SlaPreset = { id: string; nome: string; duracao: number; unidade: string };

export function ServicoCreateForm({
  slaPresets,
  onSuccess,
}: {
  slaPresets: SlaPreset[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(createServico, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome do serviço</Label>
        <Input id="nome" name="nome" placeholder="Atraso na entrega" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="textoOrientacao">Descreva o ocorrido</Label>
        <Textarea id="textoOrientacao" name="textoOrientacao" rows={2} />
      </div>
      <div className="space-y-1.5 w-64">
        <Label htmlFor="slaPresetId">SLA</Label>
        <Select
          name="slaPresetId"
          defaultValue={slaPresets[0]?.id}
          required
          items={Object.fromEntries(
            slaPresets.map((s) => [s.id, `${s.nome} — ${formatarDuracaoSla(s.duracao, s.unidade)}`])
          )}
        >
          <SelectTrigger id="slaPresetId" className="w-full">
            <SelectValue placeholder="Selecione o SLA" />
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
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Adicionar serviço"}
      </Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

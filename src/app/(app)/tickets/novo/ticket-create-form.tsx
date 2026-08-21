"use client";

import { useActionState, useMemo, useState } from "react";
import { createChamado, type CreateChamadoState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANEXO_MAX_QUANTIDADE } from "@/lib/constants";
import { formatarDuracaoSla } from "@/lib/sla-format";
import { AnexosField } from "@/components/anexos-field";

type Servico = {
  id: string;
  nome: string;
  textoOrientacao: string | null;
  slaPreset: { nome: string; duracao: number; unidade: string };
};
type Pdv = { id: string; codigo: string; nome: string };

export function TicketCreateForm({
  servicos,
  pdvs,
  abertoPorEmail,
  abertoPorNome,
}: {
  servicos: Servico[];
  pdvs: Pdv[];
  abertoPorEmail: string;
  abertoPorNome: string;
}) {
  const [state, formAction, pending] = useActionState<CreateChamadoState, FormData>(
    createChamado,
    undefined
  );
  const [servicoId, setServicoId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [descricaoDirty, setDescricaoDirty] = useState(false);
  const [servicoIdProcessado, setServicoIdProcessado] = useState(servicoId);

  const servicoSelecionado = useMemo(
    () => servicos.find((s) => s.id === servicoId),
    [servicos, servicoId]
  );

  if (servicoId !== servicoIdProcessado) {
    setServicoIdProcessado(servicoId);
    if (!descricaoDirty) setDescricao(servicoSelecionado?.textoOrientacao ?? "");
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* 1. PDV */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label htmlFor="pdvId">1. PDV que irá atender</Label>
          <Select
            name="pdvId"
            required
            items={Object.fromEntries(pdvs.map((p) => [p.id, `${p.codigo} — ${p.nome}`]))}
          >
            <SelectTrigger id="pdvId" className="w-full">
              <SelectValue placeholder="Selecione o PDV" />
            </SelectTrigger>
            <SelectContent>
              {pdvs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.codigo} — {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 2. Quem abre + Solicitante */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label>2. Quem está abrindo o chamado</Label>
          <Input value={abertoPorEmail} disabled />
          <p className="text-xs text-muted-foreground">{abertoPorNome}</p>

          <Label htmlFor="nomeSolicitante">Nome do solicitante</Label>
          <Input id="nomeSolicitante" name="nomeSolicitante" required />
        </CardContent>
      </Card>

      {/* 3. Serviço */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label htmlFor="servicoId">3. Serviço / tipo de ocorrência</Label>
          <Select
            name="servicoId"
            required
            items={Object.fromEntries(servicos.map((s) => [s.id, s.nome]))}
            onValueChange={(v) => setServicoId((v as string | null) ?? "")}
          >
            <SelectTrigger id="servicoId" className="w-full">
              <SelectValue placeholder="Selecione o serviço" />
            </SelectTrigger>
            <SelectContent>
              {servicos.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 4. Cliente + Revendedor + Pedido */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label htmlFor="nomeCliente">4. Nome do revendedor</Label>
          <Input id="nomeCliente" name="nomeCliente" required />

          <Label htmlFor="codigoRevendedor">Código do revendedor</Label>
          <Input id="codigoRevendedor" name="codigoRevendedor" required />

          <Label htmlFor="numeroPedido">Número do pedido</Label>
          <Input id="numeroPedido" name="numeroPedido" required />
        </CardContent>
      </Card>

      {/* 5. Texto livre complementar */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label htmlFor="motivoLivre">5. Descrição complementar</Label>
          <Textarea
            id="motivoLivre"
            name="motivoLivre"
            rows={4}
            required
            value={descricao}
            onChange={(e) => {
              setDescricao(e.target.value);
              setDescricaoDirty(true);
            }}
          />
        </CardContent>
      </Card>

      {/* 6. Anexos */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Label>6. Anexos (imagem, PDF ou vídeo — até {ANEXO_MAX_QUANTIDADE})</Label>
          <AnexosField />
        </CardContent>
      </Card>

      {/* SLA herdado do serviço (informativo) */}
      {servicoSelecionado && (
        <p className="text-sm text-muted-foreground">
          SLA do serviço:{" "}
          <strong>
            {formatarDuracaoSla(servicoSelecionado.slaPreset.duracao, servicoSelecionado.slaPreset.unidade)}
          </strong>
        </p>
      )}

      {state?.duplicado && (
        <Card className="border-destructive">
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm text-destructive">
              Já existe um chamado aberto para esse pedido e serviço (status:{" "}
              {state.duplicado.status}).
            </p>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="confirmarDuplicado" />
              Confirmo que quero abrir mesmo assim
            </label>
          </CardContent>
        </Card>
      )}

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Abrindo..." : "Abrir chamado"}
      </Button>
    </form>
  );
}

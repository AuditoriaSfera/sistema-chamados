"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { canOpenTicket } from "@/lib/permissions";
import {
  computeSlaVencimento,
  findChamadoDuplicado,
  resolveResponsavelAutomatico,
  resolveRoteamento,
} from "@/lib/tickets";
import { validateAnexo, saveAnexo } from "@/lib/uploads";
import { ANEXO_MAX_QUANTIDADE } from "@/lib/constants";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  servicoId: z.string().min(1),
  pdvId: z.string().min(1),
  numeroPedido: z.string().min(1),
  nomeCliente: z.string().min(1),
  codigoRevendedor: z.string().min(1),
  nomeSolicitante: z.string().min(1),
  motivoLivre: z.string().min(1),
  confirmarDuplicado: z.string().optional(),
});

export type CreateChamadoState = {
  error?: string;
  duplicado?: { chamadoId: string; status: string };
} | undefined;

export async function createChamado(
  _prevState: CreateChamadoState,
  formData: FormData
): Promise<CreateChamadoState> {
  const user = await requireUser();
  if (!canOpenTicket(user)) return { error: "Seu perfil não pode abrir chamados." };

  const parsed = schema.safeParse({
    servicoId: formData.get("servicoId"),
    pdvId: formData.get("pdvId"),
    numeroPedido: formData.get("numeroPedido"),
    nomeCliente: formData.get("nomeCliente"),
    codigoRevendedor: formData.get("codigoRevendedor"),
    nomeSolicitante: formData.get("nomeSolicitante"),
    motivoLivre: formData.get("motivoLivre"),
    confirmarDuplicado: formData.get("confirmarDuplicado") || undefined,
  });
  if (!parsed.success) return { error: "Preencha todos os campos obrigatórios." };
  const data = parsed.data;

  const servico = await prisma.servico.findUnique({ where: { id: data.servicoId } });
  if (!servico) return { error: "Serviço inválido." };

  const pdvSelecionado = await prisma.pdv.findUnique({ where: { id: data.pdvId } });
  if (!pdvSelecionado) return { error: "PDV inválido." };

  const anexos = formData.getAll("anexos").filter((f): f is File => f instanceof File && f.size > 0);
  if (anexos.length > ANEXO_MAX_QUANTIDADE) {
    return { error: `Máximo de ${ANEXO_MAX_QUANTIDADE} anexos por chamado.` };
  }
  for (const file of anexos) {
    const err = validateAnexo(file);
    if (err) return { error: err };
  }

  const pedido = await prisma.pedido.upsert({
    where: { numero: data.numeroPedido },
    update: {},
    create: {
      numero: data.numeroPedido,
      pdvId: data.pdvId,
      nomeCliente: data.nomeCliente,
      codigoRevendedor: data.codigoRevendedor,
    },
  });
  if (pedido.pdvId !== data.pdvId) {
    return { error: "Esse número de pedido já existe vinculado a outro PDV." };
  }

  const duplicado = await findChamadoDuplicado(pedido.id, data.servicoId);
  if (duplicado && !data.confirmarDuplicado) {
    return { duplicado: { chamadoId: duplicado.id, status: duplicado.status } };
  }

  const { pdv, semOperadorNoMomento } = await resolveRoteamento(pedido.id);
  const slaVencimentoEm = await computeSlaVencimento(servico.id, pdv.id);
  const responsavelId = await resolveResponsavelAutomatico(pdv.id);

  const contador = await prisma.chamadoContador.update({
    where: { id: "geral" },
    data: { valor: { increment: 1 } },
  });

  const chamado = await prisma.chamado.create({
    data: {
      numero: contador.valor,
      pedidoId: pedido.id,
      pdvId: pdv.id,
      servicoId: servico.id,
      motivoLivre: data.motivoLivre,
      nomeSolicitante: data.nomeSolicitante,
      abertoPorId: user.id,
      responsavelId,
      slaPresetId: servico.slaPresetId,
      slaVencimentoEm,
      semOperadorNoMomento,
      status: "ABERTO",
    },
  });

  await prisma.statusHistorico.create({
    data: { chamadoId: chamado.id, status: "ABERTO", texto: "Chamado aberto.", usuarioId: user.id },
  });

  for (const file of anexos) {
    const saved = await saveAnexo(chamado.id, file);
    await prisma.anexo.create({
      data: { chamadoId: chamado.id, autorId: user.id, ...saved },
    });
  }

  redirect(`/tickets?novo=${chamado.id}`);
}

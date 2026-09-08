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
import { capitalizarNome } from "@/lib/utils";
import { redirect } from "next/navigation";
import { z } from "zod";

const APENAS_NUMEROS = /^\d+$/;

const schema = z.object({
  servicoId: z.string().min(1),
  pdvId: z.string().min(1),
  // Validado condicionalmente depois de saber se o serviço exige pedido —
  // serviço que não exige (Servico.exigeNumeroPedido) grava "0" direto,
  // então aqui só passa o que veio, sem exigir formato.
  numeroPedido: z.string().optional().default(""),
  nomeCliente: z.string().min(1).transform(capitalizarNome),
  codigoRevendedor: z
    .string()
    .regex(APENAS_NUMEROS, "Código do revendedor: apenas números, sem pontos ou letras."),
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
    motivoLivre: formData.get("motivoLivre"),
    confirmarDuplicado: formData.get("confirmarDuplicado") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Preencha todos os campos obrigatórios." };
  }
  const data = parsed.data;

  const servico = await prisma.servico.findUnique({ where: { id: data.servicoId } });
  if (!servico) return { error: "Serviço inválido." };

  // Serviço que não tem relação com um pedido específico (ex.: alteração de
  // dados cadastrais) grava "0" direto, sem exigir que o número seja digitado.
  const numeroPedido = servico.exigeNumeroPedido ? data.numeroPedido : "0";
  if (servico.exigeNumeroPedido && !APENAS_NUMEROS.test(numeroPedido)) {
    return { error: "Número do pedido: apenas números, sem pontos ou letras." };
  }

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

  // Número de pedido pode se repetir de propósito (ex.: placeholder "000000"
  // quando o atendente não tem o número real, ou "0" fixo pra serviço que não
  // exige pedido) — nesse caso não é o "mesmo pedido" só porque o número
  // bate, então sempre grava o nome/código de revendedor recém-digitado em
  // vez de manter o que já estava salvo. Sem isso, um chamado novo ficava
  // silenciosamente com os dados de revendedor de quem abriu o primeiro
  // chamado com aquele número.
  //
  // Serviço sem exigência de pedido também não trava o PDV do "0" nem
  // verifica duplicidade — o "0" é compartilhado por qualquer PDV/cliente de
  // propósito, não identifica um pedido real.
  const pedido = await prisma.pedido.upsert({
    where: { numero: numeroPedido },
    update: {
      nomeCliente: data.nomeCliente,
      codigoRevendedor: data.codigoRevendedor,
      ...(servico.exigeNumeroPedido ? {} : { pdvId: data.pdvId }),
    },
    create: {
      numero: numeroPedido,
      pdvId: data.pdvId,
      nomeCliente: data.nomeCliente,
      codigoRevendedor: data.codigoRevendedor,
    },
  });
  if (servico.exigeNumeroPedido && pedido.pdvId !== data.pdvId) {
    return { error: "Esse número de pedido já existe vinculado a outro PDV." };
  }

  const duplicado = servico.exigeNumeroPedido
    ? await findChamadoDuplicado(pedido.id, data.servicoId)
    : null;
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
      nomeSolicitante: user.nome,
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

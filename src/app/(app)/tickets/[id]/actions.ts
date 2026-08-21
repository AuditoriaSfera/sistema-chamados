"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  canAccessChamado,
  canCancelOrReopenAny,
  canCancelOrReopenOwn,
  canChangeStatus,
  canRespondChat,
} from "@/lib/permissions";
import { STATUS_FINAIS, ANEXO_MAX_QUANTIDADE } from "@/lib/constants";
import { validateAnexo, saveAnexo, deleteAnexoFile } from "@/lib/uploads";

const PRAZO_APAGAR_MS = 60_000;
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function loadChamadoOrThrow(chamadoId: string) {
  const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
  if (!chamado) throw new Error("Chamado não encontrado.");
  return chamado;
}

export async function enviarMensagem(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const chamadoId = formData.get("chamadoId") as string;
  const texto = (formData.get("texto") as string)?.trim();
  const anexos = formData.getAll("anexos").filter((f): f is File => f instanceof File && f.size > 0);

  if (!texto && anexos.length === 0) return { error: "Mensagem vazia." };
  if (anexos.length > ANEXO_MAX_QUANTIDADE) {
    return { error: `Máximo de ${ANEXO_MAX_QUANTIDADE} anexos por mensagem.` };
  }
  for (const file of anexos) {
    const err = validateAnexo(file);
    if (err) return { error: err };
  }

  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) return { error: "Sem acesso a este chamado." };

  if (!canRespondChat(user)) return { error: "Seu perfil não pode responder no chat." };
  if (user.escopoChamados === "PROPRIOS" && chamado.abertoPorId !== user.id) {
    return { error: "Você só pode responder em chamados que você abriu." };
  }

  const retomaAutomatica =
    user.escopoChamados === "PROPRIOS" && chamado.status === "AGUARDANDO_SOLICITANTE";

  const mensagem = await prisma.mensagem.create({
    data: { chamadoId, autorId: user.id, texto: texto || "" },
  });

  if (retomaAutomatica) {
    await prisma.$transaction([
      prisma.chamado.update({
        where: { id: chamadoId },
        data: { status: "EM_ANDAMENTO" },
      }),
      prisma.statusHistorico.create({
        data: {
          chamadoId,
          status: "EM_ANDAMENTO",
          texto: "Retomado automaticamente: solicitante respondeu.",
          usuarioId: user.id,
        },
      }),
    ]);
  }

  for (const file of anexos) {
    const saved = await saveAnexo(chamadoId, file);
    await prisma.anexo.create({
      data: { chamadoId, mensagemId: mensagem.id, autorId: user.id, ...saved },
    });
  }

  revalidatePath(`/tickets/${chamadoId}`);
  revalidatePath("/tickets");
  return {};
}

export async function responderSolicitante(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const chamadoId = formData.get("chamadoId") as string;
  const texto = (formData.get("texto") as string)?.trim();

  if (!texto) return { error: "Informe a resposta." };

  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) return { error: "Sem acesso a este chamado." };

  if (chamado.status !== "AGUARDANDO_SOLICITANTE") {
    return { error: "Este chamado não está aguardando retorno do solicitante." };
  }
  if (!(user.escopoChamados === "PROPRIOS" && chamado.abertoPorId === user.id)) {
    return { error: "Apenas o solicitante que abriu o chamado pode responder aqui." };
  }

  await prisma.$transaction([
    prisma.chamado.update({
      where: { id: chamadoId },
      data: { status: "EM_ANDAMENTO" },
    }),
    prisma.statusHistorico.create({
      data: { chamadoId, status: "EM_ANDAMENTO", texto, usuarioId: user.id },
    }),
  ]);

  revalidatePath(`/tickets/${chamadoId}`);
  revalidatePath("/tickets");
  return {};
}

export async function marcarMensagensComoLidas(chamadoId: string) {
  const user = await requireUser();
  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) return;

  await prisma.mensagem.updateMany({
    where: { chamadoId, autorId: { not: user.id }, lidoEm: null },
    data: { lidoEm: new Date() },
  });

  revalidatePath(`/tickets/${chamadoId}`);
  revalidatePath("/tickets");
}

export async function apagarMensagem(chamadoId: string, mensagemId: string) {
  const user = await requireUser();
  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) throw new Error("Sem acesso a este chamado.");

  const mensagem = await prisma.mensagem.findUnique({
    where: { id: mensagemId },
    include: { anexos: true },
  });
  if (!mensagem || mensagem.chamadoId !== chamadoId) throw new Error("Mensagem não encontrada.");
  if (mensagem.autorId !== user.id) throw new Error("Você só pode apagar suas próprias mensagens.");
  if (Date.now() - mensagem.createdAt.getTime() > PRAZO_APAGAR_MS) {
    throw new Error("Prazo para apagar a mensagem expirou.");
  }

  const agora = new Date();
  for (const anexo of mensagem.anexos) {
    await deleteAnexoFile(anexo.path);
  }
  await prisma.$transaction([
    prisma.anexo.updateMany({
      where: { mensagemId },
      data: { apagadoEm: agora },
    }),
    prisma.mensagem.update({
      where: { id: mensagemId },
      data: { texto: "", apagadaEm: agora },
    }),
  ]);

  revalidatePath(`/tickets/${chamadoId}`);
  revalidatePath("/tickets");
}

export async function apagarAnexoMensagem(chamadoId: string, anexoId: string) {
  const user = await requireUser();
  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) throw new Error("Sem acesso a este chamado.");

  const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
  if (!anexo || anexo.chamadoId !== chamadoId || !anexo.mensagemId) {
    throw new Error("Anexo não encontrado.");
  }
  if (anexo.autorId !== user.id) throw new Error("Você só pode apagar seus próprios anexos.");
  if (Date.now() - anexo.createdAt.getTime() > PRAZO_APAGAR_MS) {
    throw new Error("Prazo para apagar o anexo expirou.");
  }

  await deleteAnexoFile(anexo.path);
  await prisma.anexo.update({ where: { id: anexoId }, data: { apagadoEm: new Date() } });

  revalidatePath(`/tickets/${chamadoId}`);
  revalidatePath("/tickets");
}

export async function assumirChamado(chamadoId: string) {
  const user = await requireUser();
  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) throw new Error("Sem acesso.");
  if (!user.podeAlterarStatus) {
    throw new Error("Seu perfil não pode assumir chamados.");
  }
  if (chamado.responsavelId) return;

  await prisma.$transaction([
    prisma.chamado.update({ where: { id: chamadoId }, data: { responsavelId: user.id } }),
    prisma.statusHistorico.create({
      data: {
        chamadoId,
        status: chamado.status,
        texto: "Chamado assumido.",
        usuarioId: user.id,
      },
    }),
  ]);
  revalidatePath(`/tickets/${chamadoId}`);
  revalidatePath("/tickets");
}

export async function changeStatus(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const chamadoId = formData.get("chamadoId") as string;
  const novoStatus = formData.get("status") as string;
  const texto = (formData.get("texto") as string)?.trim();

  if (!texto) return { error: "Informe uma observação para a mudança de status." };

  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) return { error: "Sem acesso a este chamado." };

  const isCancelamentoProprio =
    novoStatus === "CANCELADO" &&
    canCancelOrReopenOwn(user) &&
    chamado.abertoPorId === user.id;
  const isCancelamentoQualquer = novoStatus === "CANCELADO" && canCancelOrReopenAny(user);

  if (!isCancelamentoProprio && !isCancelamentoQualquer && !canChangeStatus(user)) {
    return { error: "Seu perfil não pode alterar o status deste chamado." };
  }

  if (STATUS_FINAIS.includes(chamado.status) || novoStatus === chamado.status) {
    return { error: `Transição de ${chamado.status} para ${novoStatus} não é permitida.` };
  }
  const statusDestino = await prisma.status.findUnique({ where: { id: novoStatus } });
  if (!statusDestino || !statusDestino.ativo) {
    return { error: "Status inválido ou inativo." };
  }

  await prisma.chamado.update({
    where: { id: chamadoId },
    data: {
      status: novoStatus,
      finalizadoEm: novoStatus === "FINALIZADO" ? new Date() : chamado.finalizadoEm,
    },
  });

  await prisma.statusHistorico.create({
    data: { chamadoId, status: novoStatus, texto, usuarioId: user.id },
  });

  revalidatePath(`/tickets/${chamadoId}`);
  revalidatePath("/tickets");

  if (novoStatus === "FINALIZADO") {
    redirect(`/tickets?finalizado=${chamadoId}`);
  }

  return {};
}

export async function reabrirChamado(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const chamadoId = formData.get("chamadoId") as string;
  const motivo = (formData.get("motivo") as string)?.trim();

  if (!motivo) return { error: "Informe o motivo da reabertura." };

  const chamado = await loadChamadoOrThrow(chamadoId);
  if (!canAccessChamado(user, chamado)) return { error: "Sem acesso a este chamado." };

  const config = await prisma.configGeral.upsert({
    where: { id: "geral" },
    update: {},
    create: { id: "geral" },
  });

  const podeReabrir = config.reaberturaSomenteAdmin
    ? user.podeGerenciarCadastros
    : user.podeGerenciarCadastros ||
      canCancelOrReopenAny(user) ||
      chamado.abertoPorId === user.id ||
      chamado.responsavelId === user.id;
  if (!podeReabrir) return { error: "Seu perfil não pode reabrir este chamado." };

  if (!STATUS_FINAIS.includes(chamado.status)) {
    return { error: "Só é possível reabrir chamados finalizados ou cancelados." };
  }

  if (chamado.finalizadoEm) {
    const prazoLimite = new Date(chamado.finalizadoEm);
    prazoLimite.setDate(prazoLimite.getDate() + config.reaberturaPrazoDias);
    if (new Date() > prazoLimite) {
      return { error: `Prazo de reabertura (${config.reaberturaPrazoDias} dias corridos) expirado.` };
    }
  }

  await prisma.chamado.update({
    where: { id: chamadoId },
    data: { status: "REABERTO", motivoReabertura: motivo },
  });

  await prisma.statusHistorico.create({
    data: { chamadoId, status: "REABERTO", texto: motivo, usuarioId: user.id },
  });

  revalidatePath(`/tickets/${chamadoId}`);
  return {};
}

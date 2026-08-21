import { prisma } from "@/lib/db";

export async function logAudit(
  entidade: string,
  entidadeId: string,
  acao: string,
  usuarioId: string,
  detalhes?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      entidade,
      entidadeId,
      acao,
      usuarioId,
      detalhes: detalhes ? JSON.stringify(detalhes) : null,
    },
  });
}

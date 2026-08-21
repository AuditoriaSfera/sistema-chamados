"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

const alterarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1),
    novaSenha: z.string().min(6),
    confirmarSenha: z.string().min(1),
  })
  .refine((data) => data.novaSenha === data.confirmarSenha, {
    message: "A confirmação não confere com a nova senha.",
  });

export async function alterarPropriaSenha(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const user = await requireUser();
  const parsed = alterarSenhaSchema.safeParse({
    senhaAtual: formData.get("senhaAtual"),
    novaSenha: formData.get("novaSenha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos (nova senha mínima de 6 caracteres)." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: user.id } });
  if (!usuario) return { error: "Usuário não encontrado." };

  const senhaOk = await bcrypt.compare(parsed.data.senhaAtual, usuario.senhaHash);
  if (!senhaOk) return { error: "Senha atual incorreta." };

  const senhaHash = await bcrypt.hash(parsed.data.novaSenha, 10);
  await prisma.usuario.update({
    where: { id: user.id },
    data: { senhaHash, senhaProvisoria: false },
  });
  await logAudit("Usuario", user.id, "ALTERAR_PROPRIA_SENHA", user.id);

  return {};
}

"use server";

import { z } from "zod";
import { redefinirSenha } from "@/lib/senha-reset";

const schema = z
  .object({
    token: z.string().min(1),
    novaSenha: z.string().min(6, "A senha precisa ter ao menos 6 caracteres."),
    confirmarSenha: z.string().min(1),
  })
  .refine((d) => d.novaSenha === d.confirmarSenha, {
    message: "A confirmação não confere com a nova senha.",
  });

export async function redefinirSenhaAction(
  _prev: { erro?: string; ok?: boolean } | undefined,
  formData: FormData
) {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    novaSenha: formData.get("novaSenha"),
    confirmarSenha: formData.get("confirmarSenha"),
  });
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  }

  const ok = await redefinirSenha(parsed.data.token, parsed.data.novaSenha);
  if (!ok) {
    return { erro: "Este link expirou ou já foi utilizado. Peça um novo." };
  }
  return { ok: true };
}

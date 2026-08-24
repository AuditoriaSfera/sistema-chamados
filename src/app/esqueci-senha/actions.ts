"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { gerarToken, enviarEmailRecuperacao } from "@/lib/senha-reset";

const schema = z.object({ identificador: z.string().min(1).max(200) });

export async function pedirRecuperacao(
  _prev: { erro?: string; enviado?: boolean } | undefined,
  formData: FormData
) {
  const parsed = schema.safeParse({ identificador: formData.get("identificador") });
  if (!parsed.success) return { erro: "Informe seu usuário ou e-mail." };

  const ident = parsed.data.identificador.trim();

  const usuario = await prisma.usuario.findFirst({
    where: {
      ativo: true,
      OR: [
        { email: { equals: ident, mode: "insensitive" } },
        { emailContato: { equals: ident, mode: "insensitive" } },
      ],
    },
    select: { id: true, nome: true, emailContato: true },
  });

  // Resposta sempre igual, exista ou não a conta: senão a tela vira um
  // detector de usuários válidos para quem quiser sondar.
  if (usuario?.emailContato) {
    try {
      const token = await gerarToken(usuario.id);
      const h = await headers();
      const proto = h.get("x-forwarded-proto") ?? "https";
      const host = h.get("host");
      await enviarEmailRecuperacao(usuario.emailContato, usuario.nome, token, `${proto}://${host}`);
    } catch (e) {
      // falha de envio também não pode vazar se a conta existe
      console.error("[esqueci-senha] falha ao enviar:", e instanceof Error ? e.message : e);
    }
  }

  return { enviado: true };
}

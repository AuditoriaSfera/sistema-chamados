"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function loginAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const senha = formData.get("senha") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/tickets";

  try {
    // redirect:false — decidimos o destino abaixo em vez de deixar o signIn
    // redirecionar direto pro callbackUrl. Se deixássemos, quem está com senha
    // provisória sofreria DOIS redirecionamentos em cadeia (aqui pro
    // callbackUrl, depois o middleware pro /conta/senha): na primeira
    // tentativa isso quebrava a navegação da Server Action com uma tela de
    // erro genérica — só um recarregamento normal (fora do fluxo da action)
    // seguia a cadeia direito. Resolvendo o destino aqui, é um redirect só.
    await signIn("credentials", { email, senha, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Usuário ou senha inválidos." };
    }
    throw error;
  }

  const ident = email.trim();
  const usuario = await prisma.usuario.findFirst({
    where: {
      OR: [
        { email: { equals: ident, mode: "insensitive" } },
        { emailContato: { equals: ident, mode: "insensitive" } },
      ],
    },
    select: { senhaProvisoria: true },
  });

  redirect(usuario?.senhaProvisoria ? "/conta/senha" : callbackUrl);
}

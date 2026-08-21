import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/permissions";

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/** Apesar do nome, hoje verifica a flag podeGerenciarCadastros do PerfilAcesso — não mais um perfil "ADMIN" fixo. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.podeGerenciarCadastros) redirect("/tickets");
  return user;
}

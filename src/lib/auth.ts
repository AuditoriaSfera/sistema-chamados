import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { derivarEscopoChamados } from "@/lib/constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Usuário", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!email || !senha) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { pdvVinculos: true },
        });
        if (!usuario || !usuario.ativo) return null;

        const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaOk) return null;

        const perfil = await prisma.perfilAcesso.findUnique({ where: { id: usuario.perfil } });
        if (!perfil || !perfil.ativo) return null;

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: perfil.id,
          perfilNome: perfil.nome,
          vePedidosDaEquipe: usuario.vePedidosDaEquipe,
          pdvIds: usuario.pdvVinculos.map((v) => v.pdvId),
          podeAbrirChamado: perfil.podeAbrirChamado,
          podeAlterarStatus: perfil.podeAlterarStatus,
          podeResponderChat: perfil.podeResponderChat,
          podeCancelarReabrirProprio: perfil.podeCancelarReabrirProprio,
          podeCancelarReabrirTodos: perfil.podeCancelarReabrirTodos,
          podeVerRelatorios: perfil.podeVerRelatorios,
          podeGerenciarCadastros: perfil.podeGerenciarCadastros,
          escopoChamados: derivarEscopoChamados(perfil),
          senhaProvisoria: usuario.senhaProvisoria,
        };
      },
    }),
  ],
});

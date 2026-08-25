import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { derivarEscopoChamados } from "@/lib/constants";

/**
 * De quanto em quanto tempo as permissões do token são reconferidas no banco.
 *
 * O JWT é auto-contido: sem isso, tudo que ele carrega (perfil, flags, PDVs,
 * `ativo`) fica congelado no momento do login. Desativar um usuário, rebaixar o
 * perfil dele ou desvincular PDVs não surtia efeito nenhum enquanto a sessão
 * vivesse — a tela de administração mostrava a permissão removida e a pessoa
 * seguia usando os poderes antigos.
 *
 * Um minuto é o meio-termo: uma consulta por sessão por minuto é barata, e a
 * janela de exposição depois de uma revogação fica curta o bastante para ser
 * aceitável na operação.
 */
const REVALIDAR_APOS_MS = 60_000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt: async (params) => {
      const token = await authConfig.callbacks.jwt(params);

      // No login o callback base já preencheu tudo com dados frescos.
      if (params.user || !token) return token;

      // Token sem id não tem como ser conferido — trata como inválido em vez de
      // deixar o findUnique estourar.
      if (!token.id) return null;

      // Tokens emitidos antes desta mudança não têm `revalidadoEm`: o ?? 0 faz
      // com que sejam conferidos na primeira requisição, que é o que se quer.
      if (Date.now() - (token.revalidadoEm ?? 0) < REVALIDAR_APOS_MS) return token;

      const usuario = await prisma.usuario.findUnique({
        where: { id: token.id },
        include: { pdvVinculos: true },
      });
      // Retornar null faz o Auth.js limpar o cookie de sessão: quem foi
      // desativado ou removido cai no login na requisição seguinte.
      if (!usuario || !usuario.ativo) return null;

      const perfil = await prisma.perfilAcesso.findUnique({ where: { id: usuario.perfil } });
      if (!perfil || !perfil.ativo) return null;

      token.nome = usuario.nome;
      token.perfil = perfil.id;
      token.perfilNome = perfil.nome;
      token.vePedidosDaEquipe = usuario.vePedidosDaEquipe;
      token.pdvIds = usuario.pdvVinculos.map((v) => v.pdvId);
      token.podeAbrirChamado = perfil.podeAbrirChamado;
      token.podeAlterarStatus = perfil.podeAlterarStatus;
      token.podeResponderChat = perfil.podeResponderChat;
      token.podeCancelarReabrirProprio = perfil.podeCancelarReabrirProprio;
      token.podeCancelarReabrirTodos = perfil.podeCancelarReabrirTodos;
      token.podeVerRelatorios = perfil.podeVerRelatorios;
      token.podeGerenciarCadastros = perfil.podeGerenciarCadastros;
      token.escopoChamados = derivarEscopoChamados(perfil);
      token.senhaProvisoria = usuario.senhaProvisoria;
      token.revalidadoEm = Date.now();

      return token;
    },
  },
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

        // aceita o identificador de login ou o e-mail de contato, sem
        // diferenciar maiúsculas de minúsculas
        const ident = email.trim();
        const usuario = await prisma.usuario.findFirst({
          where: {
            OR: [
              { email: { equals: ident, mode: "insensitive" } },
              { emailContato: { equals: ident, mode: "insensitive" } },
            ],
          },
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

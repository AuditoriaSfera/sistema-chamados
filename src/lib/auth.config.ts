import type { NextAuthConfig } from "next-auth";
import type { EscopoChamados } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nome: string;
      email: string;
      perfil: string;
      perfilNome: string;
      vePedidosDaEquipe: boolean;
      pdvIds: string[];
      podeAbrirChamado: boolean;
      podeAlterarStatus: boolean;
      podeResponderChat: boolean;
      podeCancelarReabrirProprio: boolean;
      podeCancelarReabrirTodos: boolean;
      podeVerRelatorios: boolean;
      podeGerenciarCadastros: boolean;
      escopoChamados: EscopoChamados;
      senhaProvisoria: boolean;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    nome: string;
    perfil: string;
    perfilNome: string;
    vePedidosDaEquipe: boolean;
    pdvIds: string[];
    podeAbrirChamado: boolean;
    podeAlterarStatus: boolean;
    podeResponderChat: boolean;
    podeCancelarReabrirProprio: boolean;
    podeCancelarReabrirTodos: boolean;
    podeVerRelatorios: boolean;
    podeGerenciarCadastros: boolean;
    escopoChamados: EscopoChamados;
    senhaProvisoria: boolean;
    /** Momento da última conferência contra o banco — ver o callback jwt em auth.ts. */
    revalidadoEm: number;
  }
}

type AuthorizedUser = {
  perfil: string;
  perfilNome: string;
  vePedidosDaEquipe: boolean;
  pdvIds: string[];
  podeAbrirChamado: boolean;
  podeAlterarStatus: boolean;
  podeResponderChat: boolean;
  podeCancelarReabrirProprio: boolean;
  podeCancelarReabrirTodos: boolean;
  podeVerRelatorios: boolean;
  podeGerenciarCadastros: boolean;
  escopoChamados: EscopoChamados;
  senhaProvisoria: boolean;
};

/**
 * Config sem providers que dependem de Node/Prisma — usada pelo middleware
 * (roda em runtime restrito). O provider Credentials + Prisma entram só em auth.ts.
 */
export const authConfig = {
  // Railway roda atrás de proxy: sem trustHost o next-auth v5 recusa o host da request.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as unknown as AuthorizedUser & { id: string; name: string };
        token.id = u.id;
        token.nome = u.name;
        token.perfil = u.perfil;
        token.perfilNome = u.perfilNome;
        token.vePedidosDaEquipe = u.vePedidosDaEquipe;
        token.pdvIds = u.pdvIds;
        token.podeAbrirChamado = u.podeAbrirChamado;
        token.podeAlterarStatus = u.podeAlterarStatus;
        token.podeResponderChat = u.podeResponderChat;
        token.podeCancelarReabrirProprio = u.podeCancelarReabrirProprio;
        token.podeCancelarReabrirTodos = u.podeCancelarReabrirTodos;
        token.podeVerRelatorios = u.podeVerRelatorios;
        token.podeGerenciarCadastros = u.podeGerenciarCadastros;
        token.escopoChamados = u.escopoChamados;
        token.senhaProvisoria = u.senhaProvisoria;
        token.revalidadoEm = Date.now();
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id;
      session.user.nome = token.nome;
      session.user.perfil = token.perfil;
      session.user.perfilNome = token.perfilNome;
      session.user.vePedidosDaEquipe = token.vePedidosDaEquipe;
      session.user.pdvIds = token.pdvIds;
      session.user.podeAbrirChamado = token.podeAbrirChamado;
      session.user.podeAlterarStatus = token.podeAlterarStatus;
      session.user.podeResponderChat = token.podeResponderChat;
      session.user.podeCancelarReabrirProprio = token.podeCancelarReabrirProprio;
      session.user.podeCancelarReabrirTodos = token.podeCancelarReabrirTodos;
      session.user.podeVerRelatorios = token.podeVerRelatorios;
      session.user.podeGerenciarCadastros = token.podeGerenciarCadastros;
      session.user.escopoChamados = token.escopoChamados;
      session.user.senhaProvisoria = token.senhaProvisoria;
      return session;
    },
  },
} satisfies NextAuthConfig;

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não definida.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pdvsSeed = [
    { codigo: "PDV001", nome: "Loja Centro", regraDistribuicao: "ROUND_ROBIN" as const },
    { codigo: "PDV002", nome: "Loja Norte" },
    { codigo: "PDV003", nome: "Loja Sul" },
    { codigo: "PDV004", nome: "Loja Leste" },
  ];
  const pdvs = await Promise.all(
    pdvsSeed.map((p) =>
      prisma.pdv.upsert({
        where: { codigo: p.codigo },
        update: {},
        create: {
          codigo: p.codigo,
          nome: p.nome,
          regraDistribuicao: p.regraDistribuicao ?? "FILA_ABERTA",
        },
      })
    )
  );

  for (const pdv of pdvs) {
    for (const diaSemana of [0, 1, 2, 3, 4, 5, 6]) {
      const abre = diaSemana >= 1 && diaSemana <= 5;
      await prisma.pdvHorario.upsert({
        where: { pdvId_diaSemana: { pdvId: pdv.id, diaSemana } },
        update: {},
        create: { pdvId: pdv.id, diaSemana, abre, horarioInicio: "08:00", horarioFim: "18:00" },
      });
    }
  }

  const feriadoExistente = await prisma.feriado.findFirst({
    where: { pdvId: pdvs[0].id, descricao: "Feriado de teste" },
  });
  if (!feriadoExistente) {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(0, 0, 0, 0);
    await prisma.feriado.create({
      data: { pdvId: pdvs[0].id, data: amanha, descricao: "Feriado de teste" },
    });
  }

  await Promise.all(
    [
      { numero: "PED-0001", pdv: 0, cliente: "Revendedor Alpha", codigoRevendedor: "REV-0001" },
      { numero: "PED-0002", pdv: 1, cliente: "Revendedor Beta", codigoRevendedor: "REV-0002" },
      { numero: "PED-0003", pdv: 2, cliente: "Revendedor Gama", codigoRevendedor: "REV-0003" },
    ].map((p) =>
      prisma.pedido.upsert({
        where: { numero: p.numero },
        update: {},
        create: {
          numero: p.numero,
          pdvId: pdvs[p.pdv].id,
          nomeCliente: p.cliente,
          codigoRevendedor: p.codigoRevendedor,
        },
      })
    )
  );

  const statusSeed = [
    { id: "ABERTO", nome: "Aberto", cor: "blue" },
    { id: "EM_ANDAMENTO", nome: "Em andamento", cor: "amber" },
    { id: "AGUARDANDO_SOLICITANTE", nome: "Aguardando retorno do solicitante", cor: "violet" },
    { id: "AGUARDANDO_TRANSPORTADORA", nome: "Aguardando transportadora", cor: "orange" },
    { id: "FINALIZADO", nome: "Finalizado", cor: "emerald" },
    { id: "CANCELADO", nome: "Cancelado", cor: "slate" },
    { id: "REABERTO", nome: "Reaberto", cor: "red" },
  ];
  for (let i = 0; i < statusSeed.length; i++) {
    const s = statusSeed[i];
    await prisma.status.upsert({
      where: { id: s.id },
      update: {},
      create: { id: s.id, nome: s.nome, cor: s.cor, fixo: true, ordem: i },
    });
  }

  const slaPresetsSeed = [
    { nome: "Crítica", duracao: 4, unidade: "HORAS", cor: "red", critica: true },
    { nome: "Alta", duracao: 12, unidade: "HORAS", cor: "blue", critica: false },
    { nome: "Normal", duracao: 24, unidade: "HORAS", cor: "slate", critica: false },
    { nome: "Baixa", duracao: 2, unidade: "DIAS", cor: "emerald", critica: false },
  ];
  const slaPresets: Record<string, { id: string }> = {};
  for (let i = 0; i < slaPresetsSeed.length; i++) {
    const s = slaPresetsSeed[i];
    const existente = await prisma.slaPreset.findFirst({ where: { nome: s.nome } });
    const registro =
      existente ??
      (await prisma.slaPreset.create({
        data: {
          nome: s.nome,
          duracao: s.duracao,
          unidade: s.unidade,
          cor: s.cor,
          critica: s.critica,
          ordem: i,
        },
      }));
    slaPresets[s.nome] = registro;
  }

  const servicosSeed = [
    {
      nome: "Atraso na entrega",
      categoria: "ENTREGA",
      textoOrientacao: "Pedido não entregue dentro do prazo combinado.",
      slaPreset: "Alta",
    },
    {
      nome: "Avaria de produto",
      categoria: "PRODUTO",
      textoOrientacao: "Produto chegou danificado ou com defeito.",
      slaPreset: "Alta",
    },
    {
      nome: "Falta de produto",
      categoria: "ESTOQUE",
      textoOrientacao: "Item do pedido não veio na entrega.",
      slaPreset: "Normal",
    },
    {
      nome: "Devolução",
      categoria: "DEVOLUCAO",
      textoOrientacao: "Solicitação de devolução de produto/pedido.",
      slaPreset: "Normal",
    },
  ];

  for (const s of servicosSeed) {
    const existing = await prisma.servico.findFirst({ where: { nome: s.nome } });
    if (!existing) {
      await prisma.servico.create({
        data: {
          nome: s.nome,
          categoria: s.categoria,
          textoOrientacao: s.textoOrientacao,
          slaPresetId: slaPresets[s.slaPreset].id,
        },
      });
    }
  }

  const perfisSeed = [
    {
      nome: "Solicitante",
      cor: "blue",
      podeAbrirChamado: true,
      podeAlterarStatus: false,
      podeResponderChat: true,
      podeCancelarReabrirProprio: true,
      podeVerRelatorios: true,
      podeGerenciarCadastros: false,
      veTodosChamados: false,
      veChamadosPdvsVinculados: false,
    },
    {
      nome: "Operador",
      cor: "amber",
      podeAbrirChamado: false,
      podeAlterarStatus: true,
      podeResponderChat: true,
      podeCancelarReabrirProprio: false,
      podeVerRelatorios: true,
      podeGerenciarCadastros: false,
      veTodosChamados: true,
      veChamadosPdvsVinculados: false,
    },
    {
      nome: "Gestor",
      cor: "violet",
      podeAbrirChamado: false,
      podeAlterarStatus: true,
      podeResponderChat: true,
      podeCancelarReabrirProprio: false,
      podeVerRelatorios: true,
      podeGerenciarCadastros: false,
      veTodosChamados: false,
      veChamadosPdvsVinculados: true,
    },
    {
      nome: "Administrador",
      cor: "red",
      podeAbrirChamado: true,
      podeAlterarStatus: true,
      podeResponderChat: true,
      podeCancelarReabrirProprio: true,
      podeVerRelatorios: true,
      podeGerenciarCadastros: true,
      veTodosChamados: true,
      veChamadosPdvsVinculados: false,
    },
  ];
  const perfis: Record<string, { id: string }> = {};
  for (let i = 0; i < perfisSeed.length; i++) {
    const p = perfisSeed[i];
    const registro = await prisma.perfilAcesso.upsert({
      where: { nome: p.nome },
      update: {},
      create: { ...p, ordem: i },
    });
    perfis[p.nome] = registro;
  }

  const adminExistente = await prisma.usuario.findUnique({
    where: { email: "gerencia.auditoria@sferamultifranquias.com" },
  });
  // upsert com update:{} não mexe na senha de quem já existe — só gera senha nova
  // na primeira vez, pra não imprimir uma senha que não bate com o hash salvo.
  const adminSenha = adminExistente ? null : crypto.randomBytes(9).toString("base64url");
  const admin =
    adminExistente ??
    (await prisma.usuario.create({
      data: {
        nome: "Administrador",
        email: "gerencia.auditoria@sferamultifranquias.com",
        senhaHash: await bcrypt.hash(adminSenha!, 10),
        perfil: perfis["Administrador"].id,
      },
    }));

  const demoUsersSeed = [
    { nome: "Solicitante Demo", email: "solicitante@demo.local", perfil: "Solicitante" },
    { nome: "Operador Demo", email: "operador@demo.local", perfil: "Operador" },
    { nome: "Gestor Demo", email: "gestor@demo.local", perfil: "Gestor", pdvs: [2, 3] },
  ];
  const demoSenha = "demo1234";
  const demoHash = await bcrypt.hash(demoSenha, 10);

  for (const u of demoUsersSeed) {
    const user = await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { nome: u.nome, email: u.email, senhaHash: demoHash, perfil: perfis[u.perfil].id },
    });
    if (u.pdvs) {
      for (const pdvIdx of u.pdvs) {
        await prisma.usuarioPdv.upsert({
          where: { usuarioId_pdvId: { usuarioId: user.id, pdvId: pdvs[pdvIdx].id } },
          update: {},
          create: { usuarioId: user.id, pdvId: pdvs[pdvIdx].id },
        });
      }
    }
  }

  await prisma.configGeral.upsert({
    where: { id: "geral" },
    update: {},
    create: { id: "geral" },
  });

  await prisma.chamadoContador.upsert({
    where: { id: "geral" },
    update: {},
    create: { id: "geral" },
  });

  console.log("\nSeed concluído.");
  console.log(
    adminSenha
      ? `Admin: ${admin.email} | senha temporária: ${adminSenha}`
      : `Admin: ${admin.email} | já existia, senha não foi alterada.`
  );
  console.log(`Usuários demo (senha: ${demoSenha}):`);
  for (const u of demoUsersSeed) console.log(`  - ${u.email} (${u.perfil})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

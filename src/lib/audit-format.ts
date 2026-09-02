/** Traduções pra deixar o log de auditoria legível (Entidade/Ação/Detalhes). */

export const ENTIDADE_LABELS: Record<string, string> = {
  Usuario: "Usuário",
  UsuarioPdv: "Vínculo usuário/PDV",
  Pdv: "PDV",
  Feriado: "Feriado",
  PerfilAcesso: "Perfil de acesso",
  Status: "Status",
  SlaPreset: "SLA",
  Servico: "Serviço",
  ConfigGeral: "Configurações gerais",
};

export function entidadeLabel(entidade: string): string {
  return ENTIDADE_LABELS[entidade] ?? entidade;
}

const ACAO_LABELS: Record<string, string> = {
  CREATE: "Criação",
  ATUALIZAR: "Atualização",
  ATUALIZAR_CALENDARIO: "Atualização do calendário",
  ATUALIZAR_VE_PEDIDOS_EQUIPE: "Alteração de 'vê pedidos da equipe'",
  DELETE: "Exclusão",
  ATIVAR: "Ativação",
  INATIVAR: "Inativação",
  DESATIVAR: "Desativação",
  VINCULAR_PDV: "Vínculo de PDV",
  DESVINCULAR_PDV: "Remoção de vínculo de PDV",
  VINCULAR_PDV_TODOS: "Vínculo de todos os PDVs",
  DESVINCULAR_PDV_TODOS: "Remoção de vínculo de todos os PDVs",
  ALTERAR_PROPRIA_SENHA: "Alteração da própria senha",
};

export function acaoLabel(acao: string): string {
  if (ACAO_LABELS[acao]) return ACAO_LABELS[acao];
  return acao.charAt(0) + acao.slice(1).toLowerCase().replaceAll("_", " ");
}

/** Rótulo em português + se o valor é um id que deve ser resolvido via `nomesPorId`. */
const DETALHE_CAMPOS: Record<string, { label: string; ref?: boolean; refLista?: boolean }> = {
  nome: { label: "Nome" },
  email: { label: "E-mail" },
  perfil: { label: "Perfil", ref: true },
  cor: { label: "Cor" },
  critica: { label: "Crítico" },
  valor: { label: "Valor" },
  pdvId: { label: "PDV", ref: true },
  pdvIds: { label: "PDVs", refLista: true },
  codigo: { label: "Código" },
  descricao: { label: "Descrição" },
  data: { label: "Data" },
  duracao: { label: "Duração" },
  unidade: { label: "Unidade" },
  regraDistribuicao: { label: "Regra de distribuição" },
  horarios: { label: "Horários" },
  textoOrientacao: { label: "Orientação" },
  categoria: { label: "Categoria" },
  slaPresetId: { label: "SLA", ref: true },
  reaberturaPrazoDias: { label: "Prazo para reabertura (dias)" },
  reaberturaSomenteAdmin: { label: "Só administrador reabre" },
  alertaVencimentoHoras: { label: "Alerta de vencimento (horas úteis)" },
  veSomenteProprios: { label: "Vê só os próprios chamados" },
  podeAbrirChamado: { label: "Pode abrir chamado" },
  podeAlterarStatus: { label: "Pode alterar status" },
  podeResponderChat: { label: "Pode responder chat" },
  podeCancelarReabrirProprio: { label: "Pode cancelar/reabrir próprio chamado" },
  podeCancelarReabrirTodos: { label: "Pode cancelar/reabrir chamado de outros" },
  podeVerRelatorios: { label: "Pode ver relatórios" },
  podeGerenciarCadastros: { label: "Pode gerenciar cadastros" },
  podeGerenciarAdministradores: { label: "Pode gerenciar administradores e configurações" },
  escopoChamados: { label: "Escopo de chamados" },
};

function formatValor(
  campo: string,
  valor: unknown,
  nomesPorId: Map<string, string>
): string {
  const conf = DETALHE_CAMPOS[campo];
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (conf?.ref && typeof valor === "string") return nomesPorId.get(valor) ?? valor;
  if (conf?.refLista && Array.isArray(valor)) {
    return valor.map((v) => (typeof v === "string" ? (nomesPorId.get(v) ?? v) : String(v))).join(", ");
  }
  if (campo === "horarios" && Array.isArray(valor)) {
    return `${valor.filter((h) => h && typeof h === "object" && "abre" in h && h.abre).length} dia(s) com atendimento`;
  }
  if (Array.isArray(valor)) return valor.map((v) => String(v)).join(", ");
  if (typeof valor === "object") return JSON.stringify(valor);
  return String(valor);
}

/** Transforma o JSON cru salvo em `AuditLog.detalhes` numa lista "Rótulo: valor" legível. */
export function formatDetalhes(
  detalhesJson: string | null,
  nomesPorId: Map<string, string>
): { label: string; valor: string }[] {
  if (!detalhesJson) return [];
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(detalhesJson);
  } catch {
    return [{ label: "Detalhes", valor: detalhesJson }];
  }
  return Object.entries(obj).map(([campo, valor]) => ({
    label: DETALHE_CAMPOS[campo]?.label ?? campo,
    valor: formatValor(campo, valor, nomesPorId),
  }));
}

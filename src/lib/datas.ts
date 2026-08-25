/**
 * Formatação de data e hora para exibição.
 *
 * O fuso é FIXO e explícito, nunca o do runtime. Sem isso, `toLocaleString`
 * usa o fuso de quem está formatando: o container do Railway roda em UTC, então
 * um chamado aberto às 13:18 aparecia como 16:18 para o usuário — três horas de
 * diferença num sistema cujo produto é prazo e SLA.
 *
 * Fixar o fuso também elimina a divergência de hidratação: servidor e navegador
 * produzem exatamente a mesma string, então o mesmo helper serve nos dois lados.
 *
 * Para datas de calendário (feriados), veja a observação no fim do arquivo.
 */
export const FUSO_APP = "America/Sao_Paulo";

const DATA_HORA: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO_APP,
};

const DATA_HORA_SEG: Intl.DateTimeFormatOptions = { ...DATA_HORA, second: "2-digit" };

const DATA: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: FUSO_APP,
};

function paraData(valor: Date | string): Date {
  return valor instanceof Date ? valor : new Date(valor);
}

/** Ex.: 25/08/2026, 13:18 */
export function formatarDataHora(valor: Date | string): string {
  return paraData(valor).toLocaleString("pt-BR", DATA_HORA);
}

/** Ex.: 25/08/2026, 13:18:41 — para trilha de auditoria, onde o segundo importa. */
export function formatarDataHoraSegundos(valor: Date | string): string {
  return paraData(valor).toLocaleString("pt-BR", DATA_HORA_SEG);
}

/** Ex.: 25/08/2026 */
export function formatarData(valor: Date | string): string {
  return paraData(valor).toLocaleDateString("pt-BR", DATA);
}

/**
 * Datas de calendário (Feriado.data) são um caso à parte e NÃO devem usar as
 * funções acima. Elas representam um dia, não um instante, mas hoje são gravadas
 * por `parseLocalDate`, que monta a meia-noite no fuso de quem grava — o mesmo
 * dia vira 00:00Z quando cadastrado pelo app em produção (UTC) e 03:00Z quando
 * veio da máquina de alguém em São Paulo. Aplicar FUSO_APP sobre o primeiro caso
 * exibiria o dia anterior. A correção é na gravação, não na exibição.
 */

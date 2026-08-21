import { Badge } from "@/components/ui/badge";
import { corBadgeClasses, corDotClasses } from "@/lib/color-palette";

/** SLA (nome + cor + duração), fundido com o antigo cadastro de Prioridade — a cor vem do registro. */
export function SlaBadge({ nome, cor }: { nome: string; cor: string }) {
  return (
    <Badge variant="outline" className={corBadgeClasses(cor)}>
      {nome}
    </Badge>
  );
}

export function slaDotClasses(cor: string): string {
  return corDotClasses(cor);
}

/** Status do fluxo do chamado — cadastro dinâmico (model Status), cor vem do registro. */
export function StatusBadge({ nome, cor }: { nome: string; cor: string }) {
  return (
    <Badge variant="outline" className={corBadgeClasses(cor)}>
      {nome}
    </Badge>
  );
}

export function statusDotClasses(cor: string): string {
  return corDotClasses(cor);
}

import { requireUser } from "@/lib/session";
import { canManageAdmins, canManageCadastros, canViewReports } from "@/lib/permissions";
import { AppSidebar } from "./app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const navItems = [
    { href: "/monitoramento", label: "Monitoramento", icon: "monitoramento", show: true },
    { href: "/tickets", label: "Chamados", icon: "chamados", show: true },
    { href: "/relatorios", label: "Relatórios", icon: "relatorios", show: canViewReports(user) },
    { href: "/cadastros/pdvs", label: "PDVs", icon: "pdvs", show: canManageCadastros(user) },
    { href: "/cadastros/servicos", label: "Serviços", icon: "servicos", show: canManageCadastros(user) },
    { href: "/cadastros/status", label: "Status", icon: "status", show: canManageCadastros(user) },
    { href: "/cadastros/sla", label: "SLA", icon: "sla", show: canManageCadastros(user) },
    { href: "/cadastros/usuarios", label: "Usuários", icon: "usuarios", show: canManageCadastros(user) },
    { href: "/cadastros/perfis", label: "Perfis", icon: "perfis", show: canManageCadastros(user) },
    // Configurações mexe nas regras globais de chamado e dá acesso à auditoria —
    // fica no nível de administrador pleno, acima de "gerenciar cadastros".
    { href: "/configuracoes", label: "Configurações", icon: "configuracoes", show: canManageAdmins(user) },
  ].filter((item) => item.show);

  return (
    <div className="flex min-h-full bg-background">
      <AppSidebar items={navItems} userNome={user.nome} userPerfilLabel={user.perfilNome} />
      <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  );
}

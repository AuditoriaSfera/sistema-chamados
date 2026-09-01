"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  Store,
  Wrench,
  Users,
  Settings,
  Clock,
  ListChecks,
  ShieldCheck,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";

export type NavItem = { href: string; label: string; icon: string };

const ICONS: Record<string, LucideIcon> = {
  monitoramento: LayoutDashboard,
  chamados: Ticket,
  relatorios: BarChart3,
  pdvs: Store,
  servicos: Wrench,
  status: ListChecks,
  sla: Clock,
  usuarios: Users,
  perfis: ShieldCheck,
  configuracoes: Settings,
};

const COLLAPSED_WIDTH = "4rem";
const EXPANDED_WIDTH = "15rem";
const STORAGE_KEY = "sidebar-collapsed";

// Store externo (fora do React) para o estado de recolhido, persistido no
// localStorage — evita setState dentro de efeito só pra hidratar a partir
// de uma storage externa (useSyncExternalStore é o jeito recomendado).
type Listener = () => void;
let listeners: Listener[] = [];

function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

function setCollapsedStore(value: boolean) {
  localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  for (const l of listeners) l();
}

export function AppSidebar({
  items,
  userNome,
  userPerfilLabel,
}: {
  items: NavItem[];
  userNome: string;
  userPerfilLabel: string;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
    );
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar p-4 flex flex-col gap-6 transition-[width] duration-150",
        collapsed ? "w-16 px-2" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5",
          collapsed ? "flex-col px-0" : "justify-between px-1"
        )}
      >
        <Link
          href="/tickets"
          title="Ir para Chamados"
          className={cn(
            "flex items-center gap-2.5 rounded-lg hover:opacity-80",
            collapsed && "flex-col"
          )}
        >
          <img src="/logo-s.png" alt="" className="size-8 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">
                Sfera Chamados
              </p>
              <p className="text-xs text-sidebar-foreground/50">Logística</p>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCollapsedStore(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1 text-sm">
        {items.map((item) => {
          const active =
            pathname === item.href || (item.href !== "/tickets" && pathname.startsWith(`${item.href}/`));
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors border-l-2 border-transparent",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-primary font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {Icon && <Icon className="size-4 shrink-0" />}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
        {!collapsed && (
          <div className="text-xs px-1">
            <p className="truncate font-medium text-sidebar-foreground">{userNome}</p>
            <p className="truncate text-sidebar-foreground/50">{userPerfilLabel}</p>
          </div>
        )}
        <Link
          href="/conta/senha"
          title={collapsed ? "Alterar senha" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0"
          )}
        >
          <KeyRound className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">Alterar senha</span>}
        </Link>
        {collapsed ? (
          <div className="flex justify-center">
            <SignOutButton compact />
          </div>
        ) : (
          <SignOutButton />
        )}
      </div>
    </aside>
  );
}

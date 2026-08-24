"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { apagarAnexoMensagem, apagarMensagem, enviarMensagem, marcarMensagensComoLidas } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoRefresh } from "@/components/auto-refresh";
import { COLOR_PALETTE, corBadgeClasses, corDotClasses } from "@/lib/color-palette";
import { cn } from "@/lib/utils";
import { ColorIcon } from "@/components/color-icon";
import { AnexosField } from "@/components/anexos-field";
import { MessageCircle, FileText, Video, MoreVertical, Download, Trash2, FileWarning } from "lucide-react";

const PRAZO_APAGAR_MS = 60_000;

type MensagemAnexo = {
  id: string;
  nomeArquivo: string;
  tipo: string;
  tamanho: number;
  apagadoEm: string | null;
};

type Mensagem = {
  id: string;
  texto: string;
  autorId: string;
  autorNome: string;
  createdAt: string;
  lidoEm: string | null;
  apagadaEm: string | null;
  anexos: MensagemAnexo[];
};

export function MensagensPanel({
  chamadoId,
  currentUserId,
  mensagens,
}: {
  chamadoId: string;
  currentUserId: string;
  mensagens: Mensagem[];
}) {
  const [, startTransition] = useTransition();
  const haNaoLidas = mensagens.some((m) => m.autorId !== currentUserId && !m.lidoEm);

  useEffect(() => {
    if (haNaoLidas) startTransition(() => marcarMensagensComoLidas(chamadoId));
  }, [haNaoLidas, chamadoId]);

  return (
    <Card>
      <AutoRefresh intervalMs={4000} />
      <CardHeader className="flex flex-row items-center gap-2.5">
        <ColorIcon icon={MessageCircle} color="blue" />
        <CardTitle className="text-base">Conversa</CardTitle>
      </CardHeader>
      <CardContent>
        <MessageList mensagens={mensagens} currentUserId={currentUserId} chamadoId={chamadoId} />
        <MessageForm chamadoId={chamadoId} />
      </CardContent>
    </Card>
  );
}

/** Cor estável por autor (hash do id), na mesma paleta usada em SLA/Status/Perfis. */
function corDoAutor(autorId: string) {
  let hash = 0;
  for (let i = 0; i < autorId.length; i++) hash = (hash * 31 + autorId.charCodeAt(i)) >>> 0;
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

function Avatar({ nome, autorId }: { nome: string; autorId: string }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        corBadgeClasses(corDoAutor(autorId))
      )}
    >
      {inicial}
    </span>
  );
}

function MessageList({
  mensagens,
  currentUserId,
  chamadoId,
}: {
  mensagens: Mensagem[];
  currentUserId: string;
  chamadoId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [mensagens.length]);

  return (
    <div className="mb-3 max-h-80 space-y-4 overflow-y-auto rounded-md border bg-muted/20 p-3">
      {mensagens.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
      )}
      {mensagens.map((m) => (
        <MessageRow key={m.id} mensagem={m} currentUserId={currentUserId} chamadoId={chamadoId} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageRow({
  mensagem: m,
  currentUserId,
  chamadoId,
}: {
  mensagem: Mensagem;
  currentUserId: string;
  chamadoId: string;
}) {
  const [, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const isOwn = m.autorId === currentUserId;
  const cor = corDoAutor(m.autorId);
  const podeApagar =
    !m.apagadaEm && isOwn && Date.now() - new Date(m.createdAt).getTime() < PRAZO_APAGAR_MS;

  function apagar() {
    startTransition(async () => {
      try {
        await apagarMensagem(chamadoId, m.id);
      } catch {
        setErro("Prazo para apagar expirou.");
      }
    });
  }

  return (
    <div className={cn("group mx-auto flex max-w-xl items-end gap-2", isOwn && "flex-row-reverse")}>
      <Avatar nome={m.autorNome} autorId={m.autorId} />
      <div className={cn("flex max-w-[65%] flex-col", isOwn && "items-end")}>
        {!isOwn && (
          <span className="mb-0.5 flex items-center gap-1.5 px-1 text-xs font-medium">
            <span className={cn("inline-block size-1.5 rounded-full", corDotClasses(cor))} />
            {m.autorNome}
          </span>
        )}
        {m.apagadaEm ? (
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm italic text-muted-foreground",
              isOwn ? "rounded-br-sm bg-muted/60" : "rounded-bl-sm bg-muted/60"
            )}
          >
            Mensagem apagada
          </div>
        ) : (
          <div
            className={cn(
              "space-y-2 rounded-2xl px-3 py-2 text-sm",
              isOwn
                ? "rounded-br-sm bg-primary text-primary-foreground"
                : cn("rounded-bl-sm", corBadgeClasses(cor))
            )}
          >
            {m.texto && <p className="whitespace-pre-wrap">{m.texto}</p>}
            {m.anexos.length > 0 && (
              <div className="flex flex-col gap-2">
                {m.anexos.map((a) => (
                  <AnexoPreview key={a.id} anexo={a} chamadoId={chamadoId} podeApagar={podeApagar} />
                ))}
              </div>
            )}
          </div>
        )}
        <span className="mt-0.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
          {new Date(m.createdAt).toLocaleString("pt-BR")}
          {isOwn && !m.apagadaEm && ` · ${m.lidoEm ? "Lido" : "Enviado"}`}
          {podeApagar && (
            <button
              type="button"
              title="Apagar mensagem"
              onClick={apagar}
              className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3" />
            </button>
          )}
        </span>
        {erro && <span className="px-1 text-[11px] text-destructive">{erro}</span>}
      </div>
    </div>
  );
}

function AnexoPreview({
  anexo,
  chamadoId,
  podeApagar,
}: {
  anexo: MensagemAnexo;
  chamadoId: string;
  podeApagar: boolean;
}) {
  const isImagem = anexo.tipo === "IMAGEM";
  const [menuAberto, setMenuAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  function apagar() {
    setMenuAberto(false);
    startTransition(async () => {
      try {
        await apagarAnexoMensagem(chamadoId, anexo.id);
      } catch {
        setErro("Prazo para apagar expirou.");
      }
    });
  }

  useEffect(() => {
    if (!menuAberto) return;
    function onClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, [menuAberto]);

  if (anexo.apagadoEm) {
    return (
      <div className="flex w-56 items-center gap-2 rounded-lg border border-dashed p-2 text-xs italic text-muted-foreground">
        <Trash2 className="size-4 shrink-0" />
        Anexo apagado
      </div>
    );
  }

  // O registro sobrevive à perda do arquivo (anexos anteriores à migração para o
  // Railway). Mostrar o nome num bloco neutro preserva o histórico do chamado sem
  // oferecer um link que só devolve erro.
  if (indisponivel) {
    return (
      <div
        className="flex w-56 items-center gap-2 rounded-lg border border-dashed p-2 text-xs italic text-muted-foreground"
        title={anexo.nomeArquivo}
      >
        <FileWarning className="size-4 shrink-0" />
        <span className="flex-1 truncate">{anexo.nomeArquivo}</span>
      </div>
    );
  }

  const menuButton = (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuAberto((v) => !v);
      }}
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full",
        isImagem
          ? "absolute top-1 right-1 bg-black/40 text-white hover:bg-black/60"
          : "text-current hover:bg-black/10"
      )}
      aria-label="Mais opções"
    >
      <MoreVertical className="size-4" />
    </button>
  );

  const menu = menuAberto && (
    <div className="absolute top-8 right-1 z-10 min-w-32 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
      <a
        href={`/api/anexos/${anexo.id}`}
        download={anexo.nomeArquivo}
        onClick={() => setMenuAberto(false)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
      >
        <Download className="size-3.5" />
        Baixar
      </a>
      {podeApagar && (
        <button
          type="button"
          onClick={apagar}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-destructive hover:bg-muted"
        >
          <Trash2 className="size-3.5" />
          Apagar
        </button>
      )}
    </div>
  );

  if (!isImagem) {
    return (
      <div className="relative w-56" ref={menuRef}>
        <a
          href={`/api/anexos/${anexo.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title={anexo.nomeArquivo}
          className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 p-2 pr-1 text-xs"
        >
          {anexo.tipo === "VIDEO" ? (
            <Video className="size-5 shrink-0" />
          ) : (
            <FileText className="size-5 shrink-0" />
          )}
          <span className="flex-1 truncate">{anexo.nomeArquivo}</span>
          {menuButton}
        </a>
        {menu}
        {erro && <p className="mt-1 text-[11px] text-destructive">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="relative w-fit max-w-full" ref={menuRef}>
      <a
        href={`/api/anexos/${anexo.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={anexo.nomeArquivo}
      >
        <img
          src={`/api/anexos/${anexo.id}`}
          alt={anexo.nomeArquivo}
          onError={() => setIndisponivel(true)}
          className="max-h-64 w-auto max-w-full rounded-lg border border-black/10 object-contain"
        />
      </a>
      {menuButton}
      {menu}
      {erro && <p className="mt-1 text-[11px] text-destructive">{erro}</p>}
    </div>
  );
}

function MessageForm({ chamadoId }: { chamadoId: string }) {
  const [state, formAction, pending] = useActionState(enviarMensagem, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [anexosKey, setAnexosKey] = useState(0);

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
      setAnexosKey((k) => k + 1);
    }
  }, [state]);

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-2" onKeyDown={handleFormKeyDown}>
      <input type="hidden" name="chamadoId" value={chamadoId} />
      <Textarea name="texto" rows={2} placeholder="Mensagem..." />
      <AnexosField key={anexosKey} compact />
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enviando..." : "Enviar"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Popover } from "@base-ui/react/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const DIAS_OPCOES = Array.from({ length: 15 }, (_, i) => i); // 0..14
const MAIS_DE_OPCOES = [1, 2, 3];

/**
 * Filtro da coluna "SLA (dias)" — diferente do MultiSelectFilter porque o
 * valor não vem de uma tabela finita (PDV, serviço...): é um número calculado
 * por linha, então além de marcar valores exatos precisa de atalhos "mais de
 * N" e um modo personalizado (dia específico ou intervalo).
 */
export function DiasAbertoFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const diasSelecionados = new Set((searchParams.get("dias") ?? "").split(",").filter(Boolean));
  const diasGt = searchParams.get("diasGt") ?? "";
  const diasDe = searchParams.get("diasDe") ?? "";
  const diasAte = searchParams.get("diasAte") ?? "";
  const ativo = diasSelecionados.size > 0 || !!diasGt || !!diasDe || !!diasAte;

  const [personalizadoTipo, setPersonalizadoTipo] = useState<"exato" | "intervalo">(
    diasDe && diasAte && diasDe === diasAte ? "exato" : "intervalo"
  );
  const [exatoInput, setExatoInput] = useState(diasDe && diasDe === diasAte ? diasDe : "");
  const [deInput, setDeInput] = useState(diasDe && diasDe !== diasAte ? diasDe : "");
  const [ateInput, setAteInput] = useState(diasAte && diasDe !== diasAte ? diasAte : "");

  function aplicar(params: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [chave, valor] of Object.entries(params)) {
      if (valor) next.set(chave, valor);
      else next.delete(chave);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function limparTudo() {
    aplicar({ dias: null, diasGt: null, diasDe: null, diasAte: null });
    setExatoInput("");
    setDeInput("");
    setAteInput("");
  }

  function toggleDia(dia: number) {
    const proximo = new Set(diasSelecionados);
    const chave = String(dia);
    if (proximo.has(chave)) proximo.delete(chave);
    else proximo.add(chave);
    aplicar({
      dias: proximo.size ? Array.from(proximo).join(",") : null,
      diasGt: null,
      diasDe: null,
      diasAte: null,
    });
  }

  function aplicarMaisDe(valor: number) {
    const chave = String(valor);
    aplicar({
      diasGt: diasGt === chave ? null : chave,
      dias: null,
      diasDe: null,
      diasAte: null,
    });
  }

  function aplicarExato() {
    const n = exatoInput.trim();
    if (!n) return;
    aplicar({ diasDe: n, diasAte: n, dias: null, diasGt: null });
  }

  function aplicarIntervalo() {
    const de = deInput.trim();
    const ate = ateInput.trim();
    if (!de && !ate) return;
    aplicar({ diasDe: de || null, diasAte: ate || null, dias: null, diasGt: null });
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "inline-flex items-center gap-1 text-sm font-medium hover:text-foreground",
          ativo && "text-primary"
        )}
      >
        SLA (dias)
        {ativo && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
        <ChevronDown className="size-3.5 shrink-0" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={4} className="isolate z-50 outline-none">
          <Popover.Popup className="z-50 w-72 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5 text-xs">
              <span className="font-semibold text-muted-foreground">Filtrar por dias em aberto</span>
              <button
                type="button"
                onClick={limparTudo}
                disabled={!ativo}
                className="text-muted-foreground hover:underline disabled:pointer-events-none disabled:opacity-50"
              >
                Limpar
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto border-b border-border p-2">
              <div className="grid grid-cols-5 gap-1">
                {DIAS_OPCOES.map((dia) => {
                  const selecionado = diasSelecionados.has(String(dia));
                  return (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={cn(
                        "rounded-md border px-1.5 py-1 text-xs",
                        selecionado
                          ? "border-primary bg-primary/15 font-medium text-primary"
                          : "border-input text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-0.5 border-b border-border p-2 text-sm">
              {MAIS_DE_OPCOES.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => aplicarMaisDe(valor)}
                  className={cn(
                    "rounded-md px-2 py-1 text-left hover:bg-accent",
                    diasGt === String(valor) && "bg-primary/15 font-medium text-primary"
                  )}
                >
                  Mais de {valor} dia{valor > 1 ? "s" : ""}
                </button>
              ))}
            </div>

            <div className="space-y-2 p-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground">Personalizado</p>
              <div className="flex gap-1 rounded-md bg-muted p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPersonalizadoTipo("exato")}
                  className={cn(
                    "flex-1 rounded px-2 py-1",
                    personalizadoTipo === "exato" && "bg-background shadow-sm"
                  )}
                >
                  Dia específico
                </button>
                <button
                  type="button"
                  onClick={() => setPersonalizadoTipo("intervalo")}
                  className={cn(
                    "flex-1 rounded px-2 py-1",
                    personalizadoTipo === "intervalo" && "bg-background shadow-sm"
                  )}
                >
                  De — até
                </button>
              </div>

              {personalizadoTipo === "exato" ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={exatoInput}
                    onChange={(e) => setExatoInput(e.target.value)}
                    placeholder="dias"
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <button
                    type="button"
                    onClick={aplicarExato}
                    className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Aplicar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={deInput}
                    onChange={(e) => setDeInput(e.target.value)}
                    placeholder="de"
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="number"
                    min={0}
                    value={ateInput}
                    onChange={(e) => setAteInput(e.target.value)}
                    placeholder="até"
                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <button
                    type="button"
                    onClick={aplicarIntervalo}
                    className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

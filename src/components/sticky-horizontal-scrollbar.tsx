"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Barra de rolagem horizontal fixa no rodapé da tela, sincronizada com o
 * container de rolagem alvo (ex.: uma tabela larga). Só aparece quando o
 * alvo realmente estiver rolável (ex.: com zoom da página aumentado) e some
 * quando o alvo não estiver visível na tela. A barra nativa do alvo só é
 * escondida enquanto esta barra estiver de fato visível, para o conteúdo
 * nunca ficar sem nenhuma forma de rolar.
 */
export function StickyHorizontalScrollbar({
  wrapperId,
}: {
  /** id de um elemento ancestral do container rolável (ex.: `[data-slot="table-container"]`). */
  wrapperId: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [rect, setRect] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const wrapper = document.getElementById(wrapperId);
    const target = wrapper?.querySelector<HTMLElement>('[data-slot="table-container"]');
    const bar = barRef.current;
    if (!target || !bar) return;

    function update() {
      if (!target) return;
      const overflow = target.scrollWidth > target.clientWidth + 1;
      const box = target.getBoundingClientRect();
      const emViewport = box.bottom > 0 && box.top < window.innerHeight;
      const proximaVisibilidade = overflow && emViewport;
      setVisible(proximaVisibilidade);
      setScrollWidth(target.scrollWidth);
      // A barra precisa ter exatamente a mesma largura visível do alvo, senão
      // o scrollLeft máximo de cada uma diverge e arrastar a barra até o fim
      // não faz a tabela rolar até o seu próprio fim.
      setRect({ left: box.left, width: target.clientWidth });
      target.classList.toggle("native-scrollbar-hidden", proximaVisibilidade);
    }

    update();

    const ro = new ResizeObserver(update);
    ro.observe(target);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    let syncing = false;
    function onTargetScroll() {
      if (syncing) return;
      syncing = true;
      bar!.scrollLeft = target!.scrollLeft;
      syncing = false;
    }
    function onBarScroll() {
      if (syncing) return;
      syncing = true;
      target!.scrollLeft = bar!.scrollLeft;
      syncing = false;
    }
    target.addEventListener("scroll", onTargetScroll, { passive: true });
    bar.addEventListener("scroll", onBarScroll, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      target.removeEventListener("scroll", onTargetScroll);
      bar.removeEventListener("scroll", onBarScroll);
      target.classList.remove("native-scrollbar-hidden");
    };
  }, [wrapperId]);

  return (
    <div
      className="fixed bottom-0 z-40 border-t border-border bg-background"
      style={{ left: rect.left, width: rect.width, display: visible ? "block" : "none" }}
    >
      <div ref={barRef} className="overflow-x-auto overflow-y-hidden">
        <div className="h-3" style={{ width: scrollWidth }} />
      </div>
    </div>
  );
}

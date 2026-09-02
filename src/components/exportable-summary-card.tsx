"use client";

import type { ReactNode } from "react";
import { downloadCsv } from "@/lib/csv-export";

/**
 * Envolve um SummaryCard (renderizado no servidor, para não cruzar componentes
 * de ícone pela fronteira client) e adiciona o clique para exportar o
 * detalhamento (CSV) dos chamados por trás do número mostrado.
 */
export function ExportableSummaryCard({
  children,
  csvFilename,
  csvHeaders,
  csvRows,
}: {
  children: ReactNode;
  csvFilename: string;
  csvHeaders: string[];
  csvRows: (string | number | null)[][];
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(csvFilename, csvHeaders, csvRows)}
      title="Clique para exportar o detalhamento em CSV"
      className="block w-full text-left transition-transform hover:-translate-y-0.5"
    >
      {children}
    </button>
  );
}

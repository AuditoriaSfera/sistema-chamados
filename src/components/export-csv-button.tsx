"use client";

import { Button } from "@/components/ui/button";

function toCsvValue(value: unknown) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[";\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null)[][];
}) {
  function handleExport() {
    const lines = [headers, ...rows].map((row) => row.map(toCsvValue).join(";"));
    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleExport}>
      Exportar CSV
    </Button>
  );
}

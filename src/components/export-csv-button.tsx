"use client";

import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";

export function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null)[][];
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => downloadCsv(filename, headers, rows)}
    >
      Exportar CSV
    </Button>
  );
}

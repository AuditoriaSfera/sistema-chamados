"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PdvVinculoBusca } from "./[id]/pdv-vinculo-busca";

export function VincularPdvsDialog({
  usuarioId,
  usuarioNome,
  pdvs,
  vinculadasIds,
}: {
  usuarioId: string;
  usuarioNome: string;
  pdvs: { id: string; codigo: string; nome: string }[];
  vinculadasIds: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        title="Vincular PDVs"
        onClick={() => setOpen(true)}
        className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
      >
        <Store className="size-3.5" />
        Vincular
      </Button>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>PDVs vinculados — {usuarioNome}</DialogTitle>
        </DialogHeader>
        <PdvVinculoBusca usuarioId={usuarioId} pdvs={pdvs} vinculadasIds={vinculadasIds} />
      </DialogContent>
    </Dialog>
  );
}

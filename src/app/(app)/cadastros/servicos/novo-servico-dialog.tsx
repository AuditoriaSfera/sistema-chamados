"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ServicoCreateForm } from "./servico-create-form";

type SlaPreset = { id: string; nome: string; duracao: number; unidade: string };

export function NovoServicoDialog({
  slaPresets,
}: {
  slaPresets: SlaPreset[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo serviço</Button>} />
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo serviço</DialogTitle>
        </DialogHeader>
        <ServicoCreateForm
          slaPresets={slaPresets}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

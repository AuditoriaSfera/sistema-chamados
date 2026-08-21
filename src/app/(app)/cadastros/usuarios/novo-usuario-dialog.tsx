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
import { UsuarioCreateForm } from "./usuario-create-form";

type Perfil = { id: string; nome: string };

export function NovoUsuarioDialog({ perfis }: { perfis: Perfil[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo usuário</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <UsuarioCreateForm perfis={perfis} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

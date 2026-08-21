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
import { PdvCreateForm } from "./pdv-create-form";

export function NovoPdvDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Novo PDV</Button>} />
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo PDV</DialogTitle>
        </DialogHeader>
        <PdvCreateForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

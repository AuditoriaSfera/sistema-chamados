"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ANEXO_MAX_QUANTIDADE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AnexosField({
  inputName = "anexos",
  compact = false,
}: {
  inputName?: string;
  compact?: boolean;
}) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const arquivoInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);
  const [cameraAberta, setCameraAberta] = useState(false);

  function sincronizarInputOculto(lista: File[]) {
    const dt = new DataTransfer();
    for (const f of lista) dt.items.add(f);
    if (hiddenInputRef.current) hiddenInputRef.current.files = dt.files;
  }

  function adicionarArquivos(novos: File[]) {
    if (novos.length === 0) return;
    setArquivos((atual) => {
      const combinados = [...atual, ...novos].slice(0, ANEXO_MAX_QUANTIDADE);
      sincronizarInputOculto(combinados);
      return combinados;
    });
  }

  function removerArquivo(index: number) {
    setArquivos((atual) => {
      const combinados = atual.filter((_, i) => i !== index);
      sincronizarInputOculto(combinados);
      return combinados;
    });
  }

  function abrirCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraFallbackInputRef.current?.click();
      return;
    }
    setCameraAberta(true);
  }

  return (
    <div className="space-y-2">
      <input
        ref={hiddenInputRef}
        type="file"
        name={inputName}
        multiple
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={arquivoInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,video/*"
        className="hidden"
        onChange={(e) => {
          const selecionados = Array.from(e.target.files ?? []);
          e.target.value = "";
          adicionarArquivos(selecionados);
        }}
      />
      <input
        ref={cameraFallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const selecionados = Array.from(e.target.files ?? []);
          e.target.value = "";
          adicionarArquivos(selecionados);
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon-sm" : "sm"}
          disabled={arquivos.length >= ANEXO_MAX_QUANTIDADE}
          onClick={() => arquivoInputRef.current?.click()}
          title="Anexar arquivo"
        >
          {compact ? <PaperclipIcon /> : "Anexar arquivo"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon-sm" : "sm"}
          disabled={arquivos.length >= ANEXO_MAX_QUANTIDADE}
          onClick={abrirCamera}
          title="Tirar foto"
        >
          {compact ? <CameraIcon /> : "Tirar foto"}
        </Button>
      </div>

      {arquivos.length > 0 && (
        <ul className={cn("space-y-1 text-sm", compact && "text-xs")}>
          {arquivos.map((f, i) => (
            <li key={`${f.name}-${f.lastModified}-${i}`} className="flex items-center justify-between gap-2">
              <span className="truncate">
                {f.name}{" "}
                <span className="text-xs text-muted-foreground">
                  ({(f.size / 1024 / 1024).toFixed(1)}MB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => removerArquivo(i)}
                className="text-xs text-destructive hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <CameraDialog
        open={cameraAberta}
        onOpenChange={setCameraAberta}
        onCapturar={(file) => adicionarArquivos([file])}
      />
    </div>
  );
}

function CameraDialog({
  open,
  onOpenChange,
  onCapturar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapturar: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    setErro(null);
    let cancelado = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setErro("Não foi possível acessar a câmera. Verifique as permissões do navegador."));
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapturar(file);
        onOpenChange(false);
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tirar foto</DialogTitle>
        </DialogHeader>
        {erro ? (
          <p className="text-sm text-destructive">{erro}</p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-video w-full rounded-lg bg-black object-cover"
          />
        )}
        <Button type="button" onClick={capturar} disabled={!!erro}>
          Capturar
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function PaperclipIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

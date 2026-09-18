import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Sem isso, o limite padrão do Next (1MB) rejeita a requisição ANTES de
      // createChamado/enviarMensagem rodarem — o formulário nem chega a
      // validar o anexo, só estoura um erro genérico de servidor. Os anexos
      // já têm seu próprio limite por tipo (src/lib/constants.ts): até 5 por
      // chamado, até 20MB cada em vídeo — o pior caso real é 5×20MB.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;

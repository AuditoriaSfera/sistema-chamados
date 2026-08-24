#!/usr/bin/env bash
# Sobe os 11 anexos legados para o volume do Railway (sistema-chamados-volume).
#
# Pré-requisitos:
#   npm i -g @railway/cli
#   railway login
#   railway link          # escolher: captivating-joy > production > sistema-chamados
#
# Rodar a partir da RAIZ do projeto, onde existe a pasta ./uploads
#
# Os caminhos no volume são relativos à raiz do volume, que está montado em
# /app/uploads no container. Ou seja, "/abc/x.png" aqui = "/app/uploads/abc/x.png" lá.

set -euo pipefail

if [ ! -d ./uploads ]; then
  echo "ERRO: pasta ./uploads não encontrada. Rode a partir da raiz do projeto." >&2
  exit 1
fi

faltando=0

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/7266ade3-a8ef-4e56-8250-ac695057e3dc.pdf" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/7266ade3-a8ef-4e56-8250-ac695057e3dc.pdf"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/7266ade3-a8ef-4e56-8250-ac695057e3dc.pdf" "/cmsusgruk000l4go39c0xg5dt/7266ade3-a8ef-4e56-8250-ac695057e3dc.pdf" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/7266ade3-a8ef-4e56-8250-ac695057e3dc.pdf" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/22784b66-0a42-48d8-bf83-d698846ef4d2.pdf" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/22784b66-0a42-48d8-bf83-d698846ef4d2.pdf"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/22784b66-0a42-48d8-bf83-d698846ef4d2.pdf" "/cmsusgruk000l4go39c0xg5dt/22784b66-0a42-48d8-bf83-d698846ef4d2.pdf" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/22784b66-0a42-48d8-bf83-d698846ef4d2.pdf" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/1d17dd2d-341e-4f96-9f8f-4564373d4860.png" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/1d17dd2d-341e-4f96-9f8f-4564373d4860.png"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/1d17dd2d-341e-4f96-9f8f-4564373d4860.png" "/cmsusgruk000l4go39c0xg5dt/1d17dd2d-341e-4f96-9f8f-4564373d4860.png" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/1d17dd2d-341e-4f96-9f8f-4564373d4860.png" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/0695b46a-8ca4-4afe-9cbf-8fd215430412.png" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/0695b46a-8ca4-4afe-9cbf-8fd215430412.png"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/0695b46a-8ca4-4afe-9cbf-8fd215430412.png" "/cmsusgruk000l4go39c0xg5dt/0695b46a-8ca4-4afe-9cbf-8fd215430412.png" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/0695b46a-8ca4-4afe-9cbf-8fd215430412.png" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/60c1de99-23df-420f-ac43-618d7ffe2181.png" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/60c1de99-23df-420f-ac43-618d7ffe2181.png"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/60c1de99-23df-420f-ac43-618d7ffe2181.png" "/cmsusgruk000l4go39c0xg5dt/60c1de99-23df-420f-ac43-618d7ffe2181.png" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/60c1de99-23df-420f-ac43-618d7ffe2181.png" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/2fb7f09f-5215-4473-84bf-cd3adcc39ebc.jpeg" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/2fb7f09f-5215-4473-84bf-cd3adcc39ebc.jpeg"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/2fb7f09f-5215-4473-84bf-cd3adcc39ebc.jpeg" "/cmsusgruk000l4go39c0xg5dt/2fb7f09f-5215-4473-84bf-cd3adcc39ebc.jpeg" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/2fb7f09f-5215-4473-84bf-cd3adcc39ebc.jpeg" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/883092ec-58ad-4fcc-8363-a576d74ecf4f.jpeg" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/883092ec-58ad-4fcc-8363-a576d74ecf4f.jpeg"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/883092ec-58ad-4fcc-8363-a576d74ecf4f.jpeg" "/cmsusgruk000l4go39c0xg5dt/883092ec-58ad-4fcc-8363-a576d74ecf4f.jpeg" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/883092ec-58ad-4fcc-8363-a576d74ecf4f.jpeg" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/d7aace68-e15a-4503-bf69-24f754188a61.jpeg" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/d7aace68-e15a-4503-bf69-24f754188a61.jpeg"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/d7aace68-e15a-4503-bf69-24f754188a61.jpeg" "/cmsusgruk000l4go39c0xg5dt/d7aace68-e15a-4503-bf69-24f754188a61.jpeg" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/d7aace68-e15a-4503-bf69-24f754188a61.jpeg" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/0cd3e449-7461-4cfd-9cc0-071144e7a2b2.jpeg" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/0cd3e449-7461-4cfd-9cc0-071144e7a2b2.jpeg"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/0cd3e449-7461-4cfd-9cc0-071144e7a2b2.jpeg" "/cmsusgruk000l4go39c0xg5dt/0cd3e449-7461-4cfd-9cc0-071144e7a2b2.jpeg" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/0cd3e449-7461-4cfd-9cc0-071144e7a2b2.jpeg" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsusgruk000l4go39c0xg5dt/6ed11080-14b0-4b3c-b973-eaadb6ef46ae.png" ]; then
  echo "-> cmsusgruk000l4go39c0xg5dt/6ed11080-14b0-4b3c-b973-eaadb6ef46ae.png"
  railway volume files upload "uploads/cmsusgruk000l4go39c0xg5dt/6ed11080-14b0-4b3c-b973-eaadb6ef46ae.png" "/cmsusgruk000l4go39c0xg5dt/6ed11080-14b0-4b3c-b973-eaadb6ef46ae.png" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsusgruk000l4go39c0xg5dt/6ed11080-14b0-4b3c-b973-eaadb6ef46ae.png" >&2; faltando=$((faltando+1))
fi

if [ -f "uploads/cmsuskte5000o4go3wgcq89si/a20a9c25-a508-4b25-bcb0-626161264b88.png" ]; then
  echo "-> cmsuskte5000o4go3wgcq89si/a20a9c25-a508-4b25-bcb0-626161264b88.png"
  railway volume files upload "uploads/cmsuskte5000o4go3wgcq89si/a20a9c25-a508-4b25-bcb0-626161264b88.png" "/cmsuskte5000o4go3wgcq89si/a20a9c25-a508-4b25-bcb0-626161264b88.png" -s sistema-chamados
else
  echo "AUSENTE: uploads/cmsuskte5000o4go3wgcq89si/a20a9c25-a508-4b25-bcb0-626161264b88.png" >&2; faltando=$((faltando+1))
fi

echo
if [ "$faltando" -gt 0 ]; then
  echo "$faltando arquivo(s) não encontrado(s) localmente."
fi
echo "Conferir o que subiu:"
echo "  railway volume files list / -s sistema-chamados"

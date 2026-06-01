# Nota Fiscal Eletrônica (NF-e)

**Categoria:** dominio
**Última atualização:** 2026-06-01

## Status no Projeto

- ✅ Emissão interna de NF (controle próprio, não NF-e fiscal)
- ⚠️ NF-e via Focus NFe: **pré-requisito de lançamento** — ainda não implementado

## NF-e via Focus NFe

Integração planejada com a API Focus NFe para emissão de NF-e com validade fiscal. É bloqueante para o lançamento em clientes que exigem nota fiscal.

## Fluxo Atual (NF interna)

`Rascunho → Confirmado → Faturado → Cancelado`

- Numeração atômica via `runTransaction` no Firestore (sem duplicatas com usuários simultâneos)
- Impressão em PDF
- Baixa de estoque automática
- Lançamento em contas a receber

## Links Relacionados
- [[../modulos/notas]]
- [[../modulos/devolucoes]]

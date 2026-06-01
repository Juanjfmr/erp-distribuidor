# Múltiplos Estoques / Depósitos

**Prioridade:** 🟠 Alto  
**Status:** [ ] Pendente

## Problema

Hoje há um único estoque global por empresa. Não é possível separar por filial, depósito ou loja.

## Solução

Adicionar campo `depositoId` em `products[].estoque` como mapa `{ depositoId: quantidade }` em vez de um número único. Depósitos são configurados em `state.company.depositos[]`.

## Impacto

Módulos afetados: `produtos.js`, `notas.js`, `compras.js`, `devolucoes.js`, `pedidos.js`, `dashboard.js` (alertas de estoque baixo).

## Tasks

- [ ] Adicionar `depositos[]` em `config.js` (configuração da empresa)
- [ ] Migrar `produto.estoque` (número) → `produto.estoques` (objeto `{depositoId: qty}`)
- [ ] Criar helper `getEstoque(produto, depositoId)` em `state.js`
- [ ] Atualizar emissão de NF para debitar do depósito correto
- [ ] Atualizar compras para creditar no depósito correto
- [ ] Atualizar alertas de estoque no `dashboard.js`
- [ ] Migração de dados existentes (estoque atual → depósito padrão)
- [ ] Testar
- [ ] Commitar

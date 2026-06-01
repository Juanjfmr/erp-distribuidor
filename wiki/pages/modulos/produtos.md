# Módulo: Produtos

**Categoria:** modulos
**Última atualização:** 2026-06-01
**Arquivo:** `js/modules/produtos.js`

## Função
Catálogo de produtos, controle de estoque, histórico de preços, movimentações e scanner de código de barras.

## Funcionalidades
- Cadastro com código de barras (scanner integrado)
- Histórico de preços de compra
- Movimentações de estoque (entrada/saída)
- Categorias e unidades configuráveis via `getCatProd()` e `getUnits()` (leem de `state.company` com fallback para defaults)

## Gaps Conhecidos
- [ ] Foto de produto (baixa prioridade)
- [ ] Múltiplos estoques/depósitos (alta prioridade)

## Links Relacionados
- [[compras]]
- [[notas]]
- [[../dominio/curva-abc]]

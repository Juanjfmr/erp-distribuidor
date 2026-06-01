# DRE — Demonstrativo de Resultado do Exercício

**Prioridade:** 🟠 Alto  
**Status:** [ ] Pendente

## Problema

Hoje só há visão de fluxo de caixa (entradas/saídas). Não há cálculo de lucro líquido real (receita bruta − custo dos produtos − despesas operacionais).

## Solução

Adicionar aba "DRE" no módulo `relatorios.js` que agrupa:
- Receita bruta (NFs emitidas no período)
- Deduções (devoluções, cancelamentos)
- Custo dos produtos vendidos (CPV — via `stockMovements` com custo de compra)
- Lucro bruto
- Despesas operacionais (contas a pagar pagas no período)
- Lucro líquido

## Pré-requisito

Produtos precisam ter `custoUnitario` preenchido para o CPV ser preciso. Hoje o campo pode estar zerado.

## Tasks

- [ ] Verificar se `custoUnitario` está sendo salvo nas compras (`compras.js`)
- [ ] Criar função `calcDRE(startDate, endDate)` em `relatorios.js`
- [ ] Renderizar tabela DRE com agrupamento mensal opcional
- [ ] Adicionar filtro de período (mês/trimestre/ano)
- [ ] Testar com dados reais
- [ ] Commitar

# Exportação de Relatórios CSV/Excel

**Prioridade:** 🟡 Médio  
**Status:** [ ] Pendente

## Problema

Não é possível exportar dados para análise externa em planilhas.

## Solução

Adicionar botão "Exportar CSV" nos módulos de relatórios, clientes, produtos e NFs. CSV é gerado no browser via `Blob` + `URL.createObjectURL` — sem backend necessário.

## Tasks

- [ ] Criar helper `exportCSV(filename, headers, rows)` em `state.js`
- [ ] Adicionar botão exportar em `relatorios.js` (visão geral, Curva ABC)
- [ ] Adicionar botão exportar em `notas.js` (lista de NFs)
- [ ] Adicionar botão exportar em `clientes.js`
- [ ] Adicionar botão exportar em `produtos.js`
- [ ] Testar geração e download
- [ ] Commitar

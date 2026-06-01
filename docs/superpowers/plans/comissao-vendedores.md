# Comissão de Vendedores

**Prioridade:** 🟠 Alto  
**Status:** [ ] Pendente

## Problema

Vendedores não têm comissão calculada automaticamente sobre NFs emitidas.

## Solução

Adicionar `percentualComissao` no cadastro de usuários (role vendedor). Ao emitir NF, registrar `comissao = valorNF * percentual` em `transactions` com tipo `comissao`. Relatório de comissões por vendedor/período.

## Tasks

- [ ] Adicionar campo `percentualComissao` em `usuarios.js`
- [ ] Ao emitir NF em `notas.js`, calcular e salvar comissão na transação
- [ ] Criar seção "Comissões" em `relatorios.js` com filtro por vendedor e período
- [ ] Testar
- [ ] Commitar

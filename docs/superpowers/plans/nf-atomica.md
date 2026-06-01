# Numeração Atômica de NF

**Prioridade:** 🔴 Crítico  
**Status:** ✅ Concluído (commit `151396a`)

## Problema

`invoices.length + 1` quebra com usuários simultâneos — dois usuários podem gerar a mesma numeração de NF.

## Solução

`runTransaction` no Firestore para ler e incrementar o contador atomicamente em `/empresas/{companyId}/meta/nfCounter`.

## Tasks

- [x] Criar campo `nfCounter` em `/empresas/{companyId}`
- [x] Substituir `invoices.length + 1` por `runTransaction` em `notas.js`
- [x] Testar com múltiplos usuários simultâneos
- [x] Commitar

# ADR-001: Firebase Single Document por Tenant

**Categoria:** decisoes
**Última atualização:** 2026-06-01
**Status:** Ativo — revisar quando gatilho de migração for atingido

## Decisão

Todos os dados de uma empresa ficam num único documento Firestore:
```
/empresas/{companyId}  ← produtos, clientes, NFs, etc. tudo aqui
```

## Contexto

Sistema multi-tenant onde cada empresa (tenant) é isolada por `companyId`. No início do projeto, a simplicidade de uma única leitura (`onSnapshot`) para carregar todo o estado foi priorizada sobre escalabilidade.

## Consequências

**Positivas:**
- Um único `onSnapshot` carrega tudo — código simples
- Regras de segurança simples: só o tenant acessa seu doc
- Zero custo de múltiplas leituras no Firestore

**Negativas:**
- Limite de 1MB por documento no Firestore
- Filtros feitos no JS após carregar (não no Firestore)
- Não é possível paginar dados

## Gatilho para Migração

| Sinal | Ação |
|---|---|
| Documento de qualquer tenant atingir ~500KB | Iniciar ADR-003 |
| Cliente com >3.000 produtos ou >5.000 NFs | Avaliar imediatamente |
| Reclamação de lentidão no carregamento | Checar tamanho no Firebase Console |

> **Como verificar:** Firebase Console → Firestore → `/empresas/{companyId}` → tamanho no canto superior direito.

## Links Relacionados
- [[ADR-003-migracao-subcollections]]

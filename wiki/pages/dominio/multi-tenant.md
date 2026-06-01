# Multi-tenant

**Categoria:** dominio
**Última atualização:** 2026-06-01
**Fontes:** [[../../raw/]] (CLAUDE.md)

## Resumo

Cada empresa cliente tem seus dados completamente isolados. O isolamento é feito por `companyId` no Firestore e nas regras de segurança.

## Como Funciona

- Ao fazer login, o sistema identifica o `companyId` do usuário
- Todas as leituras/escritas no Firestore usam `/empresas/{companyId}`
- As regras de segurança (`firestore.rules`) garantem que um tenant não acessa dados de outro

## Roles por Tenant

| Role | Acesso |
|---|---|
| `admin` | Tudo |
| `vendedor` | Tudo exceto Config e Usuários |
| `visualizador` | Apenas Dashboard e Relatórios |

## Links Relacionados
- [[../decisoes/ADR-001-firebase-single-doc]]
- [[planos-saas]]

# ADR-003: Migração para Subcoleções Firestore

**Categoria:** decisoes
**Última atualização:** 2026-06-01
**Status:** Pendente — executar quando gatilho do ADR-001 for atingido

## Decisão (futura)

Migrar de single-document para subcoleções por entidade:

```
/empresas/{companyId}/products/{id}
/empresas/{companyId}/clients/{id}
/empresas/{companyId}/invoices/{id}
...
```

## Impacto nas Queries

| Hoje | Depois |
|---|---|
| `onSnapshot(docRef)` — carrega tudo | `onSnapshot(query)` por coleção |
| Filtros no JS | Filtros no Firestore (índices) |
| 1 leitura por sync | N leituras (uma por subcoleção) — impacta custo |

## Impacto nas Regras de Segurança

As regras atuais (simples) precisarão ser expandidas para cada subcoleção. Exemplo:
```
match /empresas/{companyId}/products/{id} {
  allow read, write: if isOwner(companyId);
}
```
Oportunidade para granularidade por role (ex: vendedor não acessa `/config`).

## Estimativa de Esforço

1-2 dias de trabalho. Não é urgente.

## Links Relacionados
- [[ADR-001-firebase-single-doc]]

# ADR-002: ES Modules Nativos sem Framework de UI

**Categoria:** decisoes
**Última atualização:** 2026-06-01
**Status:** Ativo

## Decisão

Frontend em HTML + JS puro com ES Modules nativos. Sem React, Vue, Angular ou qualquer framework.

## Contexto

O projeto roda via servidor HTTP (não `file://`), o que permite ES Modules nativos no browser. A escolha foi feita para manter bundle zero e carregamento rápido.

## Estrutura

```
js/
├── core/      ← state, auth, firebase, router
└── modules/   ← um arquivo por módulo do ERP (18 arquivos)
index.html     ← apenas shell, sem lógica
```

## Consequências

**Positivas:**
- Bundle zero — sem build step
- Carregamento rápido
- Sem dependência de ecossistema externo
- Fácil de entender e manter por qualquer dev

**Negativas:**
- Sem reatividade automática — atualizações de UI são manuais
- Sem componentes reutilizáveis formais
- Escala difícil para PDV/mobile (que precisarão de framework)

## Ponto de Revisão

Quando PDV ou app mobile entrar em pauta, avaliar migração para React/Vue com camada `services/` compartilhada.

## Links Relacionados
- [[ADR-001-firebase-single-doc]]

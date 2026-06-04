# Setup do Wiki

**Categoria:** dominio
**Última atualização:** 2026-06-01
**Fontes:** sessão de configuração 2026-06-01

## Como opera este wiki

Padrão llm-wiki de Andrej Karpathy. O agente (Claude) mantém as páginas; o humano adiciona fontes em `raw/` e faz perguntas.

- **Ingest:** "ingest no wiki" → Claude atualiza páginas com o que foi discutido
- **Query:** perguntas respondidas com base nas páginas existentes
- **Lint:** "lint no wiki" → Claude verifica orphans, contradições, links quebrados

## Integração Obsidian

- Vault registrado como: **`wiki`**
- Caminho: `C:\Users\juana\Claudecode\erp-distribuidor\wiki`
- Link direto: `obsidian://open?vault=wiki&file=SCHEMA`

## Stop Hook

Configurado em `.claude/settings.json` do projeto. Ao final de cada sessão, exibe lembrete para ingest se houver decisões relevantes.

## Links Relacionados
- [[../../SCHEMA]]
- [[../../index]]

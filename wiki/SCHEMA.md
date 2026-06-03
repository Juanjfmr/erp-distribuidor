# Wiki Schema — Stoqio

> Padrão llm-wiki de Andrej Karpathy (gist: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
>
> Este arquivo é o **arquivo de instrução do agente**. Cole-o no início de qualquer sessão com o LLM para que ele saiba como operar o wiki. Os humanos adicionam fontes em `raw/` e fazem perguntas; o LLM cuida da manutenção.

---

## Estrutura do Wiki

```
wiki/
├── SCHEMA.md          ← este arquivo (instrução para o agente)
├── index.md           ← catálogo de páginas por categoria
├── log.md             ← registro append-only de ingests, queries e manutenção
├── raw/               ← fontes imutáveis — NUNCA editar após adicionar
└── pages/
    ├── modulos/       ← uma página por módulo do ERP
    ├── dominio/       ← conceitos de negócio
    └── decisoes/      ← ADRs (Architecture Decision Records)
```

---

## Operação: Ingest

**Quando usar:** sempre que um novo arquivo for adicionado em `raw/`.

**Passos:**
1. Ler o arquivo fonte
2. Extrair conhecimento relevante e takeaways principais
3. Criar ou atualizar páginas em `pages/` com resumo, contexto e links cruzados
4. Identificar e registrar contradições com páginas existentes
5. Atualizar `index.md` se página nova foi criada
6. Registrar em `log.md`:
   ```
   [YYYY-MM-DD] INGEST: <arquivo> → <páginas afetadas>
   ```

---

## Operação: Query

**Quando usar:** ao receber uma pergunta sobre o projeto.

**Passos:**
1. Buscar páginas relevantes em `pages/`
2. Sintetizar resposta **a partir do wiki** (não de conhecimento geral) — citar a página fonte
3. Se a resposta for valiosa e ainda não está no wiki, gravá-la como nota na página relevante
4. Registrar em `log.md`:
   ```
   [YYYY-MM-DD] QUERY: <pergunta resumida>
   ```

---

## Operação: Lint

**Quando usar:** periodicamente ou quando solicitado.

**Verificar:**
- [ ] Contradições entre páginas
- [ ] Páginas órfãs (sem nenhum link apontando para elas)
- [ ] Claims sem citação de fonte
- [ ] Links quebrados (`[[página]]` que não existe)
- [ ] `index.md` desatualizado (páginas novas não listadas)
- [ ] Entradas no `log.md` sem data

---

## Convenção de Página

Toda página em `pages/` deve seguir este formato:

```markdown
# Título

**Categoria:** modulos | dominio | decisoes
**Última atualização:** YYYY-MM-DD
**Fontes:** [[../../raw/arquivo]] ou link externo

## Resumo
Uma frase descrevendo o que esta página cobre.

## Detalhes
...

## Gaps / Pendências
- [ ] item pendente

## Links Relacionados
- [[outra-pagina]]
```

---

## Filosofia Central (Karpathy)

> "O wiki é um artefato persistente e cumulativo."

Em vez de re-derivar conhecimento a cada query (o padrão RAG), as conexões, contradições e sínteses **se acumulam**. Humanos dirigem a análise e curadoria; o LLM cuida da manutenção — atualizando referências cruzadas, mantendo consistência e fazendo o bookkeeping entre páginas.

---

## Integração Obsidian

- Abra `wiki/` como vault no Obsidian
- Links `[[wikilink]]` funcionam nativamente
- O graph view mostra as conexões entre páginas automaticamente
- Git para versionamento das páginas

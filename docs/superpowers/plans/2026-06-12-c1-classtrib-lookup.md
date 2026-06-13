# Plano — Task C-1: motor de classificação tributária (destrava o robô)

**Data:** 2026-06-12
**Spec mãe:** `docs/superpowers/specs/2026-06-12-ia-copiloto-reforma-e-acoes.md`
**Branch:** v2
**Escopo desta task:** a camada **read-only** que sugere `cClassTrib` por produto. Não inclui gravação em lote (C-2) nem UI (C-2/C-3). É a fundação que o resto do copiloto consome.

---

## 0. Por que esta task destrava o "robô"

O agente só pode "agir" com segurança se a sugestão dele vier de **fonte oficial determinística**, não de palpite do LLM. C-1 constrói exatamente esse motor confiável. Depois dele, o LLM só embrulha a resposta em linguagem natural — o número certo vem daqui.

---

## 1. O que descobrimos sobre o cClassTrib (fundamenta o algoritmo)

- `cClassTrib` tem **6 dígitos**; os **3 primeiros são o CST-IBS/CBS**. (Fonte: IT 2025.002.)
- CST relevantes: `000` tributação integral · `010/011` alíquotas uniformes · `200` alíquota reduzida · `220` alíquota fixa · `400` isenção · `410` imunidade/não incidência · `510/515` diferimento · `550` suspensão · `620` monofásica · `800/810/811` crédito.
- Para tributação integral (CST `000`): `000001` = tributada integralmente (o **default da maioria**). `000002`–`000005` são casos especiais (exploração de via, regimes automotivos, biocombustíveis).
- Cada par (CST, cClassTrib) aponta para um **dispositivo da LC 214/2025**.
- Tabela **oficial, versionada** (já em v1.30), baixável no **Portal Nacional NF-e → Documentos → Diversos** (ou SVRS).

**Consequência para o algoritmo:** o que decide o código não é o NCM sozinho — é a **situação tributária** do produto. Produto comum, sem benefício → `000001`. O que tira do default é o NCM cair numa **lista de tratamento especial** (cesta básica, redução 60%, isenção, monofásico). Por isso são necessárias **duas** bases de referência.

---

## 2. Bases de referência a adquirir e versionar (o bloqueante real)

| # | Base | Para quê | Fonte | Status |
|---|---|---|---|---|
| R1 | **Tabela cClassTrib + CST** (código → descrição → dispositivo legal) | traduzir código em explicação; validar que o código existe | Portal Nacional NF-e (IT 2025.002, Excel) | **a obter** |
| R2 | **Listas de NCM com tratamento especial** (cesta básica nacional, redução 60%, isenções, monofásico) | saber quando NÃO defaultar para `000001` | Anexos da LC 214/2025 / regulamentação | **a obter** |

> **Decisão de escopo do MVP:** se R2 não estiver pronta a tempo, o motor entrega **só os casos padrão** (default `000001`) e marca **todo NCM ainda não verificado** como "a revisar" — conservador, nunca classifica errado. R2 vai sendo preenchida em iterações. R1 é bloqueante duro; R2 é incremental.

Guardar ambas versionadas em `js/services/` (ou Firestore de config global, leitura pública) com um campo `versaoTabela` (ex.: `IT2025.002-v1.30`) para auditoria e atualização.

---

## 3. Arquivos desta task

| Arquivo | Papel |
|---|---|
| `js/services/classTribTable.js` (novo) | R1 — tabela cClassTrib/CST como dado versionado + helper de descrição |
| `js/services/ncmEspecial.js` (novo) | R2 — conjuntos de NCM com tratamento especial (incremental) |
| `functions/classTrib.js` (novo) | motor de classificação: `classificarProduto(produto)` puro + callable `sugerirClassTrib` |
| `functions/_businessContext.js` | (pré-req, vem antes) contexto compartilhado extraído de aiChat/aiPlaybook |

---

## 4. O motor — `classificarProduto(produto)` (função pura, testável)

Entrada: `{ id, name, ncm, cClassTrib, st, origem, ... }`. Saída estruturada:

```
{
  produtoId,
  nivel: 'padrao' | 'revisar' | 'sem_ncm' | 'ja_classificado',
  cstSugerido: '000' | null,
  cClassTribSugerido: '000001' | null,
  confianca: 'alta' | 'media' | null,
  motivo: 'Tributação integral — sem tratamento especial para o NCM 1234.56.78',
  dispositivoLegal: 'LC 214/2025 art. ...',   // de R1
  versaoTabela: 'IT2025.002-v1.30'
}
```

Lógica de tiering (ordem de avaliação):

1. `cClassTrib` já preenchido e válido em R1 → `nivel: 'ja_classificado'` (não mexe).
2. `ncm` vazio/inválido → `nivel: 'sem_ncm'`, sem sugestão (pede NCM primeiro).
3. NCM presente **e** está em R2 (tratamento especial) → `nivel: 'revisar'`, sem preencher, motivo explica o tipo de tratamento e recomenda contador.
4. NCM presente e **não** está em R2 → `nivel: 'padrao'`, `cstSugerido:'000'`, `cClassTribSugerido:'000001'`, `confianca:'alta'`.

Regras:
- A função **nunca grava** — só classifica.
- Nunca retorna código que não exista em R1 (validação dura).
- Determinística: mesmo produto → mesma saída. O LLM não entra aqui.

---

## 5. O callable — `sugerirClassTrib` (read-only)

- `functions/classTrib.js` exporta `sugerirClassTrib` (onCall), mesma trava de auth/`companyId` do `aiChat.js`.
- Entrada: opcional `produtoIds[]` (default: todos os produtos da empresa sem `cClassTrib`).
- Carrega produtos via contexto compartilhado, roda `classificarProduto` em cada um, retorna:

```
{
  versaoTabela,
  resumo: { padrao: 41, revisar: 6, sem_ncm: 0, ja_classificado: 312 },
  itens: [ <saída de classificarProduto>, ... ]
}
```

- **Sem LLM nesta task.** A explicação em linguagem natural fina (desambiguação) é da C-2; aqui o `motivo` é gerado por template a partir de R1/R2. Mantém C-1 barata, determinística e testável.

---

## 6. Casos de borda

- NCM com formatação suja (com/sem pontuação) → normalizar antes do lookup (só dígitos).
- Produto inativo (`active:false`) → ignorar no resumo.
- R1 desatualizada vs. código já gravado no produto que não existe mais na tabela → marcar `ja_classificado` mas com flag `codigoDesconhecido:true` (alerta de revisão futura).
- Empresa sem produtos → resumo zerado, sem erro.

---

## 7. Critérios de verificação (definição de pronto)

1. `classificarProduto` coberto por testes: um produto comum → `000001`/alta; um NCM de cesta básica (de R2) → `revisar`; produto sem NCM → `sem_ncm`; produto já com `cClassTrib` → `ja_classificado`. **Rodar e confirmar a saída real.**
2. `sugerirClassTrib` retorna resumo coerente para a conta de teste (`hermes@gmail.com` / companyId `9wtsr1KH8KbtUCqn57ivUHdwbrG2`).
3. Nenhum código sugerido fora de R1 (assert no teste).
4. Função não grava nada (verificar que a base de produtos não muda após chamar).
5. `versaoTabela` presente em toda saída.

---

## 8. Ordem de execução

1. (pré-req) extrair `functions/_businessContext.js` → verify: aiChat/aiPlaybook seguem ok.
2. Obter R1 (tabela oficial) → `classTribTable.js` com `versaoTabela`.
3. Esboçar R2 com o mínimo conhecido (cesta básica nacional) → `ncmEspecial.js`; resto entra incremental.
4. `classificarProduto` puro + testes (critério 1).
5. `sugerirClassTrib` callable + teste na conta de teste (critério 2).
6. Commit.

> **Pendência externa que só você resolve:** baixar o Excel oficial da tabela cClassTrib (Portal Nacional NF-e) e a lista de NCM da cesta básica/reduções. Sem R1 não dá pra cravar `classTribTable.js`. Me passa o arquivo (ou confirmo que posso buscar a versão pública) e eu monto a tabela versionada.

---

## Fontes
- [Informe Técnico RT 2025.002 – Tabela cClassTrib (Tecnospeed)](https://blog.tecnospeed.com.br/tabela-cclasstrib/)
- [CClassTrib — Tabela de Códigos CST IBS e CBS (Taxcel)](https://taxcel.com.br/cclass-cst-ibs-cbs)
- [Informe técnico detalha tabelas de classificação, CST e crédito presumido (SEFIN-RO)](https://reformatributaria.sefin.ro.gov.br/2026/04/22/informe-tecnico-detalha-tabelas-de-classificacao-tributaria-cst-e-credito-presumido-do-ibs-e-da-cbs/)
- [CG-IBS e RFB atualizam tabela de códigos de classificação tributária (Machado Meyer)](https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/tributario-ij/cg-ibs-e-rfb-atualizam-tabela-de-codigos-de-classificacao-tributaria-do-ibs-e-da-cbs)

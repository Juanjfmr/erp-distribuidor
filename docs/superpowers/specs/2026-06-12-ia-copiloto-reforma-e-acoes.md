# Spec — IA Stoqio: Copiloto da Reforma + Insight→Ação

**Data:** 2026-06-12
**Status:** Pronto para planejar
**Branch:** v2
**Objetivo:** Tirar o assistente do estado read-only (só responde) e dar a ele utilidade que vira diferencial de mercado. Duas frentes: **B — alertas acionáveis** e **C — copiloto da Reforma Tributária**.
**Relacionado:** `2026-06-12-reforma-tributaria-ibs-cbs.md` (estrutura IBS/CBS dormente, flag `ATIVO=false`), `2026-06-12-marketing-posicionamento.md` (a IA é pilar de diferenciação).

---

## 0. Princípio que vale para as duas frentes

A IA hoje (`functions/aiChat.js`, `functions/aiPlaybook.js`) só lê dados e devolve texto. O salto é deixá-la **propor uma ação concreta e executá-la sob confirmação**. Regras inegociáveis:

- **Nunca grava sem confirmação do usuário.** Toda escrita (preencher campo, gerar cobrança, dar baixa) passa por um passo de confirmação explícito — individual ou em lote.
- **Nunca se posiciona como consultoria tributária.** Sugere, explica o porquê e pede validação. A decisão é do usuário/contador. (Ver risco registrado em [[oportunidade-reforma-tributaria]].)
- **Toda ação executada fica registrada** (quem, quando, o quê) para auditoria.
- A IA opera só dentro do `companyId` do usuário autenticado (mesma trava de `aiChat.js`).

---

## 1. Direção B — Alertas acionáveis (Insight → Ação)

### Hoje
`aiPlaybook.js` analisa a operação e devolve alertas estruturados (inadimplência, estoque no limite, faturamento abaixo da média). O usuário lê e... vai resolver na mão, em outro módulo.

### Mudança
Cada alerta carrega uma **ação sugerida** com um botão. O alerta deixa de ser aviso e vira ponto de partida da resolução.

| Alerta (já existe) | Ação acionável (nova) | Backend que executa |
|---|---|---|
| Inadimplência: X clientes, R$ Y vencido | "Gerar cobranças Pix dos vencidos" | Integração Asaas já existente (Contas → A Receber gera Pix/boleto por CNPJ) |
| Estoque no limite: produto Z | "Criar ordem de compra" / "Ver produto" | Abre Compras pré-preenchido ou módulo Produtos |
| Parcelas a vencer em 7 dias | "Ver contas a receber" / "Antecipar cobrança" | Contas + Asaas |
| Faturamento abaixo da média | "Ver relatório" (só navegação) | Relatórios |

### Comportamento
- Ação de **navegação** (abrir módulo filtrado): executa direto, sem confirmação (não grava nada).
- Ação que **grava/dispara** (gerar cobrança, criar OC): mostra resumo + confirmação antes. Cobrança em lote ("gerar Pix dos 3 vencidos") permite confirmar o lote de uma vez, listando cliente + valor.
- O `aiPlaybook.js` passa a retornar, por alerta: `{ tipo, severidade, texto, acao: { label, kind: 'nav'|'write', target, payload } }`. O frontend renderiza o botão conforme `kind`.

### Escopo desta fase
- Implementar as ações de **inadimplência → cobrança Pix em lote** (maior valor, base Asaas pronta) e **estoque → navegação para compra**.
- As demais ações entram como navegação simples primeiro; escrita fica para iteração seguinte.

---

## 2. Direção C — Copiloto da Reforma Tributária (cClassTrib)

### Problema
A nota nova (IBS/CBS) exige `cClassTrib` (Código de Classificação Tributária) por produto. Produtos sem esse campo vão falhar/sair errado quando a obrigatoriedade chegar. O campo já existe no cadastro (`js/modules/produtos.js`) mas fica vazio na base atual.

### O que o copiloto faz
Varre os produtos da empresa e classifica cada um sem `cClassTrib` em **3 níveis de confiança**:

1. **Caso padrão (tributação integral)** — NCM/CST sem benefício conhecido. Sugere o código padrão com **alta confiança**. Elegível a preenchimento **em lote**.
2. **Caso a revisar** — NCM com possível tratamento diferenciado (alíquota reduzida, isenção, cesta básica, monofásico). **Não preenche.** Sinaliza "confirme com seu contador" e oferece preenchimento individual após o usuário escolher.
3. **Sem NCM** — produto sem NCM cadastrado. Bloqueia a sugestão e pede para preencher o NCM primeiro (é o insumo da classificação).

### Arquitetura anti-alucinação (crítico)
- A sugestão **NÃO** é o LLM gerando um código livre. É um **lookup determinístico** numa **tabela oficial de `cClassTrib`** (publicada na NT 2025.002 da Receita), indexada por NCM/CST.
- O LLM entra só para **explicar em linguagem natural** ("este produto é tributação integral porque...") e **desambiguar** quando houver mais de um candidato — nunca para inventar o código.
- A tabela oficial é carregada como dado de referência (arquivo versionado em `js/services/` ou Firestore de config global). **Não hardcodar códigos adivinhados** — o código padrão de tributação integral deve ser confirmado contra a fonte oficial antes de implementar (marcar como TODO-verificar).

### Experiência (UX)
- Entrada: card no Dashboard ou aba em Produtos — *"47 produtos sem classificação tributária. 41 são caso padrão (posso preencher), 6 precisam de revisão, 0 sem NCM."*
- Ação em lote: *"Preencher os 41 casos padrão"* → tela de revisão lista produto + código sugerido + motivo → usuário confirma o lote → grava.
- Os 6 a revisar ficam numa lista separada com o aviso de contador; preenchimento individual opcional.
- Cada gravação registra origem `cClassTribFonte: 'copiloto'` + data, para rastreabilidade.

---

## 3. Arquitetura compartilhada (function calling)

- Nova Cloud Function ou extensão das existentes expõe ao modelo um conjunto pequeno e seguro de **tools** (function calling do DeepSeek), cada uma mapeando para uma operação já existente e validada:
  - `gerarCobrancaPix(clienteId, parcelaId)` → Asaas (já existe)
  - `sugerirClassTrib(produtoId)` → lookup determinístico (read, sem gravar)
  - `aplicarClassTribLote(produtoIds[], confirmado:true)` → grava em Produtos
- O passo de confirmação vive no **frontend**: a tool de leitura/sugestão roda livre; a tool de escrita só é chamada **depois** do usuário confirmar (a IA propõe, o usuário aprova, o frontend chama a função de escrita). A IA nunca chama escrita direto sem o aceite.
- Reaproveitar `buildBusinessContext` (hoje duplicado em `aiChat.js` e `aiPlaybook.js` — extrair para módulo compartilhado em `functions/` nesta oportunidade, evita drift).

---

## 4. Arquivos envolvidos

| Arquivo | Mudança |
|---|---|
| `functions/aiPlaybook.js` | alertas passam a retornar objeto `acao`; reusa contexto compartilhado |
| `functions/aiChat.js` | (opcional) reconhecer intenções de ação e devolver proposta estruturada |
| `functions/_businessContext.js` (novo) | extrair `buildBusinessContext`/`loadCollections` duplicados |
| `functions/classTrib.js` (novo) | lookup determinístico NCM/CST → cClassTrib (tabela oficial) |
| `js/services/classTribTable.*` (novo) | tabela oficial de cClassTrib (fonte: NT 2025.002) |
| `js/modules/aiChat.js` | UI dos botões de ação + fluxo de confirmação (individual e lote) |
| `js/modules/produtos.js` | tela de revisão/lote do copiloto da reforma |
| Dashboard | card de entrada do copiloto ("X produtos sem classificação") |

---

## 5. Itens abertos / riscos

- **Tabela oficial cClassTrib:** localizar a fonte canônica (NT 2025.002 / portal da reforma) e versioná-la. Sem ela, C não sai. Bloqueante de C.
- **Código padrão de tributação integral:** confirmar o valor exato na fonte oficial — não chutar.
- **Cobrança Pix em lote (Asaas):** validar limite de chamadas e tratamento de erro parcial (3 cobranças, 1 falha) — mostrar resultado por item.
- **Responsabilidade fiscal:** manter o disclaimer "não substitui o contador" visível no fluxo do copiloto, igual ao da landing.
- Ligação com a flag `ATIVO=false` da estrutura IBS/CBS: o copiloto pode preencher `cClassTrib` mesmo com a emissão dormente (é só preparar o cadastro) — confirmar que preencher o campo não dispara nada na nota atual.

---

## 6. Ordem sugerida

1. Extrair `_businessContext.js` compartilhado (refactor base) → verify: aiChat e aiPlaybook seguem funcionando.
2. **C-1:** `classTrib.js` + tabela oficial + `sugerirClassTrib` (read-only) → verify: sugere certo para casos padrão conhecidos.
3. **C-2:** UI de revisão + `aplicarClassTribLote` com confirmação → verify: lote grava só após aceite; casos a revisar não são tocados.
4. **C-3:** card de entrada no Dashboard.
5. **B-1:** `aiPlaybook.js` retorna `acao`; frontend renderiza botões; ação de navegação.
6. **B-2:** inadimplência → cobrança Pix em lote (Asaas) com confirmação.

Commit ao fim de cada task. C antes de B (casa com o lançamento do posicionamento de reforma).

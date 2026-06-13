# Spec — Reportar Problema (captura → triagem IA → resposta ao usuário)

**Data:** 2026-06-13 · **Branch alvo:** v2 · **Status:** aprovado (aguarda revisão final do Juan)

## 1. Objetivo

Dar ao usuário do Stoqio um botão para reportar um problema quando vê algo errado na tela. O report captura **print da tela + logs do console**, é **triado por IA** (é um bug real? ou uma função que o usuário não sabe usar?), **deduplicado** (o mesmo bug nunca é tratado mais de uma vez), e — após o **OK do Juan** — devolve uma resposta ao usuário dentro do app. Sustenta a promessa de marketing: **"todo problema verificado em até 24h"**.

## 2. Faseamento

| Fase | Entrega | Status |
|---|---|---|
| **A** | Loop completo in-app: botão + captura + dedup + triagem IA + tela "Meus reports" + **aprovação no admin.html** + selo 24h | **este spec** |
| **B** | Camada Telegram: digest diário às 20:00 no Telegram do Juan + "OK" libera o lote (reusa `releaseReports` da Fase A) | spec futuro |

A Fase A fecha o ciclo sozinha (aprovação no admin). A Fase B é a conveniência de aprovar pelo Telegram e isola o ponto mais delicado de integração (inbound do Telegram).

## 3. Decisões tomadas (Q&A com o Juan, 13/06)

- Canal de aprovação final: **Telegram** (gateway Hermes) — mas só na Fase B. Na Fase A a aprovação é no **admin.html**.
- Retorno ao usuário: **resposta in-app por report** (status + explicação). É o que torna o "24h" honesto.
- Granularidade do OK: **um OK libera o lote do dia** como a IA classificou; override item a item no admin. **Ressalva:** classificação de baixa confiança = `investigar`, fica fora do lote, decidida em conjunto.
- **Dedup obrigatório:** o mesmo bug (vários usuários / várias vezes) = **um único issue** com contador de afetados.
- Campo de **texto livre opcional** para o usuário descrever com as palavras dele.
- Horário do digest: **20:00** (relevante na Fase B).
- Captura de tela: **html2canvas** (via CDN, como o projeto já faz com PapaParse/xlsx).
- **Duas versões dos dados sensíveis** (ver §6): versão limpa para triagem/visão padrão; versão completa (crua, com token) preservada em local restrito, usada só em investigação profunda, com expiração automática.

## 4. Componentes

### 4.1 `js/core/errorCapture.js` (novo, carregado cedo no `app.html`)
- Buffer circular dos últimos ~50 eventos: `console.error`, `console.warn`, `window.onerror` (message/source/lineno/colno/stack), `unhandledrejection`.
- Cada entrada: `{ t, level, msg, stack? }`.
- Função `scrub(texto)`: produz cópia **limpa** redigindo padrões sensíveis — `focusToken`, `Bearer <...>`, JWTs (`eyJ...`), e campos com `token|senha|password|secret|apikey`. Substitui por `«redacted»`.
- Expõe: `window.__errBuffer` (cru), `getConsoleBuffers()` → `{ raw, scrubbed }`, e `getCaptureContext()` → `{ view, userAgent, appVersion, url, ts }`.
- **Não-destrutivo:** mantém o `raw` em memória; o `scrubbed` é derivado.

### 4.2 `js/modules/reportProblem.js` (novo)
- Botão flutuante fixo (canto inferior direito), visível em todas as views, com microcopy *"Verificamos em até 24h"*.
- Ao clicar: captura a tela atual com html2canvas **antes** de abrir o modal (para não fotografar o próprio modal), depois abre modal com:
  - **Campo de texto livre** opcional: "Descreva com suas palavras o que aconteceu".
  - Aviso de consentimento: "Vamos capturar uma imagem da tela atual e os logs técnicos para entender o problema."
  - **Miniatura** da captura (o usuário vê o que compartilha).
  - Botões Enviar / Cancelar.
- Ao enviar → callable `reportProblem({ description, console: {raw, scrubbed}, screenshotBase64, context })`.
- Link "Meus reports" abre a tela de status (§4.5).
- Falha no html2canvas → segue sem imagem (não bloqueia o envio).

### 4.3 `functions/reportProblem.js` (callable, novo)
- Exige `context.auth`; resolve `companyId` + uid (padrão das outras callables).
- **Assinatura para dedup:** se houver erro de console → hash de `(msg do topo + 1º frame do stack + view)`; senão → hash de `(view + descrição normalizada)`; sem nada útil → report standalone (sem agrupar).
- **Screenshot:** sobe para **Firebase Storage** em `error-reports/{issueId}/{reportId}.png` (acesso restrito — §6). Guarda URL.
- **Dedup:** procura `issue` aberto com mesma assinatura. Achou → anexa report, `reportCount++`, adiciona empresa/usuário a `affected*`. Não achou → cria `issue`.
- **Triagem (só em issue novo, com a versão LIMPA):** chama o DeepSeek (reusa o padrão de proxy do `aiChat`/`aiPlaybook`). Prompt classifica em `bug` | `duvida` | `investigar`; se `duvida`, gera explicação curta "como usar"; gera resumo de uma linha. **Confiança baixa/ambígua → força `investigar`.** Timeout/erro → `investigar` (cai pro manual).
- Persiste versão **completa** (console raw) num campo/local restrito com TTL (§6).
- Retorna `{ ok, issueId, alreadyKnown }`. Se `alreadyKnown`, o frontend pode dizer "já estamos cientes desse problema".

### 4.4 Aprovação no admin.html (Fase A)
- Nova aba **"Reports"** (admin-only, mesmo gate de email do `manageCompany`).
- Lista `issues` agrupados: status, classificação, contador de afetados, resumo da IA, miniatura da tela, console **limpo**. Ação explícita **"ver versão completa (dados sensíveis)"** revela o console cru / token (§6).
- Juan confirma/edita classificação e a explicação; resolve os `investigar`.
- Botão **"Liberar"** (lote ou por item) → callable `releaseReports({ issueIds })` (admin-only): marca `issue.status='released'` e **carimba a resolução em cada report ligado** (`classification`, `explanation`, `releasedAt`). Fase B chama o mesmo `releaseReports`.

### 4.5 Tela "Meus reports" (usuário, client)
- Lista os `reports` do próprio usuário (rules: `reporterUid == auth.uid`).
- Status: **Pendente** ("Recebido — verificamos em até 24h") ou **Resolvido** → se `bug`: "Identificamos um bug e já estamos corrigindo"; se `duvida`: mostra o "como usar".
- O usuário **nunca** lê a coleção `issues`; a resolução é copiada para o report dele.

## 5. Modelo de dados (Firestore)

- **`issues`** (central, admin-only): `{ id, signature, status, classification, summary, explanation, reportCount, affectedCompanies[], affectedUsers[], firstView, firstSeen, lastSeen, releasedAt, createdAt }`.
  - Status: `triado` (bug/duvida) | `investigar` → (OK) → `released` → (opcional) `resolvido`.
- **`reports`** (1 por clique): `{ id, issueId, companyId, reporterUid, description, screenshotUrl, consoleScrubbed, view, userAgent, appVersion, createdAt, resolution? }`.
  - `resolution` (carimbada na liberação): `{ classification, explanation, releasedAt }`.
- **`reports_raw`** (restrito, TTL): `{ reportId, consoleRaw, expiresAt }` — versão completa para investigação profunda (§6).

## 6. Privacidade e segurança

- **Consentimento** explícito + miniatura no momento do report.
- **Duas versões:**
  - *Limpa* (tokens redigidos) → usada na triagem da IA e na visão padrão do admin.
  - *Completa* (crua, com token) → guardada em `reports_raw` + Storage restrito; **não vai pra IA**; aberta só por ação explícita do admin numa investigação (caso o token seja o bug). **TTL/expiração automática** (apaga após resolução ou ~30 dias) — não acumular credencial parada.
- **Acesso:** `issues` e `reports_raw` só admin (gate de email). `reports` legível só pelo autor + admin. Screenshot no Storage com regra restrita (admin + uploader).
- Triagem da IA recebe **só a versão limpa**; o servidor reaplica o scrub como defesa em profundidade (não confiar só no cliente).
- Screenshot de um tenant contém dados de negócio dele → é compartilhamento com o suporte (Juan = operador), coberto pelo consentimento.

## 7. Tratamento de erros

- html2canvas falha → envia sem imagem.
- Upload Storage falha → report sem `screenshotUrl`.
- DeepSeek falha/timeout → `issue.status='investigar'`.
- Offline → mensagem de erro pedindo nova tentativa (sem fila offline nesta fase).

## 8. Testes

- **Unit (funções puras):** `scrub()` (redação de token/JWT/Bearer), geração de assinatura e dedup. Em `functions/` com o runner já existente (padrão dos 8 testes do `classTrib`).
- **Preview:** botão renderiza em todas as views; captura gera miniatura; buffer de console popula com erro forçado; fluxo de envio com callable mockado; tela "Meus reports" mostra status; aba admin lista e libera (mock).

## 9. Pré-requisitos / itens abertos

- **Firebase Storage** habilitado no projeto (Blaze já ativo) + regras de acesso restrito ao bucket `error-reports/`.
- Selo "24h" na **landing** → fora do escopo da Fase A (só o microcopy no botão entra agora).
- **Fase B (futuro):** scheduled function 20:00 → digest no Telegram (gateway Hermes) → inbound "OK" → `releaseReports`. Mecânica de inbound do Telegram a detalhar no spec da Fase B.

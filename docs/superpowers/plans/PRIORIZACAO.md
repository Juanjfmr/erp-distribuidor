# Guia de Priorização — Tasks para Claude Code
**Projeto:** ERP Distribuidora
**Atualizado:** 2026-05-30

---

## Regra Geral

Nunca pule um plano sem confirmar que o anterior está 100% implementado e testado.
Cada plano tem dependências explícitas — violar a ordem causa bugs em cascata.

---

## Fila de Implementação

### 🔴 BLOCO 1 — Pré-lançamento obrigatório
> Nenhum cliente pode ser cobrado sem este bloco completo.

| Ordem | Plano | Arquivo | Dependências | Complexidade | Tempo estimado |
|---|---|---|---|---|---|
| 1 | **Plano A** | `plano-a-checkplan-trial.md` | Nenhuma | Baixa | 1–2h |
| 2 | **Plano B** | `plano-b-nfe-focus.md` | Plano A | Alta | 4–6h |
| 3 | **Plano C** | `plano-c-onboarding-csv.md` | Plano A | Média | 2–3h |
| 4 | **Plano D** | `plano-d-acesso-contador.md` | Plano A | Baixa | 1h |

**Critério de saída do Bloco 1:** NF-e emitindo em homologação Focus NFe + checkPlan bloqueando módulos corretamente + importação CSV funcionando.

---

### 🟡 BLOCO 2 — Monetização e gestão
> Executar após Bloco 1 completo. Habilita receber pagamentos e gerir tenants.

| Ordem | Plano | Arquivo | Dependências | Complexidade | Tempo estimado |
|---|---|---|---|---|---|
| 5 | **Plano E2** | `plano-e2-firebase-functions.md` | Firebase Blaze ativo, token MP | Alta | 3–4h |
| 6 | **Plano E1** | `plano-e1-admin-frontend.md` | Plano E2 deployado | Média | 2–3h |
| 7 | **Plano E3** | `plano-e3-checkout-mp.md` | Planos E1 + E2 | Média | 2h |

**Critério de saída do Bloco 2:** Assinatura recorrente funcionando no MP + admin.html operacional + tenant bloqueado automaticamente por inadimplência.

---

### 🟢 BLOCO 3 — Agente de IA e diferenciação
> Executar após Blocos 1 e 2. Diferencia o produto da concorrência.

| Ordem | Plano | Arquivo | Dependências | Complexidade | Tempo estimado |
|---|---|---|---|---|---|
| 8 | **Plano F1** | `plano-f1-agente-widget-onboarding.md` | Plano C (csvImport.js), Plano E2 (anthropicProxy) | Alta | 4–6h |
| 9 | **Plano F2** | `plano-f2-agente-playbook.md` | Plano F1 completo | Média | 2–3h |
| 10 | **Plano F3** | `plano-f3-gerador-conteudo.md` | Plano F1 (anthropicProxy), Plano E1 (admin.html) | Baixa | 1–2h |

**Critério de saída do Bloco 3:** Agente onboardando novos tenants, playbook disparando automaticamente, gerador de conteúdo operacional no admin.

---

## Regras por Sessão do Claude Code

### Antes de começar
1. Ler `CLAUDE.md` completo
2. Invocar `smart-effort`
3. Identificar o próximo plano na fila (primeiro item não marcado como ✅)
4. Carregar APENAS os arquivos do plano atual — nunca todos de uma vez

### Durante a execução
- Seguir `executing-plans` ou `subagent-driven-development`
- A cada task concluída → `verification-before-completion` antes de commitar
- Commitar ao final de cada task — nunca acumular
- Ao atingir ~60% do contexto → `/compact`

### Ao finalizar o plano
- `requesting-code-review`
- Marcar o plano como ✅ neste arquivo
- Atualizar `CLAUDE.md` com novo estado
- `finishing-a-development-branch`
- Push para o GitHub

---

## Pré-requisitos Externos (não são código)

Resolver antes de iniciar o Bloco 2:

| Item | Ação | Onde |
|---|---|---|
| Firebase Blaze | Migrar de Spark para Blaze | console.firebase.google.com |
| Conta Focus NFe | Criar conta + pegar token sandbox | app.focusnfe.com.br |
| Conta Mercado Pago | Criar conta de vendedor + pegar token | mercadopago.com.br/developers |
| Anthropic API Key | Gerar chave de API | console.anthropic.com |
| Token Focus NFe produção | Após testar em sandbox | app.focusnfe.com.br |

---

## Critério de Lançamento

O produto está pronto para cobrar clientes quando:

- [ ] Plano A concluído — `checkPlan()` bloqueando corretamente
- [ ] Plano B concluído — NF-e emitindo em produção
- [ ] Plano C concluído — importação CSV funcionando
- [ ] Plano D concluído — contador com acesso somente leitura
- [ ] Plano E2 concluído — webhook MP ativando tenants
- [ ] Plano E1 concluído — admin.html operacional
- [ ] Plano E3 concluído — checkout MP funcionando end-to-end
- [ ] 3 clientes piloto testando em produção por 2 semanas
- [ ] Landing page no ar
- [ ] Base de conhecimento com 10+ artigos

---

## Avisos Críticos

**Plano B — NF-e:**
- NUNCA ir direto para produção — testar exaustivamente em sandbox Focus NFe
- Certificado digital A1 necessário para produção — providenciar antes
- NCM obrigatório em todos os produtos antes de emitir NF-e

**Plano E2 — Firebase Functions:**
- Requer Firebase Blaze — sem isso as functions não fazem chamadas externas
- Token MP deve ser configurado via Secret Manager — NUNCA hardcoded no código
- Testar webhook com ngrok em desenvolvimento antes de fazer deploy

**Plano F1 — Agente IA:**
- API key Anthropic via proxy (Firebase Function) em produção — nunca exposta no frontend
- Em desenvolvimento local, usar API key direta apenas temporariamente
- Plano C (csvImport.js) deve existir antes do F1

**Geral:**
- Nunca fazer deploy em produção sem testar em homologação/sandbox
- Sempre commitar antes de encerrar a sessão
- Se o contexto estourar antes de commitar — o trabalho se perde

---

## Status dos Planos

Atualizar após cada plano concluído:

| Plano | Status | Data | Observações |
|---|---|---|---|
| Plano A | ✅ Concluído | 2026-05-31 | checkPlan, trial 30d, strings renomeadas |
| Plano B | ⏳ Pendente | — | Aguarda token Focus NFe |
| Plano C | ✅ Concluído | 2026-05-31 | Wizard onboarding 4 etapas + csvImport.js (Bling, Conta Azul, genérico) |
| Plano D | ⏳ Pendente | — | — |
| Plano E2 | ⏳ Pendente | — | Aguarda Firebase Blaze + token MP |
| Plano E1 | ⏳ Pendente | — | — |
| Plano E3 | ⏳ Pendente | — | — |
| Plano F1 | ⏳ Pendente | — | Aguarda Anthropic API Key |
| Plano F2 | ⏳ Pendente | — | — |
| Plano F3 | ⏳ Pendente | — | — |

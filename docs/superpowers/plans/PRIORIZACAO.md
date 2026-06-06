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

## Registro de Testes de Usuário

### Teste 1 — 05/06/2026 (Claude Code)

**Escopo:** Fluxo completo cadastro → fatura interna (conta nova em produção)

**Resultado:** ✅ Aprovado após correção de bug crítico

**Bug encontrado e corrigido:**
- **Multi-tenant contamination** — conta nova carregava dados reais de outro tenant via localStorage
- Causa: `loadFromFirebase` salvava state do localStorage no Firestore do novo tenant quando documento não existia
- Correção: reset para `defaultState` + tag `stoqio_uid` no localStorage + remoção do `config/global`
- Commits: `249ae18`, `dd341b0`, `277bc74`, `035ce82`

**Fluxo testado:**
1. ✅ Cadastro (nome, email, senha, segmento) → dashboard vazio
2. ✅ Produto criado (nome, preço custo/venda, estoque)
3. ✅ Cliente criado (razão social, CNPJ, cidade)
4. ✅ Nota Fiscal emitida (NF-0001, R$ 80,00, À Vista, status: pendente)

**Observação de produto:**
> O fluxo testado foi direto para Nota Fiscal. O fluxo correto para o usuário real deve ser:
> **Pedido** (rascunho → confirmado) → **Faturar** (gera NF vinculada ao pedido) → **Receber pagamento**

### Teste 2 — ⏳ Pendente (executar após Bloco 1 concluído)

**Escopo:** Fluxo completo via Pedidos

**Passos a validar:**
1. Cadastro de nova conta limpa
2. Cadastrar produto e cliente fictícios
3. Criar pedido → status rascunho
4. Confirmar pedido → status confirmado
5. Faturar pedido → NF gerada vinculada ao pedido
6. Registrar recebimento → status pago
7. Verificar impacto no dashboard (KPIs, fluxo de caixa)

---

## Critério de Lançamento

O produto está pronto para cobrar clientes quando:

- [ ] Plano A concluído — `checkPlan()` bloqueando corretamente
- [ ] Plano B concluído — NF-e emitindo em produção
- [ ] Plano C concluído — importação CSV funcionando
- [x] Plano D concluído — contador com acesso somente leitura
- [ ] Plano E2 deployado — webhook MP ativando tenants (requer Firebase Blaze + token MP)
- [ ] Plano E1 deployado — admin.html operacional
- [ ] Plano E3 deployado — checkout MP funcionando end-to-end
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
| Plano B | ✅ Concluído | 2026-06-01 | Focus NFe integrado; configurar token em Configurações → Dados Fiscais |
| Plano C | ✅ Concluído | 2026-05-31 | Wizard onboarding 4 etapas + csvImport.js (Bling, Conta Azul, genérico) |
| Plano D | ✅ Concluído | 2026-06-05 | Role contador: convite por email, isExternal, acesso somente leitura (dashboard/relatorios/notas/caixa/contas) |
| Plano E2 | ✅ Concluído | 2026-06-05 | mpWebhook, checkOverdue, payAffiliate — deployado, testado end-to-end |
| Plano E1 | ✅ Concluído | 2026-06-05 | admin.html operacional — deployado |
| Plano E3 | ✅ Concluído | 2026-06-05 | createSubscription + assinarPlano() + tela de bloqueio — testado sandbox MP (cartão não funciona no sandbox, usar PIX/boleto) |
| Plano F1 | ⏳ Pendente | — | Aguarda Anthropic API Key |
| Plano F2 | ⏳ Pendente | — | — |
| Plano F3 | ⏳ Pendente | — | — |

---

## Decisões de Produto

### Emissão de documentos fiscais — comportamento intencional

**Decisão:** O Stoqio emite dois tipos de documento dependendo do
status fiscal do tenant:

- Status não configurado / parcial → emite **Fatura** (PDF sem valor fiscal)
- Status `PRODUCAO_ATIVA` → emite **NF-e** via Focus NFe

**Regras:**
- O PDF de fatura nunca carrega aviso de "sem valor fiscal" — o documento
  sai limpo para o cliente final do assinante
- O aviso é exibido apenas no painel do assinante (banner persistente
  + modal de confirmação no momento da emissão)
- O banner não pode ser dispensado permanentemente — some somente quando
  o status fiscal muda para `PRODUCAO_ATIVA`
- O título do PDF nunca usa o termo "Nota Fiscal" enquanto sem validade fiscal
- Cada status fiscal tem texto de aviso específico no banner

**Motivação:** Reduz fricção de onboarding — assinante opera desde o
primeiro dia sem precisar ter a situação fiscal regularizada. Prática
padrão do mercado (Bling, Omie, Tiny).

**Não é bug. Não alterar sem decisão explícita de produto.**

### Estados fiscais do tenant — enum central

O status fiscal de cada tenant deve ser controlado por um único enum/constante
central. Toda lógica de emissão e exibição de alertas consulta esse enum.
Nunca usar condicionais espalhadas no código.

**Estados definidos:**

| Status | Descrição | Emite NF-e? |
|---|---|---|
| `NAO_CONFIGURADO` | Tenant nunca acessou configuração fiscal | Não |
| `BLOQUEADO_CPF` | Assinante é Pessoa Física | Não |
| `SEM_CERTIFICADO` | Dados cadastrais salvos, sem certificado A1 | Não |
| `ERRO_REGISTRO` | Falha ao registrar empresa na Focus NFe | Não |
| `CONFIGURADO` | Registrado na Focus NFe, token salvo | Sim |
| `CONFIGURADO_NAO_TESTADO` | Configurado, teste de emissão não realizado | Sim (com aviso) |
| `CONFIGURADO_TESTADO` | Configurado e testado em homologação | Sim |
| `PRODUCAO_ATIVA` | Ambiente de produção ativo | Sim |

**Regra de alerta:** o banner de aviso no painel do assinante aparece para
todos os estados exceto `PRODUCAO_ATIVA`.

**Regra de certificado:** monitorar data de expiração do certificado A1.
Notificar o tenant com 30 dias de antecedência. Certificado expirado
reverte o status para `SEM_CERTIFICADO` automaticamente.

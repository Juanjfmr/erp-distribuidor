# Plano F2 — Function Calling + Playbook Comercial Autônomo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar o agente de IA a tomar ações reais no sistema (estender trial, aplicar cupom, navegar para módulo, marcar onboarding) e executar o playbook comercial autônomo — agindo proativamente nos gatilhos definidos sem intervenção do operador.

**Architecture:** `js/services/agentTools.js` define as ferramentas disponíveis para o agente (function calling). `js/services/agentPlaybook.js` verifica os gatilhos do playbook a cada login e injeta mensagens proativas quando necessário. `agentService.js` é atualizado para suportar múltiplos turnos com tool use.

**Tech Stack:** JavaScript ES Modules, Anthropic API (tool use/function calling), Firebase Firestore.

**Pré-requisito:** Plano F1 (agentService.js, agentWidget.js) deve estar implementado e funcionando.

---

## Estrutura de Arquivos

```
js/services/agentTools.js       ← novo — definição das ferramentas do agente
js/services/agentPlaybook.js    ← novo — gatilhos proativos do playbook
js/services/agentService.js     ← modificar — suporte a tool use multi-turno
```

---

## Task 1: Criar agentTools.js com definição das ferramentas

**Files:**
- Create: `js/services/agentTools.js`

- [ ] **Step 1: Criar agentTools.js**

```javascript
// js/services/agentTools.js
// Ferramentas disponíveis para o agente (Anthropic function calling)

// ── Definição das ferramentas para a API ─────────────────────────────────────
const AGENT_TOOLS = [
  {
    name: 'navigate_to_module',
    description: 'Navega o usuário para um módulo específico do sistema. Use quando o usuário pede para ir a um módulo ou quando o fluxo de onboarding exige.',
    input_schema: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          enum: ['dashboard','produtos','clientes','fornecedores','pedidos','notas','devolucoes','compras','contas','caixa','relatorios','config','usuarios','minha-conta'],
          description: 'Nome do módulo para navegar'
        },
        reason: { type: 'string', description: 'Motivo da navegação (para log)' }
      },
      required: ['module']
    }
  },
  {
    name: 'complete_onboarding_step',
    description: 'Marca uma etapa do onboarding como concluída. Use quando o usuário completou uma etapa.',
    input_schema: {
      type: 'object',
      properties: {
        step: {
          type: 'string',
          enum: ['empresa', 'dados', 'pedido', 'nfe', 'recebimento'],
          description: 'Etapa do onboarding a marcar como concluída'
        }
      },
      required: ['step']
    }
  },
  {
    name: 'extend_trial',
    description: 'Estende o período de trial do tenant. Use apenas quando o usuário está próximo do fim do trial e não criou nenhum pedido ainda. Limite: 1 extensão por tenant.',
    input_schema: {
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: 'Número de dias para estender (máximo 7)',
          minimum: 1,
          maximum: 7
        },
        reason: { type: 'string', description: 'Motivo da extensão' }
      },
      required: ['days']
    }
  },
  {
    name: 'apply_coupon',
    description: 'Aplica desconto percentual no próximo pagamento do tenant. Use quando o usuário visitou Minha Conta 3+ vezes sem assinar. Limite: 1 cupom por tenant. Máximo: 20%.',
    input_schema: {
      type: 'object',
      properties: {
        percent: {
          type: 'number',
          description: 'Percentual de desconto (máximo 20)',
          minimum: 5,
          maximum: 20
        },
        reason: { type: 'string', description: 'Motivo do cupom' }
      },
      required: ['percent']
    }
  },
  {
    name: 'generate_report',
    description: 'Gera um relatório em linguagem natural baseado nos dados do sistema. Use quando o usuário pede por informações sobre seu negócio.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['resumo_mes', 'inadimplentes', 'curva_abc', 'estoque_baixo', 'pedidos_mes'],
          description: 'Tipo de relatório a gerar'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'log_action',
    description: 'Registra uma ação tomada pelo agente no Firestore para auditoria.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Tipo de ação' },
        details: { type: 'string', description: 'Detalhes da ação' }
      },
      required: ['type', 'details']
    }
  }
];

// ── Executores das ferramentas ────────────────────────────────────────────────

/**
 * Executa uma ferramenta chamada pelo agente
 * @param {string} toolName - Nome da ferramenta
 * @param {Object} input - Parâmetros da ferramenta
 * @returns {string} Resultado da execução
 */
async function executeTool(toolName, input) {
  console.log(`Agent tool: ${toolName}`, input);

  switch(toolName) {

    case 'navigate_to_module': {
      navigate(input.module);
      await _logAction('navigate', `Navegou para ${input.module}: ${input.reason || ''}`);
      return `Naveguei para o módulo ${input.module}.`;
    }

    case 'complete_onboarding_step': {
      completeOnboardingStep(input.step);
      // Atualizar widget
      if (typeof _updateOnboardingBar === 'function') _updateOnboardingBar();
      if (state.currentView === 'dashboard') render();
      await _logAction('onboarding', `Etapa ${input.step} concluída pelo agente`);
      return `Etapa "${input.step}" marcada como concluída.`;
    }

    case 'extend_trial': {
      // Verificar se já estendeu
      if (state.company?.trialExtended) {
        return 'Não é possível estender o trial — já foi estendido anteriormente.';
      }
      const days = Math.min(input.days || 7, 7);
      const current = new Date(state.company?.trialEndsAt || new Date());
      const newEnd = new Date(current.getTime() + days * 86400000);
      state.company.trialEndsAt = newEnd.toISOString();
      state.company.trialExtended = true;
      saveState();
      // Atualizar no Firestore
      const { doc, updateDoc } = window._fbFns;
      await updateDoc(doc(window._db, 'empresas', window._companyId), {
        trialEndsAt: newEnd.toISOString(),
        trialExtended: true,
      });
      await _logAction('extend_trial', `Trial estendido por ${days} dias. ${input.reason || ''}`);
      return `Trial estendido por ${days} dias! Seu novo prazo é ${newEnd.toLocaleDateString('pt-BR')}.`;
    }

    case 'apply_coupon': {
      // Verificar se já tem cupom
      if (state.company?.activeCoupon) {
        return 'Já existe um cupom ativo para sua conta.';
      }
      const percent = Math.min(input.percent || 20, 20);
      const couponCode = `NINA${percent}OFF${Date.now().toString(36).toUpperCase()}`;
      state.company.activeCoupon = { code: couponCode, percent, appliedAt: new Date().toISOString() };
      saveState();
      const { doc, updateDoc } = window._fbFns;
      await updateDoc(doc(window._db, 'empresas', window._companyId), {
        activeCoupon: state.company.activeCoupon,
      });
      await _logAction('apply_coupon', `Cupom ${couponCode} de ${percent}% aplicado. ${input.reason || ''}`);
      return `Apliquei um cupom de ${percent}% de desconto no seu primeiro mês! Código: ${couponCode}. Use em Minha Conta ao escolher seu plano.`;
    }

    case 'generate_report': {
      const report = generateReport(input.type);
      return report;
    }

    case 'log_action': {
      await _logAction(input.type, input.details);
      return 'Ação registrada.';
    }

    default:
      return `Ferramenta "${toolName}" não reconhecida.`;
  }
}

async function _logAction(type, details) {
  try {
    const { collection, addDoc } = window._fbFns;
    await addDoc(collection(window._db, 'empresas', window._companyId, 'agentLog'), {
      type,
      details,
      timestamp: new Date().toISOString(),
      view: state.currentView,
      plan: window._plan,
    });
  } catch(e) {
    console.warn('agentLog error:', e.message);
  }
}
```

- [ ] **Step 2: Commitar**

```bash
git add js/services/agentTools.js
git commit -m "feat: criar agentTools.js com ferramentas de function calling para o agente"
```

---

## Task 2: Atualizar agentService.js para suportar tool use

**Files:**
- Modify: `js/services/agentService.js`

- [ ] **Step 1: Importar AGENT_TOOLS e atualizar sendToAgent()**

Em `js/services/agentService.js`, substituir a função `sendToAgent()` por versão com suporte a tool use multi-turno:

```javascript
/**
 * Envia mensagem para o agente com suporte a tool use multi-turno
 */
async function sendToAgent(userMessage, file = null) {
  let csvContext = '';
  if (file && typeof parseCSV === 'function') {
    const entity = _detectEntity(userMessage);
    const { data, errors, system } = await parseCSV(file, entity);
    if (data.length > 0) {
      csvContext = `\n[CSV recebido: ${data.length} ${entity} do sistema ${system}. Importar?]`;
    } else {
      csvContext = `\n[CSV inválido. Erros: ${errors.slice(0,3).join(', ')}]`;
    }
  }

  const messages = [
    ...state.agentHistory,
    { role: 'user', content: userMessage + csvContext }
  ];

  let finalText = '';
  let allActions = [];
  let currentMessages = [...messages];

  // Loop de tool use — continua até o agente não usar mais ferramentas
  for (let turn = 0; turn < 5; turn++) {
    const requestBody = {
      model: AGENT_MODEL,
      max_tokens: AGENT_MAX_TOKENS,
      system: buildSystemPrompt(),
      tools: typeof AGENT_TOOLS !== 'undefined' ? AGENT_TOOLS : [],
      messages: currentMessages,
    };

    try {
      const response = await fetch(ANTHROPIC_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Erro API');

      // Processar blocos de conteúdo
      const content = data.content || [];
      const textBlocks = content.filter(b => b.type === 'text');
      const toolBlocks = content.filter(b => b.type === 'tool_use');

      if (textBlocks.length > 0) {
        finalText = textBlocks.map(b => b.text).join('\n');
      }

      // Se não há tool use, encerrar loop
      if (toolBlocks.length === 0 || data.stop_reason === 'end_turn') {
        break;
      }

      // Executar ferramentas
      const toolResults = [];
      for (const tool of toolBlocks) {
        const result = await executeTool(tool.name, tool.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: result,
        });
        allActions.push({ type: tool.name, input: tool.input, result });
      }

      // Adicionar resposta do agente e resultados ao histórico do loop
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content },
        { role: 'user', content: toolResults },
      ];

    } catch(e) {
      console.error('sendToAgent error:', e);
      finalText = 'Estou com dificuldade de conexão. Tente novamente.';
      break;
    }
  }

  // Atualizar histórico principal (máximo 20 mensagens)
  state.agentHistory = [
    ...messages,
    { role: 'assistant', content: finalText || 'Ação executada.' }
  ].slice(-20);

  return { text: finalText || 'Ação executada com sucesso.', actions: allActions };
}
```

- [ ] **Step 2: Adicionar agentTools.js ao index.html**

Em `index.html`, antes de `agentService.js`, adicionar:

```html
<script src="js/services/agentTools.js"></script>
```

- [ ] **Step 3: Commitar**

```bash
git add js/services/agentService.js index.html
git commit -m "feat: atualizar agentService com suporte a tool use multi-turno"
```

---

## Task 3: Criar agentPlaybook.js com gatilhos proativos

**Files:**
- Create: `js/services/agentPlaybook.js`

- [ ] **Step 1: Criar agentPlaybook.js**

```javascript
// js/services/agentPlaybook.js
// Gatilhos proativos do playbook comercial — executa ao fazer login

/**
 * Verifica os gatilhos do playbook e dispara ações proativas
 * Chamado uma vez por sessão após o login
 */
async function runPlaybook() {
  const co = state.company || {};
  const ob = state.onboarding || {};
  const hoje = new Date();

  // Aguardar widget estar pronto
  if (typeof agentNotify !== 'function') return;

  // ── Gatilho 1: Trial expira em 3 dias + sem pedido criado ──
  if (!co.trialExtended && window._plan === 'trial') {
    const trialEnd = co.trialEndsAt ? new Date(co.trialEndsAt) : null;
    if (trialEnd) {
      const diasRestantes = Math.ceil((trialEnd - hoje) / 86400000);
      const semPedidos = (state.orders || []).length === 0;
      if (diasRestantes <= 3 && diasRestantes > 0 && semPedidos) {
        await _playDelay(2000);
        agentNotify(`⏰ Seu trial expira em ${diasRestantes} dia(s) e você ainda não criou nenhum pedido. Posso te dar mais 7 dias para explorar — quer que eu estenda?`);
        // Agente vai propor extensão na próxima interação
        state.agentHistory.push({
          role: 'assistant',
          content: `⏰ Seu trial expira em ${diasRestantes} dia(s) e você ainda não criou nenhum pedido. Posso te dar mais 7 dias para explorar — quer que eu estenda?`
        });
        return; // Um gatilho por sessão
      }
    }
  }

  // ── Gatilho 2: Onboarding parado na etapa de dados há 3+ dias ──
  if (!ob.complete && ob.checklist?.empresa && !ob.checklist?.dados) {
    const lastAccess = co.lastAccess ? new Date(co.lastAccess) : null;
    const diasParado = lastAccess ? Math.floor((hoje - lastAccess) / 86400000) : 0;
    if (diasParado >= 3) {
      await _playDelay(1500);
      agentNotify('👋 Você configurou a empresa mas ainda não importou seus produtos. Posso te ajudar com isso agora — tem um CSV do seu sistema atual?');
      return;
    }
  }

  // ── Gatilho 3: Inadimplente há 3 dias ──
  if (window._tenantStatus === 'inadimplente') {
    const nextDue = co.nextDue ? new Date(co.nextDue) : null;
    if (nextDue) {
      const diasAtraso = Math.floor((hoje - nextDue) / 86400000);
      if (diasAtraso >= 3 && diasAtraso < 7) {
        await _playDelay(1000);
        agentNotify(`💳 Seu pagamento está ${diasAtraso} dias em atraso. Para evitar o bloqueio do sistema, renove sua assinatura em Minha Conta. Posso te levar até lá?`);
        return;
      }
    }
  }

  // ── Gatilho 4: Proativo de boas-vindas no primeiro acesso ──
  if (!ob.checklist?.empresa && !co._playbook_welcomed) {
    await _playDelay(1000);
    // Abrir widget automaticamente no primeiro acesso
    const panel = document.getElementById('agent-panel');
    if (panel && !panel.classList.contains('open')) {
      panel.classList.add('open');
    }
    co._playbook_welcomed = true;
    saveState();
  }
}

function _playDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rastrear visitas ao módulo Minha Conta para gatilho de cupom
function trackMinhaContaVisit() {
  if (state.currentView !== 'minha-conta') return;
  const co = state.company || {};
  if (co.activeCoupon) return; // Já tem cupom

  co._minhaContaVisits = (co._minhaContaVisits || 0) + 1;
  state.company = co;

  // Gatilho 5: Visitou Minha Conta 3x sem assinar
  if (co._minhaContaVisits === 3 && window._plan === 'trial') {
    setTimeout(() => {
      agentNotify('🎁 Vi que você está avaliando os planos! Que tal 20% de desconto no primeiro mês? Posso aplicar agora se quiser.');
    }, 2000);
  }
}
```

- [ ] **Step 2: Adicionar agentPlaybook.js ao index.html**

Em `index.html`, após `agentTools.js`, adicionar:

```html
<script src="js/services/agentPlaybook.js"></script>
```

- [ ] **Step 3: Chamar runPlaybook() após login em app.js**

Em `js/app.js`, após `initAgentWidget()`, adicionar:

```javascript
// Executar playbook comercial (com delay para não bloquear o carregamento)
setTimeout(() => {
  if (typeof runPlaybook === 'function') runPlaybook();
}, 3000);
```

- [ ] **Step 4: Rastrear visitas a Minha Conta em nav.js**

Em `js/core/nav.js`, no final da função `navigate()`, adicionar:

```javascript
// Rastrear visitas para playbook
if (typeof trackMinhaContaVisit === 'function') trackMinhaContaVisit();
```

- [ ] **Step 5: Commitar e push**

```bash
git add js/services/agentPlaybook.js js/services/agentTools.js index.html js/app.js js/core/nav.js
git commit -m "feat: agentPlaybook com gatilhos proativos — extensão de trial, cupom, inadimplência"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ navigate_to_module — agente navega o usuário
- ✅ complete_onboarding_step — agente marca etapas
- ✅ extend_trial — extensão de 7 dias, 1x por tenant
- ✅ apply_coupon — desconto 20%, 1x por tenant
- ✅ generate_report — relatórios em linguagem natural
- ✅ log_action — auditoria no Firestore
- ✅ Tool use multi-turno — agente executa ferramentas em sequência
- ✅ Gatilho: trial expira em 3 dias sem pedido
- ✅ Gatilho: onboarding parado há 3 dias
- ✅ Gatilho: inadimplente há 3 dias
- ✅ Gatilho: visitou Minha Conta 3x sem assinar
- ✅ Limite de 1 extensão e 1 cupom por tenant
- ✅ Um gatilho proativo por sessão (não sobrepõe)

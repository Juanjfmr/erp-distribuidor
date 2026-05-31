# Plano F1 — Widget de Chat + Onboarding Conversacional (IA)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar widget de chat com IA dentro do ERP que substitui o wizard de onboarding estático, guia o novo tenant conversacionalmente e responde dúvidas sobre o sistema em linguagem natural.

**Architecture:** `js/services/agentService.js` centraliza todas as chamadas à Anthropic API, injeta contexto dinâmico do tenant e gerencia o histórico da conversa. `js/modules/agentWidget.js` renderiza o widget de chat flutuante no canto inferior direito. O widget detecta se o onboarding está incompleto e assume o papel de guia — caso contrário, atua como suporte reativo. O `csvImport.js` (Plano C) é mantido como serviço acionado pelo agente.

**Tech Stack:** JavaScript ES Modules, Anthropic API (`claude-haiku-4-5-20251001`), Firebase Firestore, PapaParse (já incluso do Plano C).

**Pré-requisito:** `js/services/csvImport.js` do Plano C deve existir (o agente chama `parseCSV` e `importToState`). Plano A (checkPlan, state) deve estar implementado.

**ATENÇÃO:** O Plano C (wizard estático) é substituído por este plano. O arquivo `js/modules/onboarding.js` do Plano C NÃO deve ser criado — este plano o substitui completamente. O `js/services/csvImport.js` do Plano C deve ser criado antes deste plano.

---

## Estrutura de Arquivos

```
js/services/agentService.js     ← novo — lógica de chamada à API, contexto, histórico
js/modules/agentWidget.js       ← novo — UI do widget flutuante
js/core/state.js                ← modificar — adicionar agentHistory ao state
index.html                      ← modificar — adicionar scripts do agente
```

---

## Task 1: Adicionar agentHistory ao state.js

**Files:**
- Modify: `js/core/state.js`

- [ ] **Step 1: Adicionar agentHistory ao defaultState**

Em `js/core/state.js`, no objeto `defaultState`, adicionar:

```javascript
agentHistory: [],        // histórico da conversa com o agente (não persiste no Firestore)
agentOpen: false,        // widget aberto ou fechado
onboarding: {
  complete: false,
  step: 0,
  checklist: {
    empresa: false,
    dados: false,
    pedido: false,
    nfe: false,
    recebimento: false,
  }
},
```

- [ ] **Step 2: Adicionar guard no loadState()**

Após os guards existentes, adicionar:

```javascript
if (!state.onboarding) state.onboarding = {
  complete: false, step: 0,
  checklist: { empresa:false, dados:false, pedido:false, nfe:false, recebimento:false }
};
if (!state.agentHistory) state.agentHistory = [];
```

- [ ] **Step 3: Adicionar helper completeOnboardingStep()**

```javascript
function completeOnboardingStep(step) {
  if (!state.onboarding) return;
  state.onboarding.checklist[step] = true;
  const all = Object.values(state.onboarding.checklist);
  if (all.every(Boolean)) state.onboarding.complete = true;
  saveState();
}
```

- [ ] **Step 4: Commitar**

```bash
git add js/core/state.js
git commit -m "feat: adicionar agentHistory e onboarding ao state"
```

---

## Task 2: Criar agentService.js

**Files:**
- Create: `js/services/agentService.js`

- [ ] **Step 1: Criar agentService.js**

```javascript
// js/services/agentService.js
// Centraliza comunicação com Anthropic API para o agente comercial

const AGENT_MODEL = 'claude-haiku-4-5-20251001';
const AGENT_MAX_TOKENS = 1000;

// Documentação dos módulos — base de conhecimento do agente
const SYSTEM_DOCS = `
Você é o assistente do ERP Distribuidora — um sistema de gestão para distribuidoras e atacadistas.
Seu nome é Nina. Você é consultivo, direto e conhece profundamente o setor de distribuição.
Nunca diga "Olá! Sou o assistente virtual." — seja natural e contextualizado.

## Módulos disponíveis no sistema:
- Dashboard: KPIs, alertas de estoque, últimas transações
- Produtos: cadastro, estoque, código de barras, histórico de preços
- Clientes: cadastro, limite de crédito, histórico de compras
- Fornecedores: cadastro, prazo de pagamento
- Pedidos: criação, confirmação, faturamento
- Nota Fiscal (NF-e): emissão, cancelamento, DANFE
- Devoluções: parcial/total com estorno automático
- Compras: ordens de compra, parcelas, pagamento
- Contas: receber e pagar, filtro por vencimento
- Caixa: fluxo de caixa, lançamentos
- Relatórios: curva ABC, relatório de NF, visão geral
- Configurações: dados da empresa, categorias, segmento de negócio
- Minha Conta: planos, assinatura, programa de afiliados

## Planos disponíveis:
- Básico (R$79/mês): 1 usuário, 300 produtos, 100 NF-e/mês
- Profissional (R$149/mês): 3 usuários, 2.000 produtos, 500 NF-e/mês, relatórios avançados
- Empresarial (R$299/mês): ilimitado, PDV, API, suporte prioritário
- Trial: 30 dias gratuitos

## Importação de dados:
Você pode importar dados de outros sistemas via CSV. Suporte para: Bling, Conta Azul, Omie, Excel genérico.
Para importar, peça ao usuário para exportar o CSV do sistema atual e enviar aqui.
Quando o usuário enviar um arquivo CSV, chame a função importCSV.

## Emissão de NF-e:
Requer configurar o Token Focus NFe em Configurações e preencher NCM nos produtos.
`;

/**
 * Monta o contexto dinâmico do tenant para injetar no prompt
 */
function buildTenantContext() {
  const plan = window._plan || 'trial';
  const co = state.company || {};
  const ob = state.onboarding || {};
  const checklist = ob.checklist || {};
  const trialDays = co.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(co.trialEndsAt) - new Date()) / 86400000))
    : 30;

  const done = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(checklist).length;

  return `
## Contexto atual do usuário:
- Empresa: ${co.name || 'não configurada'}
- Segmento: ${co.segment || 'não definido'}
- Plano: ${plan} ${plan === 'trial' ? `(${trialDays} dias restantes)` : ''}
- Módulo atual: ${state.currentView || 'dashboard'}
- Onboarding: ${ob.complete ? 'concluído' : `${done}/${total} etapas (${Math.round(done/total*100)}%)`}
- Produtos cadastrados: ${(state.products||[]).filter(p=>p.active!==false).length}
- Clientes cadastrados: ${(state.clients||[]).length}
- Pedidos este mês: ${(state.orders||[]).filter(o => o.createdAt?.startsWith(new Date().toISOString().slice(0,7))).length}
- Token Focus NFe: ${co.focusToken ? 'configurado' : 'não configurado'}
- Checklist: empresa=${checklist.empresa?'✓':'✗'}, dados=${checklist.dados?'✓':'✗'}, pedido=${checklist.pedido?'✓':'✗'}, nfe=${checklist.nfe?'✓':'✗'}
`;
}

/**
 * Determina o papel do agente baseado no contexto
 */
function buildSystemPrompt() {
  const ob = state.onboarding || {};

  if (!ob.complete && Object.values(ob.checklist||{}).every(v => !v)) {
    // Onboarding inicial — agente assume papel de guia
    return SYSTEM_DOCS + buildTenantContext() + `
## Seu papel agora: ONBOARDING
O usuário acabou de se cadastrar. Guie-o pelas etapas de configuração inicial:
1. Confirmar dados da empresa e segmento de negócio
2. Importar produtos e clientes (perguntar se vem de outro sistema)
3. Criar o primeiro pedido
4. Emitir a primeira NF-e

Comece perguntando qual sistema ele usa hoje para emitir notas fiscais.
Seja proativo — não espere ele perguntar, guide o processo.
`;
  }

  if (!ob.complete) {
    // Onboarding em andamento
    return SYSTEM_DOCS + buildTenantContext() + `
## Seu papel agora: CONTINUAR ONBOARDING
O usuário está no meio da configuração. Ajude-o a completar as etapas pendentes.
Seja proativo — ofereça ajuda específica para a próxima etapa não concluída.
`;
  }

  // Sistema configurado — suporte reativo
  return SYSTEM_DOCS + buildTenantContext() + `
## Seu papel agora: SUPORTE E RELATÓRIOS
O sistema está configurado. Responda dúvidas, gere relatórios em linguagem natural
e ofereça insights sobre os dados do tenant quando relevante.
Para relatórios, acesse os dados do state e apresente em texto claro.
`;
}

/**
 * Envia mensagem para o agente e retorna resposta
 * @param {string} userMessage - Mensagem do usuário
 * @param {File|null} file - Arquivo CSV opcional
 * @returns {Promise<{text: string, actions: Array}>}
 */
async function sendToAgent(userMessage, file = null) {
  // Se há arquivo CSV, processar antes de enviar
  let csvContext = '';
  if (file && typeof parseCSV === 'function') {
    const entity = _detectEntity(userMessage);
    const { data, errors, system } = await parseCSV(file, entity);
    if (data.length > 0) {
      csvContext = `\n[Arquivo CSV recebido: ${data.length} ${entity} detectados do sistema ${system}. ${errors.length > 0 ? `${errors.length} erros.` : 'Sem erros.'}]`;
      // Importar automaticamente
      const result = importToState(data, entity);
      csvContext += `\n[Importação concluída: ${result.imported} importados, ${result.skipped} ignorados (duplicatas).]`;
      completeOnboardingStep('dados');
    } else {
      csvContext = `\n[Arquivo CSV enviado mas sem dados válidos. Erros: ${errors.join(', ')}]`;
    }
  }

  // Montar histórico para a API
  const messages = [
    ...state.agentHistory,
    { role: 'user', content: userMessage + csvContext }
  ];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AGENT_MODEL,
        max_tokens: AGENT_MAX_TOKENS,
        system: buildSystemPrompt(),
        messages,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro na API Anthropic');
    }

    const assistantText = data.content?.[0]?.text || 'Desculpe, não consegui processar sua mensagem.';

    // Atualizar histórico (máximo 20 mensagens para não estourar contexto)
    state.agentHistory = [
      ...messages,
      { role: 'assistant', content: assistantText }
    ].slice(-20);

    // Detectar ações a tomar baseado na resposta
    const actions = _detectActions(assistantText, userMessage);

    return { text: assistantText, actions };

  } catch(e) {
    console.error('agentService error:', e);
    return {
      text: 'Estou com dificuldade de conexão no momento. Tente novamente em alguns instantes.',
      actions: []
    };
  }
}

/**
 * Detecta entidade a importar baseado na mensagem do usuário
 */
function _detectEntity(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('cliente')) return 'clientes';
  if (m.includes('fornecedor')) return 'fornecedores';
  return 'produtos'; // default
}

/**
 * Detecta ações implícitas na conversa para atualizar o state
 */
function _detectActions(assistantText, userMessage) {
  const actions = [];
  const text = (assistantText + ' ' + userMessage).toLowerCase();

  // Detectar conclusão de etapas do onboarding
  if (text.includes('empresa configurada') || text.includes('dados da empresa')) {
    actions.push({ type: 'completeOnboarding', step: 'empresa' });
  }
  if (text.includes('importado') || text.includes('cadastrado') || text.includes('produtos adicionados')) {
    actions.push({ type: 'completeOnboarding', step: 'dados' });
  }
  if (text.includes('pedido criado') || text.includes('primeiro pedido')) {
    actions.push({ type: 'completeOnboarding', step: 'pedido' });
  }
  if (text.includes('nf-e emitida') || text.includes('nota emitida') || text.includes('nota fiscal emitida')) {
    actions.push({ type: 'completeOnboarding', step: 'nfe' });
  }

  return actions;
}

/**
 * Gera relatório em linguagem natural baseado nos dados do state
 */
function generateReport(type) {
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);

  if (type === 'resumo_mes') {
    const pedidosMes = (state.orders||[]).filter(o => (o.createdAt||'').startsWith(mesAtual));
    const nfMes = (state.invoices||[]).filter(i => (i.createdAt||'').startsWith(mesAtual));
    const recMes = (state.receivables||[]).filter(r => (r.dueDate||'').startsWith(mesAtual));
    const totalRec = recMes.reduce((s,r) => s + (r.amount||0), 0);
    const vencidas = recMes.filter(r => r.status !== 'pago' && new Date(r.dueDate) < hoje);

    return `Resumo de ${hoje.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}:
• ${pedidosMes.length} pedidos criados
• ${nfMes.length} NF-e emitidas  
• R$${totalRec.toLocaleString('pt-BR',{minimumFractionDigits:2})} em recebíveis
• ${vencidas.length} contas vencidas`;
  }

  if (type === 'inadimplentes') {
    const inad = (state.clients||[]).filter(c => {
      const recVencidas = (state.receivables||[]).filter(r =>
        r.clientId === c.id && r.status !== 'pago' && new Date(r.dueDate) < hoje
      );
      return recVencidas.length > 0;
    });
    if (inad.length === 0) return 'Nenhum cliente inadimplente no momento.';
    return `${inad.length} cliente(s) com pagamentos em atraso:\n` +
      inad.slice(0,5).map(c => `• ${c.name}`).join('\n') +
      (inad.length > 5 ? `\n...e mais ${inad.length - 5}` : '');
  }

  return 'Tipo de relatório não reconhecido. Tente: resumo do mês, inadimplentes, curva ABC.';
}
```

- [ ] **Step 2: Commitar**

```bash
git add js/services/agentService.js
git commit -m "feat: criar agentService.js com integração Anthropic API e contexto dinâmico"
```

---

## Task 3: Criar agentWidget.js

**Files:**
- Create: `js/modules/agentWidget.js`

- [ ] **Step 1: Criar agentWidget.js**

```javascript
// js/modules/agentWidget.js
// Widget de chat flutuante com o agente de IA

function initAgentWidget() {
  // Criar container do widget se não existir
  if (document.getElementById('agent-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'agent-widget';
  widget.innerHTML = `
    <style>
      #agent-fab {
        position:fixed;bottom:24px;right:24px;width:52px;height:52px;
        background:var(--blue);border-radius:50%;display:flex;align-items:center;
        justify-content:center;cursor:pointer;z-index:1000;box-shadow:0 4px 12px rgba(0,0,0,.3);
        transition:transform .2s;font-size:22px;border:none;
      }
      #agent-fab:hover{transform:scale(1.08);}
      #agent-fab .badge {
        position:absolute;top:-4px;right:-4px;background:var(--red);color:#fff;
        border-radius:50%;width:18px;height:18px;font-size:10px;font-weight:700;
        display:flex;align-items:center;justify-content:center;display:none;
      }
      #agent-panel {
        position:fixed;bottom:88px;right:24px;width:360px;height:520px;
        background:var(--surface);border:1px solid var(--border);border-radius:16px;
        display:none;flex-direction:column;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,.4);
        overflow:hidden;
      }
      #agent-panel.open{display:flex;}
      .agent-head {
        padding:14px 16px;border-bottom:1px solid var(--border);
        display:flex;align-items:center;gap:10px;
      }
      .agent-avatar {
        width:32px;height:32px;background:var(--blue);border-radius:50%;
        display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;
      }
      .agent-name{font-weight:700;font-size:13px;}
      .agent-status{font-size:11px;color:var(--text2);}
      .agent-close{margin-left:auto;background:none;border:none;color:var(--text2);font-size:18px;cursor:pointer;}
      #agent-messages {
        flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;
      }
      .msg {
        max-width:85%;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.5;
      }
      .msg.agent {
        background:var(--surface2);color:var(--text);border-bottom-left-radius:4px;align-self:flex-start;
      }
      .msg.user {
        background:var(--blue);color:#fff;border-bottom-right-radius:4px;align-self:flex-end;
      }
      .msg.typing {
        background:var(--surface2);color:var(--text2);font-style:italic;align-self:flex-start;
      }
      #agent-input-row {
        padding:12px;border-top:1px solid var(--border);display:flex;gap:8px;align-items:flex-end;
      }
      #agent-input {
        flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;
        padding:8px 12px;color:var(--text);font-size:13px;font-family:var(--sans);
        outline:none;resize:none;max-height:80px;min-height:36px;
      }
      #agent-input:focus{border-color:var(--blue);}
      #agent-send {
        background:var(--blue);border:none;border-radius:8px;padding:8px 12px;
        color:#fff;cursor:pointer;font-size:16px;flex-shrink:0;
      }
      #agent-send:hover{opacity:.85;}
      #agent-file-btn {
        background:none;border:1px solid var(--border);border-radius:8px;padding:8px;
        color:var(--text2);cursor:pointer;font-size:14px;flex-shrink:0;
      }
      #agent-file-btn:hover{color:var(--text);border-color:var(--text);}
      #agent-file-input{display:none;}
      .agent-onboarding-bar {
        padding:8px 16px;background:rgba(79,110,247,.08);border-bottom:1px solid var(--border);
        font-size:11px;color:var(--text2);display:flex;align-items:center;gap:8px;
      }
      .ob-progress {
        flex:1;height:4px;background:var(--border);border-radius:2px;overflow:hidden;
      }
      .ob-progress-fill {
        height:100%;background:var(--blue);border-radius:2px;transition:width .4s;
      }
    </style>

    <!-- FAB -->
    <button id="agent-fab" onclick="toggleAgentWidget()" title="Assistente Nina">
      🤖
      <div class="badge" id="agent-badge"></div>
    </button>

    <!-- PAINEL -->
    <div id="agent-panel">
      <div class="agent-head">
        <div class="agent-avatar">🤖</div>
        <div>
          <div class="agent-name">Nina</div>
          <div class="agent-status">Assistente ERP Distribuidora</div>
        </div>
        <button class="agent-close" onclick="toggleAgentWidget()">×</button>
      </div>
      <div id="agent-ob-bar" style="display:none">
        <div class="agent-onboarding-bar">
          <span id="agent-ob-label">Configuração 0%</span>
          <div class="ob-progress"><div class="ob-progress-fill" id="agent-ob-fill" style="width:0%"></div></div>
        </div>
      </div>
      <div id="agent-messages"></div>
      <div id="agent-input-row">
        <input type="file" id="agent-file-input" accept=".csv,.xlsx,.xls" onchange="agentHandleFile(this)">
        <button id="agent-file-btn" onclick="document.getElementById('agent-file-input').click()" title="Importar CSV">📎</button>
        <textarea id="agent-input" placeholder="Pergunte algo ou descreva o que precisa..." rows="1"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();agentSend();}"></textarea>
        <button id="agent-send" onclick="agentSend()">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // Mensagem de boas-vindas
  _agentAppendMessage('agent', _getWelcomeMessage());
  _updateOnboardingBar();
}

function _getWelcomeMessage() {
  const ob = state.onboarding || {};
  const name = state.company?.name;

  if (!ob.complete && !ob.checklist?.empresa) {
    return `Olá${name ? `, ${name}` : ''}! 👋 Sou a Nina, sua assistente. Vou te ajudar a configurar tudo rapidinho.\n\nPrimeira pergunta: qual sistema você usa hoje para emitir notas fiscais?`;
  }
  if (!ob.complete) {
    const done = Object.values(ob.checklist||{}).filter(Boolean).length;
    const total = Object.keys(ob.checklist||{}).length;
    return `Olá de novo! Você está ${Math.round(done/total*100)}% configurado. Quer continuar de onde parou?`;
  }
  return `Olá${name ? `, ${name.split(' ')[0]}` : ''}! Como posso ajudar?`;
}

function _updateOnboardingBar() {
  const ob = state.onboarding || {};
  if (ob.complete) { el('agent-ob-bar').style.display = 'none'; return; }

  const done = Object.values(ob.checklist||{}).filter(Boolean).length;
  const total = Object.keys(ob.checklist||{}).length;
  const pct = Math.round(done/total*100);

  el('agent-ob-bar').style.display = 'block';
  el('agent-ob-label').textContent = `Configuração ${pct}%`;
  el('agent-ob-fill').style.width = pct + '%';
}

window.toggleAgentWidget = function() {
  const panel = el('agent-panel');
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  if (!isOpen) {
    el('agent-input').focus();
    el('agent-badge').style.display = 'none';
  }
};

window.agentSend = async function() {
  const input = el('agent-input');
  const msg = (input.value || '').trim();
  if (!msg) return;

  input.value = '';
  input.style.height = 'auto';

  _agentAppendMessage('user', msg);
  const typingEl = _agentAppendMessage('typing', '...');

  const { text, actions } = await sendToAgent(msg, window._agentPendingFile || null);
  window._agentPendingFile = null;

  typingEl.remove();
  _agentAppendMessage('agent', text);

  // Executar ações detectadas
  actions.forEach(action => {
    if (action.type === 'completeOnboarding') {
      completeOnboardingStep(action.step);
      _updateOnboardingBar();
      // Atualizar dashboard se estiver visível
      if (state.currentView === 'dashboard') render();
    }
  });
};

window.agentHandleFile = function(input) {
  const file = input.files[0];
  if (!file) return;
  window._agentPendingFile = file;
  _agentAppendMessage('user', `📎 Arquivo selecionado: ${file.name}`);
  _agentAppendMessage('agent', `Recebi o arquivo "${file.name}". O que devo importar? Produtos, clientes ou fornecedores?`);
};

function _agentAppendMessage(role, text) {
  const messages = el('agent-messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  // Converter quebras de linha em <br>
  div.innerHTML = text.replace(/\n/g, '<br>');
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

// Notificação proativa — chamada externamente quando há alerta
function agentNotify(message) {
  const badge = el('agent-badge');
  if (badge) {
    badge.style.display = 'flex';
    badge.textContent = '1';
  }
  // Adicionar mensagem ao histórico sem abrir o painel
  _agentAppendMessage('agent', message);
}
```

- [ ] **Step 2: Commitar**

```bash
git add js/modules/agentWidget.js
git commit -m "feat: criar agentWidget.js com chat flutuante e suporte a importação de CSV"
```

---

## Task 4: Integrar widget no index.html e app.js

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`

- [ ] **Step 1: Adicionar scripts ao index.html**

Em `index.html`, antes de `<script src="js/app.js">`, adicionar:

```html
<script src="js/services/agentService.js"></script>
<script src="js/modules/agentWidget.js"></script>
```

- [ ] **Step 2: Inicializar widget no app.js após login**

Em `js/app.js`, no final da função `init()` (após carregar state e autenticar), adicionar:

```javascript
// Inicializar agente de IA
if (typeof initAgentWidget === 'function') {
  initAgentWidget();
}
```

- [ ] **Step 3: Adicionar checklist de onboarding no dashboard**

Em `js/modules/dashboard.js`, no início de `renderDashboard()`, adicionar o bloco de checklist:

```javascript
const ob = state.onboarding || {};
const onboardingHtml = ob.complete ? '' : (() => {
  const items = [
    { key:'empresa',     label:'Dados da empresa configurados' },
    { key:'dados',       label:'Produtos e clientes importados' },
    { key:'pedido',      label:'Primeiro pedido criado' },
    { key:'nfe',         label:'Primeira NF-e emitida' },
    { key:'recebimento', label:'Primeiro recebimento registrado' },
  ];
  const done = items.filter(i => ob.checklist?.[i.key]).length;
  const pct = Math.round(done/items.length*100);
  return `
    <div class="card" style="padding:16px;margin-bottom:16px;border-left:4px solid var(--blue)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:700">Configure sua conta — ${pct}% concluído</div>
        <button class="btn btn-sm" onclick="toggleAgentWidget()">💬 Falar com a Nina</button>
      </div>
      <div style="background:var(--border);border-radius:4px;height:6px;margin-bottom:12px">
        <div style="background:var(--blue);height:100%;width:${pct}%;border-radius:4px;transition:width .4s"></div>
      </div>
      ${items.map(i => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:13px">
          <span>${ob.checklist?.[i.key]?'✅':'⬜'}</span>
          <span style="color:${ob.checklist?.[i.key]?'var(--text)':'var(--text2)'}">${i.label}</span>
        </div>
      `).join('')}
    </div>
  `;
})();
```

Inserir `${onboardingHtml}` no início do HTML retornado pelo `renderDashboard()`.

- [ ] **Step 4: Commitar e push**

```bash
git add index.html js/app.js js/modules/dashboard.js
git commit -m "feat: integrar agente de IA no ERP com widget flutuante e checklist no dashboard"
git push origin main
```

---

## Task 5: Adicionar proxy Anthropic API no Firebase Functions

**Files:**
- Create: `functions/anthropicProxy.js`
- Modify: `functions/index.js`

> **Nota:** A chamada direta à Anthropic API do frontend expõe a API key. Para produção, criar um proxy via Firebase Function que autentica o usuário e faz a chamada server-side.

- [ ] **Step 1: Criar functions/anthropicProxy.js**

```javascript
// functions/anthropicProxy.js
// Proxy para Anthropic API — protege a API key e autentica usuários
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

exports.anthropicProxy = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não autorizado' }); return;
    }
    const idToken = authHeader.split('Bearer ')[1];
    await admin.auth().verifyIdToken(idToken);

    // Fazer chamada à Anthropic API
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        }
      }
    );

    res.status(200).json(response.data);
  } catch(e) {
    console.error('anthropicProxy error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 2: Adicionar ao functions/index.js**

```javascript
exports.anthropicProxy = require('./anthropicProxy').anthropicProxy;
```

- [ ] **Step 3: Configurar API key como secret**

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
# Cole a API key da Anthropic quando solicitado
```

- [ ] **Step 4: Atualizar URL no agentService.js para usar proxy em produção**

Em `js/services/agentService.js`, substituir a URL direta:

```javascript
// Detectar ambiente — usar proxy em produção, API direta em dev
const ANTHROPIC_ENDPOINT = window.location.hostname === 'localhost'
  ? 'https://api.anthropic.com/v1/messages'
  : 'https://us-central1-erp-distribuidora-905ca.cloudfunctions.net/anthropicProxy';

// Montar headers baseado no ambiente
const headers = { 'Content-Type': 'application/json' };
if (window.location.hostname !== 'localhost') {
  // Produção: usar token Firebase para autenticar no proxy
  const token = await window._currentUser?.getIdToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
} else {
  // Dev: API key direta (usar apenas em ambiente de desenvolvimento)
  headers['x-api-key'] = 'SUA_API_KEY_AQUI';
  headers['anthropic-version'] = '2023-06-01';
}
```

- [ ] **Step 5: Deploy e commitar**

```bash
firebase deploy --only functions:anthropicProxy
git add functions/anthropicProxy.js functions/index.js js/services/agentService.js
git commit -m "feat: proxy Firebase Function para Anthropic API — protege API key em produção"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Widget de chat flutuante com botão FAB
- ✅ Onboarding conversacional substituindo wizard estático
- ✅ Contexto dinâmico do tenant injetado em cada mensagem
- ✅ Importação CSV via chat (usuário envia arquivo, agente processa)
- ✅ Checklist de progresso no dashboard
- ✅ Detecção automática de etapas concluídas via análise da conversa
- ✅ Relatórios em linguagem natural (resumo do mês, inadimplentes)
- ✅ Proxy Firebase Function para produção (API key protegida)
- ✅ `csvImport.js` (Plano C) acionado pelo agente, não pelo usuário

**Nota sobre Plano C:** O `js/modules/onboarding.js` do Plano C NÃO deve ser criado. O `js/services/csvImport.js` do Plano C DEVE ser criado antes deste plano — o agente depende de `parseCSV` e `importToState`.

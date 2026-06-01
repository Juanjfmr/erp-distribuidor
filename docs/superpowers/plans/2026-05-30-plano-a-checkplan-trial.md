# Plano A — checkPlan(), Trial 30 dias, Strings Antigas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar bloqueio real de módulos por plano, corrigir trial para 30 dias e renomear strings do projeto antigo.

**Architecture:** `PLAN_LIMITS` e `checkPlan()` vivem em `state.js`. `navigate()` em `nav.js` chama `checkPlan()` antes de renderizar. Trial corrigido em `firebase.js`. Strings antigas em `state.js` e `config.js`.

**Tech Stack:** JavaScript puro (ES Modules), Firebase Firestore, sem dependências externas.

---

## Task 1: Adicionar PLAN_LIMITS e checkPlan() ao state.js

**Files:**
- Modify: `js/core/state.js` — adicionar constantes e função após linha 2 (após STORAGE_KEY)

- [ ] **Step 1: Renomear STORAGE_KEY e strings do projeto antigo**

Em `js/core/state.js`, substituir linha 2:
```javascript
const STORAGE_KEY = "distribuidorms_v2";
```
Por:
```javascript
const STORAGE_KEY = "erp_distribuidor_v1";
```

- [ ] **Step 2: Adicionar PLAN_LIMITS e MODULE_PLAN após STORAGE_KEY**

Inserir após a linha `const STORAGE_KEY = "erp_distribuidor_v1";`:

```javascript
// ─── PLANOS ───────────────────────────────────────────────────────────────────
const PLAN_LIMITS = {
  trial:        { users: 1, products: 50,    nfMonth: 10,   modules: ['basic'] },
  basico:       { users: 1, products: 300,   nfMonth: 100,  modules: ['basic'] },
  profissional: { users: 3, products: 2000,  nfMonth: 500,  modules: ['basic','pro'] },
  empresarial:  { users: 99,products: 99999, nfMonth: 9999, modules: ['basic','pro','enterprise'] },
};

const MODULE_PLAN = {
  devolucoes:   'pro',
  relatorios:   'pro',
  comissoes:    'pro',
  tabelaPreco:  'pro',
  estoqueMin:   'pro',
  pdv:          'enterprise',
  api:          'enterprise',
};

function checkPlan(module) {
  const plan = window._plan || 'trial';
  const required = MODULE_PLAN[module];
  if (!required) return true;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  return limits.modules.includes(required);
}

function getPlanLimit(key) {
  const plan = window._plan || 'trial';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  return limits[key];
}

function showPlanBlockModal(module) {
  const msgs = {
    devolucoes:  'Devoluções',
    relatorios:  'Relatórios avançados e Curva ABC',
    comissoes:   'Comissão de vendedores',
    tabelaPreco: 'Tabela de preços por cliente',
    estoqueMin:  'Estoque mínimo e alertas',
    pdv:         'PDV (Ponto de Venda)',
    api:         'Acesso via API',
  };
  const nome = msgs[module] || module;
  showModal(`
    <div style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:12px">🔒</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">Recurso bloqueado</div>
      <div style="color:var(--text2);margin-bottom:20px"><b>${nome}</b> está disponível a partir do plano <b>Profissional</b>.</div>
      <button class="btn btn-primary" onclick="navigate('minha-conta');closeModal()">Ver planos</button>
      <button class="btn" onclick="closeModal()" style="margin-left:8px">Fechar</button>
    </div>
  `);
}
```

- [ ] **Step 3: Commitar**

```bash
git add js/core/state.js
git commit -m "feat: adiciona PLAN_LIMITS, checkPlan() e getPlanLimit() em state.js"
```

---

## Task 2: Bloquear módulos Pro em nav.js

**Files:**
- Modify: `js/core/nav.js` — interceptar navigate() para módulos bloqueados

- [ ] **Step 1: Adicionar mapeamento de módulos bloqueáveis em nav.js**

Em `js/core/nav.js`, substituir a função `navigate(v)` atual:
```javascript
function navigate(v){
  state.currentView=v;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===v));
  el("page-title").textContent=PAGE_TITLES[v];
  render();
}
```
Por:
```javascript
// Módulos que exigem checkPlan antes de renderizar
const MODULE_GUARD = {
  devolucoes: 'devolucoes',
  relatorios: 'relatorios',
};

function navigate(v){
  // Verificar se módulo requer plano superior
  if (MODULE_GUARD[v] && !checkPlan(MODULE_GUARD[v])) {
    showPlanBlockModal(MODULE_GUARD[v]);
    return;
  }
  state.currentView=v;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===v));
  el("page-title").textContent=PAGE_TITLES[v]||v;
  render();
}
```

- [ ] **Step 2: Adicionar indicadores visuais de bloqueio no applyRoleUI()**

No final da função `applyRoleUI()`, antes do fechamento `}`, adicionar:

```javascript
  // Marcar visualmente itens de nav bloqueados por plano
  document.querySelectorAll('.nav-item[data-view]').forEach(n => {
    const guard = MODULE_GUARD[n.dataset.view];
    const locked = guard && !checkPlan(guard);
    // Adicionar ícone de cadeado se bloqueado
    const existing = n.querySelector('.plan-lock');
    if (locked && !existing) {
      const lock = document.createElement('span');
      lock.className = 'plan-lock';
      lock.textContent = ' 🔒';
      lock.style.fontSize = '10px';
      n.appendChild(lock);
    } else if (!locked && existing) {
      existing.remove();
    }
  });
```

- [ ] **Step 3: Commitar**

```bash
git add js/core/nav.js
git commit -m "feat: bloquear navegação para módulos restritos por plano com modal explicativo"
```

---

## Task 3: Verificar limite de produtos e usuários

**Files:**
- Modify: `js/modules/produtos.js` — bloquear cadastro além do limite
- Modify: `js/modules/usuarios.js` — bloquear criação além do limite

- [ ] **Step 1: Bloquear cadastro de produto além do limite em produtos.js**

Em `js/modules/produtos.js`, localizar a função `saveProduto()` (ou equivalente que salva produto). Adicionar no início da função, antes de qualquer save:

```javascript
// Verificar limite do plano
const limite = getPlanLimit('products');
const ativos = state.products.filter(p => p.active !== false).length;
// Só bloquear se for novo produto (sem id existente)
const isNew = !el('fp-id')?.value;
if (isNew && ativos >= limite) {
  showModal(`
    <div style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:12px">🔒</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">Limite atingido</div>
      <div style="color:var(--text2);margin-bottom:20px">
        Seu plano permite até <b>${limite} produtos</b>. Você tem <b>${ativos}</b> cadastrados.<br>
        Faça upgrade para cadastrar mais.
      </div>
      <button class="btn btn-primary" onclick="navigate('minha-conta');closeModal()">Ver planos</button>
      <button class="btn" onclick="closeModal()" style="margin-left:8px">Fechar</button>
    </div>
  `);
  return;
}
```

- [ ] **Step 2: Bloquear criação de usuário além do limite em usuarios.js**

Em `js/modules/usuarios.js`, localizar a função que cria usuário (chama `createUserWithEmailAndPassword`). Adicionar verificação no início:

```javascript
const limiteUsers = getPlanLimit('users');
const totalUsers = (state.users || []).length + 1; // +1 pelo admin
if (totalUsers >= limiteUsers) {
  showModal(`
    <div style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:12px">🔒</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">Limite de usuários atingido</div>
      <div style="color:var(--text2);margin-bottom:20px">
        Seu plano permite até <b>${limiteUsers} usuário(s)</b>. Faça upgrade para adicionar mais.
      </div>
      <button class="btn btn-primary" onclick="navigate('minha-conta');closeModal()">Ver planos</button>
      <button class="btn" onclick="closeModal()" style="margin-left:8px">Fechar</button>
    </div>
  `);
  return;
}
```

- [ ] **Step 3: Commitar**

```bash
git add js/modules/produtos.js js/modules/usuarios.js
git commit -m "feat: bloquear cadastro além do limite de produtos e usuários por plano"
```

---

## Task 4: Corrigir trial para 30 dias

**Files:**
- Modify: `js/core/firebase.js` — linha 277

- [ ] **Step 1: Alterar cálculo do trialEndsAt**

Em `js/core/firebase.js`, substituir:
```javascript
const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
```
Por:
```javascript
const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
```

- [ ] **Step 2: Corrigir referência no módulo config.js**

Em `js/modules/config.js`, localizar a linha que exibe "14 dias" na UI:
```javascript
<span>${trialDaysLeft} dias restantes de 14</span>
```
Substituir por:
```javascript
<span>${trialDaysLeft} dias restantes de 30</span>
```

E o cálculo da porcentagem:
```javascript
trialPct = Math.round((trialDaysLeft/14)*100);
```
Por:
```javascript
trialPct = Math.round((trialDaysLeft/30)*100);
```

- [ ] **Step 3: Commitar**

```bash
git add js/core/firebase.js js/modules/config.js
git commit -m "feat: alterar trial de 14 para 30 dias"
```

---

## Task 5: Corrigir string de backup do projeto antigo

**Files:**
- Modify: `js/modules/config.js` — nome do arquivo de backup

- [ ] **Step 1: Localizar e substituir nome do arquivo de backup**

Em `js/modules/config.js`, localizar:
```javascript
a.download=`distribuidorms_backup_${today()}.json`;
```
Substituir por:
```javascript
a.download=`erp_distribuidor_backup_${today()}.json`;
```

- [ ] **Step 2: Commitar e push**

```bash
git add js/modules/config.js
git commit -m "fix: renomear strings do projeto antigo para erp_distribuidor"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ checkPlan() implementado em state.js
- ✅ Bloqueio de navegação para módulos Pro em nav.js
- ✅ Limite de produtos bloqueado em produtos.js
- ✅ Limite de usuários bloqueado em usuarios.js
- ✅ Trial alterado para 30 dias em firebase.js e config.js
- ✅ Strings do projeto antigo renomeadas

**Gaps identificados e resolvidos:**
- Limite de NF-e/mês: controlado pelo Focus NFe (Plano B) — não precisa de verificação local
- `window._plan` já é setado pelo firebase.js ao fazer login — checkPlan() funciona sem alteração adicional

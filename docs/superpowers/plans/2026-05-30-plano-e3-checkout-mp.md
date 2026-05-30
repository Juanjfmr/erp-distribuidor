# Plano E3 — Checkout Mercado Pago em Minha Conta

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar checkout de assinatura recorrente do Mercado Pago no módulo "Minha Conta" do ERP, substituindo o botão de WhatsApp por um fluxo de pagamento real.

**Architecture:** `renderMinhaConta()` em `config.js` exibe os planos com botão "Assinar". Ao clicar, uma Firebase Function cria uma preferência de assinatura no MP e retorna a URL de checkout. O cliente é redirecionado para o MP, paga, e o webhook (Plano E2) ativa o plano automaticamente.

**Tech Stack:** JavaScript ES Modules, Firebase Functions (proxy MP), Mercado Pago Subscriptions API.

**Pré-requisito:** Plano E2 deployado (webhook ativo).

---

## Task 1: Firebase Function para criar preferência de assinatura

**Files:**
- Modify: `functions/index.js` — adicionar nova function
- Create: `functions/createSubscription.js`

- [ ] **Step 1: Criar functions/createSubscription.js**

```javascript
// functions/createSubscription.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, PreApprovalPlan, PreApproval } = require('mercadopago');

const db = admin.firestore();

const PLANOS = {
  basico:       { nome: 'ERP Distribuidora Básico',       valor: 79,  frequencia: 'monthly' },
  profissional: { nome: 'ERP Distribuidora Profissional', valor: 149, frequencia: 'monthly' },
  empresarial:  { nome: 'ERP Distribuidora Empresarial',  valor: 299, frequencia: 'monthly' },
};

exports.createSubscription = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    // Verificar autenticação do usuário do ERP
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não autorizado' }); return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Buscar companyId do usuário
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      res.status(404).json({ error: 'Usuário não encontrado' }); return;
    }
    const companyId = userSnap.data().companyId;
    const { plan, backUrl } = req.body;

    if (!PLANOS[plan]) {
      res.status(400).json({ error: 'Plano inválido' }); return;
    }

    const planoConfig = PLANOS[plan];
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken: mpToken });

    // Buscar email do tenant para o MP
    const tenantSnap = await db.collection('empresas').doc(companyId).get();
    const tenantEmail = tenantSnap.data()?.email || decoded.email;

    // Criar assinatura recorrente no MP
    const preapproval = new PreApproval(client);
    const sub = await preapproval.create({
      body: {
        preapproval_plan_id: null, // plano livre
        reason: planoConfig.nome,
        external_reference: companyId,
        payer_email: tenantEmail,
        auto_recurring: {
          frequency: 1,
          frequency_type: planoConfig.frequencia,
          transaction_amount: planoConfig.valor,
          currency_id: 'BRL',
        },
        back_url: backUrl || 'https://erpdistribuidor.com.br',
        status: 'pending',
        metadata: { company_id: companyId, plan },
      }
    });

    res.status(200).json({
      success: true,
      checkoutUrl: sub.init_point,
      subscriptionId: sub.id,
    });

  } catch(e) {
    console.error('createSubscription error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});
```

- [ ] **Step 2: Adicionar ao functions/index.js**

```javascript
exports.createSubscription = require('./createSubscription').createSubscription;
```

- [ ] **Step 3: Deploy da nova function**

```bash
firebase deploy --only functions:createSubscription
```

- [ ] **Step 4: Commitar**

```bash
git add functions/createSubscription.js functions/index.js
git commit -m "feat: Firebase Function createSubscription para gerar checkout MP recorrente"
```

---

## Task 2: Integrar checkout no módulo Minha Conta

**Files:**
- Modify: `js/modules/config.js` — atualizar renderMinhaConta()

- [ ] **Step 1: Localizar a função renderMinhaConta() em config.js**

A função está no início de `js/modules/config.js`. Localizar o bloco que exibe os planos e o botão de WhatsApp.

- [ ] **Step 2: Substituir botão WhatsApp por botão de checkout real**

Localizar o trecho que monta os cards de plano (dentro de `renderMinhaConta`). O botão atual:
```javascript
const msg = encodeURIComponent(`Olá! Quero assinar o plano ${name} (${price}) do ERP Distribuidora...`);
// <a href="https://wa.me/...">Assinar via WhatsApp</a>
```

Substituir por:
```javascript
// Botão de checkout MP
`<button class="btn btn-primary" style="width:100%;margin-top:12px"
  onclick="assinarPlano('${key}')">
  Assinar ${name}
</button>`
```

- [ ] **Step 3: Adicionar função assinarPlano() em config.js**

Após a função `renderMinhaConta()`, adicionar:

```javascript
async function assinarPlano(plan) {
  const FUNCTIONS_BASE = 'https://us-central1-erp-distribuidora-905ca.cloudfunctions.net';

  const btn = event.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Redirecionando...';

  try {
    const token = await window._currentUser.getIdToken();
    const resp = await fetch(`${FUNCTIONS_BASE}/createSubscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan,
        backUrl: window.location.href,
      }),
    });

    const data = await resp.json();

    if (!data.success) {
      alert('Erro ao gerar checkout: ' + (data.error || 'Tente novamente.'));
      btn.disabled = false;
      btn.textContent = 'Assinar ' + plan;
      return;
    }

    // Salvar subscriptionId localmente antes de redirecionar
    localStorage.setItem('pendingSubscriptionId', data.subscriptionId);

    // Redirecionar para checkout MP
    window.location.href = data.checkoutUrl;

  } catch(e) {
    alert('Erro de conexão: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Assinar';
  }
}
```

- [ ] **Step 4: Remover botão de WhatsApp**

Remover ou comentar o trecho que gera o link `wa.me/` nos cards de plano. O fluxo agora é 100% via MP.

- [ ] **Step 5: Adicionar indicador de plano atual**

No card do plano atual (verificado via `window._plan`), substituir o botão por:
```javascript
`<div style="text-align:center;padding:12px;background:rgba(34,197,94,.1);border-radius:6px;color:var(--green);font-weight:700;margin-top:12px">
  ✓ Plano atual
</div>`
```

- [ ] **Step 6: Commitar e push**

```bash
git add js/modules/config.js
git commit -m "feat: integrar checkout Mercado Pago no módulo Minha Conta — substituir WhatsApp"
git push origin main
```

---

## Task 3: Exibir status de inadimplência no ERP

**Files:**
- Modify: `js/core/firebase.js` — exibir tela de bloqueio quando status = 'bloqueado'

- [ ] **Step 1: Verificar status do tenant no carregamento**

Em `js/core/firebase.js`, no callback de `onAuthStateChanged`, após carregar os dados da empresa, adicionar:

```javascript
// Verificar se tenant está bloqueado
const empresaSnap = await getDoc(doc(db, 'empresas', companyId));
if (empresaSnap.exists()) {
  const empresaData = empresaSnap.data();
  window._plan = empresaData.plan || 'trial';
  window._tenantStatus = empresaData.status || 'trial';

  if (empresaData.status === 'bloqueado') {
    // Mostrar tela de bloqueio
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    _showBloqueioScreen(empresaData.plan);
    return;
  }
}
```

- [ ] **Step 2: Criar função _showBloqueioScreen()**

Em `js/core/firebase.js`, adicionar:

```javascript
function _showBloqueioScreen(planoAnterior) {
  // Criar tela de bloqueio se não existir
  let bloqueioEl = document.getElementById('bloqueio-screen');
  if (!bloqueioEl) {
    bloqueioEl = document.createElement('div');
    bloqueioEl.id = 'bloqueio-screen';
    bloqueioEl.style.cssText = 'position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:9999;';
    document.body.appendChild(bloqueioEl);
  }

  bloqueioEl.innerHTML = `
    <div style="text-align:center;max-width:400px;padding:40px">
      <div style="font-size:48px;margin-bottom:16px">🔒</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:8px">Acesso suspenso</div>
      <div style="color:var(--text2);margin-bottom:24px;line-height:1.6">
        Seu acesso foi suspenso por falta de pagamento ou trial expirado.<br>
        Renove sua assinatura para continuar usando o sistema.
      </div>
      <button onclick="navigate('minha-conta');document.getElementById('bloqueio-screen').remove();document.getElementById('app').style.display='flex';"
        style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;">
        Renovar assinatura
      </button>
      <br><br>
      <button onclick="signOutUser()" style="background:none;border:none;color:var(--text2);font-size:12px;cursor:pointer;">
        Sair da conta
      </button>
    </div>
  `;
  bloqueioEl.style.display = 'flex';
}
```

- [ ] **Step 3: Commitar e push**

```bash
git add js/core/firebase.js
git commit -m "feat: tela de bloqueio quando tenant está inadimplente ou trial expirado"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Firebase Function cria assinatura recorrente no MP
- ✅ Botão de checkout substitui WhatsApp em Minha Conta
- ✅ Redirect para checkout MP com companyId como external_reference
- ✅ Webhook (Plano E2) ativa tenant após pagamento — sem ação manual
- ✅ Plano atual exibido com badge "Plano atual" em vez de botão
- ✅ Tela de bloqueio quando status = 'bloqueado'
- ✅ Botão de renovar na tela de bloqueio leva para Minha Conta

**Fluxo completo:**
```
Cliente clica "Assinar Profissional"
→ assinarPlano('profissional') chama createSubscription
→ Function cria assinatura no MP → retorna checkoutUrl
→ Cliente é redirecionado para MP
→ Cliente paga
→ MP dispara webhook → mpWebhook ativa tenant + calcula comissão
→ Cliente volta ao ERP já com plano ativo
```

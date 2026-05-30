# Plano E2 — Firebase Functions (Webhook MP + Comissões)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Firebase Functions que processam webhooks do Mercado Pago, atualizam status dos tenants automaticamente e executam transferências de comissão para afiliados.

**Architecture:** 3 Cloud Functions em Node.js: `mpWebhook` (recebe eventos MP e atualiza Firestore), `checkOverdue` (Cloud Scheduler, roda diariamente e bloqueia inadimplentes), `payAffiliate` (chamada pelo admin para transferir comissão via MP API). Credenciais MP salvas em Firebase Secret Manager.

**Tech Stack:** Node.js 18, Firebase Functions v2, Firestore Admin SDK, Mercado Pago SDK Node.js, Firebase Secret Manager.

**Pré-requisito:** Firebase Blaze (pay-as-you-go) ativo. Token MP de produção disponível.

---

## Estrutura de Arquivos

```
functions/
├── package.json
├── index.js          ← entry point — exporta as 3 functions
├── mpWebhook.js      ← processa eventos do MP
├── checkOverdue.js   ← verifica inadimplência diariamente
└── payAffiliate.js   ← transfere comissão para afiliado
```

---

## Task 1: Inicializar projeto Firebase Functions

**Files:**
- Create: `functions/package.json`
- Create: `functions/index.js`

- [ ] **Step 1: Instalar Firebase CLI e inicializar functions**

```bash
npm install -g firebase-tools
firebase login
firebase init functions
# Escolher: JavaScript, não usar ESLint, instalar dependências
```

- [ ] **Step 2: Instalar dependências**

```bash
cd functions
npm install mercadopago axios
```

- [ ] **Step 3: Criar functions/package.json final**

```json
{
  "name": "erp-distribuidor-functions",
  "version": "1.0.0",
  "engines": { "node": "18" },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.0.0",
    "mercadopago": "^2.0.0",
    "axios": "^1.6.0"
  }
}
```

- [ ] **Step 4: Criar functions/index.js**

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

exports.mpWebhook = require('./mpWebhook').mpWebhook;
exports.checkOverdue = require('./checkOverdue').checkOverdue;
exports.payAffiliate = require('./payAffiliate').payAffiliate;
```

- [ ] **Step 5: Commitar**

```bash
git add functions/
git commit -m "feat: inicializar projeto Firebase Functions"
```

---

## Task 2: Webhook do Mercado Pago

**Files:**
- Create: `functions/mpWebhook.js`

- [ ] **Step 1: Criar mpWebhook.js**

```javascript
// functions/mpWebhook.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment, PreApproval } = require('mercadopago');

const db = admin.firestore();

exports.mpWebhook = functions.https.onRequest(async (req, res) => {
  // Só aceitar POST
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const { type, data } = req.body;
  console.log('MP Webhook:', type, data?.id);

  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken: mpToken });

    // ── Pagamento único aprovado ──
    if (type === 'payment') {
      const payment = new Payment(client);
      const p = await payment.get({ id: data.id });

      if (p.status !== 'approved') { res.status(200).send('ignored'); return; }

      const companyId = p.metadata?.company_id || p.external_reference;
      if (!companyId) { res.status(200).send('no company_id'); return; }

      const plano = p.metadata?.plan || 'basico';
      const valor = p.transaction_amount;

      // Atualizar tenant
      await db.collection('empresas').doc(companyId).update({
        status: 'ativo',
        plan: plano,
        lastPayment: new Date().toISOString(),
        nextDue: _addDays(new Date(), 30).toISOString(),
      });

      // Salvar pagamento
      await db.collection('pagamentos').add({
        companyId,
        plan: plano,
        valor,
        data: new Date().toISOString(),
        metodo: _metodoPagamento(p.payment_type_id),
        statusMP: p.status,
        mpPaymentId: String(data.id),
      });

      // Calcular comissão do afiliado
      await _calcularComissao(companyId, valor);

      console.log(`Tenant ${companyId} ativado — plano ${plano} — R$${valor}`);
    }

    // ── Assinatura (preapproval) ──
    if (type === 'subscription_preapproval') {
      const preapproval = new PreApproval(client);
      const sub = await preapproval.get({ id: data.id });

      const companyId = sub.external_reference;
      if (!companyId) { res.status(200).send('no company_id'); return; }

      if (sub.status === 'authorized') {
        await db.collection('empresas').doc(companyId).update({
          status: 'ativo',
          mpSubscriptionId: String(data.id),
          lastPayment: new Date().toISOString(),
          nextDue: sub.next_payment_date,
        });
      } else if (sub.status === 'cancelled' || sub.status === 'paused') {
        await db.collection('empresas').doc(companyId).update({ status: 'inadimplente' });
      }
    }

    res.status(200).send('ok');
  } catch(e) {
    console.error('Webhook error:', e);
    res.status(500).send('error');
  }
});

async function _calcularComissao(companyId, valorPagamento) {
  // Buscar tenant para ver se tem afiliado
  const tenantSnap = await db.collection('empresas').doc(companyId).get();
  if (!tenantSnap.exists) return;
  const affiliateCode = tenantSnap.data().affiliateCode;
  if (!affiliateCode) return;

  // Buscar afiliado pelo código
  const afiliadoSnap = await db.collection('afiliados').where('code', '==', affiliateCode).limit(1).get();
  if (afiliadoSnap.empty) return;

  const afiliadoDoc = afiliadoSnap.docs[0];
  const comissao = parseFloat((valorPagamento * 0.20).toFixed(2));
  const atual = afiliadoDoc.data().comissaoDevida || 0;
  const mrrAtual = afiliadoDoc.data().mrrGerado || 0;

  await afiliadoDoc.ref.update({
    comissaoDevida: atual + comissao,
    mrrGerado: mrrAtual + valorPagamento,
  });

  console.log(`Comissão R$${comissao} creditada para afiliado ${affiliateCode}`);
}

function _metodoPagamento(type) {
  const map = { credit_card:'Cartão', debit_card:'Débito', account_money:'Conta MP', pix:'Pix', bank_transfer:'TED', ticket:'Boleto' };
  return map[type] || type || '—';
}

function _addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
```

- [ ] **Step 2: Commitar**

```bash
git add functions/mpWebhook.js
git commit -m "feat: webhook MP para ativar tenants e calcular comissões de afiliados"
```

---

## Task 3: Cloud Scheduler — verificação de inadimplência

**Files:**
- Create: `functions/checkOverdue.js`

- [ ] **Step 1: Criar checkOverdue.js**

```javascript
// functions/checkOverdue.js
// Roda todo dia às 08:00 BRT via Cloud Scheduler
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

exports.checkOverdue = functions.pubsub
  .schedule('0 11 * * *') // 11:00 UTC = 08:00 BRT
  .timeZone('America/Manaus')
  .onRun(async () => {
    const hoje = new Date().toISOString();
    const snap = await db.collection('empresas').where('status', 'in', ['ativo', 'inadimplente']).get();

    for (const docSnap of snap.docs) {
      const t = docSnap.data();
      if (!t.nextDue) continue;

      const diasAtraso = Math.floor((new Date() - new Date(t.nextDue)) / 86400000);

      if (diasAtraso >= 10 && t.status !== 'bloqueado') {
        await docSnap.ref.update({ status: 'bloqueado' });
        console.log(`Tenant ${docSnap.id} BLOQUEADO — ${diasAtraso}d de atraso`);
      } else if (diasAtraso >= 5 && t.status === 'ativo') {
        await docSnap.ref.update({ status: 'inadimplente' });
        console.log(`Tenant ${docSnap.id} INADIMPLENTE — ${diasAtraso}d de atraso`);
      }
    }

    // Verificar trials expirados
    const trialsSnap = await db.collection('empresas').where('status', '==', 'trial').get();
    for (const docSnap of trialsSnap.docs) {
      const t = docSnap.data();
      if (!t.trialEndsAt) continue;
      if (new Date(t.trialEndsAt) < new Date()) {
        await docSnap.ref.update({ status: 'bloqueado' });
        console.log(`Trial expirado: tenant ${docSnap.id} BLOQUEADO`);
      }
    }

    console.log('checkOverdue concluído');
    return null;
  });
```

- [ ] **Step 2: Commitar**

```bash
git add functions/checkOverdue.js
git commit -m "feat: Cloud Scheduler para bloqueio automático de inadimplentes e trials expirados"
```

---

## Task 4: Pagamento de comissão para afiliado

**Files:**
- Create: `functions/payAffiliate.js`

- [ ] **Step 1: Criar payAffiliate.js**

```javascript
// functions/payAffiliate.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const db = admin.firestore();
const ADMIN_EMAIL = 'SEU_EMAIL_AQUI@email.com'; // Substituir

exports.payAffiliate = functions.https.onRequest(async (req, res) => {
  // CORS para o admin.html
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    // Verificar autenticação — só o admin pode chamar
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não autorizado' }); return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Acesso negado' }); return;
    }

    const { afiliadoId, valor } = req.body;
    if (!afiliadoId || !valor || valor <= 0) {
      res.status(400).json({ error: 'afiliadoId e valor são obrigatórios' }); return;
    }

    // Buscar afiliado
    const afiliadoSnap = await db.collection('afiliados').doc(afiliadoId).get();
    if (!afiliadoSnap.exists) {
      res.status(404).json({ error: 'Afiliado não encontrado' }); return;
    }
    const afiliado = afiliadoSnap.data();

    if (!afiliado.mpAccount) {
      res.status(400).json({ error: 'Afiliado sem conta Mercado Pago cadastrada' }); return;
    }

    // Executar transferência via MP
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken: mpToken });
    const payment = new Payment(client);

    const result = await payment.create({
      body: {
        transaction_amount: valor,
        description: `Comissão de afiliado — ERP Distribuidora`,
        payment_method_id: 'account_money',
        payer: { email: afiliado.mpAccount },
      }
    });

    if (result.status !== 'approved') {
      res.status(500).json({ error: `MP retornou status: ${result.status}` }); return;
    }

    // Registrar pagamento e zerar saldo
    const totalPagoAtual = afiliado.totalPago || 0;
    await afiliadoSnap.ref.update({
      comissaoDevida: 0,
      totalPago: totalPagoAtual + valor,
      pagamentos: admin.firestore.FieldValue.arrayUnion({
        valor,
        data: new Date().toISOString(),
        mpPaymentId: String(result.id),
      }),
    });

    console.log(`Comissão R$${valor} paga para afiliado ${afiliadoId} — MP ID: ${result.id}`);
    res.status(200).json({ success: true, mpPaymentId: result.id });

  } catch(e) {
    console.error('payAffiliate error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});
```

- [ ] **Step 2: Substituir ADMIN_EMAIL no arquivo**

Substituir `SEU_EMAIL_AQUI@email.com` pelo seu email real.

- [ ] **Step 3: Commitar**

```bash
git add functions/payAffiliate.js
git commit -m "feat: Firebase Function payAffiliate para transferência de comissão via MP"
```

---

## Task 5: Configurar secrets e fazer deploy

**Files:**
- Modify: `functions/index.js` — nenhuma alteração necessária

- [ ] **Step 1: Configurar token MP como secret**

```bash
firebase functions:secrets:set MP_ACCESS_TOKEN
# Cole o token de produção do Mercado Pago quando solicitado
```

- [ ] **Step 2: Fazer deploy das functions**

```bash
firebase deploy --only functions
```

Saída esperada:
```
✔ functions[mpWebhook]: Successful create operation.
✔ functions[checkOverdue]: Successful create operation.
✔ functions[payAffiliate]: Successful create operation.
```

- [ ] **Step 3: Registrar URL do webhook no Mercado Pago**

No painel do MP → Configurações → Webhooks:
- URL: `https://us-central1-erp-distribuidora-905ca.cloudfunctions.net/mpWebhook`
- Eventos: `payment`, `subscription_preapproval`

- [ ] **Step 4: Atualizar FUNCTIONS_BASE no admin.html**

Em `admin.html`, substituir:
```javascript
const FUNCTIONS_BASE = 'https://us-central1-SEU_PROJETO.cloudfunctions.net';
```
Por:
```javascript
const FUNCTIONS_BASE = 'https://us-central1-erp-distribuidora-905ca.cloudfunctions.net';
```

- [ ] **Step 5: Commitar e push**

```bash
git add admin.html
git commit -m "feat: atualizar FUNCTIONS_BASE no admin com URL real das Firebase Functions"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Webhook MP processa pagamentos aprovados e ativa tenants
- ✅ Webhook MP processa assinaturas recorrentes (preapproval)
- ✅ Comissão calculada automaticamente (20%) a cada pagamento recebido
- ✅ Cloud Scheduler: inadimplente após 5 dias, bloqueado após 10 dias
- ✅ Trial expirado → bloqueado automaticamente
- ✅ payAffiliate: autenticação admin, transferência MP, registro no Firestore
- ✅ Credenciais MP em Secret Manager (não expostas no código)

**Atenção:** Em sandbox/homologação do MP, transferências para conta_money podem não funcionar. Testar com conta MP de produção.

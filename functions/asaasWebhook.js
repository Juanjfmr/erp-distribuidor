// functions/asaasWebhook.js
// Recebe webhooks do Asaas — confirmação de pagamento (PIX, boleto, cartão).
// Atualiza o recebível no Firestore do tenant automaticamente.
//
// O externalReference enviado na criação da cobrança segue o formato:
//   <companyId>:<receivableId>
// Ex: "9wtsr1KH8KbtUCqn57ivUHdwbrG2:rec_abc123"

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

const db = admin.firestore();

// Token de autenticação do webhook — definido no painel Asaas
// Se vazio, webhook aceita qualquer chamada (modo insecure — só para dev/sandbox)
const AUTH_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';

exports.asaasWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Validar token de autenticação do Asaas (header asaas-access-token)
  if (AUTH_TOKEN) {
    const receivedToken = req.headers['asaas-access-token'];
    if (receivedToken !== AUTH_TOKEN) {
      console.warn('asaasWebhook: token inválido');
      return res.status(401).send('Unauthorized');
    }
  }

  const { id: eventId, event, payment } = req.body || {};
  console.log(`asaasWebhook: event=${event} paymentId=${payment?.id} eventId=${eventId}`);

  if (!event || !payment) {
    return res.status(200).send('ignored: no event/payment');
  }

  const validEvents = [
    'PAYMENT_RECEIVED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
  ];

  if (!validEvents.includes(event)) {
    return res.status(200).send(`ignored: event=${event}`);
  }

  // Extrair referência: companyId:receivableId
  const ref = payment.externalReference || '';
  const idx = ref.indexOf(':');
  if (idx === -1) {
    console.warn(`asaasWebhook: externalReference sem companyId (${ref})`);
    return res.status(200).send('ignored: no companyId in ref');
  }

  const companyId = ref.substring(0, idx);
  const receivableId = ref.substring(idx + 1);

  if (!companyId || !receivableId) {
    return res.status(200).send('ignored: invalid ref');
  }

  try {
    const companyRef = db.collection('empresas').doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists) {
      console.warn(`asaasWebhook: empresa ${companyId} não encontrada`);
      return res.status(200).send('ignored: company not found');
    }

    const recSnap = await companyRef.collection('receivables').doc(receivableId).get();
    if (!recSnap.exists) {
      console.warn(`asaasWebhook: receivable ${receivableId} não encontrado`);
      return res.status(200).send('ignored: receivable not found');
    }

    const receivable = recSnap.data();
    if (receivable.status === 'paga') {
      return res.status(200).send('already paid');
    }

    const paidAt = payment.paymentDate || payment.confirmedDate
      || new Date().toISOString().slice(0, 10);
    const paidAmount = payment.value || payment.netValue || receivable.amount;

    // 1. Marcar recebível como pago
    await recSnap.ref.update({
      status: 'paga',
      paidAt,
      paidAmount: parseFloat(paidAmount),
      asaasPaymentId: payment.id,
    });

    // 2. Criar transação no caixa
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await companyRef.collection('transactions').doc(txId).set({
      id: txId,
      date: paidAt,
      type: 'entrada',
      category: 'Vendas',
      description: `Recebimento ${receivable.invoiceNumber || ''} (${payment.billingType || 'Asaas'})`,
      amount: parseFloat(paidAmount),
      reference: `Asaas ${payment.id}`,
      reconciled: true,
      createdAt: new Date().toISOString(),
    });

    console.log(`asaasWebhook OK: rec=${receivableId} R$${paidAmount} empresa=${companyId}`);
    return res.status(200).json({ received: true, receivableId, status: 'paga' });

  } catch (err) {
    console.error('asaasWebhook error:', err);
    return res.status(500).json({ received: false, error: err.message });
  }
});

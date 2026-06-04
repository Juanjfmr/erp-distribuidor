const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment, PreApproval } = require('mercadopago');

const db = admin.firestore();

exports.mpWebhook = functions.https.onRequest(async (req, res) => {
  // Só aceitar POST
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { type, data } = req.body;
  console.log('MP Webhook:', type, data?.id);

  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const client = new MercadoPagoConfig({ accessToken: mpToken });

    // ── Pagamento único aprovado ──
    if (type === 'payment') {
      const payment = new Payment(client);
      const p = await payment.get({ id: data.id });

      if (p.status !== 'approved') {
        res.status(200).send('ignored');
        return;
      }

      const companyId = p.metadata?.company_id || p.external_reference;
      if (!companyId) {
        res.status(200).send('no company_id');
        return;
      }

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
      if (!companyId) {
        res.status(200).send('no company_id');
        return;
      }

      if (sub.status === 'authorized') {
        await db.collection('empresas').doc(companyId).update({
          status: 'ativo',
          mpSubscriptionId: String(data.id),
          lastPayment: new Date().toISOString(),
          nextDue: sub.next_payment_date,
        });
      } else if (sub.status === 'cancelled' || sub.status === 'paused') {
        await db.collection('empresas').doc(companyId).update({
          status: 'inadimplente'
        });
      }
    }

    res.status(200).send('ok');
  } catch (e) {
    console.error('Webhook error:', e);
    res.status(500).send('error');
  }
});

async function _calcularComissao(companyId, valorPagamento) {
  // Buscar tenant para ver se foi indicado por algum afiliado (referredBy)
  const tenantSnap = await db.collection('empresas').doc(companyId).get();
  if (!tenantSnap.exists) return;
  const referredBy = tenantSnap.data().referredBy;
  if (!referredBy) return;

  // Buscar afiliado pelo código de indicação (referredBy)
  const afiliadoSnap = await db.collection('afiliados').where('code', '==', referredBy).limit(1).get();
  if (afiliadoSnap.empty) return;

  const afiliadoDoc = afiliadoSnap.docs[0];
  const comissao = parseFloat((valorPagamento * 0.20).toFixed(2));
  const atual = afiliadoDoc.data().comissaoDevida || 0;
  const mrrAtual = afiliadoDoc.data().mrrGerado || 0;

  await afiliadoDoc.ref.update({
    comissaoDevida: atual + comissao,
    mrrGerado: mrrAtual + valorPagamento,
  });

  console.log(`Comissão R$${comissao} creditada para afiliado ${referredBy}`);
}

function _metodoPagamento(type) {
  const map = {
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    account_money: 'Saldo Mercado Pago',
    pix: 'Pix',
    bank_transfer: 'Transferência Bancária',
    ticket: 'Boleto'
  };
  return map[type] || type || '—';
}

function _addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

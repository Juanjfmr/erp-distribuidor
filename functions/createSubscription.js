// functions/createSubscription.js
// Callable function — auth gerenciado automaticamente pelo Firebase.
// Não precisa de IAM role porque não usa verifyIdToken manual.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');

const db = admin.firestore();

const PLANOS = {
  basico:       { nome: 'ERP Distribuidora Básico',       valor: 79,  frequencia: 'months' },
  profissional: { nome: 'ERP Distribuidora Profissional', valor: 149, frequencia: 'months' },
  empresarial:  { nome: 'ERP Distribuidora Empresarial',  valor: 299, frequencia: 'months' },
};

exports.createSubscription = functions.runWith({ secrets: ['MP_ACCESS_TOKEN'] }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const uid = context.auth.uid;
  const { plan } = data;

  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Usuário não encontrado.');
  }
  const companyId = userSnap.data().companyId;

  if (!PLANOS[plan]) {
    throw new functions.https.HttpsError('invalid-argument', 'Plano inválido.');
  }

  const planoConfig = PLANOS[plan];
  const mpToken = process.env.MP_ACCESS_TOKEN;
  const client = new MercadoPagoConfig({ accessToken: mpToken });

  const tenantSnap = await db.collection('empresas').doc(companyId).get();
  const tenantEmail = tenantSnap.data()?.email
    || context.auth.token.email
    || userSnap.data()?.email
    || 'cliente@email.com';

  const preapproval = new PreApproval(client);
  const sub = await preapproval.create({
    body: {
      reason: planoConfig.nome,
      external_reference: companyId,
      payer_email: tenantEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: planoConfig.frequencia,
        transaction_amount: planoConfig.valor,
        currency_id: 'BRL',
      },
      back_url: 'https://stoqio.com.br',
      status: 'pending',
      metadata: { company_id: companyId, plan },
    }
  });

  console.log(`Assinatura criada para ${companyId} — plano ${plan} — ID: ${sub.id}`);
  return {
    success: true,
    checkoutUrl: sub.init_point,
    subscriptionId: sub.id,
  };
});

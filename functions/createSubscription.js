const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');

const db = admin.firestore();

const PLANOS = {
  basico:       { nome: 'ERP Distribuidora Básico',       valor: 79,  frequencia: 'monthly' },
  profissional: { nome: 'ERP Distribuidora Profissional', valor: 149, frequencia: 'monthly' },
  empresarial:  { nome: 'ERP Distribuidora Empresarial',  valor: 299, frequencia: 'monthly' },
};

exports.createSubscription = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Verificar autenticação do usuário do ERP
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Buscar companyId do usuário
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    const companyId = userSnap.data().companyId;
    const { plan, backUrl } = req.body;

    if (!PLANOS[plan]) {
      res.status(400).json({ error: 'Plano inválido' });
      return;
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

  } catch (e) {
    console.error('createSubscription error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const db = admin.firestore();
const ADMIN_EMAIL = 'juanjfmr1@gmail.com';

exports.payAffiliate = functions.https.onRequest(async (req, res) => {
  // CORS para o admin.html
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
    // Verificar autenticação — só o admin pode chamar
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.email !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    const { afiliadoId, valor } = req.body;
    if (!afiliadoId || !valor || valor <= 0) {
      res.status(400).json({ error: 'afiliadoId e valor são obrigatórios' });
      return;
    }

    // Buscar afiliado
    const afiliadoSnap = await db.collection('afiliados').doc(afiliadoId).get();
    if (!afiliadoSnap.exists) {
      res.status(404).json({ error: 'Afiliado não encontrado' });
      return;
    }
    const afiliado = afiliadoSnap.data();

    if (!afiliado.mpAccount) {
      res.status(400).json({ error: 'Afiliado sem conta Mercado Pago cadastrada' });
      return;
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
      res.status(500).json({ error: `MP retornou status: ${result.status}` });
      return;
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

  } catch (e) {
    console.error('payAffiliate error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

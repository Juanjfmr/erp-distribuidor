// functions/cancelSubscription.js
// Callable function — cancela a assinatura recorrente no Mercado Pago
// e atualiza o tenant para status "cancelado".
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');

const db = admin.firestore();

exports.cancelSubscription = functions
  .runWith({ secrets: ['MP_ACCESS_TOKEN'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    const uid = context.auth.uid;
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Usuário não encontrado.');
    }

    const companyId = userSnap.data().companyId;
    const tenantSnap = await db.collection('empresas').doc(companyId).get();
    if (!tenantSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Empresa não encontrada.');
    }

    const tenant = tenantSnap.data();
    const mpSubscriptionId = tenant.mpSubscriptionId;

    if (!mpSubscriptionId) {
      // Sem assinatura no MP — só atualiza o Firestore
      await tenantSnap.ref.update({
        status: 'trial',
        plan: 'trial',
        mpSubscriptionId: admin.firestore.FieldValue.delete(),
      });
      return { success: true, message: 'Assinatura local removida.' };
    }

    // Cancelar no Mercado Pago
    try {
      const mpToken = process.env.MP_ACCESS_TOKEN;
      const client = new MercadoPagoConfig({ accessToken: mpToken });
      const preapproval = new PreApproval(client);

      await preapproval.update({
        id: mpSubscriptionId,
        body: { status: 'cancelled' }
      });

      console.log(`Assinatura MP ${mpSubscriptionId} cancelada para ${companyId}`);
    } catch (mpError) {
      console.error('MP cancel error:', mpError.message);
      // Mesmo se falhar no MP, atualizamos localmente
    }

    // Atualizar Firestore — volta para trial (sem bloqueio)
    await tenantSnap.ref.update({
      status: 'trial',
      plan: 'trial',
      mpSubscriptionId: admin.firestore.FieldValue.delete(),
    });

    return { success: true, message: 'Assinatura cancelada com sucesso.' };
  });

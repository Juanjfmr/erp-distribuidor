const functions = require('firebase-functions');
const admin = require('firebase-admin');
// admin já inicializado em index.js

// Apenas o admin do sistema pode gerenciar empresas (operação cross-tenant).
// O gate no admin.html é client-side e pode ser burlado por qualquer usuário
// autenticado chamando a callable direto — a verificação real precisa estar aqui.
const ADMIN_EMAIL = 'juanjfmr1@gmail.com';

exports.manageCompany = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }
  if (context.auth.token.email !== ADMIN_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Acesso restrito ao administrador.');
  }

  const { action, companyId, plan, status, name } = data;
  const db = admin.firestore();

  if (action === 'find') {
    const snap = await db.collection('empresas').get();
    const results = [];
    snap.forEach(doc => {
      const d = doc.data();
      const companyName = (d.company && d.company.name) || d.name || '';
      if (!name || companyName.toLowerCase().includes(name.toLowerCase())) {
        results.push({
          id: doc.id,
          name: companyName,
          plan: d.plan || 'trial',
          status: d.status || 'active',
          trialEndsAt: d.trialEndsAt || null,
          createdAt: d.createdAt || null,
          active: d.active
        });
      }
    });
    return { success: true, companies: results };
  }

  if (action === 'update' && companyId) {
    const updateData = {};
    if (plan) updateData.plan = plan;
    if (status) updateData.status = status;
    if (plan === 'vitalicio') {
      updateData.active = true;
      updateData.trialEndsAt = null;
    }
    await db.collection('empresas').doc(companyId).update(updateData);
    // Also update the company sub-object
    if (plan) {
      await db.collection('empresas').doc(companyId).update({
        'company.plan': plan
      });
    }
    return { success: true, updated: updateData };
  }

  return { success: false, error: 'Invalid action' };
});

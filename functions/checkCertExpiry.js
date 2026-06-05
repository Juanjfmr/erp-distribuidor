// functions/checkCertExpiry.js
// Cron diário: notifica tenants com certificado expirando em 30 dias
// e reverte status para SEM_CERTIFICADO se já expirado.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

exports.checkCertExpiry = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const db     = admin.firestore();
    const now    = new Date();
    const in30d  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const snap   = await db.collection('empresas').get();

    const updates = [];
    snap.forEach(doc => {
      const company = doc.data()?.company;
      if (!company?.certExpiresAt) return;

      const exp = new Date(company.certExpiresAt);

      if (exp < now) {
        updates.push(doc.ref.update({
          'company.fiscalStatus': 'SEM_CERTIFICADO',
          'company.certAlert':    { tipo: 'expirado', desde: exp.toISOString() },
        }));
      } else if (exp < in30d) {
        const diasRestantes = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
        updates.push(doc.ref.update({
          'company.certAlert': { tipo: 'expirando', diasRestantes, expiraEm: exp.toISOString() },
        }));
      } else {
        if (company.certAlert) {
          updates.push(doc.ref.update({ 'company.certAlert': null }));
        }
      }
    });

    await Promise.all(updates);
    console.log(`checkCertExpiry: processados ${snap.size} tenants, ${updates.length} atualizações.`);
  });

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

// Executa diariamente às 08:00 Horário de Brasília (BRT)
exports.checkOverdue = functions.pubsub
  .schedule('0 11 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
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

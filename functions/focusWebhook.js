// functions/focusWebhook.js
// Recebe notificações da Focus NFe (webhooks) e atualiza status das NFs no Firestore.
// Registrado automaticamente após registerTenant criar a empresa na Focus.
//
// A URL do webhook será: https://<region>-<project>.cloudfunctions.net/focusWebhook
// Deve ser registrada na Focus via POST /v2/webhooks com o token master.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

exports.focusWebhook = functions.https.onRequest(async (req, res) => {
  // Focus NFe envia POST com JSON no body quando um documento muda de status
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  if (!body || !body.cnpj_emitente) {
    return res.status(400).json({ error: 'Payload inválido — esperado JSON com cnpj_emitente.' });
  }

  try {
    const cnpj     = (body.cnpj_emitente || '').replace(/\D/g, '');
    const status   = body.status;         // 'autorizado', 'cancelado', 'erro_autorizacao', etc.
    const chave    = body.chave_nfe || body.chave || '';
    const ref      = body.ref || '';
    const tipo     = body.tipo_documento || 'nfe'; // nfe, nfce, cte, nfse, mdfe

    // Busca o tenant pelo CNPJ
    const empresasRef = admin.firestore().collection('empresas');
    const snapshot = await empresasRef
      .where('company.cnpj', '==', cnpj)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Empresa não encontrada no Firestore — pode ser um webhook de outro sistema
      console.warn(`Webhook recebido para CNPJ ${cnpj} não encontrado no Firestore.`);
      return res.json({ received: true, warning: 'CNPJ não encontrado no Firestore' });
    }

    const companyDoc = snapshot.docs[0];
    const companyId  = companyDoc.id;

    // Determina qual coleção atualizar baseado no tipo de documento
    const collectionMap = {
      nfe:  'invoices',
      nfce: 'invoices',
      cte:  'invoices',
      nfse: 'invoices',
      mdfe: 'invoices',
    };
    const collection = collectionMap[tipo] || 'invoices';

    // Busca o documento pelo focusRef (ex: 'nfe_<invoiceId>') ou chave
    let docRef = null;
    if (ref) {
      const refSnapshot = await empresasRef.doc(companyId)
        .collection(collection)
        .where('focusRef', '==', ref)
        .limit(1)
        .get();
      if (!refSnapshot.empty) docRef = refSnapshot.docs[0].ref;
    }

    if (!docRef && chave) {
      const chaveSnapshot = await empresasRef.doc(companyId)
        .collection(collection)
        .where('chave', '==', chave)
        .limit(1)
        .get();
      if (!chaveSnapshot.empty) docRef = chaveSnapshot.docs[0].ref;
    }

    if (docRef) {
      await docRef.update({
        status:         status,
        statusSefaz:    status,
        updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
        webhookData:    body,
        webhookAt:      admin.firestore.FieldValue.serverTimestamp(),
      });

      // Se autorizado, salva dados adicionais
      if (status === 'autorizado') {
        await docRef.update({
          chave:  chave,
          danfeUrl: body.caminho_danfe || body.danfe_url || null,
          xmlUrl:   body.caminho_xml   || body.xml_url   || null,
          numero:   body.numero,
          serie:    body.serie,
        });
      }

      console.log(`Webhook processado: ${tipo} ${chave} → ${status} (companyId: ${companyId})`);
    } else {
      console.log(`Webhook recebido mas documento não encontrado: ${tipo} ref=${ref} chave=${chave}`);
    }

    return res.json({ received: true, status, companyId });
  } catch (err) {
    console.error('Erro ao processar webhook Focus NFe:', err);
    return res.status(500).json({ error: 'Erro interno', details: err.message });
  }
});

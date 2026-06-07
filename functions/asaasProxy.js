// functions/asaasProxy.js
// Proxy Cloud Function — frontend chama esta função (sem CORS), 
// e ela encaminha para a API Asaas. Token do tenant lido do Firestore.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');

exports.asaasProxy = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { companyId, method, path, body } = req.body || {};
  if (!companyId || !method || !path) {
    return res.status(400).json({ error: 'companyId, method e path são obrigatórios.' });
  }

  try {
    // Busca token e ambiente do Firestore
    const companyDoc = await admin.firestore().doc(`empresas/${companyId}`).get();
    if (!companyDoc.exists) return res.status(404).json({ error: 'Empresa não encontrada.' });

    const co   = companyDoc.data()?.company || {};
    const key  = co.asaasKey;
    const env  = co.asaasEnv || 'sandbox';

    if (!key) return res.status(400).json({ error: 'Token Asaas não configurado.' });

    const baseUrl = env === 'producao'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    const resp = await axios({
      method,
      url: baseUrl + path,
      headers: {
        'Content-Type': 'application/json',
        'access_token': key,
      },
      data: method !== 'GET' ? body : undefined,
      timeout: 30000,
    });

    return res.json({ success: true, status: resp.status, data: resp.data });

  } catch (err) {
    const asaasError = err.response?.data;
    console.error('asaasProxy error:', asaasError || err.message);
    return res.status(err.response?.status || 500).json({
      success: false,
      error: asaasError?.errors?.[0]?.description || err.message,
      data: asaasError || null,
    });
  }
});

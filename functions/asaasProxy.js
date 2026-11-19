// functions/asaasProxy.js
// Proxy Cloud Function — o frontend chama esta função (sem CORS), e ela encaminha
// para a API Asaas no servidor. A chave API do tenant é lida do Firestore, nunca
// exposta ao frontend. Cada tenant usa sua própria chave → PIX cai na conta do tenant.
//
// POST { companyId, method, path, body }
// O proxy repassa method + path + body diretamente para a API Asaas.
// A chave e o ambiente (sandbox/produção) vêm do Firestore do tenant.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');
const { requireTenantUser } = require('./requestAuth');

exports.asaasProxy = functions.https.onRequest(async (req, res) => {
  // CORS — permite chamadas do frontend
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Use POST.' });
  }

  const { companyId, method, path, body: asaasBody } = req.body || {};
  if (!companyId || !method || !path) {
    return res.status(400).json({ success: false, error: 'companyId, method e path são obrigatórios.' });
  }

  // O proxy antigo aceitava qualquer metodo e caminho do Asaas.
  // Permitir apenas as rotas usadas pelo app, impedindo operacoes arbitrarias.
  const allowed =
    (method === 'GET' && /^\/customers\?cpfCnpj=\d{11,14}$/.test(path)) ||
    (method === 'GET' && /^\/payments\/[A-Za-z0-9_-]+\/pixQrCode$/.test(path)) ||
    (method === 'POST' && (path === '/customers' || path === '/payments'));
  if (!allowed) {
    return res.status(400).json({ success: false, error: 'Operacao nao permitida.' });
  }

  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  if (!projectId || projectId === 'erp-distribuidora-905ca' || process.env.STOQIO_LAB_ALLOW_EXTERNAL !== 'true') {
    return res.status(503).json({ success: false, error: 'Integracao externa desabilitada no Stoqio Lab.' });
  }

  try {
    await requireTenantUser(req, admin, companyId, ['admin', 'vendedor']);
  } catch (err) {
    return res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'Falha de autenticacao.' });
  }

  try {
    // Busca a chave e ambiente do tenant no Firestore
    const companyDoc = await admin.firestore().doc(`empresas/${companyId}`).get();
    if (!companyDoc.exists) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada.' });
    }

    const company = companyDoc.data()?.company || {};
    const key     = company.asaasKey;
    const env     = company.asaasEnv || 'sandbox';

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Chave Asaas não configurada para esta empresa.',
        hint: 'Acesse Configurações → Financeiro e configure a chave API do Asaas.'
      });
    }

    // URL base conforme ambiente
    const baseUrl = env === 'producao'
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    const url = `${baseUrl}${path}`;

    // Encaminha a chamada para o Asaas
    const asaasResp = await axios({
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'access_token': key,
      },
      data: asaasBody || undefined,
      timeout: 30000,
    });

    return res.json({
      success: true,
      status: asaasResp.status,
      data:   asaasResp.data,
    });

  } catch (err) {
    const asaasError = err.response?.data;
    const status     = err.response?.status || 500;

    console.error(`asaasProxy error [${method} ${path}]:`, asaasError || err.message);

    return res.status(status).json({
      success: false,
      status,
      error: asaasError?.errors?.[0]?.description || asaasError?.message || err.message,
      data:  asaasError || null,
    });
  }
});

// functions/focusProxy.js
// Proxy Cloud Function — o frontend chama esta função (sem CORS), e ela encaminha
// para a API Focus NFe no servidor. O token do tenant é lido do Firestore, nunca
// exposto ao frontend.
//
// POST { companyId, action, payload }
// actions disponíveis: todas as operações da API Focus NFe

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');
const { requireTenantUser } = require('./requestAuth');

// Mapeamento de action → { method, pathTemplate, needsRef }
const ROUTES = {
  // NF-e
  emitir_nfe:        { method: 'POST',   path: '/v2/nfe?ref={ref}',           needsRef: true },
  cancelar_nfe:      { method: 'DELETE', path: '/v2/nfe?ref={ref}',           needsRef: true },
  consultar_nfe:     { method: 'GET',    path: '/v2/nfe?ref={ref}',           needsRef: true },
  carta_correcao:    { method: 'POST',   path: '/v2/nfe?ref={ref}',           needsRef: true },
  enviar_email:      { method: 'POST',   path: '/v2/nfe?ref={ref}',           needsRef: true },
  previsualizar:     { method: 'POST',   path: '/v2/nfe/preview',             needsRef: false },
  inutilizar:        { method: 'POST',   path: '/v2/nfe/inutilizar',          needsRef: false },
  importar_nfe:      { method: 'POST',   path: '/v2/nfe/importar',            needsRef: false },

  // NFCe
  emitir_nfce:       { method: 'POST',   path: '/v2/nfce?ref={ref}',          needsRef: true },
  cancelar_nfce:     { method: 'DELETE', path: '/v2/nfce?ref={ref}',          needsRef: true },

  // NFS-e
  emitir_nfse:       { method: 'POST',   path: '/v2/nfse?ref={ref}',          needsRef: true },
  cancelar_nfse:     { method: 'DELETE', path: '/v2/nfse?ref={ref}',          needsRef: true },

  // CT-e
  emitir_cte:        { method: 'POST',   path: '/v2/cte?ref={ref}',           needsRef: true },
  cancelar_cte:      { method: 'DELETE', path: '/v2/cte?ref={ref}',           needsRef: true },

  // MDF-e
  emitir_mdfe:       { method: 'POST',   path: '/v2/mdfe?ref={ref}',          needsRef: true },
  cancelar_mdfe:     { method: 'DELETE', path: '/v2/mdfe?ref={ref}',          needsRef: true },

  // Consultas auxiliares
  consultar_cep:     { method: 'GET',    path: '/v2/cep/{codigo}',             needsRef: false },
  consultar_ncm:     { method: 'GET',    path: '/v2/ncm/{codigo}',             needsRef: false },
  consultar_cnpj:    { method: 'GET',    path: '/v2/cnpj/{codigo}',            needsRef: false },

  // NF Recebidas
  listar_recebidas:  { method: 'GET',    path: '/v2/nfes_recebidas',          needsRef: false },
  consultar_recebida:{ method: 'GET',    path: '/v2/nfes_recebidas/{chave}.json', needsRef: false },
  manifestar:        { method: 'POST',   path: '/v2/nfes_recebidas/{chave}/manifesto', needsRef: false },
};

exports.focusProxy = functions.https.onRequest(async (req, res) => {
  // CORS — permite chamadas do frontend (local + produção)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  const { companyId, action, payload } = req.body || {};
  if (!companyId || !action) {
    return res.status(400).json({ success: false, error: 'companyId e action são obrigatórios.' });
  }

  const route = ROUTES[action];
  if (!route) {
    return res.status(400).json({ success: false, error: `Ação desconhecida: ${action}` });
  }

  // No Lab, integrações externas são bloqueadas por padrão, mesmo com credenciais.
  // Jamais permitir que esta branch use os serviços do projeto de produção.
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
    // Busca o token e ambiente do tenant no Firestore
    const companyDoc = await admin.firestore().doc(`empresas/${companyId}`).get();
    if (!companyDoc.exists) {
      return res.status(404).json({ success: false, error: 'Empresa não encontrada.' });
    }

    const company    = companyDoc.data()?.company || {};
    const token      = company.focusNfeToken;
    const env        = company.focusNfeEnv || 'homologacao';

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token Focus NFe não configurado para esta empresa.' });
    }

    const baseUrl = env === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';

    // Constrói a URL
    let url = baseUrl + route.path;
    if (route.needsRef && payload?.ref) {
      url = url.replace('{ref}', encodeURIComponent(payload.ref));
    }
    url = url.replace('{codigo}', encodeURIComponent(payload?.codigo || ''));
    url = url.replace('{chave}', encodeURIComponent(payload?.chave || ''));

    // Prepara o body (sem o ref/codigo/chave que já foram usados na URL)
    const body = { ...(payload || {}) };
    delete body.ref;
    delete body.codigo;
    delete body.chave;

    // Faz a chamada para a Focus NFe
    const axiosConfig = {
      method: route.method,
      url,
      auth: { username: token, password: '' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 45000, // 45s para processamento SEFAZ
    };

    if (route.method !== 'GET') {
      axiosConfig.data = body;
    }

    const focusResp = await axios(axiosConfig);

    return res.json({
      success: true,
      status: focusResp.status,
      data:   focusResp.data,
    });

  } catch (err) {
    const focusError = err.response?.data;
    const status     = err.response?.status || 500;

    console.error(`focusProxy error [${action}]:`, focusError || err.message);

    return res.status(status).json({
      success: false,
      status,
      error: focusError?.mensagem || focusError || err.message,
      data:  focusError || null,
    });
  }
});

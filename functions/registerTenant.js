// functions/registerTenant.js
// Registra o tenant na Focus NFe usando o token master do Stoqio.
// O token master NUNCA vai ao frontend — fica em variável de ambiente.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');

exports.registerTenant = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');
  }

  const { companyId, fiscalData, env } = data;
  if (!companyId || !fiscalData?.cnpj) {
    throw new functions.https.HttpsError('invalid-argument', 'companyId e fiscalData.cnpj são obrigatórios.');
  }

  // Token master: tenta env var, depois Firestore (configurado via admin.html)
  let masterToken = (functions.config().focusnfe?.master_token) || process.env.FOCUS_NFE_MASTER_TOKEN;
  if (!masterToken) {
    const masterTokenDoc = await admin.firestore().doc('config/focusNfe').get();
    masterToken = masterTokenDoc.data()?.masterToken;
  }
  if (!masterToken) {
    throw new functions.https.HttpsError('internal', 'Token master Focus NFe não configurado no servidor.');
  }

  const baseUrl = env === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

  const payload = {
    cnpj:                  fiscalData.cnpj.replace(/\D/g, ''),
    nome:                  fiscalData.razaoSocial,
    nome_fantasia:         fiscalData.nomeFantasia || fiscalData.razaoSocial,
    regime_tributario:     fiscalData.regime || '1',
    inscricao_estadual:    fiscalData.ie || 'ISENTO',
    logradouro:            fiscalData.logradouro,
    municipio:             fiscalData.cidade,
    uf:                    fiscalData.uf,
    cep:                   (fiscalData.cep || '').replace(/\D/g, ''),
    email:                 fiscalData.email || '',
    telefone:              fiscalData.telefone || '',
    habilita_nfe:          true,
    ambiente_nfe:          env === 'producao' ? 'producao' : 'homologacao',
  };

  try {
    const resp = await axios.post(`${baseUrl}/v2/empresas`, payload, {
      auth: { username: masterToken, password: '' },
    });

    const tenantToken = resp.data?.token || resp.data?.api_token;
    if (!tenantToken) {
      throw new functions.https.HttpsError('internal', 'Focus NFe não retornou token do tenant.');
    }

    await admin.firestore().doc(`empresas/${companyId}`).update({
      'company.focusNfeToken':  tenantToken,
      'company.focusNfeEnv':    env || 'homologacao',
      'company.fiscalStatus':   'CONFIGURADO',
      'company.fiscalData':     fiscalData,
    });

    return { success: true };

  } catch (err) {
    const focusMsg  = err.response?.data?.mensagem || err.message;
    const focusCod  = err.response?.data?.codigo   || 'erro_desconhecido';

    await admin.firestore().doc(`empresas/${companyId}`).update({
      'company.fiscalStatus':               'ERRO_REGISTRO',
      'company.fiscalData.lastError':       { codigo: focusCod, mensagem: focusMsg },
    });

    return { success: false, codigo: focusCod, mensagem: focusMsg };
  }
});

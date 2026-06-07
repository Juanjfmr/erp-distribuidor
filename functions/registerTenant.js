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

  // Registro SEMPRE via API de produção — é o único endpoint que aceita POST /v2/empresas.
  // A escolha de ambiente (homologação/produção) determina qual token salvar, não a URL de registro.
  const payload = {
    cnpj:               fiscalData.cnpj.replace(/\D/g, ''),
    nome:               fiscalData.razaoSocial,
    nome_fantasia:      fiscalData.nomeFantasia || fiscalData.razaoSocial,
    regime_tributario:  fiscalData.regime || '1',
    inscricao_estadual: fiscalData.ie || 'ISENTO',
    logradouro:         fiscalData.logradouro,
    municipio:          fiscalData.cidade,
    uf:                 fiscalData.uf,
    cep:                (fiscalData.cep || '').replace(/\D/g, ''),
    email:              fiscalData.email || '',
    telefone:           fiscalData.telefone || '',
    habilita_nfe:       true,
  };

  try {
    const resp = await axios.post('https://api.focusnfe.com.br/v2/empresas', payload, {
      auth: { username: masterToken, password: '' },
    });

    // Focus NFe retorna tokens separados para cada ambiente
    const tokenHomologacao = resp.data?.token_homologacao;
    const tokenProducao    = resp.data?.token_producao;

    // Salva o token do ambiente escolhido como token ativo
    const tokenAtivo = env === 'producao' ? tokenProducao : tokenHomologacao;
    if (!tokenAtivo) {
      throw new functions.https.HttpsError('internal', 'Focus NFe não retornou token do tenant.');
    }

    await admin.firestore().doc(`empresas/${companyId}`).update({
      'company.focusNfeToken':           tokenAtivo,
      'company.focusNfeTokenHomologacao': tokenHomologacao,
      'company.focusNfeTokenProducao':    tokenProducao,
      'company.focusNfeEnv':             env || 'homologacao',
      'company.fiscalStatus':            'CONFIGURADO',
      'company.fiscalData':              fiscalData,
    });

    // ─── Auto-registra webhook na Focus NFe ──────────────────────────────────
    try {
      const functionUrl = `https://${process.env.GCLOUD_PROJECT || 'erp-distribuidora-905ca'}.cloudfunctions.net/focusWebhook`;
      await axios.post('https://api.focusnfe.com.br/v2/webhooks', {
        url:    functionUrl,
        eventos: ['nfe', 'nfce', 'nfse', 'cte', 'mdfe'],
        cnpj:   fiscalData.cnpj.replace(/\D/g, ''),
      }, {
        auth: { username: masterToken, password: '' },
      });
      console.log(`Webhook registrado para ${fiscalData.cnpj} → ${functionUrl}`);
    } catch (webhookErr) {
      // Webhook falhou — não é crítico, a emissão funciona sem webhook (usa polling)
      console.warn(`Falha ao registrar webhook para ${fiscalData.cnpj}:`, webhookErr.response?.data || webhookErr.message);
    }

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

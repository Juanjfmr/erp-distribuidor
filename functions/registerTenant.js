// functions/registerTenant.js
// Registra o tenant na Focus NFe usando o token master do Stoqio.
// O token master NUNCA vai ao frontend — fica em variável de ambiente.
//
// Fluxo idempotente (v2):
//   1. Salva status REGISTRANDO no Firestore (âncora de idempotência)
//   2. GET /v2/empresas/{cnpj} — verifica se já existe na Focus
//   3. Se existe → PATCH (atualiza). Se não → POST (cria).
//   4. Em caso de 409 no POST, faz GET para recuperar tokens existentes
//   5. Após sucesso, atualiza Firestore com tokens + status final
//
// Isso corrige dois bugs:
//   - Falha do Firestore após sucesso na Focus deixava estado irreconciliável
//   - Retry de registerTenant fazia POST duplicado (409) sem tratamento

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');
const crypto    = require('crypto');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getMasterToken() {
  let token = functions.config().focusnfe?.master_token || process.env.FOCUS_NFE_MASTER_TOKEN;
  if (!token) {
    const doc = await admin.firestore().doc('config/focusNfe').get();
    token = doc.data()?.masterToken;
  }
  if (!token) {
    throw new functions.https.HttpsError('internal', 'Token master Focus NFe não configurado no servidor.');
  }
  return token;
}

function encryptPfx(pfxBase64) {
  const encKey = functions.config().cert?.encryption_key || process.env.CERT_ENCRYPTION_KEY;
  if (!encKey) return null; // sem chave = não persiste cert (erro tratado pelo caller)
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv('aes-256-cbc', Buffer.from(encKey, 'hex'), iv);
  const enc       = Buffer.concat([cipher.update(pfxBuffer), cipher.final()]);
  return { iv: iv.toString('hex'), data: enc.toString('hex') };
}

function buildPayload(fiscalData, pfxBase64, certSenha) {
  return {
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
    ...(pfxBase64 && certSenha ? {
      arquivo_certificado_base64: pfxBase64,
      senha_certificado:          certSenha,
    } : {}),
  };
}

async function registerWebhook(masterToken, cnpj) {
  try {
    const functionUrl = `https://${process.env.GCLOUD_PROJECT || 'erp-distribuidora-905ca'}.cloudfunctions.net/focusWebhook`;
    await axios.post('https://api.focusnfe.com.br/v2/webhooks', {
      url:    functionUrl,
      eventos: ['nfe', 'nfce', 'nfse', 'cte', 'mdfe'],
      cnpj:   cnpj.replace(/\D/g, ''),
    }, { auth: { username: masterToken, password: '' } });
    console.log(`Webhook registrado para ${cnpj} → ${functionUrl}`);
  } catch (err) {
    console.warn(`Falha ao registrar webhook para ${cnpj}:`, err.response?.data || err.message);
  }
}

function buildFirestoreUpdate(respData, env, fiscalData, encCert, certExpiresAt, hasCert) {
  const tokenHomologacao = respData?.token_homologacao;
  const tokenProducao    = respData?.token_producao;
  const tokenAtivo       = env === 'producao' ? tokenProducao : tokenHomologacao;

  if (!tokenAtivo) {
    throw new functions.https.HttpsError('internal', 'Focus NFe não retornou token do tenant.');
  }

  const update = {
    'company.focusNfeToken':            tokenAtivo,
    'company.focusNfeTokenHomologacao': tokenHomologacao,
    'company.focusNfeTokenProducao':    tokenProducao,
    'company.focusNfeEnv':              env || 'homologacao',
    'company.fiscalStatus':             hasCert ? 'CERTIFICADO_INSTALADO' : 'CONFIGURADO',
    'company.fiscalData':               fiscalData,
  };

  if (encCert) {
    update['company.certEncrypted'] = encCert;
    if (certExpiresAt) update['company.certExpiresAt'] = certExpiresAt;
  }

  return update;
}

// ─── Função principal ─────────────────────────────────────────────────────────

exports.registerTenant = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');
  }

  const { companyId, fiscalData, env, pfxBase64, certSenha } = data;
  if (!companyId || !fiscalData?.cnpj) {
    throw new functions.https.HttpsError('invalid-argument', 'companyId e fiscalData.cnpj são obrigatórios.');
  }

  const cnpjLimpo    = fiscalData.cnpj.replace(/\D/g, '');
  const hasCert      = !!(pfxBase64 && certSenha);
  const masterToken  = await getMasterToken();
  const companyRef   = admin.firestore().doc(`empresas/${companyId}`);

  // ─── Passo 1: Âncora de idempotência ────────────────────────────────────
  // Salva REGISTRANDO ANTES de qualquer chamada à Focus.
  // Se o processo morrer depois do sucesso na Focus, o GET do próximo retry
  // encontra a empresa e recupera os tokens.
  await companyRef.update({
    'company.fiscalStatus':           'REGISTRANDO',
    'company.fiscalData':             fiscalData,
    'company.fiscalData.lastError':   admin.firestore.FieldValue.delete(),
  });

  try {
    // ─── Passo 2: Verifica se já existe na Focus ──────────────────────────
    let focusData = null;
    try {
      const getResp = await axios.get(
        `https://api.focusnfe.com.br/v2/empresas/${cnpjLimpo}`,
        { auth: { username: masterToken, password: '' } }
      );
      focusData = getResp.data;
      console.log(`Empresa ${cnpjLimpo} já existe na Focus — atualizando.`);
    } catch (getErr) {
      if (getErr.response?.status !== 404) {
        // Erro inesperado no GET — aborta
        const msg = getErr.response?.data?.mensagem || getErr.message;
        throw Object.assign(new Error(msg), { focusCode: getErr.response?.data?.codigo || 'erro_get' });
      }
      // 404 = não existe, segue para criação
      console.log(`Empresa ${cnpjLimpo} não encontrada na Focus — criando.`);
    }

    let respData;

    if (focusData) {
      // ─── Empresa já existe: PATCH (atualiza dados + cert se enviado) ──
      const patchPayload = hasCert
        ? { arquivo_certificado_base64: pfxBase64, senha_certificado: certSenha }
        : buildPayload(fiscalData, pfxBase64, certSenha);

      const patchResp = await axios.patch(
        `https://api.focusnfe.com.br/v2/empresas/${cnpjLimpo}`,
        patchPayload,
        { auth: { username: masterToken, password: '' } }
      );

      // PATCH pode não retornar tokens — usa os do GET ou da resposta
      respData = {
        token_homologacao: patchResp.data?.token_homologacao || focusData.token_homologacao,
        token_producao:    patchResp.data?.token_producao    || focusData.token_producao,
        certificado_valido_ate: patchResp.data?.certificado_valido_ate,
      };
    } else {
      // ─── Empresa nova: POST (cria) ─────────────────────────────────────
      const payload = buildPayload(fiscalData, pfxBase64, certSenha);
      try {
        const postResp = await axios.post(
          'https://api.focusnfe.com.br/v2/empresas',
          payload,
          { auth: { username: masterToken, password: '' } }
        );
        respData = postResp.data;
      } catch (postErr) {
        // 409 = race condition: empresa foi criada entre nosso GET e POST
        if (postErr.response?.status === 409) {
          console.log(`409 no POST — empresa ${cnpjLimpo} já existe. Recuperando tokens...`);
          const retryGet = await axios.get(
            `https://api.focusnfe.com.br/v2/empresas/${cnpjLimpo}`,
            { auth: { username: masterToken, password: '' } }
          );
          respData = retryGet.data;

          // Se tem cert novo, faz PATCH para atualizá-lo
          if (hasCert) {
            await axios.patch(
              `https://api.focusnfe.com.br/v2/empresas/${cnpjLimpo}`,
              { arquivo_certificado_base64: pfxBase64, senha_certificado: certSenha },
              { auth: { username: masterToken, password: '' } }
            );
          }
        } else {
          throw postErr;
        }
      }
    }

    // ─── Passo 3: Encripta certificado (se enviado) ──────────────────────
    let encCert      = null;
    let certExpiresAt = null;
    if (hasCert) {
      encCert = encryptPfx(pfxBase64);
      certExpiresAt = respData?.certificado_valido_ate || null;
    }

    // ─── Passo 4: Atualiza Firestore com status final ────────────────────
    const firestoreUpdate = buildFirestoreUpdate(respData, env, fiscalData, encCert, certExpiresAt, hasCert);
    await companyRef.update(firestoreUpdate);

    // ─── Passo 5: Webhook (não bloqueante) ───────────────────────────────
    registerWebhook(masterToken, cnpjLimpo); // fire-and-forget

    return { success: true, certInstalado: hasCert };

  } catch (err) {
    // ─── Falha: registra erro no Firestore ───────────────────────────────
    const focusMsg = err.response?.data?.mensagem || err.message;
    const focusCod = err.response?.data?.codigo   || err.focusCode || 'erro_desconhecido';

    await companyRef.update({
      'company.fiscalStatus':         'ERRO_REGISTRO',
      'company.fiscalData.lastError': { codigo: focusCod, mensagem: focusMsg },
    });

    return { success: false, codigo: focusCod, mensagem: focusMsg };
  }
});

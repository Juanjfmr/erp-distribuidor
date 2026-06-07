// functions/uploadCertificate.js
// Valida certificado A1 (.pfx), armazena encriptado no Firestore e envia para a Focus NFe.
// A chave de encriptação NUNCA vai ao Firestore — fica em variável de ambiente.
// A senha do certificado NUNCA é persistida — só usada em memória para validação e envio.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const forge     = require('node-forge');
const crypto    = require('crypto');
const axios     = require('axios');

function encryptCert(pfxBuffer, encKey) {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encKey, 'hex'), iv);
  const enc    = Buffer.concat([cipher.update(pfxBuffer), cipher.final()]);
  return { iv: iv.toString('hex'), data: enc.toString('hex') };
}

exports.uploadCertificate = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação necessária.');
  }

  const { companyId, pfxBase64, senha, cnpj } = data;
  if (!companyId || !pfxBase64 || !senha || !cnpj) {
    throw new functions.https.HttpsError('invalid-argument', 'companyId, pfxBase64, senha e cnpj são obrigatórios.');
  }

  const encKey = functions.config().cert?.encryption_key || process.env.CERT_ENCRYPTION_KEY;
  if (!encKey) {
    throw new functions.https.HttpsError('internal', 'Chave de encriptação não configurada.');
  }

  let pfxBuffer;
  try {
    pfxBuffer = Buffer.from(pfxBase64, 'base64');
  } catch {
    throw new functions.https.HttpsError('invalid-argument', 'Arquivo inválido — não é base64 válido.');
  }

  let p12;
  try {
    const asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    p12        = forge.pkcs12.pkcs12FromAsn1(asn1, senha);
  } catch {
    return { success: false, error: 'Senha incorreta ou arquivo corrompido.' };
  }

  // Extrair CNPJ do subject do certificado
  let certBags = [];
  try {
    certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  } catch { /* ignora */ }

  if (certBags.length > 0) {
    const subject   = certBags[0].cert?.subject?.attributes || [];
    const cnField   = subject.find(a => a.shortName === 'CN')?.value || '';
    const cnpjMatch = cnField.match(/\d{14}/);
    const certCnpj  = cnpjMatch ? cnpjMatch[0] : null;
    const inputCnpj = cnpj.replace(/\D/g, '');

    if (certCnpj && certCnpj !== inputCnpj) {
      return {
        success: false,
        error: `O certificado pertence ao CNPJ ${certCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}. Verifique.`,
      };
    }
  }

  // Verificar validade
  let expiresAt = null;
  if (certBags.length > 0) {
    const notAfter = certBags[0].cert?.validity?.notAfter;
    if (notAfter) {
      expiresAt = notAfter.toISOString();
      if (new Date(notAfter) < new Date()) {
        return { success: false, error: `Certificado expirado em ${new Date(notAfter).toLocaleDateString('pt-BR')}.` };
      }
    }
  }

  const { iv, data: encData } = encryptCert(pfxBuffer, encKey);

  // Verifica se empresa já está registrada na Focus (tem token) — renovação vs. primeiro setup
  const companyDoc = await admin.firestore().doc(`empresas/${companyId}`).get();
  const company    = companyDoc.data()?.company || {};
  const hasToken   = !!company.focusNfeToken;

  if (!hasToken) {
    // Primeiro setup: empresa ainda não existe na Focus — cert será enviado em registerTenant
    await admin.firestore().doc(`empresas/${companyId}`).update({
      'company.certEncrypted': { iv, data: encData },
      'company.certExpiresAt': expiresAt,
      'company.fiscalStatus':  'SEM_CERTIFICADO',
    });
    return { success: true, expiresAt };
  }

  // Renovação: empresa já registrada — salva e PATCH direto na Focus
  await admin.firestore().doc(`empresas/${companyId}`).update({
    'company.certEncrypted': { iv, data: encData },
    'company.certExpiresAt': expiresAt,
    'company.fiscalStatus':  'ENVIANDO_CERTIFICADO',
  });

  let masterToken = (functions.config().focusnfe?.master_token) || process.env.FOCUS_NFE_MASTER_TOKEN;
  if (!masterToken) {
    const masterTokenDoc = await admin.firestore().doc('config/focusNfe').get();
    masterToken = masterTokenDoc.data()?.masterToken;
  }
  if (!masterToken) {
    await admin.firestore().doc(`empresas/${companyId}`).update({ 'company.fiscalStatus': 'ERRO_CERTIFICADO' });
    return { success: false, error: 'Token master Focus NFe não configurado no servidor.' };
  }

  const cnpjLimpo = cnpj.replace(/\D/g, '');
  try {
    await axios.patch(
      `https://api.focusnfe.com.br/v2/empresas/${cnpjLimpo}`,
      { arquivo_certificado_base64: pfxBase64, senha_certificado: senha },
      { auth: { username: masterToken, password: '' } }
    );
  } catch (err) {
    const focusMsg = err.response?.data?.mensagem || err.response?.data?.erros?.[0]?.mensagem || err.message;
    await admin.firestore().doc(`empresas/${companyId}`).update({
      'company.fiscalStatus':  'ERRO_CERTIFICADO',
      'company.certLastError': focusMsg,
    });
    return { success: false, error: focusMsg };
  }

  await admin.firestore().doc(`empresas/${companyId}`).update({
    'company.fiscalStatus':  'CERTIFICADO_INSTALADO',
    'company.certLastError': admin.firestore.FieldValue.delete(),
  });

  return { success: true, expiresAt };
});

// functions/classTrib.js
// Motor de classificacao tributaria — determina cClassTrib sugerido por produto.
// Funcao pura classificarProduto(produto) + callable sugerirClassTrib.
// Sem LLM. Deterministica. So leitura (nunca grava).
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { VERSAO_TABELA, CODIGO_TRIBUTACAO_INTEGRAL, existeClassTrib, descreverClassTrib } = require('./classTribTable');
const { ehNcmEspecial } = require('./ncmEspecial');

const db = admin.firestore();

// ─── Funcao pura de classificacao ─────────────────────────────────────────────
// Entrada: { id, name, ncm, cClassTrib, ... }
// Saida: { produtoId, nivel, cstSugerido, cClassTribSugerido, confianca, motivo, dispositivoLegal, versaoTabela }
function classificarProduto(produto) {
  const produtoId = produto.id;
  const ncm = produto.ncm || '';
  const cClassTrib = produto.cClassTrib || '';

  // 1. ja classificado — cClassTrib preenchido e valido em R1
  if (cClassTrib && existeClassTrib(cClassTrib)) {
    const desc = descreverClassTrib(cClassTrib);
    return {
      produtoId,
      nivel: 'ja_classificado',
      cstSugerido: null,
      cClassTribSugerido: null,
      confianca: null,
      motivo: 'Produto ja classificado com cClassTrib ' + cClassTrib + ' (' + (desc?.descricao || 'codigo valido') + ').',
      dispositivoLegal: desc?.dispositivo || null,
      versaoTabela: VERSAO_TABELA,
    };
  }

  // 1b. cClassTrib preenchido mas NAO existe em R1 — flag codigoDesconhecido
  if (cClassTrib && !existeClassTrib(cClassTrib)) {
    return {
      produtoId,
      nivel: 'ja_classificado',
      cstSugerido: null,
      cClassTribSugerido: null,
      confianca: null,
      codigoDesconhecido: true,
      motivo: 'cClassTrib ' + cClassTrib + ' preenchido mas nao localizado na tabela R1 (versao ' + VERSAO_TABELA + '). Revisao necessaria.',
      dispositivoLegal: null,
      versaoTabela: VERSAO_TABELA,
    };
  }

  // 2. Sem NCM — nao e possivel classificar
  if (!ncm || typeof ncm !== 'string' || ncm.replace(/\D/g, '').length < 4) {
    return {
      produtoId,
      nivel: 'sem_ncm',
      cstSugerido: null,
      cClassTribSugerido: null,
      confianca: null,
      motivo: 'Produto sem NCM cadastrado. Informe o NCM para permitir a classificacao tributaria.',
      dispositivoLegal: null,
      versaoTabela: VERSAO_TABELA,
    };
  }

  // 3. NCM presente e em R2 (tratamento especial) → revisar
  if (ehNcmEspecial(ncm)) {
    return {
      produtoId,
      nivel: 'revisar',
      cstSugerido: null,
      cClassTribSugerido: null,
      confianca: 'media',
      motivo: 'NCM ' + ncm + ' possui tratamento especial na Reforma Tributaria (LC 214/2025). Consulte um contador para determinar o cClassTrib correto.',
      dispositivoLegal: 'LC 214/2025 – art. 26 (cesta basica nacional) e regulamentacao complementar',
      versaoTabela: VERSAO_TABELA,
    };
  }

  // 4. NCM presente e NAO em R2 → padrao (tributacao integral)
  const codigo = CODIGO_TRIBUTACAO_INTEGRAL;
  const desc = descreverClassTrib(codigo);
  return {
    produtoId,
    nivel: 'padrao',
    cstSugerido: '000',
    cClassTribSugerido: codigo,
    confianca: 'alta',
    motivo: 'Tributacao integral — sem tratamento especial para o NCM ' + ncm + '.',
    dispositivoLegal: desc?.dispositivo || 'LC 214/2025 — regra geral',
    versaoTabela: VERSAO_TABELA,
  };
}

// ─── Callable: sugerirClassTrib ────────────────────────────────────────────────
exports.sugerirClassTrib = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario nao autenticado.');
  }

  const uid = context.auth.uid;
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Usuario nao encontrado.');
  }
  const companyId = userSnap.data().companyId;
  if (!companyId) {
    throw new functions.https.HttpsError('failed-precondition', 'Empresa nao configurada.');
  }

  const produtoIds = data?.produtoIds || null;

  // Carrega produtos da empresa
  const productsSnap = await db.collection('empresas').doc(companyId).collection('products').get();
  let produtos = [];
  productsSnap.forEach(doc => {
    const p = doc.data();
    p.id = doc.id;
    if (p.active === false) return; // Ignora inativos
    produtos.push(p);
  });

  // Filtra por IDs explicitos se informado
  if (Array.isArray(produtoIds) && produtoIds.length > 0) {
    produtos = produtos.filter(p => produtoIds.includes(p.id));
  }

  // Classifica cada produto
  const itens = produtos.map(p => classificarProduto(p));

  // Resumo
  const resumo = {
    padrao: itens.filter(i => i.nivel === 'padrao').length,
    revisar: itens.filter(i => i.nivel === 'revisar').length,
    sem_ncm: itens.filter(i => i.nivel === 'sem_ncm').length,
    ja_classificado: itens.filter(i => i.nivel === 'ja_classificado').length,
  };

  return {
    versaoTabela: VERSAO_TABELA,
    resumo,
    itens,
  };
});

// Export para testes
module.exports.classificarProduto = classificarProduto;

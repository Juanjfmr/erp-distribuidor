// functions/test-classTrib.js
// Testes para classificarProduto (função pura).
// Roda com: node test-classTrib.js
// Como classTrib.js faz require de Firebase no topo, mockamos antes de carregar.

const path = require('path');

// ─── Mocks do Firebase ──────────────────────────────────────────────────────────
// Intercepta requires de firebase-admin e firebase-functions antes de carregar classTrib
const Module = require('module');
const origLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'firebase-admin') {
    return {
      initializeApp: () => {},
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            get: () => ({ exists: false }),
            collection: () => ({
              get: () => ({ forEach: () => {} }),
            }),
          }),
        }),
      }),
    };
  }
  if (request === 'firebase-functions') {
    return {
      https: {
        HttpsError: class extends Error {
          constructor(code, msg) { super(msg); this.code = code; }
        },
        onCall: (fn) => fn,
      },
      runWith: () => ({ https: { onCall: (fn) => fn } }),
    };
  }
  return origLoad.call(Module, request, parent, isMain);
};

// ─── Carrega o motor ────────────────────────────────────────────────────────────
const { classificarProduto } = require('./classTrib');

// ─── Testes ─────────────────────────────────────────────────────────────────────
let passou = 0;
let falhou = 0;

function testar(nome, fn) {
  try {
    fn();
    console.log(`  ✅ ${nome}`);
    passou++;
  } catch (e) {
    console.log(`  ❌ ${nome}: ${e.message}`);
    falhou++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

// ─── 1. Produto comum com NCM normal → padrao / 000001 / alta ────────────────
testar('produto comum com NCM normal → padrao/000001/alta', () => {
  const result = classificarProduto({
    id: 'p001',
    name: 'Parafuso',
    ncm: '7318.15',
  });
  assert(result.nivel === 'padrao', `esperado padrao, got ${result.nivel}`);
  assert(result.cstSugerido === '000', `cstSugerido 000, got ${result.cstSugerido}`);
  assert(result.cClassTribSugerido === '000001', `cClassTribSugerido 000001, got ${result.cClassTribSugerido}`);
  assert(result.confianca === 'alta', `confianca alta, got ${result.confianca}`);
  assert(result.versaoTabela && result.versaoTabela.length > 0, 'versaoTabela vazia');
  assert(result.motivo.includes('sem tratamento especial'), `motivo inesperado: ${result.motivo}`);
});

// ─── 2. Produto com NCM de cesta básica (R2) → revisar ──────────────────────
testar('NCM de cesta básica (arroz 1006.30) → revisar', () => {
  const result = classificarProduto({
    id: 'p002',
    name: 'Arroz Tipo 1',
    ncm: '1006.30',
  });
  assert(result.nivel === 'revisar', `esperado revisar, got ${result.nivel}`);
  assert(result.cstSugerido === null, `cstSugerido deve ser null, got ${result.cstSugerido}`);
  assert(result.cClassTribSugerido === null, `cClassTribSugerido deve ser null`);
  assert(result.confianca === 'media', `confianca media, got ${result.confianca}`);
  assert(result.motivo.includes('tratamento especial'), `motivo deve mencionar tratamento especial: ${result.motivo}`);
});

testar('NCM de cesta básica (prefixo leite 0401.10) → revisar', () => {
  const result = classificarProduto({
    id: 'p003',
    name: 'Leite Integral',
    ncm: '0401.10',
  });
  assert(result.nivel === 'revisar', `esperado revisar, got ${result.nivel}`);
});

// ─── 3. Produto sem NCM → sem_ncm ──────────────────────────────────────────
testar('produto sem NCM → sem_ncm', () => {
  const result = classificarProduto({
    id: 'p004',
    name: 'Produto Genérico',
  });
  assert(result.nivel === 'sem_ncm', `esperado sem_ncm, got ${result.nivel}`);
  assert(result.cstSugerido === null, `cstSugerido deve ser null`);
  assert(result.cClassTribSugerido === null, `cClassTribSugerido deve ser null`);
  assert(result.confianca === null, `confianca deve ser null`);
  assert(result.motivo.includes('sem NCM'), `motivo deve mencionar sem NCM: ${result.motivo}`);
});

testar('produto com NCM vazio → sem_ncm', () => {
  const result = classificarProduto({
    id: 'p005',
    name: 'Produto Sem NCM',
    ncm: '',
  });
  assert(result.nivel === 'sem_ncm', `esperado sem_ncm, got ${result.nivel}`);
});

// ─── 4. Produto já com cClassTrib válido → ja_classificado ────────────────
testar('produto com cClassTrib 000001 → ja_classificado', () => {
  const result = classificarProduto({
    id: 'p006',
    name: 'Produto Classificado',
    ncm: '8471.30',
    cClassTrib: '000001',
  });
  assert(result.nivel === 'ja_classificado', `esperado ja_classificado, got ${result.nivel}`);
  assert(result.cstSugerido === null, `cstSugerido deve ser null`);
  assert(result.cClassTribSugerido === null, `cClassTribSugerido deve ser null`);
  assert(result.motivo.includes('ja classificado'), `motivo deve mencionar ja classificado: ${result.motivo}`);
  assert(result.dispositivoLegal !== null, `deve ter dispositivoLegal`);
});

// ─── 5. Produto com cClassTrib inválido → ja_classificado + codigoDesconhecido
testar('produto com cClassTrib inexistente → ja_classificado + codigoDesconhecido', () => {
  const result = classificarProduto({
    id: 'p007',
    name: 'Produto Código Inválido',
    ncm: '8471.30',
    cClassTrib: '999999',
  });
  assert(result.nivel === 'ja_classificado', `esperado ja_classificado, got ${result.nivel}`);
  assert(result.codigoDesconhecido === true, `deve ter flag codigoDesconhecido:true`);
  assert(result.motivo.includes('nao localizado'), `motivo deve mencionar nao localizado: ${result.motivo}`);
  assert(result.dispositivoLegal === null, `dispositivoLegal deve ser null`);
});

// ─── 6. NENHUM código sugerido pode estar fora de R1 ─────────────────────────
testar('nenhum código sugerido está fora de R1', () => {
  const testCases = [
    { id: 't1', name: 'Comum', ncm: '8471.30' },
    { id: 't2', name: 'Arroz', ncm: '1006.30' },
    { id: 't3', name: 'Sem NCM', ncm: '' },
    { id: 't4', name: 'Classif', ncm: '8471.30', cClassTrib: '000001' },
  ];
  for (const tc of testCases) {
    const r = classificarProduto(tc);
    if (r.cClassTribSugerido != null) {
      // Se sugeriu código, tem que existir na R1 (via verificação indireta:
      // todo código sugerido vem de CODIGO_TRIBUTACAO_INTEGRAL que = '000001')
      const { existeClassTrib } = require('./classTribTable');
      assert(existeClassTrib(r.cClassTribSugerido),
        `Código ${r.cClassTribSugerido} (${tc.name}) não existe na R1`);
    }
  }
});

// ─── Resumo ────────────────────────────────────────────────────────────────────
const total = passou + falhou;
console.log(`\n${'='.repeat(40)}`);
console.log(`Total: ${total} | ✅ ${passou} | ❌ ${falhou}`);
if (falhou > 0) process.exit(1);

// functions/test-reportUtils.js
// Roda com: node test-reportUtils.js
const assert = require('assert');
const { scrubTokens, computeSignature, parseTriage } = require('./reportUtils');

let passed = 0, failed = 0;
function test(name, fn){ try { fn(); passed++; console.log('  ok  -', name); } catch(e){ failed++; console.error('  FAIL-', name, '\n      ', e.message); } }

// ─── scrubTokens ───────────────────────────────────────────────
test('scrubTokens redige JWT', () => {
  const inp = 'erro Authorization eyJhbGci.eyJzdW...F2QT';
  assert.ok(!scrubTokens(inp).includes('eyJhbGci'));
  assert.ok(scrubTokens(inp).includes('«redacted»'));
});
test('scrubTokens redige Bearer', () => {
  assert.ok(!scrubTokens('Bearer abc123def456ghi').includes('abc123def456ghi'));
});
test('scrubTokens redige campo focusToken', () => {
  const out = scrubTokens('{"focusToken":"AbC123secreto"}');
  assert.ok(!out.includes('AbC123secreto'));
});
test('scrubTokens preserva texto normal', () => {
  assert.strictEqual(scrubTokens('produto sem estoque'), 'produto sem estoque');
});

// ─── computeSignature ───────────────────────────────────────────
test('signature por erro é estável', () => {
  const a = computeSignature({ topErrorMsg: 'x is undefined', topFrame: 'produtos.js:51', view: 'produtos' });
  const b = computeSignature({ topErrorMsg: 'x is undefined', topFrame: 'produtos.js:51', view: 'produtos' });
  assert.strictEqual(a, b);
});
test('signature difere por view', () => {
  const a = computeSignature({ topErrorMsg: 'x', topFrame: 'f', view: 'produtos' });
  const b = computeSignature({ topErrorMsg: 'x', topFrame: 'f', view: 'clientes' });
  assert.notStrictEqual(a, b);
});
test('signature por descrição quando sem erro', () => {
  const a = computeSignature({ view: 'caixa', description: 'Não   salva!!' });
  const b = computeSignature({ view: 'caixa', description: 'nao salva' });
  assert.strictEqual(a, b); // normalizada
});
test('signature null sem erro e sem descrição', () => {
  assert.strictEqual(computeSignature({ view: 'caixa' }), null);
});

// ─── parseTriage ────────────────────────────────────────────────
test('parseTriage lê JSON válido', () => {
  const r = parseTriage('{"classification":"duvida","summary":"x","explanation":"faça y","confidence":0.9}');
  assert.strictEqual(r.classification, 'duvida');
  assert.strictEqual(r.explanation, 'faça y');
});
test('parseTriage baixa confiança vira investigar', () => {
  assert.strictEqual(parseTriage('{"classification":"bug","confidence":0.3}').classification, 'investigar');
});
test('parseTriage JSON inválido vira investigar', () => {
  assert.strictEqual(parseTriage('isso não é json').classification, 'investigar');
});
test('parseTriage classe desconhecida vira investigar', () => {
  assert.strictEqual(parseTriage('{"classification":"xyz","confidence":0.9}').classification, 'investigar');
});

console.log(`\n${passed} passou, ${failed} falhou`);
process.exit(failed ? 1 : 0);

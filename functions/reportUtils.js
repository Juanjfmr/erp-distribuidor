// functions/reportUtils.js
// Funções puras (sem Firebase) para o fluxo de Reportar Problema. Testável isolado.
const crypto = require('crypto');

// Redige tokens/segredos de um texto. NÃO destrutivo para o resto.
function scrubTokens(text) {
  if (typeof text !== 'string') return text;
  return text
    // JWT (3 segmentos base64url separados por ponto)
    .replace(/eyJ[A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+/g, '«redacted»')
    // Bearer <token>
    .replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer «redacted»')
    // campos sensíveis em JSON/query: "token":"...", focusToken=...
    .replace(/("?(?:focus_?token|token|senha|password|secret|api_?key)"?\s*[:=]\s*"?)([^"&,}\s]{4,})/gi, '$1«redacted»');
}

// Assinatura para dedup. Erro → (msg+frame+view); senão descrição+view; senão null.
function computeSignature({ topErrorMsg, topFrame, view, description } = {}) {
  const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
  if (topErrorMsg) return sha(`${topErrorMsg}|${topFrame || ''}|${view || ''}`);
  if (description && description.trim()) {
    const norm = description.toLowerCase().normalize('NFD').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    return sha(`${view || ''}|${norm}`);
  }
  return null;
}

// Interpreta a resposta de triagem do modelo. Defensivo: tudo que não for
// claramente bug/duvida com confiança >= 0.6 vira 'investigar'.
function parseTriage(raw) {
  const fallback = { classification: 'investigar', summary: '', explanation: '', confidence: 0 };
  let obj;
  try { obj = JSON.parse(raw); } catch (e) { return fallback; }
  const cls = obj && obj.classification;
  const conf = typeof obj.confidence === 'number' ? obj.confidence : 0;
  if ((cls === 'bug' || cls === 'duvida') && conf >= 0.6) {
    return { classification: cls, summary: obj.summary || '', explanation: obj.explanation || '', confidence: conf };
  }
  return fallback;
}

module.exports = { scrubTokens, computeSignature, parseTriage };

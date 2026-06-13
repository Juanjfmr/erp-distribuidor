# Reportar Problema — Fase A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botão in-app que captura tela + console, tria por IA (bug / dúvida / investigar), deduplica em issues, e — após o OK do admin — devolve resposta ao usuário dentro do app.

**Architecture:** Frontend em JS puro (scripts clássicos, funções globais) captura console num buffer e a tela via html2canvas, e envia a uma Cloud Function callable. A função deduplica por assinatura, sobe a tela ao Storage pelo admin SDK, e tria com DeepSeek (mesma base do aiChat). Aprovação na aba Reports do admin.html via callable `releaseReports`, que carimba a resolução nos reports dos usuários.

**Tech Stack:** Firebase (Firestore + Storage + Functions Node 20), DeepSeek API, html2canvas (CDN). Testes em node puro (padrão de `functions/test-classTrib.js`).

**Spec:** `docs/superpowers/specs/2026-06-13-reportar-problema-design.md`

---

## File Structure

- Create `functions/reportUtils.js` — puro: `scrubTokens`, `computeSignature`, `parseTriage`. Testável sem Firebase.
- Create `functions/test-reportUtils.js` — testes das funções puras.
- Create `functions/reportProblem.js` — callable: dedup → upload tela → triagem DeepSeek → persiste.
- Create `functions/releaseReports.js` — callable admin-only: libera lote, carimba resolução.
- Modify `functions/index.js` — exporta as duas callables.
- Create `js/core/errorCapture.js` — buffer de console + scrub + contexto.
- Create `js/modules/reportProblem.js` — botão flutuante, modal, captura, envio, tela "Meus reports".
- Modify `app.html` — CDN html2canvas + `<script>` dos 2 arquivos novos + mount do botão.
- Modify `admin.html` — aba "Reports" + lista + liberar.
- Modify `firestore.rules` — regras para `issues`, `reports`, `reports_raw`.

---

## Task 1: Funções puras + testes (`reportUtils.js`)

**Files:**
- Create: `functions/reportUtils.js`
- Test: `functions/test-reportUtils.js`

- [ ] **Step 1: Escrever os testes que falham**

Create `functions/test-reportUtils.js`:

```javascript
// functions/test-reportUtils.js
// Roda com: node test-reportUtils.js
const assert = require('assert');
const { scrubTokens, computeSignature, parseTriage } = require('./reportUtils');

let passed = 0, failed = 0;
function test(name, fn){ try { fn(); passed++; console.log('  ok  -', name); } catch(e){ failed++; console.error('  FAIL-', name, '\n      ', e.message); } }

// ─── scrubTokens ───────────────────────────────────────────────
test('scrubTokens redige JWT', () => {
  const inp = 'erro Authorization eyJhbGci.eyJzdWIiOiIxMjM0NTY.SflKxwRJSMeKKF2QT';
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node functions/test-reportUtils.js`
Expected: FAIL — `Cannot find module './reportUtils'`.

- [ ] **Step 3: Implementar `reportUtils.js`**

Create `functions/reportUtils.js`:

```javascript
// functions/reportUtils.js
// Funções puras (sem Firebase) para o fluxo de Reportar Problema. Testável isolado.
const crypto = require('crypto');

// Redige tokens/segredos de um texto. NÃO destrutivo para o resto.
function scrubTokens(text) {
  if (typeof text !== 'string') return text;
  return text
    // JWT (3 segmentos base64url separados por ponto)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '«redacted»')
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node functions/test-reportUtils.js`
Expected: PASS — `12 passou, 0 falhou`.

- [ ] **Step 5: Commit**

```bash
git add functions/reportUtils.js functions/test-reportUtils.js
git commit -m "feat(report): funcoes puras scrub/signature/parseTriage + testes"
```

---

## Task 2: Callable `reportProblem` (backend)

**Files:**
- Create: `functions/reportProblem.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Implementar `reportProblem.js`**

Create `functions/reportProblem.js`:

```javascript
// functions/reportProblem.js
// Callable: recebe um report (descrição + console {raw,scrubbed} + screenshot base64
// + contexto), deduplica em `issues`, sobe a tela ao Storage, e tria com DeepSeek.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { scrubTokens, computeSignature, parseTriage } = require('./reportUtils');

const db = admin.firestore();
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';
const RAW_TTL_DAYS = 30;

const TRIAGE_PROMPT = `Você tria reports de erro de um ERP web (Stoqio). Decida se é um BUG real do sistema ou uma DÚVIDA (o usuário não sabe usar uma função existente).
Responda APENAS um JSON: {"classification":"bug"|"duvida","summary":"resumo de 1 linha","explanation":"se duvida, como usar em 1-2 frases; se bug, vazio","confidence":0..1}.
Se não tiver certeza, use confidence baixa (<0.6).`;

exports.reportProblem = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  const uid = context.auth.uid;
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'Usuário não encontrado.');
  const companyId = userSnap.data().companyId;

  const description = String(data?.description || '').slice(0, 2000);
  const consoleRaw = String(data?.console?.raw || '').slice(0, 20000);
  const consoleScrubbed = scrubTokens(String(data?.console?.scrubbed || consoleRaw).slice(0, 20000));
  const ctx = data?.context || {};
  const view = String(ctx.view || '').slice(0, 60);
  const topErrorMsg = String(ctx.topErrorMsg || '').slice(0, 300);
  const topFrame = String(ctx.topFrame || '').slice(0, 200);

  const signature = computeSignature({ topErrorMsg, topFrame, view, description });

  // Dedup: procura issue aberto com a mesma assinatura
  let issueId = null, alreadyKnown = false;
  if (signature) {
    const q = await db.collection('issues')
      .where('signature', '==', signature)
      .where('status', 'in', ['triado', 'investigar', 'released'])
      .limit(1).get();
    if (!q.empty) { issueId = q.docs[0].id; alreadyKnown = true; }
  }

  const reportRef = db.collection('reports').doc();

  // Upload da tela (server-side, via admin SDK)
  let screenshotUrl = null;
  const b64 = data?.screenshotBase64;
  if (typeof b64 === 'string' && b64.startsWith('data:image')) {
    try {
      const buf = Buffer.from(b64.split(',')[1], 'base64');
      const path = `error-reports/${issueId || reportRef.id}/${reportRef.id}.jpg`;
      const file = admin.storage().bucket().file(path);
      await file.save(buf, { contentType: 'image/jpeg' });
      screenshotUrl = path; // caminho interno; admin gera signed URL ao visualizar
    } catch (e) { console.error('screenshot upload falhou:', e.message); }
  }

  // Cria issue novo se não deduplicou
  if (!issueId) {
    const issueRef = db.collection('issues').doc();
    issueId = issueRef.id;
    // Triagem só para issue novo
    let triage = { classification: 'investigar', summary: '', explanation: '', confidence: 0 };
    try {
      const payload = {
        model: MODEL,
        messages: [
          { role: 'system', content: TRIAGE_PROMPT },
          { role: 'user', content: `View: ${view}\nDescrição do usuário: ${description || '(vazia)'}\nConsole (sanitizado):\n${consoleScrubbed.slice(0, 4000)}` },
        ],
        temperature: 0.2, max_tokens: 300,
      };
      const resp = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const json = await resp.json();
        triage = parseTriage(json.choices?.[0]?.message?.content || '');
      }
    } catch (e) { console.error('triagem falhou:', e.message); }

    await issueRef.set({
      signature: signature || null,
      status: triage.classification === 'investigar' ? 'investigar' : 'triado',
      classification: triage.classification,
      summary: triage.summary,
      explanation: triage.explanation,
      reportCount: 1,
      affectedCompanies: [companyId],
      affectedUsers: [uid],
      firstView: view,
      firstSeen: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await db.collection('issues').doc(issueId).update({
      reportCount: admin.firestore.FieldValue.increment(1),
      affectedCompanies: admin.firestore.FieldValue.arrayUnion(companyId),
      affectedUsers: admin.firestore.FieldValue.arrayUnion(uid),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Report do usuário (legível pelo autor)
  await reportRef.set({
    issueId, companyId, reporterUid: uid,
    description, screenshotUrl, consoleScrubbed, view,
    userAgent: String(ctx.userAgent || '').slice(0, 300),
    appVersion: String(ctx.appVersion || '').slice(0, 40),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    resolution: null,
  });

  // Versão completa (com token) — restrita, com expiração
  const expiresAt = new Date(Date.now() + RAW_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.collection('reports_raw').doc(reportRef.id).set({
    reportId: reportRef.id, issueId, consoleRaw, expiresAt,
  });

  return { ok: true, issueId, alreadyKnown };
});
```

- [ ] **Step 2: Exportar no `index.js`**

Modify `functions/index.js` — adicionar após a linha de `sugerirClassTrib`:

```javascript
exports.reportProblem      = require('./reportProblem').reportProblem;
exports.releaseReports     = require('./releaseReports').releaseReports;
```

- [ ] **Step 3: Validar sintaxe**

Run: `node --check functions/reportProblem.js`
Expected: sem saída (OK).

- [ ] **Step 4: Commit**

```bash
git add functions/reportProblem.js functions/index.js
git commit -m "feat(report): callable reportProblem (dedup + upload tela + triagem IA)"
```

> Nota: teste de integração real exige Firebase emulator/deploy; cobertura unitária está nas funções puras (Task 1). Verificação ponta-a-ponta acontece na Task 7+ via preview com callable mockado.

---

## Task 3: Callable `releaseReports` (admin-only)

**Files:**
- Create: `functions/releaseReports.js`

- [ ] **Step 1: Implementar `releaseReports.js`**

Create `functions/releaseReports.js`:

```javascript
// functions/releaseReports.js
// Admin-only: libera o lote de issues e carimba a resolução em cada report ligado,
// para o usuário ver o status dentro do app.
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();
const ADMIN_EMAIL = 'juanjfmr1@gmail.com';

exports.releaseReports = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Não autenticado.');
  if (context.auth.token.email !== ADMIN_EMAIL) {
    throw new functions.https.HttpsError('permission-denied', 'Acesso restrito ao administrador.');
  }
  const issueIds = Array.isArray(data?.issueIds) ? data.issueIds : [];
  if (!issueIds.length) throw new functions.https.HttpsError('invalid-argument', 'Nenhum issue informado.');

  let released = 0;
  for (const issueId of issueIds) {
    const issueRef = db.collection('issues').doc(issueId);
    const snap = await issueRef.get();
    if (!snap.exists) continue;
    const issue = snap.data();
    if (issue.classification === 'investigar') continue; // investigar não entra no lote

    const resolution = {
      classification: issue.classification,
      explanation: issue.explanation || '',
      releasedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await issueRef.update({ status: 'released', releasedAt: resolution.releasedAt });

    // Carimba todos os reports ligados
    const reps = await db.collection('reports').where('issueId', '==', issueId).get();
    const batch = db.batch();
    reps.forEach(r => batch.update(r.ref, { resolution }));
    await batch.commit();
    released++;
  }
  return { ok: true, released };
});
```

- [ ] **Step 2: Validar sintaxe**

Run: `node --check functions/releaseReports.js`
Expected: sem saída (OK).

- [ ] **Step 3: Commit**

```bash
git add functions/releaseReports.js
git commit -m "feat(report): callable releaseReports admin-only (libera lote + carimba resolucao)"
```

---

## Task 4: Regras do Firestore

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Adicionar regras**

Modify `firestore.rules` — dentro do bloco `match /databases/{database}/documents {`, antes do fechamento, adicionar:

```
    // Reports do usuário: cria autenticado; lê só o próprio autor. Admin lê tudo.
    match /reports/{reportId} {
      allow create: if request.auth != null
                    && request.resource.data.reporterUid == request.auth.uid;
      allow read:   if request.auth != null
                    && (resource.data.reporterUid == request.auth.uid
                        || request.auth.token.email == 'juanjfmr1@gmail.com');
      allow update, delete: if request.auth.token.email == 'juanjfmr1@gmail.com';
    }
    // Issues e versão completa: só admin (escrita feita pelas Functions com admin SDK).
    match /issues/{issueId} {
      allow read, write: if request.auth.token.email == 'juanjfmr1@gmail.com';
    }
    match /reports_raw/{reportId} {
      allow read, write: if request.auth.token.email == 'juanjfmr1@gmail.com';
    }
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat(report): regras Firestore para reports/issues/reports_raw"
```

> Nota: publicar `firestore.rules` no Firebase Console faz parte do deploy (não do código).

---

## Task 5: Captura de console no cliente (`errorCapture.js`)

**Files:**
- Create: `js/core/errorCapture.js`

- [ ] **Step 1: Implementar `errorCapture.js`**

Create `js/core/errorCapture.js`:

```javascript
// js/core/errorCapture.js
// Buffer circular de eventos de console/erro + redação de tokens + contexto de captura.
// Carregado cedo no app.html (antes dos módulos) para capturar erros desde o boot.
(function(){
  const MAX = 50;
  const buf = [];
  function push(level, msg, stack){
    buf.push({ t: Date.now(), level, msg: String(msg).slice(0, 1000), stack: stack ? String(stack).slice(0, 2000) : '' });
    if (buf.length > MAX) buf.shift();
  }

  const origErr = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = function(...a){ push('error', a.join(' ')); origErr(...a); };
  console.warn  = function(...a){ push('warn',  a.join(' ')); origWarn(...a); };
  window.addEventListener('error', e => push('onerror', e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', e => push('promise', (e.reason && e.reason.message) || e.reason, e.reason && e.reason.stack));

  function scrub(text){
    if (typeof text !== 'string') return text;
    return text
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '«redacted»')
      .replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, 'Bearer «redacted»')
      .replace(/("?(?:focus_?token|token|senha|password|secret|api_?key)"?\s*[:=]\s*"?)([^"&,}\s]{4,})/gi, '$1«redacted»');
  }

  window.__errBuffer = buf;
  window.getConsoleBuffers = function(){
    const raw = buf.map(e => `[${e.level}] ${e.msg}${e.stack ? '\n'+e.stack : ''}`).join('\n');
    return { raw, scrubbed: scrub(raw) };
  };
  window.getCaptureContext = function(){
    const last = [...buf].reverse().find(e => e.level === 'onerror' || e.level === 'error');
    return {
      view: (window.state && window.state.currentView) || (typeof state !== 'undefined' && state.currentView) || '',
      topErrorMsg: last ? last.msg : '',
      topFrame: last && last.stack ? (last.stack.split('\n')[1] || '').trim().slice(0, 200) : '',
      userAgent: navigator.userAgent,
      appVersion: 'v2',
      url: location.href,
      ts: Date.now(),
    };
  };
})();
```

- [ ] **Step 2: Validar sintaxe**

Run: `node --check js/core/errorCapture.js`
Expected: sem saída (OK).

- [ ] **Step 3: Commit**

```bash
git add js/core/errorCapture.js
git commit -m "feat(report): captura de console no cliente com redacao de tokens"
```

---

## Task 6: Módulo `reportProblem.js` (botão + modal + envio + Meus reports)

**Files:**
- Create: `js/modules/reportProblem.js`

- [ ] **Step 1: Implementar `reportProblem.js`**

Create `js/modules/reportProblem.js`:

```javascript
// js/modules/reportProblem.js
// Botão flutuante "Reportar problema": captura tela (html2canvas) + console, envia
// à callable reportProblem, e oferece a tela "Meus reports" com o status/resolução.
function mountReportButton(){
  if (document.getElementById('report-fab')) return;
  const b = document.createElement('button');
  b.id = 'report-fab';
  b.title = 'Reportar problema — verificamos em até 24h';
  b.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:9000;background:var(--primary);color:#fff;border:none;border-radius:24px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:var(--shadow-md)';
  b.innerHTML = '🐞 Reportar problema';
  b.onclick = abrirReportModal;
  document.body.appendChild(b);
}

async function abrirReportModal(){
  let shot = null;
  try {
    if (window.html2canvas) {
      const canvas = await window.html2canvas(document.getElementById('app') || document.body, { logging:false, scale:0.6 });
      shot = canvas.toDataURL('image/jpeg', 0.7);
    }
  } catch(e){ console.warn('html2canvas falhou', e); }
  window._reportShot = shot;

  showModal(`<div class="modal-title">Reportar problema</div>
    <div style="font-size:12px;color:var(--success);margin-bottom:10px">✓ Todo problema é verificado em até 24h.</div>
    <div class="form-group"><label class="form-label">Descreva com suas palavras o que aconteceu (opcional)</label>
      <textarea id="report-desc" class="form-input" rows="3" placeholder="Ex: cliquei em salvar a nota e não aconteceu nada"></textarea></div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Vamos capturar uma imagem da tela atual e os logs técnicos para entender o problema.</div>
    ${shot ? `<img src="${shot}" style="max-width:100%;border:1px solid var(--border);border-radius:8px;max-height:160px;object-fit:contain;display:block">` : '<div style="font-size:12px;color:var(--muted)">(não foi possível capturar a tela; seguimos sem imagem)</div>'}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="abrirMeusReports()">Meus reports</button>
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="enviarReport()">Enviar</button>
    </div>`);
}

async function enviarReport(){
  const desc = (document.getElementById('report-desc')||{}).value || '';
  const consoles = window.getConsoleBuffers ? window.getConsoleBuffers() : { raw:'', scrubbed:'' };
  const context = window.getCaptureContext ? window.getCaptureContext() : {};
  const btn = document.querySelector('[onclick="enviarReport()"]');
  if (btn){ btn.disabled = true; btn.textContent = 'Enviando…'; }
  try {
    const callable = window._httpsCallable(window._functions, 'reportProblem');
    const r = await callable({ description: desc, console: consoles, screenshotBase64: window._reportShot, context });
    closeModal();
    showModal(`<div class="modal-title">Recebido ✓</div>
      <div style="padding:8px 4px">${r.data.alreadyKnown ? 'Já estamos cientes desse problema e trabalhando nele.' : 'Recebemos seu report. Verificamos em até 24h e você verá a resposta em "Meus reports".'}</div>
      <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Fechar</button></div>`);
  } catch(e){
    console.error('reportProblem erro', e);
    if (btn){ btn.disabled = false; btn.textContent = 'Enviar'; }
    alert('Não foi possível enviar agora. Tente novamente em instantes.');
  }
}

async function abrirMeusReports(){
  showModal(`<div class="modal-title">Meus reports</div><div style="padding:20px;text-align:center;color:var(--muted)"><svg width="24" height="24" style="animation:spin 1s linear infinite"><use href="#icon-loader"/></svg></div>`);
  // Import dinâmico (não depender de window._fbFns expor query/where)
  const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const uid = window._auth.currentUser.uid;
  const snap = await getDocs(query(collection(window._db, 'reports'), where('reporterUid','==',uid)));
  const rows = [];
  snap.forEach(d => rows.push(d.data()));
  rows.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  const body = rows.length ? rows.map(r => {
    const res = r.resolution;
    const status = !res ? '<span class="badge bg-amber">Pendente — verificamos em até 24h</span>'
      : res.classification === 'bug' ? '<span class="badge bg-green">Identificamos um bug, já estamos corrigindo</span>'
      : `<span class="badge bg-green">Resolvido</span> <span style="font-size:12px;color:var(--text2)">${escapeHtml(res.explanation||'')}</span>`;
    return `<div style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:13px;color:var(--text-white)">${escapeHtml(r.description||'(sem descrição)')}</div>
      <div style="font-size:11px;color:var(--muted);margin:3px 0">${escapeHtml(r.view||'')}</div>${status}</div>`;
  }).join('') : '<div style="padding:16px;color:var(--muted)">Você ainda não enviou nenhum report.</div>';
  showModal(`<div class="modal-title">Meus reports</div><div style="max-height:55vh;overflow-y:auto">${body}</div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Fechar</button></div>`);
}

window.mountReportButton = mountReportButton;
window.abrirReportModal = abrirReportModal;
window.enviarReport = enviarReport;
window.abrirMeusReports = abrirMeusReports;
```

- [ ] **Step 2: Validar sintaxe**

Run: `node --check js/modules/reportProblem.js`
Expected: sem saída (OK).

- [ ] **Step 3: Commit**

```bash
git add js/modules/reportProblem.js
git commit -m "feat(report): modulo botao + modal de report + tela Meus reports"
```

---

## Task 7: Integrar no `app.html` (CDN + scripts + mount)

**Files:**
- Modify: `app.html`

- [ ] **Step 1: Adicionar html2canvas via CDN**

Modify `app.html` — junto aos outros CDNs (perto da linha do PapaParse), adicionar:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

- [ ] **Step 2: Carregar os módulos novos**

Modify `app.html` — `errorCapture.js` deve carregar CEDO (logo após `state.js`); o módulo do botão junto aos demais módulos:

```html
<script src="js/core/errorCapture.js?v=1"></script>
```
e (na seção dos módulos):
```html
<script src="js/modules/reportProblem.js?v=1"></script>
```

- [ ] **Step 3: Montar o botão quando o app fica visível**

Modify `app.html` — no ponto em que o app autenticado é exibido (onde `#app` ganha `visible`), adicionar uma chamada:

```javascript
if (window.mountReportButton) window.mountReportButton();
```

- [ ] **Step 4: Verificar no preview**

Run: `preview_start` servindo a pasta; navegar a `app.html`.
No console do preview, simular login mínimo e checar:
```javascript
// injetar state.currentView e montar botão
window.state = window.state || { currentView:'produtos' };
mountReportButton();
JSON.stringify({ fab: !!document.getElementById('report-fab'), h2c: typeof window.html2canvas });
```
Expected: `{"fab":true,"h2c":"function"}`.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat(report): integra html2canvas + errorCapture + botao no app.html"
```

---

## Task 8: Aba "Reports" no admin.html

**Files:**
- Modify: `admin.html`

- [ ] **Step 1: Adicionar a aba e a lógica de listagem/liberação**

Modify `admin.html` — adicionar um item de navegação "Reports" e uma função que lista `issues` e libera via callable. Usar o padrão de callable já presente no admin (`getFunctions`/`httpsCallable`):

```javascript
async function carregarReports(){
  const { collection, getDocs, query, orderBy } = window._fbFns || await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const snap = await getDocs(collection(window._db, 'issues'));
  const issues = []; snap.forEach(d => issues.push({ id:d.id, ...d.data() }));
  issues.sort((a,b)=>(b.lastSeen?.seconds||0)-(a.lastSeen?.seconds||0));
  const el = document.getElementById('reports-list');
  el.innerHTML = issues.map(i => `<tr>
    <td><input type="checkbox" class="rep-check" value="${i.id}" ${i.classification==='investigar'||i.status==='released'?'disabled':''}></td>
    <td>${i.classification}</td><td>${i.status}</td><td>${i.reportCount||1}</td>
    <td>${(i.summary||'').replace(/</g,'&lt;')}</td>
    <td>${(i.explanation||'').replace(/</g,'&lt;')}</td>
  </tr>`).join('');
}

async function liberarLote(){
  const ids = [...document.querySelectorAll('.rep-check:checked')].map(c=>c.value);
  if (!ids.length) return alert('Selecione ao menos um issue.');
  const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js');
  const fns = getFunctions(window._app || window._auth.app, 'us-central1');
  const r = await httpsCallable(fns, 'releaseReports')({ issueIds: ids });
  alert(`Liberados: ${r.data.released}`);
  carregarReports();
}
```

E o markup da aba (tabela + botão), seguindo o estilo do admin:

```html
<div id="tab-reports" style="display:none">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <h2>Reports</h2><button class="btn" onclick="liberarLote()">Liberar selecionados</button>
  </div>
  <table><thead><tr><th></th><th>Classe</th><th>Status</th><th>Afetados</th><th>Resumo</th><th>Como usar</th></tr></thead>
  <tbody id="reports-list"></tbody></table>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add admin.html
git commit -m "feat(report): aba Reports no admin com liberacao de lote"
```

---

## Task 9: Verificação ponta-a-ponta no preview (callable mockado)

**Files:** nenhum (verificação)

- [ ] **Step 1: Subir preview e mockar a callable**

Servir a pasta, navegar a `app.html`, e no console do preview:
```javascript
window._httpsCallable = (f,n)=>async(p)=>({ data: { ok:true, issueId:'mock1', alreadyKnown:false } });
window._functions = {};
window.state = { currentView:'produtos' };
console.error('Teste: x is undefined'); // popula o buffer
mountReportButton();
abrirReportModal();
```
Expected: modal abre com a microcopy "24h", textarea, e miniatura (ou aviso de sem-imagem).

- [ ] **Step 2: Validar buffer e contexto**

No console:
```javascript
JSON.stringify({ buffers: window.getConsoleBuffers().scrubbed.includes('x is undefined'), ctx: window.getCaptureContext().view });
```
Expected: `{"buffers":true,"ctx":"produtos"}`.

- [ ] **Step 3: Validar scrub de token**

```javascript
console.error('focusToken="ABCD1234secreto"');
window.getConsoleBuffers().scrubbed.includes('ABCD1234secreto');
```
Expected: `false` (token redigido).

- [ ] **Step 4: Enviar (mock) e ver confirmação**

Clicar "Enviar" no modal → deve aparecer "Recebido ✓".

- [ ] **Step 5: Commit (se houve ajuste)**

```bash
git add -A && git commit -m "test(report): verificacao ponta-a-ponta no preview"
```

---

## Pós-implementação (fora dos commits de código)

- Habilitar/confirmar **Firebase Storage** e publicar `firestore.rules` no Console.
- Deploy: `firebase deploy --only functions:reportProblem,functions:releaseReports`.
- **Fase B** (spec futuro): scheduled function 20:00 → digest no Telegram → inbound "OK" → `releaseReports`.

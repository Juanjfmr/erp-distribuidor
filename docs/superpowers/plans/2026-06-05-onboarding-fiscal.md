# Onboarding Fiscal Self-Service — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar wizard de configuração fiscal self-service por tenant, substituindo o token Focus NFe global por tokens individuais por tenant, com enum central de estados fiscais e banner no Dashboard.

**Architecture:** Dois novos arquivos (`js/core/fiscalStatus.js` e `js/modules/fiscal.js`) + três Firebase Functions (`registerTenant`, `uploadCertificate`, `checkCertExpiry`) + migração de `window._focusToken` para `state.company.focusNfeToken`. A lógica de estado fiscal fica em `core/fiscalStatus.js`, acessível a todos os módulos sem duplicação.

**Tech Stack:** JS puro (ES Modules via `<script type="module">`), Firebase Firestore, Firebase Functions v4 (Node 18), `node-forge` para parsing de certificado A1, Focus NFe API v2.

**Spec:** `docs/superpowers/specs/2026-06-05-onboarding-fiscal-design.md`

---

## Fase 1 — Infraestrutura (sem UI)

### Task 1: Enum central de estados fiscais

**Files:**
- Create: `js/core/fiscalStatus.js`
- Modify: `index.html` (adicionar script tag)

- [ ] **Criar `js/core/fiscalStatus.js`** com o enum e funções puras:

```js
// js/core/fiscalStatus.js
// Enum central de estados fiscais — consultar antes de emitir qualquer documento.
// NUNCA usar condicionais fiscais espalhadas no código — use estas funções.

const FISCAL_STATUS = {
  NAO_CONFIGURADO:        'NAO_CONFIGURADO',
  BLOQUEADO_CPF:          'BLOQUEADO_CPF',
  SEM_CERTIFICADO:        'SEM_CERTIFICADO',
  ERRO_REGISTRO:          'ERRO_REGISTRO',
  CONFIGURADO:            'CONFIGURADO',
  CONFIGURADO_NAO_TESTADO:'CONFIGURADO_NAO_TESTADO',
  CONFIGURADO_TESTADO:    'CONFIGURADO_TESTADO',
  PRODUCAO_ATIVA:         'PRODUCAO_ATIVA',
};

// Retorna true se o tenant pode emitir NF-e via Focus NFe.
function canEmitNFe(company) {
  const s = company?.fiscalStatus;
  return s === FISCAL_STATUS.CONFIGURADO
      || s === FISCAL_STATUS.CONFIGURADO_NAO_TESTADO
      || s === FISCAL_STATUS.CONFIGURADO_TESTADO
      || s === FISCAL_STATUS.PRODUCAO_ATIVA;
}

// Fatura PDF está sempre disponível — nunca bloquear por status fiscal.
function canEmitFatura(company) { return true; }

// Retorna true se deve exibir banner de aviso no Dashboard.
function needsBanner(company) {
  return company?.fiscalStatus !== FISCAL_STATUS.PRODUCAO_ATIVA;
}

// Retorna { icone, texto, ctaLabel, ctaAction } por estado.
// ctaAction: string de ação executada ao clicar no CTA.
function getBannerConfig(company) {
  const s = company?.fiscalStatus || FISCAL_STATUS.NAO_CONFIGURADO;
  const gotoFiscal = "navigate('config'); openFiscalTab()";
  const configs = {
    [FISCAL_STATUS.NAO_CONFIGURADO]: {
      icone: '⚙️', ctaLabel: 'Configurar agora', ctaAction: gotoFiscal,
      texto: 'Configure o módulo fiscal para emitir NF-e.',
    },
    [FISCAL_STATUS.BLOQUEADO_CPF]: {
      icone: 'ℹ️', ctaLabel: 'Saiba mais', ctaAction: gotoFiscal,
      texto: 'Você usa CPF — faturas disponíveis. NF-e requer CNPJ.',
    },
    [FISCAL_STATUS.SEM_CERTIFICADO]: {
      icone: '⚠️', ctaLabel: 'Completar', ctaAction: gotoFiscal,
      texto: 'Dados salvos. Faça upload do certificado A1 para emitir NF-e.',
    },
    [FISCAL_STATUS.ERRO_REGISTRO]: {
      icone: '🔴', ctaLabel: 'Tentar novamente', ctaAction: gotoFiscal,
      texto: `Erro ao registrar na Focus NFe: ${company?.fiscalData?.lastError?.mensagem || 'verifique os dados.'}`,
    },
    [FISCAL_STATUS.CONFIGURADO]: {
      icone: '✅', ctaLabel: 'Testar agora', ctaAction: gotoFiscal,
      texto: 'Módulo fiscal configurado. Recomendamos testar em homologação.',
    },
    [FISCAL_STATUS.CONFIGURADO_NAO_TESTADO]: {
      icone: '⚠️', ctaLabel: 'Ver detalhes', ctaAction: gotoFiscal,
      texto: 'Teste de emissão falhou. Verifique os dados fiscais.',
    },
    [FISCAL_STATUS.CONFIGURADO_TESTADO]: {
      icone: '✅', ctaLabel: 'Ativar produção', ctaAction: gotoFiscal,
      texto: 'Homologação testada. Pronto para produção quando quiser.',
    },
  };
  return configs[s] || configs[FISCAL_STATUS.NAO_CONFIGURADO];
}
```

- [ ] **Adicionar script em `index.html`** antes dos módulos (após os outros scripts de core):

Localizar a linha com `<script src="js/core/firebase.js">` e adicionar logo após:
```html
<script src="js/core/fiscalStatus.js"></script>
```

- [ ] **Verificar no browser:** abrir o console e executar:
```js
console.log(canEmitNFe({ fiscalStatus: 'PRODUCAO_ATIVA' }));  // true
console.log(canEmitNFe({ fiscalStatus: 'NAO_CONFIGURADO' })); // false
console.log(canEmitFatura({}));                               // true
console.log(needsBanner({ fiscalStatus: 'PRODUCAO_ATIVA' })); // false
console.log(needsBanner({ fiscalStatus: 'CONFIGURADO' }));    // true
```

- [ ] **Commit:**
```bash
git add js/core/fiscalStatus.js index.html
git commit -m "feat(fiscal): adicionar enum central de estados fiscais e funções puras"
```

---

### Task 2: Campos fiscais no state

**Files:**
- Modify: `js/core/state.js` (linha 59 — objeto `company`)

- [ ] **Localizar a definição do objeto `company` em `js/core/state.js` linha 59:**
```js
company:{ name:"2R Comércio", cnpj:"", address:"", city:"", uf:"MS", phone:"", email:"" },
```

- [ ] **Substituir por** (adicionar campos fiscais ao final, preservar todos os existentes):
```js
company:{
  name:"2R Comércio", cnpj:"", address:"", city:"", uf:"MS", phone:"", email:"",
  ie:"", regime:"1", cep:"",
  // Fiscal
  fiscalStatus: "NAO_CONFIGURADO",
  focusNfeToken: null,
  focusNfeEnv:   "homologacao",
  certExpiresAt: null,
  certAlert:     null,
  fiscalData: {
    cnpj:"", razaoSocial:"", nomeFantasia:"", regime:"1", ie:"",
    cep:"", logradouro:"", cidade:"", uf:"",
    lastError: null,
  },
},
```

- [ ] **Verificar no browser:** `console.log(state.company.fiscalStatus)` → `"NAO_CONFIGURADO"`

- [ ] **Commit:**
```bash
git add js/core/state.js
git commit -m "feat(fiscal): adicionar campos fiscais ao state.company"
```

---

### Task 3: Migrar invoiceService.js para token por parâmetro

**Files:**
- Modify: `js/services/invoiceService.js`

O objetivo é remover a leitura de `window._focusToken` e `window._focusEnv` do serviço. O token e o env passam a ser extraídos de `company` (passado como parâmetro, já existente).

- [ ] **Abrir `js/services/invoiceService.js`** e localizar linhas 6-7:
```js
  const token = window._focusToken;
  const env = window._focusEnv || 'homologacao';
```

- [ ] **Substituir por** (lê de `company` que já é parâmetro da função):
```js
  const token = company?.focusNfeToken || window._focusToken;
  const env   = company?.focusNfeEnv   || window._focusEnv || 'homologacao';
```

> Nota: manter `window._focusToken` como fallback garante compatibilidade com tenants que ainda têm o token antigo até migrarem. O fallback será removido em sprint futuro.

- [ ] **Repetir para `cancelarNFe` (linhas ~99-100):**
```js
  const token = company?.focusNfeToken || window._focusToken;
  const env   = company?.focusNfeEnv   || window._focusEnv || 'homologacao';
```

- [ ] **Repetir para `consultarNFe` (linhas ~127-128):**
```js
  const token = company?.focusNfeToken || window._focusToken;
  const env   = company?.focusNfeEnv   || window._focusEnv || 'homologacao';
```

- [ ] **Repetir para `_aguardarAutorizacao` — verificar se recebe `token` como parâmetro** (não lê de window). Se sim, nenhuma mudança necessária.

- [ ] **Verificar:** salvar e recarregar o app. A emissão de NF-e deve continuar funcionando (fallback para `window._focusToken` ativo).

- [ ] **Commit:**
```bash
git add js/services/invoiceService.js
git commit -m "refactor(fiscal): invoiceService lê token de company com fallback para window"
```

---

### Task 4: Migrar notas.js para canEmitNFe()

**Files:**
- Modify: `js/modules/notas.js` (linhas 339 e 358)

- [ ] **Localizar linha 339:**
```js
    if(window._focusToken){
```
**Substituir por:**
```js
    if(canEmitNFe(state.company)){
```

- [ ] **Localizar linha 358:**
```js
    if(!window._focusToken) showSyncStatus("✓ Nota fiscal emitida");
```
**Substituir por:**
```js
    if(!canEmitNFe(state.company)) showSyncStatus("✓ Fatura emitida");
```

- [ ] **Verificar no browser:** criar uma NF com token configurado → deve emitir via Focus NFe. Criar sem token → deve emitir fatura PDF normalmente.

- [ ] **Commit:**
```bash
git add js/modules/notas.js
git commit -m "refactor(fiscal): substituir window._focusToken por canEmitNFe() em notas.js"
```

---

## Fase 2 — Firebase Functions

### Task 5: Adicionar node-forge às Functions

**Files:**
- Modify: `functions/package.json`

- [ ] **Adicionar `node-forge` às dependências em `functions/package.json`:**
```json
{
  "name": "erp-distribuidor-functions",
  "version": "1.0.0",
  "engines": { "node": "18" },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^4.0.0",
    "mercadopago": "^2.0.0",
    "axios": "^1.6.0",
    "node-forge": "^1.3.1"
  }
}
```

- [ ] **Instalar:**
```bash
cd functions && npm install
```
Saída esperada: `added N packages` sem erros.

- [ ] **Commit:**
```bash
git add functions/package.json functions/package-lock.json
git commit -m "chore(functions): adicionar node-forge para parsing de certificado A1"
```

---

### Task 6: Function registerTenant

**Files:**
- Create: `functions/registerTenant.js`
- Modify: `functions/index.js`

- [ ] **Criar `functions/registerTenant.js`:**

```js
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

  const masterToken = process.env.FOCUS_NFE_MASTER_TOKEN;
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
```

- [ ] **Adicionar export em `functions/index.js`:**
```js
exports.registerTenant = require('./registerTenant').registerTenant;
```

- [ ] **Commit:**
```bash
git add functions/registerTenant.js functions/index.js
git commit -m "feat(functions): adicionar registerTenant para registro multi-tenant na Focus NFe"
```

---

### Task 7: Function uploadCertificate

**Files:**
- Create: `functions/uploadCertificate.js`
- Modify: `functions/index.js`

- [ ] **Criar `functions/uploadCertificate.js`:**

```js
// functions/uploadCertificate.js
// Valida certificado A1 (.pfx) e armazena encriptado no Firestore.
// A chave de encriptação NUNCA vai ao Firestore — fica em variável de ambiente.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const forge     = require('node-forge');
const crypto    = require('crypto');

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

  const encKey = process.env.CERT_ENCRYPTION_KEY; // 64 hex chars = 32 bytes AES-256
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
        return { success: false, error: `Certificado expirado em ${notAfter.toLocaleDateString('pt-BR')}.` };
      }
    }
  }

  const { iv, data: encData } = encryptCert(pfxBuffer, encKey);

  await admin.firestore().doc(`empresas/${companyId}`).update({
    'company.certEncrypted': { iv, data: encData },
    'company.certExpiresAt': expiresAt,
    'company.fiscalStatus':  'SEM_CERTIFICADO', // avança para próxima etapa do wizard
  });

  return { success: true, expiresAt };
});
```

- [ ] **Adicionar export em `functions/index.js`:**
```js
exports.uploadCertificate = require('./uploadCertificate').uploadCertificate;
```

- [ ] **Commit:**
```bash
git add functions/uploadCertificate.js functions/index.js
git commit -m "feat(functions): adicionar uploadCertificate com validação e encriptação AES-256"
```

---

### Task 8: Function checkCertExpiry (cron)

**Files:**
- Create: `functions/checkCertExpiry.js`
- Modify: `functions/index.js`

- [ ] **Criar `functions/checkCertExpiry.js`:**

```js
// functions/checkCertExpiry.js
// Cron diário: notifica tenants com certificado expirando em 30 dias
// e reverte status para SEM_CERTIFICADO se já expirado.

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

exports.checkCertExpiry = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const db     = admin.firestore();
    const now    = new Date();
    const in30d  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const snap   = await db.collection('empresas').get();

    const updates = [];
    snap.forEach(doc => {
      const company = doc.data()?.company;
      if (!company?.certExpiresAt) return;

      const exp = new Date(company.certExpiresAt);

      if (exp < now) {
        // Expirado — reverter para SEM_CERTIFICADO
        updates.push(doc.ref.update({
          'company.fiscalStatus': 'SEM_CERTIFICADO',
          'company.certAlert':    { tipo: 'expirado', desde: exp.toISOString() },
        }));
      } else if (exp < in30d) {
        // Expirando em breve — alertar
        const diasRestantes = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
        updates.push(doc.ref.update({
          'company.certAlert': { tipo: 'expirando', diasRestantes, expiraEm: exp.toISOString() },
        }));
      } else {
        // OK — limpar alerta se houver
        if (company.certAlert) {
          updates.push(doc.ref.update({ 'company.certAlert': null }));
        }
      }
    });

    await Promise.all(updates);
    console.log(`checkCertExpiry: processados ${snap.size} tenants, ${updates.length} atualizações.`);
  });
```

- [ ] **Adicionar export em `functions/index.js`:**
```js
exports.checkCertExpiry = require('./checkCertExpiry').checkCertExpiry;
```

- [ ] **Estado final de `functions/index.js`:**
```js
const admin = require('firebase-admin');
admin.initializeApp();

exports.mpWebhook         = require('./mpWebhook').mpWebhook;
exports.checkOverdue      = require('./checkOverdue').checkOverdue;
exports.payAffiliate      = require('./payAffiliate').payAffiliate;
exports.createSubscription= require('./createSubscription').createSubscription;
exports.registerTenant    = require('./registerTenant').registerTenant;
exports.uploadCertificate = require('./uploadCertificate').uploadCertificate;
exports.checkCertExpiry   = require('./checkCertExpiry').checkCertExpiry;
```

- [ ] **Commit:**
```bash
git add functions/checkCertExpiry.js functions/index.js
git commit -m "feat(functions): adicionar checkCertExpiry cron para monitoramento de certificado A1"
```

---

### Task 9: Deploy das Functions + configurar env vars

**Files:** nenhum arquivo novo — deploy e configuração de env vars.

- [ ] **Configurar variáveis de ambiente no Firebase:**
```bash
firebase functions:config:set focusnfe.master_token="SEU_TOKEN_MASTER_AQUI"
firebase functions:config:set cert.encryption_key="$(openssl rand -hex 32)"
```

- [ ] **Verificar config:**
```bash
firebase functions:config:get
```
Saída esperada: objeto com `focusnfe.master_token` e `cert.encryption_key`.

- [ ] **Adicionar acesso às env vars nas Functions.** Em `registerTenant.js` linha onde usa `process.env`, substituir por:
```js
const masterToken = functions.config().focusnfe?.master_token || process.env.FOCUS_NFE_MASTER_TOKEN;
```
Em `uploadCertificate.js`:
```js
const encKey = functions.config().cert?.encryption_key || process.env.CERT_ENCRYPTION_KEY;
```

- [ ] **Deploy:**
```bash
cd functions && npm install && cd .. && firebase deploy --only functions
```
Saída esperada: `✔ Deploy complete!` com lista das functions.

- [ ] **Commit:**
```bash
git add functions/registerTenant.js functions/uploadCertificate.js
git commit -m "chore(functions): usar firebase functions:config para env vars sensíveis"
```

---

## Fase 3 — UI do Wizard

### Task 10: Estrutura base de fiscal.js + aba no Config

**Files:**
- Create: `js/modules/fiscal.js`
- Modify: `index.html` (adicionar script tag)
- Modify: `js/modules/config.js` (adicionar aba Fiscal)

- [ ] **Criar `js/modules/fiscal.js`** com estrutura base e renderFiscalTab:

```js
// js/modules/fiscal.js
// Wizard de configuração fiscal self-service e dashboard fiscal.
// Acessa: state.company (leitura/escrita), Firebase Functions (registerTenant, uploadCertificate)

// Salva progresso de uma etapa no Firestore sem navegar fora do wizard.
async function saveFiscalStep(fields) {
  const updates = {};
  for (const [k, v] of Object.entries(fields)) updates[`company.${k}`] = v;
  await setDoc(doc(window._db, 'empresas', state.companyId), updates, { merge: true });
  Object.assign(state.company, fields);
}

// Ponto de entrada: renderiza aba Fiscal no Config.
// Se tenant já configurou, mostra dashboard fiscal. Senão, mostra wizard.
function renderFiscalTab() {
  const status = state.company.fiscalStatus || 'NAO_CONFIGURADO';
  const isNew  = status === 'NAO_CONFIGURADO';
  const el     = document.getElementById('fiscal-tab-content');
  if (!el) return;

  if (isNew) {
    el.innerHTML = renderFiscalWizardHTML(1);
  } else {
    el.innerHTML = renderFiscalDashboardHTML();
  }
}

// Abre a aba Fiscal no Config (usado pelo CTA do banner).
function openFiscalTab() {
  const tab = document.querySelector('[data-tab="fiscal"]');
  if (tab) tab.click();
}

// Navega para uma etapa específica do wizard.
function wizardGoTo(step) {
  const el = document.getElementById('fiscal-tab-content');
  if (el) el.innerHTML = renderFiscalWizardHTML(step);
}
```

- [ ] **Adicionar aba Fiscal em `js/modules/config.js`.** Localizar o HTML das abas de Config (procurar por `data-tab` ou tabs existentes) e adicionar:
```html
<button class="tab-btn" data-tab="fiscal" onclick="switchConfigTab('fiscal')">Fiscal</button>
```
No conteúdo da aba, adicionar:
```html
<div id="config-fiscal" class="tab-content" style="display:none">
  <div id="fiscal-tab-content"></div>
</div>
```

- [ ] **Adicionar `case 'fiscal'` na função `switchConfigTab` de `config.js`:**
```js
case 'fiscal':
  renderFiscalTab();
  break;
```

- [ ] **Adicionar script em `index.html`** após `invoiceService.js`:
```html
<script src="js/modules/fiscal.js"></script>
```

- [ ] **Verificar:** abrir Config → deve aparecer aba "Fiscal" → clicar → deve renderizar sem erro no console.

- [ ] **Commit:**
```bash
git add js/modules/fiscal.js js/modules/config.js index.html
git commit -m "feat(fiscal): estrutura base de fiscal.js e aba Fiscal no Config"
```

---

### Task 11: Wizard — Etapas 1 e 2 (tipo + dados cadastrais)

**Files:**
- Modify: `js/modules/fiscal.js`

- [ ] **Adicionar `renderFiscalWizardHTML(step)` em `fiscal.js`:**

```js
function renderFiscalWizardHTML(step) {
  const steps = ['Tipo', 'Dados', 'Certificado', 'Ambiente', 'Registro', 'Teste'];
  const nav   = steps.map((s, i) =>
    `<span class="wizard-step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}">${i + 1}. ${s}</span>`
  ).join('');

  // Guard: etapas implementadas em tasks posteriores retornam placeholder até lá
  const safeCall = fn => typeof fn === 'function' ? fn() : '<p style="color:var(--text-secondary)">Etapa em construção…</p>';
  const bodies = {
    1: safeCall(typeof renderWizardStep1 !== 'undefined' && renderWizardStep1),
    2: safeCall(typeof renderWizardStep2 !== 'undefined' && renderWizardStep2),
    3: safeCall(typeof renderWizardStep3 !== 'undefined' && renderWizardStep3),
    4: safeCall(typeof renderWizardStep4 !== 'undefined' && renderWizardStep4),
    5: safeCall(typeof renderWizardStep5 !== 'undefined' && renderWizardStep5),
    6: safeCall(typeof renderWizardStep6 !== 'undefined' && renderWizardStep6),
  };

  return `
    <div class="fiscal-wizard">
      <div class="wizard-nav">${nav}</div>
      <div class="wizard-body">${bodies[step] || ''}</div>
    </div>`;
}

function renderWizardStep1() {
  return `
    <h3 class="modal-title">Configuração Fiscal</h3>
    <p>Qual documento fiscal você emite?</p>
    <div class="row" style="gap:12px;margin-top:16px">
      <button class="btn" onclick="wizardSelectDocType('cnpj')">
        <strong>NF-e (CNPJ)</strong><br>
        <small>Emite Nota Fiscal Eletrônica com validade fiscal</small>
      </button>
      <button class="btn btn-secondary" onclick="wizardSelectDocType('cpf')">
        <strong>Fatura (CPF)</strong><br>
        <small>Emite fatura sem validade fiscal</small>
      </button>
    </div>`;
}

async function wizardSelectDocType(type) {
  if (type === 'cpf') {
    await saveFiscalStep({ fiscalStatus: 'BLOQUEADO_CPF' });
    document.getElementById('fiscal-tab-content').innerHTML = `
      <div class="alert alert-info">
        <strong>ℹ️ CPF identificado.</strong><br>
        Faturas disponíveis normalmente. Para emitir NF-e com validade fiscal, é necessário CNPJ (MEI ou LTDA).
        <br><br>
        <button class="btn btn-secondary" onclick="renderFiscalTab()">Voltar</button>
      </div>`;
  } else {
    wizardGoTo(2);
  }
}

function renderWizardStep2() {
  const d = state.company.fiscalData || {};
  return `
    <h3 class="modal-title">Dados Cadastrais</h3>
    <div class="form-grid">
      <label>CNPJ *
        <input id="wiz-cnpj" class="form-input" placeholder="00.000.000/0000-00"
          value="${d.cnpj || ''}" oninput="maskCNPJ(this)">
      </label>
      <label>Razão Social *
        <input id="wiz-razao" class="form-input" placeholder="Nome da empresa" value="${d.razaoSocial || ''}">
      </label>
      <label>Nome Fantasia
        <input id="wiz-fantasia" class="form-input" placeholder="Nome comercial" value="${d.nomeFantasia || ''}">
      </label>
      <label>Regime Tributário *
        <select id="wiz-regime" class="form-input">
          <option value="1" ${(d.regime||'1')==='1'?'selected':''}>Simples Nacional / MEI</option>
          <option value="2" ${d.regime==='2'?'selected':''}>Simples Nacional — Excesso</option>
          <option value="3" ${d.regime==='3'?'selected':''}>Lucro Real / Presumido</option>
        </select>
      </label>
      <label>Inscrição Estadual
        <input id="wiz-ie" class="form-input" placeholder="Número ou ISENTO" value="${d.ie || 'ISENTO'}">
      </label>
      <label>CEP *
        <input id="wiz-cep" class="form-input" placeholder="00000-000"
          value="${d.cep || ''}" oninput="wizardCepLookup(this.value)">
      </label>
      <label>Logradouro *
        <input id="wiz-logradouro" class="form-input" placeholder="Rua, número" value="${d.logradouro || ''}">
      </label>
      <label>Cidade *
        <input id="wiz-cidade" class="form-input" placeholder="Cidade" value="${d.cidade || ''}">
      </label>
      <label>UF *
        <input id="wiz-uf" class="form-input" style="width:80px" placeholder="UF" value="${d.uf || ''}">
      </label>
    </div>
    <div class="row" style="gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="wizardGoTo(1)">Voltar</button>
      <button class="btn" onclick="wizardSaveStep2()">Próximo →</button>
    </div>`;
}

async function wizardCepLookup(cep) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const d = await r.json();
    if (d.erro) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('wiz-logradouro', d.logradouro || '');
    set('wiz-cidade',     d.localidade || '');
    set('wiz-uf',         d.uf || '');
  } catch { /* falha silenciosa */ }
}

function maskCNPJ(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 14);
  v = v.replace(/(\d{2})(\d)/, '$1.$2');
  v = v.replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
  v = v.replace(/(\d{4})(\d)/, '$1-$2');
  input.value = v;
}

async function wizardSaveStep2() {
  const cnpj      = document.getElementById('wiz-cnpj')?.value.trim();
  const razao     = document.getElementById('wiz-razao')?.value.trim();
  const logradouro= document.getElementById('wiz-logradouro')?.value.trim();
  const cidade    = document.getElementById('wiz-cidade')?.value.trim();
  const uf        = document.getElementById('wiz-uf')?.value.trim();

  const cnpjDigits = (cnpj || '').replace(/\D/g, '');
  if (cnpjDigits.length !== 14) return alert('CNPJ inválido. Verifique os 14 dígitos.');
  if (!razao)      return alert('Razão Social é obrigatória.');
  if (!logradouro) return alert('Logradouro é obrigatório.');
  if (!cidade)     return alert('Cidade é obrigatória.');
  if (!uf || uf.length !== 2) return alert('UF inválida.');

  const fiscalData = {
    cnpj,
    razaoSocial:  razao,
    nomeFantasia: document.getElementById('wiz-fantasia')?.value.trim() || razao,
    regime:       document.getElementById('wiz-regime')?.value || '1',
    ie:           document.getElementById('wiz-ie')?.value.trim() || 'ISENTO',
    cep:          document.getElementById('wiz-cep')?.value.trim(),
    logradouro, cidade, uf,
    lastError: null,
  };

  await saveFiscalStep({ fiscalData });
  wizardGoTo(3);
}
```

- [ ] **Verificar:** abrir aba Fiscal → clicar "NF-e (CNPJ)" → preencher dados → clicar Próximo → deve avançar para etapa 3 (placeholder OK por enquanto).

- [ ] **Commit:**
```bash
git add js/modules/fiscal.js
git commit -m "feat(fiscal): wizard etapas 1 e 2 (tipo de doc + dados cadastrais)"
```

---

### Task 12: Wizard — Etapa 3 (Certificado A1)

**Files:**
- Modify: `js/modules/fiscal.js`

- [ ] **Adicionar `renderWizardStep3()` e handlers em `fiscal.js`:**

```js
function renderWizardStep3() {
  const exp = state.company.certExpiresAt;
  if (exp) {
    // Certificado já carregado — mostrar status e permitir substituir
    const expDate = new Date(exp).toLocaleDateString('pt-BR');
    return `
      <h3 class="modal-title">Certificado A1</h3>
      <div class="alert alert-success">✅ Certificado carregado. Validade: <strong>${expDate}</strong></div>
      <button class="btn btn-secondary" onclick="wizardGoTo(4)">Próximo →</button>
      <button class="btn btn-secondary" onclick="wizardReplaceCert()" style="margin-left:8px">Substituir certificado</button>`;
  }

  return `
    <h3 class="modal-title">Certificado A1</h3>
    <p>Faça upload do seu certificado digital A1 (.pfx ou .p12).</p>
    <div class="form-grid">
      <label>Arquivo do certificado *
        <input id="wiz-cert-file" type="file" accept=".pfx,.p12" class="form-input">
      </label>
      <label>Senha do certificado *
        <input id="wiz-cert-senha" type="password" class="form-input" placeholder="Senha do certificado">
      </label>
    </div>
    <div id="wiz-cert-error" style="color:var(--red);margin-top:8px"></div>
    <div class="row" style="gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="wizardGoTo(2)">Voltar</button>
      <button id="wiz-cert-btn" class="btn" onclick="wizardUploadCert()">Enviar certificado</button>
    </div>`;
}

function wizardReplaceCert() {
  state.company.certExpiresAt = null;
  wizardGoTo(3);
}

async function wizardUploadCert() {
  const fileInput = document.getElementById('wiz-cert-file');
  const senha     = document.getElementById('wiz-cert-senha')?.value;
  const errEl     = document.getElementById('wiz-cert-error');
  const btn       = document.getElementById('wiz-cert-btn');

  if (!fileInput?.files[0]) return errEl && (errEl.textContent = 'Selecione o arquivo .pfx.');
  if (!senha)               return errEl && (errEl.textContent = 'Informe a senha do certificado.');

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  if (errEl) errEl.textContent = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    const pfxBase64 = btoa(String.fromCharCode(...new Uint8Array(e.target.result)));
    const cnpj      = state.company.fiscalData?.cnpj || '';

    try {
      const uploadCertFn = firebase.functions().httpsCallable('uploadCertificate');
      const result       = await uploadCertFn({
        companyId: state.companyId,
        pfxBase64,
        senha,
        cnpj,
      });

      if (result.data.success) {
        state.company.certExpiresAt = result.data.expiresAt;
        state.company.fiscalStatus  = 'SEM_CERTIFICADO';
        wizardGoTo(4);
      } else {
        if (errEl) errEl.textContent = result.data.error || 'Erro ao processar certificado.';
        btn.disabled = false;
        btn.textContent = 'Enviar certificado';
      }
    } catch (err) {
      if (errEl) errEl.textContent = 'Erro de conexão: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Enviar certificado';
    }
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
}
```

- [ ] **Verificar:** wizard etapa 3 → selecionar .pfx + senha → clicar "Enviar" → deve chamar Function e avançar ou mostrar erro descritivo.

- [ ] **Commit:**
```bash
git add js/modules/fiscal.js
git commit -m "feat(fiscal): wizard etapa 3 — upload e validação de certificado A1"
```

---

### Task 13: Wizard — Etapas 4, 5 e 6 (Ambiente + Registro + Teste)

**Files:**
- Modify: `js/modules/fiscal.js`

- [ ] **Adicionar etapas 4, 5 e 6 em `fiscal.js`:**

```js
function renderWizardStep4() {
  const env = state.company.focusNfeEnv || 'homologacao';
  return `
    <h3 class="modal-title">Ambiente de Emissão</h3>
    <p>Qual ambiente você deseja usar?</p>
    <div class="row" style="gap:12px;margin-top:16px">
      <button class="btn ${env==='homologacao'?'':'btn-secondary'}" onclick="wizardSetEnv('homologacao')">
        <strong>Homologação</strong><br>
        <small>NFs de teste, sem validade fiscal. Recomendado para início.</small>
      </button>
      <button class="btn ${env==='producao'?'':'btn-secondary'}" onclick="wizardConfirmProducao()">
        <strong>Produção</strong><br>
        <small>NFs com validade fiscal real.</small>
      </button>
    </div>
    <div class="row" style="gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="wizardGoTo(3)">Voltar</button>
    </div>`;
}

async function wizardSetEnv(env) {
  await saveFiscalStep({ focusNfeEnv: env });
  wizardGoTo(5);
}

function wizardConfirmProducao() {
  if (!confirm('⚠️ As NFs emitidas em produção terão validade fiscal real.\n\nConfirmar ambiente de produção?')) return;
  wizardSetEnv('producao');
}

function renderWizardStep5() {
  const err = state.company.fiscalData?.lastError;
  return `
    <h3 class="modal-title">Registro na Focus NFe</h3>
    <p>Vamos registrar sua empresa na Focus NFe para emissão de NF-e.</p>
    ${err ? `<div class="alert alert-danger">⚠️ Tentativa anterior falhou: ${err.mensagem}</div>` : ''}
    <div id="wiz-reg-status"></div>
    <div class="row" style="gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="wizardGoTo(4)">Voltar</button>
      <button id="wiz-reg-btn" class="btn" onclick="wizardRegisterFocusNFe()">Registrar empresa</button>
    </div>`;
}

async function wizardRegisterFocusNFe() {
  const statusEl = document.getElementById('wiz-reg-status');
  const btn      = document.getElementById('wiz-reg-btn');
  btn.disabled   = true;
  btn.textContent = 'Registrando…';
  if (statusEl) statusEl.innerHTML = '<em>Conectando à Focus NFe…</em>';

  try {
    const registerFn = firebase.functions().httpsCallable('registerTenant');
    const result     = await registerFn({
      companyId:  state.companyId,
      fiscalData: state.company.fiscalData,
      env:        state.company.focusNfeEnv || 'homologacao',
    });

    if (result.data.success) {
      state.company.fiscalStatus = 'CONFIGURADO';
      wizardGoTo(6);
    } else {
      state.company.fiscalStatus = 'ERRO_REGISTRO';
      if (state.company.fiscalData) {
        state.company.fiscalData.lastError = { mensagem: result.data.mensagem, codigo: result.data.codigo };
      }
      if (statusEl) statusEl.innerHTML = `<div class="alert alert-danger">Erro: ${result.data.mensagem}</div>`;
      btn.disabled    = false;
      btn.textContent = 'Tentar novamente';
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-danger">Erro de conexão: ${err.message}</div>`;
    btn.disabled    = false;
    btn.textContent = 'Tentar novamente';
  }
}

function renderWizardStep6() {
  const isHom = (state.company.focusNfeEnv || 'homologacao') === 'homologacao';
  if (!isHom) {
    return `
      <h3 class="modal-title">✅ Configuração concluída!</h3>
      <p>Sua empresa está registrada na Focus NFe em ambiente de <strong>produção</strong>.</p>
      <button class="btn" onclick="renderFiscalTab()">Ver painel fiscal</button>`;
  }
  return `
    <h3 class="modal-title">Teste de Emissão</h3>
    <p>Quer testar uma NF-e fictícia em homologação para validar a configuração?</p>
    <div id="wiz-test-status"></div>
    <div class="row" style="gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="wizardSkipTest()">Pular</button>
      <button id="wiz-test-btn" class="btn" onclick="wizardRunTest()">Testar agora</button>
    </div>`;
}

async function wizardSkipTest() {
  renderFiscalTab();
}

async function wizardRunTest() {
  const statusEl = document.getElementById('wiz-test-status');
  const btn      = document.getElementById('wiz-test-btn');
  btn.disabled   = true;
  btn.textContent = 'Emitindo NF de teste…';

  const testInvoice = {
    id: 'teste_' + Date.now(),
    items: [{ productId: null, qty: 1, price: 1.00, itemDiscount: 0 }],
    subtotal: 1.00, total: 1.00, discount: 0, freight: 0,
  };
  const testProducts = [{ id: null, code: 'TESTE001', name: 'Produto Teste Homologação',
    ncm: '84713012', cfop: '5102', unit: 'UN', origem: '0' }];

  // Reutiliza emitirNFe com company do state (tem focusNfeToken)
  // O destinatário fictício exigido pela SEFAZ em homologação:
  const testCompany = {
    ...state.company,
    // override destinatário para nome obrigatório em homologação
  };

  try {
    const resultado = await emitirNFe(
      { ...testInvoice, clientId: null },
      testCompany,
      testProducts,
      []
    );

    if (resultado.success) {
      await saveFiscalStep({ fiscalStatus: 'CONFIGURADO_TESTADO' });
      state.company.fiscalStatus = 'CONFIGURADO_TESTADO';
      if (statusEl) statusEl.innerHTML = '<div class="alert alert-success">✅ NF-e de teste autorizada pela SEFAZ!</div>';
      setTimeout(() => renderFiscalTab(), 2000);
    } else {
      await saveFiscalStep({ fiscalStatus: 'CONFIGURADO_NAO_TESTADO' });
      state.company.fiscalStatus = 'CONFIGURADO_NAO_TESTADO';
      if (statusEl) statusEl.innerHTML = `<div class="alert alert-warning">⚠️ Rejeitada: ${resultado.error}</div>`;
      btn.disabled    = false;
      btn.textContent = 'Tentar novamente';
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-danger">Erro: ${err.message}</div>`;
    btn.disabled    = false;
    btn.textContent = 'Tentar novamente';
  }
}
```

- [ ] **Verificar:** percorrer o wizard completo (homologação) → etapas 4 → 5 → 6 → Testar → deve chegar ao dashboard fiscal.

- [ ] **Commit:**
```bash
git add js/modules/fiscal.js
git commit -m "feat(fiscal): wizard etapas 4-6 (ambiente, registro Focus NFe, teste de emissão)"
```

---

### Task 14: Dashboard fiscal e renderFiscalDashboardHTML

**Files:**
- Modify: `js/modules/fiscal.js`

- [ ] **Adicionar `renderFiscalDashboardHTML()` em `fiscal.js`:**

```js
function renderFiscalDashboardHTML() {
  const s       = state.company.fiscalStatus || 'NAO_CONFIGURADO';
  const env     = state.company.focusNfeEnv  || 'homologacao';
  const exp     = state.company.certExpiresAt;
  const alert   = state.company.certAlert;
  const expStr  = exp ? new Date(exp).toLocaleDateString('pt-BR') : '—';
  const cfg     = getBannerConfig(state.company);

  const statusColors = {
    PRODUCAO_ATIVA:         'bg-green',
    CONFIGURADO_TESTADO:    'bg-green',
    CONFIGURADO:            'bg-blue',
    CONFIGURADO_NAO_TESTADO:'bg-amber',
    SEM_CERTIFICADO:        'bg-amber',
    ERRO_REGISTRO:          'bg-red',
    BLOQUEADO_CPF:          'bg-gray',
    NAO_CONFIGURADO:        'bg-gray',
  };

  const certAlertHtml = alert ? `
    <div class="alert ${alert.tipo === 'expirado' ? 'alert-danger' : 'alert-warning'}">
      ${alert.tipo === 'expirado'
        ? `⚠️ Certificado expirado em ${new Date(alert.desde).toLocaleDateString('pt-BR')}. Faça upload de um novo.`
        : `⚠️ Certificado expira em ${alert.diasRestantes} dias (${new Date(alert.expiraEm).toLocaleDateString('pt-BR')}).`}
    </div>` : '';

  return `
    <div class="fiscal-dashboard">
      <h3 class="modal-title">Módulo Fiscal</h3>
      ${certAlertHtml}
      <div class="info-grid">
        <div>Status: <span class="badge ${statusColors[s] || 'bg-gray'}">${s.replace(/_/g, ' ')}</span></div>
        <div>Ambiente: <strong>${env === 'producao' ? 'Produção' : 'Homologação'}</strong></div>
        <div>Certificado válido até: <strong>${expStr}</strong></div>
      </div>
      <div class="row" style="gap:8px;margin-top:20px;flex-wrap:wrap">
        ${exp ? `<button class="btn btn-secondary" onclick="wizardGoTo(3)">Trocar certificado</button>` : ''}
        ${env === 'homologacao' && s !== 'NAO_CONFIGURADO' ? `
          <button class="btn btn-secondary" onclick="if(confirm('Ativar produção? NFs emitidas terão validade fiscal real.')) wizardConfirmProducao()">
            Ativar produção
          </button>
          <button class="btn btn-secondary" onclick="wizardGoTo(6)">Re-testar emissão</button>
        ` : ''}
        ${s === 'ERRO_REGISTRO' ? `<button class="btn" onclick="wizardGoTo(5)">Tentar registro novamente</button>` : ''}
      </div>
    </div>`;
}
```

- [ ] **Verificar:** tenant com status `CONFIGURADO_TESTADO` → abrir aba Fiscal → deve mostrar dashboard com badge verde e botões corretos.

- [ ] **Commit:**
```bash
git add js/modules/fiscal.js
git commit -m "feat(fiscal): dashboard fiscal para tenants já configurados"
```

---

### Task 15: Banner no Dashboard

**Files:**
- Modify: `js/modules/dashboard.js`

- [ ] **Localizar a função `renderDashboard()` em `dashboard.js` (linha 3).** Adicionar banner no início do HTML retornado, logo após a abertura do container principal:

```js
function renderFiscalBanner() {
  if (!needsBanner(state.company)) return '';
  const cfg = getBannerConfig(state.company);
  // Roles visualizador e contador não têm botão de ação
  const isReadOnly = state.user?.role === 'visualizador' || state.user?.role === 'contador';
  const cta = isReadOnly ? '' :
    `<button class="btn-sm" onclick="${cfg.ctaAction}" style="margin-left:12px">${cfg.ctaLabel}</button>`;
  return `
    <div class="fiscal-banner" style="
      background:var(--amber-light,#fffbe6);border-bottom:1px solid var(--amber,#f59e0b);
      padding:8px 16px;display:flex;align-items:center;gap:8px;font-size:13px">
      <span>${cfg.icone}</span>
      <span style="flex:1">${cfg.texto}</span>
      ${cta}
    </div>`;
}
```

- [ ] **Localizar onde `renderDashboard()` monta o HTML** (procurar por `el("content").innerHTML = `) e inserir o banner antes do conteúdo principal:

```js
function renderDashboard(){
  // ...código existente...
  el("content").innerHTML = renderFiscalBanner() + `
    <!-- resto do dashboard existente -->
  `;
}
```

- [ ] **Verificar:** com `fiscalStatus = 'NAO_CONFIGURADO'` → banner aparece no topo do Dashboard. Com `fiscalStatus = 'PRODUCAO_ATIVA'` → banner não aparece.

- [ ] **Commit:**
```bash
git add js/modules/dashboard.js
git commit -m "feat(fiscal): banner de status fiscal no Dashboard"
```

---

### Task 16: Token master no admin.html

**Files:**
- Modify: `admin.html`

- [ ] **Localizar seção de configurações em `admin.html`** e adicionar campo para o token master da Focus NFe:

```html
<section class="admin-section">
  <h3>Focus NFe — Token Master</h3>
  <p style="color:var(--text-secondary);font-size:13px">
    Token master usado pelo Stoqio para registrar empresas de novos tenants na Focus NFe.
    Este token nunca é exposto aos assinantes.
  </p>
  <div class="form-grid">
    <label>Token Master Focus NFe
      <input id="admin-focus-master" type="password" class="form-input"
        placeholder="Token master da sua conta Focus NFe">
    </label>
  </div>
  <button class="btn" onclick="saveAdminFocusMasterToken()">Salvar token master</button>
  <div id="admin-focus-status" style="margin-top:8px"></div>
</section>
```

- [ ] **Adicionar função `saveAdminFocusMasterToken()` em `admin.html`** (ou no script do arquivo):

```js
async function saveAdminFocusMasterToken() {
  const token  = document.getElementById('admin-focus-master')?.value.trim();
  const status = document.getElementById('admin-focus-status');
  if (!token) return status && (status.textContent = 'Token não pode ser vazio.');
  try {
    await setDoc(doc(window._db, 'config', 'focusNfe'), { masterToken: token }, { merge: true });
    status.textContent = '✅ Token master salvo com sucesso.';
    status.style.color = 'var(--green)';
  } catch (err) {
    status.textContent = 'Erro: ' + err.message;
    status.style.color = 'var(--red)';
  }
}
```

> **Nota:** O token master salvo aqui é acessado pela Firebase Function via Firestore (`/config/focusNfe.masterToken`). Atualizar também a Function `registerTenant.js` para lê-lo do Firestore como fallback:
```js
const masterTokenDoc = await admin.firestore().doc('config/focusNfe').get();
const masterToken = functions.config().focusnfe?.master_token
                 || masterTokenDoc.data()?.masterToken;
```

- [ ] **Verificar:** abrir `admin.html` → inserir token → salvar → verificar no Firestore Console que `/config/focusNfe.masterToken` foi salvo.

- [ ] **Commit:**
```bash
git add admin.html functions/registerTenant.js
git commit -m "feat(admin): campo para token master Focus NFe no painel de administração"
```

---

## Push final

- [ ] **Push para GitHub:**
```bash
git push origin main
```

---

## Checklist de verificação pós-implementação

- [ ] `canEmitNFe({ fiscalStatus: 'NAO_CONFIGURADO' })` retorna `false` no console
- [ ] `canEmitFatura({})` retorna `true` no console
- [ ] Emissão de fatura (sem token) funciona normalmente
- [ ] Aba "Fiscal" aparece em Config
- [ ] Wizard percorre as 6 etapas sem erro de JS
- [ ] CEP autocomplete funciona na etapa 2
- [ ] Banner aparece no Dashboard para `NAO_CONFIGURADO`
- [ ] Banner não aparece para `PRODUCAO_ATIVA`
- [ ] Roles `visualizador`/`contador` veem banner sem botão de ação
- [ ] Functions deployadas e visíveis no Firebase Console
- [ ] Token master salvo via `admin.html` e acessível pela Function

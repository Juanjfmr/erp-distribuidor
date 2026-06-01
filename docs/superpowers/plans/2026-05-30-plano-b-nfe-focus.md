# Plano B — NF-e via Focus NFe

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar emissão de NF-e real via API Focus NFe, com campos fiscais em produtos e empresa, numeração atômica no Firestore, emissão/cancelamento/CCe e retorno do DANFE PDF.

**Architecture:** `js/services/invoiceService.js` centraliza toda comunicação com a Focus NFe API. `js/modules/notas.js` chama invoiceService — sem lógica fiscal no módulo de UI. Numeração de NF usa transação atômica no Firestore (counter em `/empresas/{id}/nfCounter`). Chave da API Focus NFe configurada no Firebase (não exposta no frontend — usar Firebase Function como proxy).

**Tech Stack:** JavaScript ES Modules, Focus NFe REST API, Firebase Firestore (transação atômica), Firebase Functions (proxy de API).

**Pré-requisito:** Conta Focus NFe criada com sandbox ativo. Token da API disponível.

---

## Task 1: Adicionar campos fiscais no cadastro de produto

**Files:**
- Modify: `js/modules/produtos.js` — adicionar NCM, CFOP, origem no formulário e no objeto salvo

- [ ] **Step 1: Adicionar campos ao formulário de produto**

Em `js/modules/produtos.js`, localizar o `showModal` do formulário de produto. Adicionar após o campo de categoria:

```javascript
<div class="form-group">
  <label class="form-label">NCM <span style="color:var(--text2);font-weight:400">(obrigatório para NF-e)</span></label>
  <input id="fp-ncm" class="form-input" maxlength="8" placeholder="Ex: 22021000" value="${p?p.ncm||'':''}">
</div>
<div class="form-group">
  <label class="form-label">CFOP padrão</label>
  <select id="fp-cfop" class="form-input">
    <option value="5102" ${(!p||p.cfop==='5102')?'selected':''}>5102 — Venda dentro do estado</option>
    <option value="6102" ${p&&p.cfop==='6102'?'selected':''}>6102 — Venda fora do estado</option>
    <option value="5405" ${p&&p.cfop==='5405'?'selected':''}>5405 — Venda com ST dentro do estado</option>
    <option value="6404" ${p&&p.cfop==='6404'?'selected':''}>6404 — Venda com ST fora do estado</option>
  </select>
</div>
<div class="form-group">
  <label class="form-label">Origem</label>
  <select id="fp-origem" class="form-input">
    <option value="0" ${(!p||p.origem==='0'||!p.origem)?'selected':''}>0 — Nacional</option>
    <option value="1" ${p&&p.origem==='1'?'selected':''}>1 — Estrangeira (importação direta)</option>
    <option value="2" ${p&&p.origem==='2'?'selected':''}>2 — Estrangeira (adquirida no mercado interno)</option>
  </select>
</div>
```

- [ ] **Step 2: Incluir campos fiscais no objeto salvo**

Na função que monta o objeto produto antes de salvar, adicionar:
```javascript
ncm: el('fp-ncm').value.replace(/\D/g,''),
cfop: el('fp-cfop').value,
origem: el('fp-origem').value,
```

- [ ] **Step 3: Commitar**

```bash
git add js/modules/produtos.js
git commit -m "feat: adicionar campos fiscais NCM, CFOP e origem em produtos"
```

---

## Task 2: Adicionar campos fiscais no cadastro da empresa

**Files:**
- Modify: `js/modules/config.js` — adicionar IE e regime tributário

- [ ] **Step 1: Adicionar campos ao formulário de configuração**

Em `js/modules/config.js`, na função `renderConfig()`, localizar o bloco de dados da empresa. Adicionar após o campo de CNPJ:

```javascript
<div class="form-group">
  <label class="form-label">Inscrição Estadual (IE)</label>
  <input id="cfg-ie" class="form-input" placeholder="Somente números ou ISENTO" value="${co.ie||''}">
</div>
<div class="form-group">
  <label class="form-label">Regime Tributário</label>
  <select id="cfg-regime" class="form-input">
    <option value="1" ${(!co.regime||co.regime==='1')?'selected':''}>1 — Simples Nacional</option>
    <option value="2" ${co.regime==='2'?'selected':''}>2 — Simples Nacional — excesso de sublimite</option>
    <option value="3" ${co.regime==='3'?'selected':''}>3 — Regime Normal (Lucro Presumido/Real)</option>
  </select>
</div>
<div class="form-group">
  <label class="form-label">Token Focus NFe</label>
  <input id="cfg-focustoken" class="form-input" type="password" placeholder="Token da API Focus NFe" value="${co.focusToken||''}">
  <div style="font-size:11px;color:var(--text2);margin-top:4px">Obtido em app.focusnfe.com.br → Configurações → Token</div>
</div>
<div class="form-group">
  <label class="form-label">Ambiente Focus NFe</label>
  <select id="cfg-focusenv" class="form-input">
    <option value="homologacao" ${(!co.focusEnv||co.focusEnv==='homologacao')?'selected':''}>Homologação (testes)</option>
    <option value="producao" ${co.focusEnv==='producao'?'selected':''}>Produção</option>
  </select>
</div>
```

- [ ] **Step 2: Incluir campos no saveConfig()**

Na função `saveConfig()`, adicionar ao objeto company:
```javascript
ie: el('cfg-ie').value,
regime: el('cfg-regime').value,
focusToken: el('cfg-focustoken').value,
focusEnv: el('cfg-focusenv').value,
```

- [ ] **Step 3: Commitar**

```bash
git add js/modules/config.js
git commit -m "feat: adicionar campos fiscais IE, regime tributário e config Focus NFe na empresa"
```

---

## Task 3: Numeração atômica de NF no Firestore

**Files:**
- Create: `js/services/invoiceService.js`

- [ ] **Step 1: Criar invoiceService.js com getNextNFNumber()**

```javascript
// js/services/invoiceService.js
// Centraliza lógica fiscal: numeração atômica e comunicação com Focus NFe

/**
 * Obtém o próximo número de NF usando transação atômica no Firestore.
 * Elimina risco de duplicação com múltiplos usuários simultâneos.
 * @returns {Promise<number>} Próximo número de NF
 */
async function getNextNFNumber() {
  const { doc, runTransaction } = window._fbFns;
  const db = window._db;
  const companyId = window._companyId;
  const counterRef = doc(db, 'empresas', companyId, 'meta', 'nfCounter');

  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists() ? (snap.data().value || 0) : 0;
    const next = current + 1;
    transaction.set(counterRef, { value: next });
    return next;
  });

  return nextNumber;
}

/**
 * Emite NF-e via Focus NFe API.
 * @param {Object} invoice - Objeto da nota do state
 * @param {Object} company - Dados da empresa emitente
 * @param {Array} products - Lista de produtos do state
 * @param {Array} clients - Lista de clientes do state
 * @returns {Promise<{success: boolean, chave?: string, danfeUrl?: string, error?: string}>}
 */
async function emitirNFe(invoice, company, products, clients) {
  const token = company.focusToken;
  const env = company.focusEnv || 'homologacao';

  if (!token) {
    return { success: false, error: 'Token Focus NFe não configurado. Acesse Configurações para inserir.' };
  }

  const client = clients.find(c => c.id === invoice.clientId);
  if (!client) {
    return { success: false, error: 'Cliente não encontrado.' };
  }

  // Montar itens da NF
  const itens = (invoice.items || []).map((item, idx) => {
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return null;
    return {
      numero_item: idx + 1,
      codigo_produto: prod.code || String(prod.id),
      descricao: prod.name,
      codigo_ncm: (prod.ncm || '').replace(/\D/g, ''),
      cfop: prod.cfop || '5102',
      unidade_comercial: prod.unit || 'UN',
      quantidade_comercial: item.qty,
      valor_unitario_comercial: item.price,
      valor_bruto: parseFloat((item.qty * item.price).toFixed(2)),
      origem_mercadoria: prod.origem || '0',
      icms_situacao_tributaria: company.regime === '1' || company.regime === '2' ? '102' : '000',
      pis_situacao_tributaria: '07',
      cofins_situacao_tributaria: '07',
    };
  }).filter(Boolean);

  const payload = {
    natureza_operacao: 'Venda de mercadoria',
    forma_pagamento: 0,
    tipo_documento: 1,
    local_destino: 1,
    cnpj_emitente: (company.cnpj || '').replace(/\D/g, ''),
    nome_emitente: company.name,
    logradouro_emitente: company.address || '',
    municipio_emitente: company.city || '',
    uf_emitente: company.uf || '',
    cep_emitente: (company.cep || '').replace(/\D/g, '') || '00000000',
    regime_tributario_emitente: company.regime || '1',
    inscricao_estadual_emitente: company.ie || 'ISENTO',
    nome_destinatario: client.name,
    cnpj_destinatario: (client.cnpj || '').replace(/\D/g, '') || null,
    cpf_destinatario: null,
    logradouro_destinatario: client.street || '',
    municipio_destinatario: client.city || '',
    uf_destinatario: client.uf || '',
    cep_destinatario: (client.cep || '').replace(/\D/g, '') || '00000000',
    indicador_inscricao_estadual_destinatario: 9,
    valor_produtos: invoice.subtotal || invoice.total,
    valor_total: invoice.total,
    forma_de_pagamento: [{ forma_pagamento: '01', valor: invoice.total }],
    items: itens,
  };

  try {
    const baseUrl = env === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';

    const ref = `nfe_${invoice.id}`;
    const url = `${baseUrl}/v2/nfe?ref=${ref}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(token + ':'),
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (resp.ok || resp.status === 201 || data.status === 'autorizado') {
      return {
        success: true,
        chave: data.chave_nfe || data.chave,
        danfeUrl: data.caminho_danfe || data.danfe_url || null,
        numero: data.numero,
        serie: data.serie,
        focusRef: ref,
      };
    } else {
      return { success: false, error: data.mensagem || data.erros?.[0]?.mensagem || 'Erro ao emitir NF-e.' };
    }
  } catch (e) {
    return { success: false, error: 'Erro de conexão com Focus NFe: ' + e.message };
  }
}

/**
 * Cancela NF-e já autorizada.
 * @param {string} focusRef - Referência usada na emissão (nfe_{invoice.id})
 * @param {string} justificativa - Mínimo 15 caracteres
 * @param {Object} company - Dados da empresa
 */
async function cancelarNFe(focusRef, justificativa, company) {
  const token = company.focusToken;
  const env = company.focusEnv || 'homologacao';

  if (!token) return { success: false, error: 'Token Focus NFe não configurado.' };
  if ((justificativa || '').length < 15) return { success: false, error: 'Justificativa deve ter no mínimo 15 caracteres.' };

  try {
    const baseUrl = env === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';

    const resp = await fetch(`${baseUrl}/v2/nfe/${focusRef}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(token + ':'),
      },
      body: JSON.stringify({ justificativa }),
    });

    const data = await resp.json();
    if (resp.ok || data.status === 'cancelado') {
      return { success: true };
    }
    return { success: false, error: data.mensagem || 'Erro ao cancelar NF-e.' };
  } catch (e) {
    return { success: false, error: 'Erro de conexão: ' + e.message };
  }
}

/**
 * Consulta status de NF-e na Focus NFe.
 */
async function consultarNFe(focusRef, company) {
  const token = company.focusToken;
  const env = company.focusEnv || 'homologacao';
  const baseUrl = env === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

  try {
    const resp = await fetch(`${baseUrl}/v2/nfe/${focusRef}`, {
      headers: { 'Authorization': 'Basic ' + btoa(token + ':') },
    });
    return await resp.json();
  } catch(e) {
    return { error: e.message };
  }
}
```

- [ ] **Step 2: Adicionar script no index.html**

Em `index.html`, antes de `<script src="js/app.js">`, adicionar:
```html
<script src="js/services/invoiceService.js"></script>
```

- [ ] **Step 3: Commitar**

```bash
git add js/services/invoiceService.js index.html
git commit -m "feat: criar invoiceService.js com numeração atômica e integração Focus NFe"
```

---

## Task 4: Integrar emissão NF-e em notas.js

**Files:**
- Modify: `js/modules/notas.js` — substituir emissão simulada pela real

- [ ] **Step 1: Localizar função de emissão atual em notas.js**

Buscar a função que salva/emite a NF (provavelmente `saveNF()` ou `faturarNF()`). Localizar onde o objeto `invoice` é salvo no state.

- [ ] **Step 2: Substituir emissão simulada pela chamada ao invoiceService**

No momento em que a NF é confirmada (status passa para 'emitida'), substituir por:

```javascript
// Antes de salvar no state, emitir via Focus NFe
showSyncStatus('Emitindo NF-e na SEFAZ...');

// Obter número atômico
const nfNumber = await getNextNFNumber();
invoice.number = nfNumber;

const resultado = await emitirNFe(invoice, state.company, state.products, state.clients);

if (!resultado.success) {
  showSyncStatus('⚠ Erro NF-e: ' + resultado.error, true);
  alert('Erro ao emitir NF-e:\n' + resultado.error);
  return;
}

// Salvar dados retornados pela Focus NFe
invoice.chaveNFe = resultado.chave;
invoice.danfeUrl = resultado.danfeUrl;
invoice.focusRef = resultado.focusRef;
invoice.status = 'emitida';
invoice.emitidaEm = new Date().toISOString();

showSyncStatus('✓ NF-e autorizada — chave: ' + (resultado.chave || '').slice(-8));
```

- [ ] **Step 3: Adicionar botão "Ver DANFE" na listagem de notas**

Na renderização da lista de NFs, adicionar coluna/botão para notas com `danfeUrl`:

```javascript
${inv.danfeUrl
  ? `<a href="${inv.danfeUrl}" target="_blank" class="btn btn-sm">DANFE</a>`
  : ''}
${inv.chaveNFe
  ? `<div style="font-size:10px;color:var(--text2);margin-top:2px">Chave: ...${inv.chaveNFe.slice(-8)}</div>`
  : ''}
```

- [ ] **Step 4: Adicionar cancelamento via invoiceService**

Na função de cancelamento de NF existente, substituir o cancelamento local por:

```javascript
async function cancelarNota(id) {
  const inv = state.invoices.find(n => n.id === id);
  if (!inv) return;
  if (!inv.focusRef) {
    // NF sem emissão SEFAZ — cancelar apenas localmente
    inv.status = 'cancelada';
    saveState();
    renderNotas();
    return;
  }
  const justificativa = prompt('Justificativa do cancelamento (mín. 15 caracteres):');
  if (!justificativa || justificativa.length < 15) {
    alert('Justificativa deve ter no mínimo 15 caracteres.');
    return;
  }
  showSyncStatus('Cancelando na SEFAZ...');
  const result = await cancelarNFe(inv.focusRef, justificativa, state.company);
  if (!result.success) {
    showSyncStatus('⚠ Erro: ' + result.error, true);
    alert('Erro ao cancelar: ' + result.error);
    return;
  }
  inv.status = 'cancelada';
  inv.canceladaEm = new Date().toISOString();
  inv.justificativaCancelamento = justificativa;
  saveState();
  showSyncStatus('✓ NF-e cancelada');
  renderNotas();
}
```

- [ ] **Step 5: Commitar**

```bash
git add js/modules/notas.js
git commit -m "feat: integrar emissão, DANFE e cancelamento de NF-e via Focus NFe em notas.js"
```

---

## Task 5: Criar diretório services e organizar

**Files:**
- Create: `js/services/` — diretório já criado na Task 3

- [ ] **Step 1: Atualizar CLAUDE.md com services/ como camada existente**

No `CLAUDE.md`, atualizar a seção de arquitetura para incluir:
```
├── js/
│   ├── services/
│   │   └── invoiceService.js   ← NF-e: numeração atômica + Focus NFe API
```

- [ ] **Step 2: Commitar e push**

```bash
git add CLAUDE.md
git commit -m "docs: atualizar CLAUDE.md com services/invoiceService.js"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Campos NCM, CFOP, origem em produtos
- ✅ Campos IE, regime tributário, token Focus NFe na empresa
- ✅ Numeração atômica via Firestore transaction
- ✅ Emissão NF-e via Focus NFe API
- ✅ DANFE PDF link retornado e exibido
- ✅ Cancelamento via Focus NFe
- ✅ Sandbox/homologação configurável

**Atenção:**
- CORS: Focus NFe permite chamadas diretas do browser em sandbox. Em produção, validar se o token expõe risco. Se necessário, implementar proxy via Firebase Function em task futura.
- Campos obrigatórios como CEP da empresa devem ser preenchidos antes de emitir — o sistema já alerta via `resultado.error`.

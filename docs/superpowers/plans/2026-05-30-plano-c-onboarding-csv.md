# Plano C — Onboarding Guiado e Migração de Dados CSV

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar wizard de onboarding pós-cadastro com 4 etapas e checklist de progresso no dashboard, incluindo importação CSV para migração de dados de concorrentes.

**Architecture:** `js/modules/onboarding.js` (novo) controla o fluxo completo. `state.onboarding` salvo no Firestore por tenant. `js/services/csvImport.js` (novo) faz parse, validação e mapeamento de colunas. Dashboard exibe checklist enquanto `onboarding.complete === false`.

**Tech Stack:** JavaScript ES Modules, PapaParse (CDN) para parsing CSV, Firebase Firestore.

---

## Task 1: Criar estado de onboarding no state.js

**Files:**
- Modify: `js/core/state.js` — adicionar onboarding ao defaultState e loadState

- [ ] **Step 1: Adicionar onboarding ao defaultState**

Em `js/core/state.js`, no objeto `defaultState`, adicionar:
```javascript
onboarding: {
  complete: false,
  step: 0,
  checklist: {
    empresa: false,
    dados: false,
    pedido: false,
    nfe: false,
    recebimento: false,
    certificado: false,
  }
},
```

- [ ] **Step 2: Adicionar guard no loadState()**

Em `loadState()`, após os guards existentes (`if(!state.orders)`), adicionar:
```javascript
if (!state.onboarding) state.onboarding = {
  complete: false, step: 0,
  checklist: { empresa:false, dados:false, pedido:false, nfe:false, recebimento:false, certificado:false }
};
```

- [ ] **Step 3: Criar helper para marcar etapa do checklist**

Após os helpers existentes, adicionar:
```javascript
function completeOnboardingStep(step) {
  if (!state.onboarding) return;
  state.onboarding.checklist[step] = true;
  const all = Object.values(state.onboarding.checklist);
  if (all.every(Boolean)) state.onboarding.complete = true;
  saveState();
}
```

- [ ] **Step 4: Commitar**

```bash
git add js/core/state.js
git commit -m "feat: adicionar estado de onboarding e helper completeOnboardingStep ao state"
```

---

## Task 2: Criar csvImport.js para migração de dados

**Files:**
- Create: `js/services/csvImport.js`

- [ ] **Step 1: Criar csvImport.js com mapeamentos e parser**

```javascript
// js/services/csvImport.js
// Parser e mapeador de CSV para migração de dados de outros ERPs

// Mapeamento de colunas por sistema de origem
const COLUMN_MAPS = {
  bling: {
    produtos: {
      name: ['Descrição', 'Nome', 'Produto'],
      code: ['Código', 'SKU', 'Ref'],
      ean: ['EAN', 'GTIN', 'Código de Barras'],
      costPrice: ['Preço de Custo', 'Custo'],
      salePrice: ['Preço de Venda', 'Venda', 'Preço'],
      stock: ['Estoque', 'Saldo', 'Qtd'],
      unit: ['Unidade', 'Un'],
      category: ['Categoria', 'Grupo'],
    },
    clientes: {
      name: ['Nome / Razão Social', 'Nome', 'Razão Social'],
      cnpj: ['CPF / CNPJ', 'CNPJ', 'CPF'],
      email: ['E-mail', 'Email'],
      phone: ['Telefone', 'Celular', 'Fone'],
      city: ['Cidade'],
      uf: ['UF', 'Estado'],
    }
  },
  contaazul: {
    produtos: {
      name: ['Nome', 'Descrição'],
      code: ['Código', 'Referência'],
      salePrice: ['Preço de Venda', 'Preço'],
      costPrice: ['Custo'],
      stock: ['Estoque'],
      unit: ['Unidade'],
    },
    clientes: {
      name: ['Nome', 'Razão Social'],
      cnpj: ['CNPJ', 'CPF'],
      email: ['E-mail'],
      phone: ['Telefone'],
      city: ['Cidade'],
      uf: ['Estado', 'UF'],
    }
  },
  generico: {
    produtos: {
      name: ['nome', 'name', 'produto', 'descricao', 'description'],
      code: ['codigo', 'code', 'sku', 'ref', 'referencia'],
      ean: ['ean', 'gtin', 'barcode', 'codigo_barras'],
      costPrice: ['custo', 'cost', 'preco_custo', 'cost_price'],
      salePrice: ['venda', 'preco', 'price', 'sale_price', 'preco_venda'],
      stock: ['estoque', 'stock', 'quantidade', 'qty', 'saldo'],
      unit: ['unidade', 'unit', 'un'],
      category: ['categoria', 'category', 'grupo', 'group'],
      ncm: ['ncm'],
    },
    clientes: {
      name: ['nome', 'name', 'razao_social'],
      cnpj: ['cnpj', 'cpf', 'documento'],
      email: ['email', 'e-mail'],
      phone: ['telefone', 'phone', 'celular', 'fone'],
      city: ['cidade', 'city', 'municipio'],
      uf: ['uf', 'estado', 'state'],
      street: ['endereco', 'address', 'logradouro'],
      creditLimit: ['limite_credito', 'limite', 'credit_limit'],
    }
  }
};

/**
 * Detecta sistema de origem pelo cabeçalho do CSV
 */
function detectSystem(headers) {
  const h = headers.map(x => (x||'').toLowerCase());
  if (h.some(x => x.includes('razão social') || x === 'nome / razão social')) return 'bling';
  if (h.some(x => x === 'razão social' || x === 'nome fantasia')) return 'contaazul';
  return 'generico';
}

/**
 * Encontra o valor de uma coluna pelo mapeamento (case-insensitive)
 */
function findCol(row, headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => (h||'').toLowerCase() === c.toLowerCase());
    if (idx >= 0 && row[idx] !== undefined && row[idx] !== '') return row[idx];
  }
  return '';
}

/**
 * Faz parse do arquivo CSV e retorna array de objetos mapeados
 * @param {File} file - Arquivo CSV
 * @param {string} entity - 'produtos' | 'clientes' | 'fornecedores'
 * @returns {Promise<{data: Array, errors: Array, system: string}>}
 */
async function parseCSV(file, entity) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (!results.data || results.data.length < 2) {
          resolve({ data: [], errors: ['Arquivo vazio ou sem dados válidos.'], system: 'generico' });
          return;
        }

        const headers = results.data[0];
        const rows = results.data.slice(1);
        const system = detectSystem(headers);
        const map = COLUMN_MAPS[system]?.[entity] || COLUMN_MAPS.generico[entity] || {};

        const data = [];
        const errors = [];

        rows.forEach((row, i) => {
          try {
            let obj = {};

            if (entity === 'produtos') {
              const name = findCol(row, headers, map.name || []);
              if (!name) { errors.push(`Linha ${i+2}: nome do produto vazio — ignorada.`); return; }
              obj = {
                id: uid(),
                name: name.trim(),
                code: findCol(row, headers, map.code || []).trim(),
                ean: findCol(row, headers, map.ean || []).trim(),
                costPrice: parseFloat((findCol(row, headers, map.costPrice || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                salePrice: parseFloat((findCol(row, headers, map.salePrice || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                stock: parseFloat((findCol(row, headers, map.stock || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                unit: findCol(row, headers, map.unit || []).trim() || 'UN',
                category: findCol(row, headers, map.category || []).trim() || getCatProd()[0],
                ncm: (findCol(row, headers, map.ncm || []).replace(/\D/g,'')).trim(),
                active: true,
              };
            } else if (entity === 'clientes') {
              const name = findCol(row, headers, map.name || []);
              if (!name) { errors.push(`Linha ${i+2}: nome do cliente vazio — ignorada.`); return; }
              obj = {
                id: uid(),
                name: name.trim(),
                cnpj: (findCol(row, headers, map.cnpj || [])||'').replace(/\D/g,''),
                email: findCol(row, headers, map.email || []).trim(),
                phone: findCol(row, headers, map.phone || []).trim(),
                city: findCol(row, headers, map.city || []).trim(),
                uf: findCol(row, headers, map.uf || []).trim(),
                street: findCol(row, headers, map.street || []).trim(),
                creditLimit: parseFloat((findCol(row, headers, map.creditLimit || [])||'0').replace(',','.').replace(/[^0-9.]/g,'')) || 0,
                payterm: 'À Vista',
              };
            } else if (entity === 'fornecedores') {
              const name = findCol(row, headers, map.name || []);
              if (!name) { errors.push(`Linha ${i+2}: nome do fornecedor vazio — ignorada.`); return; }
              obj = {
                id: uid(),
                name: name.trim(),
                cnpj: (findCol(row, headers, map.cnpj || [])||'').replace(/\D/g,''),
                email: findCol(row, headers, map.email || []).trim(),
                phone: findCol(row, headers, map.phone || []).trim(),
                city: findCol(row, headers, map.city || []).trim(),
                payterm: '30 dias',
              };
            }

            data.push(obj);
          } catch(e) {
            errors.push(`Linha ${i+2}: erro ao processar — ${e.message}`);
          }
        });

        resolve({ data, errors, system, headers });
      },
      error: (err) => {
        resolve({ data: [], errors: ['Erro ao ler arquivo: ' + err.message], system: 'generico' });
      }
    });
  });
}

/**
 * Importa dados parseados para o state, evitando duplicatas por CNPJ/nome
 * @returns {{imported: number, skipped: number, skippedReasons: string[]}}
 */
function importToState(data, entity) {
  let imported = 0, skipped = 0;
  const skippedReasons = [];

  data.forEach(obj => {
    if (entity === 'produtos') {
      const dup = state.products.find(p =>
        (obj.ean && p.ean === obj.ean) ||
        (obj.code && p.code === obj.code) ||
        norm(p.name) === norm(obj.name)
      );
      if (dup) { skipped++; skippedReasons.push(`Produto "${obj.name}" já existe.`); return; }
      state.products.push(obj);
    } else if (entity === 'clientes') {
      const dup = state.clients.find(c =>
        (obj.cnpj && c.cnpj === obj.cnpj) || norm(c.name) === norm(obj.name)
      );
      if (dup) { skipped++; skippedReasons.push(`Cliente "${obj.name}" já existe.`); return; }
      state.clients.push(obj);
    } else if (entity === 'fornecedores') {
      const dup = state.suppliers.find(s =>
        (obj.cnpj && s.cnpj === obj.cnpj) || norm(s.name) === norm(obj.name)
      );
      if (dup) { skipped++; skippedReasons.push(`Fornecedor "${obj.name}" já existe.`); return; }
      state.suppliers.push(obj);
    }
    imported++;
  });

  saveState();
  return { imported, skipped, skippedReasons };
}
```

- [ ] **Step 2: Adicionar PapaParse ao index.html**

Em `index.html`, no bloco de scripts CDN (antes de `js/core/state.js`), adicionar:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
```

- [ ] **Step 3: Adicionar csvImport.js ao index.html**

Antes de `js/app.js`, adicionar:
```html
<script src="js/services/csvImport.js"></script>
```

- [ ] **Step 4: Commitar**

```bash
git add js/services/csvImport.js index.html
git commit -m "feat: criar csvImport.js com parser, detecção de sistema e importação para state"
```

---

## Task 3: Criar onboarding.js com wizard de 4 etapas

**Files:**
- Create: `js/modules/onboarding.js`

- [ ] **Step 1: Criar onboarding.js**

```javascript
// js/modules/onboarding.js
// Wizard de onboarding pós-cadastro — 4 etapas

function shouldShowOnboarding() {
  return state.onboarding && !state.onboarding.complete;
}

function renderOnboarding() {
  const step = state.onboarding?.step || 0;
  const steps = [
    { id: 'empresa',      label: 'Sua empresa',    icon: '🏢' },
    { id: 'dados',        label: 'Seus dados',      icon: '📦' },
    { id: 'pedido',       label: 'Primeiro pedido', icon: '🛒' },
    { id: 'nfe',          label: 'Primeira NF-e',   icon: '📄' },
  ];

  const progressBar = steps.map((s, i) =>
    `<div style="flex:1;text-align:center">
      <div style="width:32px;height:32px;border-radius:50%;background:${i<=step?'var(--blue)':'var(--border)'};color:${i<=step?'#fff':'var(--text2)'};display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:14px">${i<step?'✓':s.icon}</div>
      <div style="font-size:10px;color:${i===step?'var(--blue)':'var(--text2)'};margin-top:4px">${s.label}</div>
    </div>`
  ).join('<div style="flex:0 0 24px;display:flex;align-items:center;justify-content:center;color:var(--border)">→</div>');

  const stepContent = [
    _onboardingStep0,
    _onboardingStep1,
    _onboardingStep2,
    _onboardingStep3,
  ][step]?.() || '';

  el('content').innerHTML = `
    <div style="max-width:640px;margin:0 auto;padding:24px 0">
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:22px;font-weight:700;margin-bottom:4px">Bem-vindo ao ERP Distribuidora 👋</div>
        <div style="color:var(--text2)">Vamos configurar tudo em menos de 15 minutos</div>
      </div>
      <div style="display:flex;align-items:flex-start;margin-bottom:32px;gap:0">${progressBar}</div>
      ${stepContent}
    </div>
  `;
}

// Etapa 0 — Dados da empresa e segmento
function _onboardingStep0() {
  const co = state.company || {};
  const segments = [
    { key:'distribuidor',  label:'Distribuidora / Atacado', icon:'🏭' },
    { key:'farmacias',     label:'Farmácias / Drogarias',   icon:'💊' },
    { key:'alimenticio',   label:'Alimentos e Bebidas',     icon:'🍺' },
    { key:'petshop',       label:'Pet Shop',                icon:'🐾' },
    { key:'construcao',    label:'Construção Civil',         icon:'🔨' },
    { key:'outros',        label:'Outro segmento',          icon:'📦' },
  ];

  return `
    <div class="card" style="padding:24px">
      <div style="font-size:16px;font-weight:700;margin-bottom:16px">Etapa 1 — Sua empresa</div>
      <div class="form-group">
        <label class="form-label">Nome da empresa *</label>
        <input id="ob-name" class="form-input" value="${co.name||''}" placeholder="Nome da sua empresa">
      </div>
      <div class="form-group">
        <label class="form-label">CNPJ</label>
        <input id="ob-cnpj" class="form-input" value="${co.cnpj||''}" placeholder="00.000.000/0001-00">
      </div>
      <div class="form-group">
        <label class="form-label">Cidade / UF</label>
        <div style="display:flex;gap:8px">
          <input id="ob-city" class="form-input" value="${co.city||''}" placeholder="Cidade" style="flex:3">
          <input id="ob-uf" class="form-input" value="${co.uf||''}" placeholder="UF" style="flex:1;max-width:64px">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Segmento de negócio</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px">
          ${segments.map(s => `
            <div onclick="document.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');document.getElementById('ob-segment').value='${s.key}'"
              class="seg-btn" data-seg="${s.key}"
              style="border:2px solid var(--border);border-radius:8px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .15s;${(co.segment===s.key)?'border-color:var(--blue);background:var(--blue)15':''}">
              <div style="font-size:20px">${s.icon}</div>
              <div style="font-size:11px;margin-top:4px">${s.label}</div>
            </div>
          `).join('')}
        </div>
        <input type="hidden" id="ob-segment" value="${co.segment||'distribuidor'}">
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:16px" onclick="_onboardingSave0()">
        Continuar →
      </button>
    </div>
  `;
}

function _onboardingSave0() {
  const name = el('ob-name').value.trim();
  if (!name) { alert('Informe o nome da empresa.'); return; }
  state.company = {
    ...state.company,
    name,
    cnpj: el('ob-cnpj').value,
    city: el('ob-city').value,
    uf: el('ob-uf').value,
    segment: el('ob-segment').value,
  };
  // Pré-configurar categorias pelo segmento
  const catMap = {
    distribuidor: ['Bebidas','Alimentos','Limpeza','Higiene','Outros'],
    farmacias:    ['Medicamentos','Cosméticos','Higiene','Suplementos','Outros'],
    alimenticio:  ['Bebidas','Laticínios','Frios','Mercearia','Outros'],
    petshop:      ['Rações','Acessórios','Medicamentos','Higiene Pet','Outros'],
    construcao:   ['Materiais','Ferramentas','Elétrico','Hidráulico','Outros'],
    outros:       ['Produtos','Serviços','Outros'],
  };
  state.company.categories = catMap[el('ob-segment').value] || catMap.outros;
  state.onboarding.step = 1;
  completeOnboardingStep('empresa');
  renderOnboarding();
}

// Etapa 1 — Importar ou cadastrar dados
function _onboardingStep1() {
  return `
    <div class="card" style="padding:24px">
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">Etapa 2 — Seus produtos e clientes</div>
      <div style="color:var(--text2);margin-bottom:20px">Como você quer adicionar seus dados?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div onclick="_onboardingShowImport()" style="border:2px solid var(--border);border-radius:8px;padding:20px;text-align:center;cursor:pointer">
          <div style="font-size:28px;margin-bottom:8px">📥</div>
          <div style="font-weight:700;margin-bottom:4px">Importar do sistema atual</div>
          <div style="font-size:12px;color:var(--text2)">Bling, Conta Azul, Omie, Excel ou CSV</div>
        </div>
        <div onclick="_onboardingShowManual()" style="border:2px solid var(--border);border-radius:8px;padding:20px;text-align:center;cursor:pointer">
          <div style="font-size:28px;margin-bottom:8px">✏️</div>
          <div style="font-weight:700;margin-bottom:4px">Cadastrar manualmente</div>
          <div style="font-size:12px;color:var(--text2)">Adicionar alguns produtos e clientes agora</div>
        </div>
      </div>
      <div id="ob-import-area"></div>
      <div id="ob-manual-area"></div>
      <button class="btn" style="width:100%;margin-top:8px" onclick="_onboardingSkipDados()">
        Pular por agora e continuar →
      </button>
    </div>
  `;
}

function _onboardingShowImport() {
  el('ob-import-area').innerHTML = `
    <div style="background:var(--surface2);border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:12px">Importar Produtos</div>
      <input type="file" id="ob-file-prod" accept=".csv,.xlsx,.xls" class="form-input" style="margin-bottom:8px">
      <button class="btn btn-primary" onclick="_onboardingImport('produtos')">Importar produtos</button>
      <div id="ob-import-result-prod" style="margin-top:8px;font-size:12px"></div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:16px;margin-bottom:12px">
      <div style="font-weight:700;margin-bottom:12px">Importar Clientes</div>
      <input type="file" id="ob-file-cli" accept=".csv,.xlsx,.xls" class="form-input" style="margin-bottom:8px">
      <button class="btn btn-primary" onclick="_onboardingImport('clientes')">Importar clientes</button>
      <div id="ob-import-result-cli" style="margin-top:8px;font-size:12px"></div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick="_onboardingNextFromDados()">
      Continuar com os dados importados →
    </button>
  `;
}

async function _onboardingImport(entity) {
  const fileEl = el(entity === 'produtos' ? 'ob-file-prod' : 'ob-file-cli');
  const resultEl = el(entity === 'produtos' ? 'ob-import-result-prod' : 'ob-import-result-cli');
  if (!fileEl.files[0]) { resultEl.textContent = 'Selecione um arquivo primeiro.'; return; }
  resultEl.textContent = 'Processando...';
  const { data, errors, system } = await parseCSV(fileEl.files[0], entity);
  if (data.length === 0) {
    resultEl.innerHTML = `<span style="color:var(--red)">Nenhum dado encontrado. Erros: ${errors.join(', ')}</span>`;
    return;
  }
  const { imported, skipped } = importToState(data, entity);
  resultEl.innerHTML = `<span style="color:var(--green)">✓ ${imported} importados</span>${skipped ? ` · ${skipped} ignorados (duplicatas)` : ''} · Sistema detectado: <b>${system}</b>`;
  if (entity === 'produtos' && imported > 0) completeOnboardingStep('dados');
}

function _onboardingShowManual() {
  el('ob-manual-area').innerHTML = `
    <div style="color:var(--text2);font-size:13px;margin-bottom:12px">
      Cadastre pelo menos 1 produto e 1 cliente para continuar o onboarding.
      Você pode adicionar mais depois.
    </div>
    <button class="btn btn-primary" onclick="closeModal();navigate('produtos')">Ir para Produtos</button>
    <button class="btn" style="margin-left:8px" onclick="closeModal();navigate('clientes')">Ir para Clientes</button>
    <div style="margin-top:12px">
      <button class="btn" onclick="_onboardingNextFromDados()">Já cadastrei, continuar →</button>
    </div>
  `;
}

function _onboardingSkipDados() {
  state.onboarding.step = 2;
  renderOnboarding();
}

function _onboardingNextFromDados() {
  completeOnboardingStep('dados');
  state.onboarding.step = 2;
  renderOnboarding();
}

// Etapa 2 — Criar primeiro pedido (guiado)
function _onboardingStep2() {
  const hasProd = state.products.filter(p=>p.active!==false).length > 0;
  const hasCli = state.clients.length > 0;

  if (!hasProd || !hasCli) {
    return `
      <div class="card" style="padding:24px;text-align:center">
        <div style="font-size:32px;margin-bottom:12px">⚠️</div>
        <div style="font-weight:700;margin-bottom:8px">Cadastre produtos e clientes primeiro</div>
        <div style="color:var(--text2);margin-bottom:16px">Para criar um pedido você precisa de pelo menos 1 produto e 1 cliente cadastrados.</div>
        <button class="btn btn-primary" onclick="state.onboarding.step=1;renderOnboarding()">← Voltar e importar dados</button>
      </div>
    `;
  }

  return `
    <div class="card" style="padding:24px">
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">Etapa 3 — Seu primeiro pedido</div>
      <div style="color:var(--text2);margin-bottom:20px">
        Vamos criar um pedido de teste para você conhecer o fluxo completo.
      </div>
      <div style="background:var(--surface2);border-radius:8px;padding:16px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px">Como funciona:</div>
        <div style="font-size:13px;color:var(--text2)">
          1. Pedido criado → 2. Pedido confirmado → 3. Faturado (gera NF-e) → 4. Recebimento registrado
        </div>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="_onboardingGoToPedidos()">
        Criar primeiro pedido →
      </button>
      <button class="btn" style="width:100%;margin-top:8px" onclick="_onboardingSkipPedido()">
        Pular por agora
      </button>
    </div>
  `;
}

function _onboardingGoToPedidos() {
  navigate('pedidos');
  // Marcar step para retornar ao onboarding após criar pedido
  state.onboarding._pendingStep = 'pedido';
  saveState();
}

function _onboardingSkipPedido() {
  state.onboarding.step = 3;
  renderOnboarding();
}

// Etapa 3 — Primeira NF-e
function _onboardingStep3() {
  const hasPedido = state.orders && state.orders.length > 0;

  return `
    <div class="card" style="padding:24px">
      <div style="font-size:16px;font-weight:700;margin-bottom:8px">Etapa 4 — Sua primeira NF-e</div>
      <div style="color:var(--text2);margin-bottom:16px">
        ${hasPedido
          ? 'Você tem pedidos cadastrados. Vá em Nota Fiscal e fature um pedido para emitir sua primeira NF-e.'
          : 'Vá em Nota Fiscal e emita sua primeira nota fiscal eletrônica.'}
      </div>
      ${!state.company?.focusToken ? `
        <div class="alert-warn" style="margin-bottom:16px">
          ⚠ Configure o Token Focus NFe em <b>Configurações</b> antes de emitir NF-e.
        </div>
      ` : ''}
      <button class="btn btn-primary" style="width:100%" onclick="navigate('notas')">
        Ir para Nota Fiscal →
      </button>
      <button class="btn" style="width:100%;margin-top:8px" onclick="_onboardingFinish()">
        Concluir configuração inicial
      </button>
    </div>
  `;
}

function _onboardingFinish() {
  state.onboarding.complete = true;
  saveState();
  navigate('dashboard');
  showSyncStatus('✓ Configuração concluída! Bem-vindo ao ERP Distribuidora.');
}
```

- [ ] **Step 2: Adicionar onboarding.js ao index.html**

Antes de `js/app.js`, adicionar:
```html
<script src="js/modules/onboarding.js"></script>
```

- [ ] **Step 3: Commitar**

```bash
git add js/modules/onboarding.js index.html
git commit -m "feat: criar wizard de onboarding com 4 etapas e importação CSV"
```

---

## Task 4: Integrar onboarding no app.js e dashboard

**Files:**
- Modify: `js/app.js` — verificar onboarding ao iniciar
- Modify: `js/modules/dashboard.js` — exibir checklist de progresso

- [ ] **Step 1: Verificar onboarding no init() em app.js**

Em `js/app.js`, no final da função `init()`, antes do `render()`, adicionar:

```javascript
// Verificar se onboarding deve ser exibido
if (shouldShowOnboarding && shouldShowOnboarding()) {
  state.currentView = 'onboarding';
  // Registrar render do onboarding no mapa
  window._renderOnboarding = renderOnboarding;
}
```

E no `render()` em `nav.js`, adicionar `'onboarding': renderOnboarding` ao mapa de renders:

```javascript
function render(){
  ({
    dashboard:renderDashboard, produtos:renderProdutos, clientes:renderClientes,
    fornecedores:renderFornecedores, pedidos:renderPedidos, notas:renderNotas,
    devolucoes:renderDevolucoes, compras:renderCompras, contas:renderContas,
    caixa:renderCaixa, relatorios:renderRelatorios, config:renderConfig,
    usuarios:renderUsuarios, 'minha-conta':renderMinhaConta,
    onboarding: renderOnboarding,
  })[state.currentView]?.();
  applyRoleUI();
}
```

- [ ] **Step 2: Adicionar checklist no dashboard**

Em `js/modules/dashboard.js`, no início de `renderDashboard()`, verificar se onboarding está incompleto e exibir checklist:

```javascript
// Checklist de onboarding no topo do dashboard
const ob = state.onboarding;
const onboardingHtml = (!ob || ob.complete) ? '' : (() => {
  const items = [
    { key:'empresa',      label:'Dados da empresa configurados' },
    { key:'dados',        label:'Produtos e clientes importados' },
    { key:'pedido',       label:'Primeiro pedido criado' },
    { key:'nfe',          label:'Primeira NF-e emitida' },
    { key:'recebimento',  label:'Primeiro recebimento registrado' },
  ];
  const done = items.filter(i => ob.checklist?.[i.key]).length;
  const pct = Math.round(done/items.length*100);
  return `
    <div class="card" style="padding:16px;margin-bottom:16px;border-left:4px solid var(--blue)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:700">Configure sua conta — ${pct}% concluído</div>
        <button class="btn btn-sm" onclick="navigate('onboarding')">Continuar configuração</button>
      </div>
      <div style="background:var(--border);border-radius:4px;height:6px;margin-bottom:12px">
        <div style="background:var(--blue);height:100%;width:${pct}%;border-radius:4px;transition:width .4s"></div>
      </div>
      ${items.map(i => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:13px">
          <span style="color:${ob.checklist?.[i.key]?'var(--green)':'var(--border)'}">
            ${ob.checklist?.[i.key]?'✅':'⬜'}
          </span>
          <span style="color:${ob.checklist?.[i.key]?'var(--text)':'var(--text2)'}">${i.label}</span>
        </div>
      `).join('')}
    </div>
  `;
})();
```

Inserir `onboardingHtml` no início do HTML retornado pelo `renderDashboard()`.

- [ ] **Step 3: Commitar e push**

```bash
git add js/app.js js/core/nav.js js/modules/dashboard.js
git commit -m "feat: integrar onboarding no init e checklist de progresso no dashboard"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Etapa 1: dados da empresa + segmento + pré-configuração de categorias
- ✅ Etapa 2: importação CSV (Bling, Conta Azul, genérico) ou cadastro manual
- ✅ Etapa 3: guia para criar primeiro pedido
- ✅ Etapa 4: guia para primeira NF-e
- ✅ Checklist de progresso no dashboard
- ✅ PapaParse integrado para parsing CSV
- ✅ Detecção automática de sistema de origem
- ✅ Deduplicação por CNPJ/nome na importação

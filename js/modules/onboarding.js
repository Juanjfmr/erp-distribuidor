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
            <div onclick="document.querySelectorAll('.seg-btn').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='';b.style.color=''});this.style.borderColor='var(--blue)';this.style.background='rgba(59,130,246,0.1)';document.getElementById('ob-segment').value='${s.key}'"
              class="seg-btn" data-seg="${s.key}"
              style="border:2px solid ${(co.segment===s.key)?'var(--blue)':'var(--border)'};background:${(co.segment===s.key)?'rgba(59,130,246,0.1)':''};border-radius:8px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .15s">
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
  try {
  if (!state.onboarding) { alert('Erro: state.onboarding indefinido'); return; }
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
  } catch(e) { alert('Erro _onboardingSave0: ' + e.message); }
}

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
    <button class="btn btn-primary" onclick="navigate('produtos')">Ir para Produtos</button>
    <button class="btn" style="margin-left:8px" onclick="navigate('clientes')">Ir para Clientes</button>
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
  state.onboarding._pendingStep = 'pedido';
  saveState();
  navigate('pedidos');
}

function _onboardingSkipPedido() {
  state.onboarding.step = 3;
  renderOnboarding();
}

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
        <div style="background:var(--amber-bg,#fff8e1);border:1px solid var(--amber,#f59e0b);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px">
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

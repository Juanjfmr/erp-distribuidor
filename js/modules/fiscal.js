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
  const container = document.getElementById('fiscal-tab-content');
  if (!container) return;

  if (isNew) {
    container.innerHTML = renderFiscalWizardHTML(1);
  } else {
    container.innerHTML = renderFiscalDashboardHTML();
  }
}

// Abre a aba Fiscal no Config (usado pelo CTA do banner).
function openFiscalTab() {
  const tab = document.querySelector('[data-tab="fiscal"]');
  if (tab) tab.click();
}

// Navega para uma etapa específica do wizard.
function wizardGoTo(step) {
  const container = document.getElementById('fiscal-tab-content');
  if (container) container.innerHTML = renderFiscalWizardHTML(step);
}

function renderFiscalWizardHTML(step) {
  const steps = ['Tipo', 'Dados', 'Certificado', 'Ambiente', 'Registro', 'Teste'];
  const nav   = steps.map((s, i) =>
    `<span class="wizard-step ${i + 1 === step ? 'active' : i + 1 < step ? 'done' : ''}">${i + 1}. ${s}</span>`
  ).join('');

  // Guard: etapas implementadas em tasks posteriores retornam placeholder até lá
  const safeCall = fn => typeof fn === 'function' ? fn() : '<p style="color:var(--text-secondary)">Etapa em construção…</p>';
  const bodies = {
    1: safeCall(typeof renderWizardStep1 !== 'undefined' ? renderWizardStep1 : false),
    2: safeCall(typeof renderWizardStep2 !== 'undefined' ? renderWizardStep2 : false),
    3: safeCall(typeof renderWizardStep3 !== 'undefined' ? renderWizardStep3 : false),
    4: safeCall(typeof renderWizardStep4 !== 'undefined' ? renderWizardStep4 : false),
    5: safeCall(typeof renderWizardStep5 !== 'undefined' ? renderWizardStep5 : false),
    6: safeCall(typeof renderWizardStep6 !== 'undefined' ? renderWizardStep6 : false),
  };

  return `
    <div class="fiscal-wizard">
      <div class="wizard-nav" style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">${nav}</div>
      <div class="wizard-body">${bodies[step] || ''}</div>
    </div>`;
}

// Placeholder para dashboard fiscal (implementado na Task 14)
function renderFiscalDashboardHTML() {
  return '<p>Carregando painel fiscal…</p>';
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
      <div class="alert" style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);padding:16px;border-radius:8px">
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
      <button class="btn btn-secondary" onclick="wizardGoTo(1)">← Voltar</button>
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
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    setVal('wiz-logradouro', d.logradouro || '');
    setVal('wiz-cidade',     d.localidade || '');
    setVal('wiz-uf',         d.uf || '');
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
  if (cnpjDigits.length !== 14) { alert('CNPJ inválido. Verifique os 14 dígitos.'); return; }
  if (!razao)      { alert('Razão Social é obrigatória.'); return; }
  if (!logradouro) { alert('Logradouro é obrigatório.'); return; }
  if (!cidade)     { alert('Cidade é obrigatória.'); return; }
  if (!uf || uf.length !== 2) { alert('UF inválida (2 letras).'); return; }

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

function renderWizardStep3() {
  const exp = state.company.certExpiresAt;
  if (exp) {
    const expDate = new Date(exp).toLocaleDateString('pt-BR');
    return `
      <h3 class="modal-title">Certificado A1</h3>
      <div class="alert" style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);padding:12px;border-radius:8px">
        ✅ Certificado carregado. Validade: <strong>${expDate}</strong>
      </div>
      <div class="row" style="gap:8px;margin-top:16px">
        <button class="btn btn-secondary" onclick="wizardGoTo(4)">Próximo →</button>
        <button class="btn btn-secondary" onclick="wizardReplaceCert()">Substituir certificado</button>
      </div>`;
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
    <div id="wiz-cert-error" style="color:var(--red,#ef4444);margin-top:8px"></div>
    <div class="row" style="gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="wizardGoTo(2)">← Voltar</button>
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

  if (!fileInput?.files[0]) { if (errEl) errEl.textContent = 'Selecione o arquivo .pfx.'; return; }
  if (!senha)               { if (errEl) errEl.textContent = 'Informe a senha do certificado.'; return; }

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  if (errEl) errEl.textContent = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    const bytes     = new Uint8Array(e.target.result);
    const binary    = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    const pfxBase64 = btoa(binary);
    const cnpj      = state.company.fiscalData?.cnpj || '';

    try {
      const uploadCertFn = firebase.functions().httpsCallable('uploadCertificate');
      const result       = await uploadCertFn({ companyId: state.companyId, pfxBase64, senha, cnpj });

      if (result.data.success) {
        state.company.certExpiresAt = result.data.expiresAt;
        state.company.fiscalStatus  = 'SEM_CERTIFICADO';
        wizardGoTo(4);
      } else {
        if (errEl) errEl.textContent = result.data.error || 'Erro ao processar certificado.';
        btn.disabled    = false;
        btn.textContent = 'Enviar certificado';
      }
    } catch (err) {
      if (errEl) errEl.textContent = 'Erro de conexão: ' + err.message;
      btn.disabled    = false;
      btn.textContent = 'Enviar certificado';
    }
  };
  reader.readAsArrayBuffer(fileInput.files[0]);
}

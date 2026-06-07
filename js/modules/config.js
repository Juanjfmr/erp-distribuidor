// ─── MINHA CONTA ─────────────────────────────────────────────────────────────
function renderMinhaConta(){
  window._billingCycle = window._billingCycle || 'monthly';
  const plan = window._plan || 'trial';
  const trialEndsAt = window._trialEndsAt;
  const co = state.company || {};
  const companyData = window._companyData || {};
  const affiliateCode = companyData.affiliateCode || (window._companyId||'').slice(0,8).toUpperCase();
  const referredBy = companyData.referredBy || null;
  const baseUrl = window.location.origin + window.location.pathname;
  const affiliateLink = `${baseUrl}?ref=${affiliateCode}`;

  let trialDaysLeft = 0, trialPct = 0;
  if(plan==='trial' && trialEndsAt){
    const msLeft = new Date(trialEndsAt) - new Date();
    trialDaysLeft = Math.max(0, Math.ceil(msLeft/86400000));
    trialPct = Math.round((trialDaysLeft/14)*100);
  }

  const planLabel = {trial:'Teste Grátis', basico:'Essencial', profissional:'Profissional', empresarial:'Empresarial'}[plan] || plan;
  const planColor = plan==='trial'?'bg-amber': plan==='basico'?'bg-blue':'bg-green';

  let planSection = '';
  if (plan === 'trial') {
    planSection = `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:var(--muted)">
            <span>Periodo de teste</span>
              <span>${trialDaysLeft} dias restantes de 14</span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${trialPct}%;background:${trialDaysLeft<=3?'var(--red)':trialDaysLeft<=7?'var(--amber)':'var(--green)'};border-radius:4px;transition:width .4s"></div>
          </div>
          ${trialDaysLeft<=7?`<div class="alert-warn" style="margin-top:12px;margin-bottom:0">&#9888; Seu teste encerra em ${trialDaysLeft} dia(s). Assine para nao perder o acesso.</div>`:''}
        </div>
        <div class="divider"></div>
        <div style="margin-bottom:16px">
          <div class="row-between" style="margin-bottom:12px">
            <div class="section-title" style="font-size:14px">Escolha seu plano</div>
            <div style="display:flex;background:var(--bg);border-radius:8px;padding:3px;border:1px solid var(--border)">
              <div onclick="window._billingCycle='monthly';renderMinhaConta()" style="padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;${window._billingCycle==='monthly'?'background:var(--primary);color:#fff':'color:var(--muted)'}">Mensal</div>
              <div onclick="window._billingCycle='annual';renderMinhaConta()" style="padding:5px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;${window._billingCycle==='annual'?'background:var(--green);color:#fff':'color:var(--muted)'}">Anual <span style="font-size:10px;opacity:.8">-20%</span></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
            ${[
              {key:'basico', name:'Essencial', price:'R$ 97/mes', priceAnnual:'R$ 931/ano', features:['1 usuario','500 produtos','150 NFs/mes','Pedidos + NF + Caixa']},
              {key:'profissional', name:'Profissional', price:'R$ 197/mes', priceAnnual:'R$ 1.891/ano', features:['5 usuarios','3.000 produtos','1.000 NFs/mes','Devolucoes + Comissoes','Curva ABC + DRE'], highlight:true},
              {key:'empresarial', name:'Empresarial', price:'R$ 397/mes', priceAnnual:'R$ 3.811/ano', features:['Usuarios ilimitados','Produtos ilimitados','NFs ilimitadas','API + PDV (em breve)','Suporte prioritario']}
            ].map(p=>{
              const isCurrent = plan === p.key;
              return `
              <div style="border:1.5px solid ${p.highlight?'var(--amber)':'var(--border2)'};border-radius:10px;padding:16px;${p.highlight?'background:rgba(245,158,11,.06)':''}">
                ${p.highlight?`<div style="font-size:10px;color:var(--amber);font-weight:700;letter-spacing:.06em;margin-bottom:6px">MAIS POPULAR</div>`:''}
                <div style="font-weight:700;font-size:15px;color:var(--text);margin-bottom:4px">${p.name}</div>
                <div style="font-size:18px;font-weight:700;color:${p.highlight?'var(--amber)':'var(--text2)'};margin-bottom:2px">${window._billingCycle==='annual'?p.priceAnnual:p.price}</div>
                <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${window._billingCycle==='annual'?'Cobranca unica anual (-20%)':'ou '+p.priceAnnual+' (-20%)'}</div>
                ${p.features.map(f=>`<div style="font-size:12px;color:var(--muted);margin-bottom:4px">&#10003; ${f}</div>`).join('')}
                ${isCurrent ? `
                  <div style="text-align:center;padding:9px;background:rgba(34,197,94,.1);border-radius:6px;color:var(--green);font-weight:700;margin-top:12px;font-size:13px">
                    &#10003; Plano atual
                  </div>
                ` : `
                  <button class="btn ${p.highlight?'btn-primary':'btn-ghost'}" style="width:100%;margin-top:12px;padding:9px" onclick="assinarPlano('${p.key}')">Assinar ${p.name}</button>
                `}
              </div>`;
            }).join('')}
          </div>
        </div>`;
  }

  el("content").innerHTML=`
    <div class="section-title" style="margin-bottom:24px">Minha Conta</div>
    <div style="max-width:680px;display:flex;flex-direction:column;gap:20px">

    <div class="card" style="border-top:3px solid var(--amber)">
      <div class="row-between" style="margin-bottom:16px">
        <div>
          <div class="kpi-label">Plano Atual</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
            <span style="font-size:20px;font-weight:700;color:var(--text)">${planLabel}</span>
            <span class="badge ${planColor}">${plan==='trial'?'Em teste':'Ativo'}</span>
          </div>
        </div>
        ${planSection}
    </div>

    <div class="card" style="border-top:3px solid var(--blue)">
      <div class="section-title" style="font-size:14px;margin-bottom:14px">Uso da conta</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${[
          ['Produtos', state.products.filter(p=>p.active!==false).length],
          ['Clientes', state.clients.length],
          ['Notas Fiscais', state.invoices.filter(n=>n.status!=='cancelada').length],
          ['Pedidos', (state.orders||[]).filter(o=>o.status!=='cancelado').length],
          ['Compras', state.purchases.length],
          ['Transações', state.transactions.length]
        ].map(([lbl,val])=>`
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
            <div style="font-size:22px;font-weight:700;color:var(--text);font-family:var(--font-m)">${val}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${lbl}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="card" style="border-top:3px solid var(--green)">
      <div class="row-between" style="margin-bottom:14px">
        <div class="section-title" style="font-size:14px">Programa de Afiliados</div>
        <span class="badge bg-green">Ativo</span>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
        Indique o Stoqio e ganhe <b style="color:var(--amber)">20% de comissão</b> recorrente enquanto o indicado for cliente ativo.
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:600;letter-spacing:.06em">SEU LINK DE AFILIADO</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input id="affiliate-link-input" class="form-input" value="${affiliateLink}" readonly style="flex:1;font-family:var(--font-m);font-size:12px;color:var(--amber)">
        <button class="btn btn-ghost" onclick="copyAffiliateLink()" style="flex-shrink:0">Copiar</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <div style="font-size:20px;font-weight:700;color:var(--green);font-family:var(--font-m)" id="aff-count">—</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Indicações</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <div style="font-size:20px;font-weight:700;color:var(--amber);font-family:var(--font-m)" id="aff-active">—</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Ativos</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
          <div style="font-size:20px;font-weight:700;color:var(--text);font-family:var(--font-m)" id="aff-commission">R$ —</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">Comissão/mês</div>
        </div>
      </div>
      ${referredBy?`<div style="font-size:12px;color:var(--muted);margin-top:8px;padding:8px 12px;background:var(--bg);border-radius:6px;border:1px solid var(--border)">Você foi indicado por um afiliado. Obrigado por escolher o Stoqio!</div>`:''}
      <div style="margin-top:12px;font-size:12px;color:var(--muted)">
        Para receber suas comissões, entre em contato: <a href="mailto:contato@stoqio.com.br" style="color:var(--amber)">contato@stoqio.com.br</a>
      </div>
    </div>

    </div>`;
}

function copyAffiliateLink(){
  const inp = el('affiliate-link-input');
  if(inp){ inp.select(); document.execCommand('copy'); showSyncStatus('✓ Link copiado!'); }
}

async function assinarPlano(plan) {
  const btn = event.currentTarget;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Redirecionando...';

  try {
    // Usa Callable Function — auth é gerenciado automaticamente pelo SDK
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js');
    const functions = getFunctions(window._app, 'us-central1');
    const createSub = httpsCallable(functions, 'createSubscription');

    const billingCycle = window._billingCycle || 'monthly';
    const result = await createSub({ plan, billingCycle, backUrl: window.location.href });
    const data = result.data;

    if (!data.success) {
      alert('Erro ao gerar checkout: ' + (data.error || 'Tente novamente.'));
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    // Salvar subscriptionId localmente antes de redirecionar
    localStorage.setItem('pendingSubscriptionId', data.subscriptionId);

    // Redirecionar para checkout MP
    window.location.href = data.checkoutUrl;

  } catch(e) {
    alert('Erro ao gerar checkout: ' + (e.message || 'Tente novamente.'));
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function cancelarPlano() {
  if (!confirm('Tem certeza que deseja cancelar sua assinatura?\n\nSeu acesso permanecerá ativo até o fim do período pago.')) {
    return;
  }

  const btn = event.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Cancelando...';

  try {
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js');
    const functions = getFunctions(window._app || window._auth.app, 'us-central1');
    const cancelSub = httpsCallable(functions, 'cancelSubscription');

    const result = await cancelSub();
    const data = result.data;

    if (data.success) {
      alert('Assinatura cancelada com sucesso.');
    } else {
      alert('Erro ao cancelar: ' + (data.error || 'Tente novamente.'));
    }
  } catch(e) {
    alert('Erro ao cancelar: ' + (e.message || 'Tente novamente.'));
  }

  btn.disabled = false;
  btn.textContent = 'Cancelar assinatura';
  renderMinhaConta();
}

async function fazerUpgrade(plan) {
  if (!confirm(`Fazer upgrade para o plano ${plan === 'profissional' ? 'Profissional' : 'Empresarial'}?\n\nSua assinatura atual será substituída. O valor proporcional já pago será considerado na primeira cobrança do novo plano.`)) {
    return;
  }
  const btn = event.currentTarget;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Redirecionando...';

  try {
    const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js');
    const functions = getFunctions(window._app, 'us-central1');
    const createSub = httpsCallable(functions, 'createSubscription');

    const billingCycle = window._billingCycle || 'monthly';
    const result = await createSub({ plan, billingCycle, backUrl: window.location.href });
    const data = result.data;

    if (!data.success) {
      alert('Erro ao gerar upgrade: ' + (data.error || 'Tente novamente.'));
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    localStorage.setItem('pendingSubscriptionId', data.subscriptionId);
    window.location.href = data.checkoutUrl;
  } catch(e) {
    alert('Erro ao gerar upgrade: ' + (e.message || 'Tente novamente.'));
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
function renderConfig(activeTab){
  activeTab = activeTab || 'geral';
  const co=state.company||{};
  el("content").innerHTML=`
    <div class="section-title" style="margin-bottom:20px">Configurações da Empresa</div>
    <div class="tabs" style="margin-bottom:0">
      <div class="tab ${activeTab==='geral'?'active':''}" data-tab="geral" onclick="renderConfig('geral')">Geral</div>
      <div class="tab ${activeTab==='fiscal'?'active':''}" data-tab="fiscal" onclick="renderConfig('fiscal')">Fiscal</div>
      <div class="tab ${activeTab==='financeiro'?'active':''}" data-tab="financeiro" onclick="renderConfig('financeiro')">Financeiro</div>
    </div>
    <div id="config-tab-geral" style="display:${activeTab==='geral'?'block':'none'}">
    <div class="card" style="max-width:580px">
      <div class="form-group"><label class="form-label">Nome / Razão Social</label><input id="cfg-name" class="form-input" value="${co.name||""}"></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">CNPJ</label><input id="cfg-cnpj" class="form-input" value="${co.cnpj||""}"></div>
        <div class="form-group"><label class="form-label">Telefone</label><input id="cfg-phone" class="form-input" value="${co.phone||""}"></div>
      </div>
      <div class="form-group"><label class="form-label">Endereço</label><input id="cfg-addr" class="form-input" value="${co.address||""}"></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">CEP</label><input id="cfg-cep" class="form-input" placeholder="00000-000" maxlength="9" value="${co.cep||""}" onblur="buscarCep('cfg')"></div>
        <div class="form-group"><label class="form-label">UF</label><input id="cfg-uf" class="form-input" value="${co.uf||"MS"}"></div>
      </div>
      <div class="form-group"><label class="form-label">Cidade</label><input id="cfg-city" class="form-input" value="${co.city||""}"></div>
      <div class="form-group"><label class="form-label">E-mail</label><input id="cfg-email" class="form-input" value="${co.email||""}"></div>
      <div class="form-group"><label class="form-label">Saldo de Abertura do Caixa (R$)</label><input id="cfg-opening" class="form-input" type="number" step="0.01" value="${co.openingBalance||0}"><div style="font-size:11px;color:var(--muted);margin-top:4px">Saldo bancário/caixa no momento em que começou a usar o sistema.</div></div>
      <div class="divider"></div>
      <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">DADOS FISCAIS E NF-e</div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Inscrição Estadual (IE)</label><input id="cfg-ie" class="form-input" placeholder="Somente números ou ISENTO" value="${co.ie||''}"></div>
        <div class="form-group"><label class="form-label">Regime Tributário</label><select id="cfg-regime" class="form-input">
          <option value="1" ${(!co.regime||co.regime==='1')?'selected':''}>1 — Simples Nacional</option>
          <option value="2" ${co.regime==='2'?'selected':''}>2 — Simples Nacional (excesso sublimite)</option>
          <option value="3" ${co.regime==='3'?'selected':''}>3 — Regime Normal (Lucro Presumido/Real)</option>
        </select></div>
      </div>
      <button class="btn btn-primary" onclick="saveConfig()">Salvar Configurações</button>
    </div>
    <div class="card" style="max-width:580px;margin-top:0">
      <div class="section-title" style="margin-bottom:4px">Integração Focus NFe</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:14px">Token da API Focus NFe para emissão de NF-e. Obtenha em <b>app.focusnfe.com.br</b>.</div>
      <div class="form-group">
        <label class="form-label">Token da API</label>
        <input id="cfg-focus-token" class="form-input" type="password" placeholder="Cole seu token aqui" value="${window._focusToken||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Ambiente</label>
        <select id="cfg-focus-env" class="form-input">
          <option value="homologacao" ${(window._focusEnv||'homologacao')==='homologacao'?'selected':''}>Homologação (testes)</option>
          <option value="producao" ${window._focusEnv==='producao'?'selected':''}>Produção</option>
        </select>
      </div>
      <div id="cfg-focus-status" style="font-size:12px;margin-bottom:10px;display:none"></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="saveFocusToken()">Salvar token</button>
        <button class="btn" onclick="testFocusToken()">Testar conexão</button>
      </div>
    </div>
    <div class="card" style="max-width:580px;margin-top:0">
      <div class="section-title" style="margin-bottom:4px">Categorias de Produtos</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">Separe por vírgula. Usado nos formulários de produto. Ex: Bebidas, Alimentos, Higiene</div>
      <div class="form-group">
        <textarea id="cfg-categories" class="form-input" rows="3" style="resize:vertical">${(co.categories||DEFAULT_CAT_PROD).join(", ")}</textarea>
      </div>
      <div class="section-title" style="margin-bottom:4px;margin-top:4px">Unidades de Medida</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">Separe por vírgula. Ex: UN, CX, KG, M², SC, GL, MT, L</div>
      <div class="form-group">
        <textarea id="cfg-units" class="form-input" rows="2" style="resize:vertical">${(co.units||DEFAULT_UNITS).join(", ")}</textarea>
      </div>
      <button class="btn btn-primary" onclick="saveCatUnits()">Salvar Categorias e Unidades</button>
    </div>
    <div class="card" style="max-width:580px;margin-top:0">
      <div class="section-title" style="margin-bottom:14px">Dados do Sistema</div>
      <div style="font-size:13px;color:var(--text2);line-height:2">
        Produtos: <b>${state.products.length}</b> &nbsp;·&nbsp;
        Clientes: <b>${state.clients.length}</b> &nbsp;·&nbsp;
        Fornecedores: <b>${state.suppliers.length}</b><br>
        Notas: <b>${state.invoices.length}</b> &nbsp;·&nbsp;
        Compras: <b>${state.purchases.length}</b> &nbsp;·&nbsp;
        Transações: <b>${state.transactions.length}</b>
      </div>
      <div style="margin-top:16px">
        <button class="btn btn-danger" onclick="exportData()">⬇ Exportar Dados (JSON)</button>
        &nbsp;
        <button class="btn btn-ghost" onclick="importData()">⬆ Importar Dados</button>
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-danger" style="background:rgba(248,81,73,.08)" onclick="resetData()">⚠ Resetar todos os dados</button>
      </div>
      <!-- ⚠ TEMPORÁRIO — remover após testes do onboarding -->
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border)">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">DEV: Reiniciar wizard de onboarding</div>
        <button class="btn" style="font-size:12px;border-color:var(--amber);color:var(--amber)" onclick="state.onboarding={complete:false,step:0,checklist:{empresa:false,dados:false,pedido:false,nfe:false,recebimento:false,certificado:false}};saveState();navigate('onboarding')">↩ Reiniciar onboarding</button>
      </div>
      <!-- /TEMPORÁRIO -->
    </div>
    </div>
    <div id="config-tab-fiscal" style="display:${activeTab==='fiscal'?'block':'none'}">
      <div class="card" style="max-width:680px;margin-top:0">
        <div id="fiscal-tab-content">
        </div>
      </div>
    </div>
    <div id="config-tab-financeiro" style="display:${activeTab==='financeiro'?'block':'none'}">
      <div class="card" style="max-width:680px;margin-top:0">
        <h3 style="margin-bottom:16px">Cobrança Pix e Boleto — Asaas</h3>
        <div id="asaas-instrucoes" style="margin-bottom:20px"></div>
        <div class="form-group">
          <label class="form-label">Chave API Asaas</label>
          <input id="cfg-asaas-key" class="form-input" type="password"
            placeholder="$aact_..." value="${co.asaasKey||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Ambiente</label>
          <select id="cfg-asaas-env" class="form-input">
            <option value="sandbox"  ${(co.asaasEnv||'sandbox')==='sandbox' ?'selected':''}>Sandbox (testes)</option>
            <option value="producao" ${co.asaasEnv==='producao'?'selected':''}>Produção</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-primary" onclick="salvarAsaas()">Salvar</button>
          <button class="btn btn-secondary" onclick="testarAsaas()">Testar conexão</button>
        </div>
        <div id="cfg-asaas-status" style="font-size:12px;margin-top:10px;display:none"></div>
      </div>
    </div>`;
  if (activeTab === 'fiscal') {
    renderFiscalTab();
  }
  if (activeTab === 'financeiro') {
    _renderAsaasInstrucoes();
  }
}
function saveConfig(){
  const prev = state.company||{};
  state.company={...prev,name:el("cfg-name").value,cnpj:el("cfg-cnpj").value,phone:el("cfg-phone").value,address:el("cfg-addr").value,cep:el("cfg-cep").value.replace(/\D/g,''),city:el("cfg-city").value,uf:el("cfg-uf").value,email:el("cfg-email").value,openingBalance:parseFloat(el("cfg-opening").value)||0,ie:el("cfg-ie").value,regime:el("cfg-regime").value};
  saveState(); showSyncStatus("✓ Configurações salvas"); updateTopbar();
}
function saveCatUnits(){
  const cats = el("cfg-categories").value.split(",").map(s=>s.trim()).filter(Boolean);
  const units = el("cfg-units").value.split(",").map(s=>s.trim()).filter(Boolean);
  if(!cats.length) return alert("Informe ao menos uma categoria.");
  if(!units.length) return alert("Informe ao menos uma unidade.");
  state.company = {...(state.company||{}), categories: cats, units};
  saveState();
  showSyncStatus("✓ Categorias e unidades salvas");
  renderConfig();
}
function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`stoqio_backup_${today()}.json`; a.click();
}
function importData(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept=".json";
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=ev=>{ try{ const d=JSON.parse(ev.target.result); Object.assign(state,d); state.nfItems=[]; state.compraItems=[]; saveState(); render(); alert("Dados importados!"); }catch(e){ alert("Arquivo inválido."); } };
    r.readAsText(f);
  }; inp.click();
}
async function saveFocusToken() {
  const token = el('cfg-focus-token').value.trim();
  const env = el('cfg-focus-env').value;
  const statusEl = el('cfg-focus-status');
  if (!token) { statusEl.style.display='block'; statusEl.style.color='var(--red)'; statusEl.textContent='Informe o token.'; return; }
  try {
    const { doc, setDoc } = window._fbFns;
    await setDoc(doc(window._db, 'config', 'focusNfe'), { token, env });
    window._focusToken = token;
    window._focusEnv = env;
    statusEl.style.display='block'; statusEl.style.color='var(--green)';
    statusEl.textContent='✓ Token salvo com sucesso.';
    showSyncStatus('✓ Token Focus NFe salvo');
  } catch(e) {
    statusEl.style.display='block'; statusEl.style.color='var(--red)';
    statusEl.textContent='Erro ao salvar: ' + e.message;
  }
}

async function testFocusToken() {
  const token = el('cfg-focus-token').value.trim() || window._focusToken;
  const env = el('cfg-focus-env').value || window._focusEnv || 'homologacao';
  const statusEl = el('cfg-focus-status');
  if (!token) { statusEl.style.display='block'; statusEl.style.color='var(--red)'; statusEl.textContent='Nenhum token para testar.'; return; }
  statusEl.style.display='block'; statusEl.style.color='var(--muted)'; statusEl.textContent='Testando conexão...';
  try {
    const baseUrl = env === 'producao' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br';
    const resp = await fetch(`${baseUrl}/v2/nfe?ref=ping_test`, {
      method: 'GET',
      headers: { 'Authorization': 'Basic ' + btoa(token + ':') },
    });
    if (resp.status === 200 || resp.status === 404) {
      statusEl.style.color='var(--green)'; statusEl.textContent=`✓ Conexão OK (${env}).`;
    } else if (resp.status === 401) {
      statusEl.style.color='var(--red)'; statusEl.textContent='Token inválido ou sem permissão.';
    } else {
      statusEl.style.color='var(--amber)'; statusEl.textContent=`Resposta inesperada: HTTP ${resp.status}.`;
    }
  } catch(e) {
    statusEl.style.color='var(--red)'; statusEl.textContent='Erro de conexão: ' + e.message;
  }
}

async function resetData(){
  const confirm1 = confirm("⚠ ATENÇÃO: Esta ação apagará TODOS os dados permanentemente.\n\nEsta operação não pode ser desfeita. Deseja continuar?");
  if(!confirm1) return;
  const typed = prompt('Para confirmar, digite exatamente: RESETAR');
  if(typed !== 'RESETAR'){ alert("Confirmação incorreta. Operação cancelada."); return; }
  localStorage.removeItem(STORAGE_KEY);
  state = JSON.parse(JSON.stringify(defaultState));
  await saveToFirebase();
  render();
  alert("Dados resetados.");
}

function _renderAsaasInstrucoes() {
  const box = el('asaas-instrucoes');
  if (!box) return;
  const temChave = !!(state?.company?.asaasKey);
  box.innerHTML = temChave
    ? `<div style="background:var(--surface-2);border-left:3px solid var(--green);padding:12px;border-radius:6px;font-size:13px">
        ✅ <strong>Asaas configurado.</strong> Os botões <em>📱 Pix</em> e <em>🏦 Boleto</em> aparecem automaticamente em <strong>Contas → A Receber</strong>.
        <br><small style="color:var(--muted)">Para trocar a chave, cole a nova abaixo e salve. Use Produção apenas quando pronto para cobranças reais.</small>
        <br><a href="https://www.asaas.com/config/index?tab=integracao" target="_blank" style="font-size:12px">Gerenciar chave no Asaas →</a>
      </div>`
    : `<div style="background:var(--surface-2);border-left:3px solid var(--amber,#f59e0b);padding:12px;border-radius:6px;font-size:13px">
        <strong>Como configurar em 3 passos:</strong>
        <ol style="margin:8px 0 0 16px;line-height:2.2">
          <li>Crie uma conta gratuita em <a href="https://asaas.com" target="_blank">asaas.com</a></li>
          <li>Acesse <strong>Configurações → Integrações → Chave de API</strong> e copie a chave</li>
          <li>Cole no campo abaixo e clique em <strong>Salvar</strong></li>
        </ol>
        <p style="margin-top:8px;color:var(--muted);font-size:12px">
          💡 Comece em <strong>Sandbox</strong> — pagamentos são simulados sem custo. Mude para Produção quando quiser cobrar de verdade.
        </p>
      </div>`;
}

function salvarAsaas() {
  const key = (el('cfg-asaas-key')?.value || '').trim();
  const env = el('cfg-asaas-env')?.value || 'sandbox';
  if (!key) {
    const st = el('cfg-asaas-status');
    st.style.display = 'block'; st.style.color = 'var(--red)';
    st.textContent = 'Informe a chave API.'; return;
  }
  state.company = { ...(state.company||{}), asaasKey: key, asaasEnv: env };
  saveState();
  _renderAsaasInstrucoes();
  const st = el('cfg-asaas-status');
  st.style.display = 'block'; st.style.color = 'var(--green)';
  st.textContent = '✓ Chave salva com sucesso.';
  showSyncStatus('✓ Asaas configurado');
}

async function testarAsaas() {
  const st = el('cfg-asaas-status');
  st.style.display = 'block'; st.textContent = '⏳ Testando...'; st.style.color = 'var(--muted)';
  try {
    const key = (el('cfg-asaas-key')?.value || state?.company?.asaasKey || '').trim();
    const env = el('cfg-asaas-env')?.value || state?.company?.asaasEnv || 'sandbox';
    if (!key) throw new Error('Informe a chave primeiro.');
    const r = await fetch(`${ASAAS_BASE[env]}/myAccount`, { headers: { 'access_token': key } });
    const d = await r.json();
    if (d?.name) {
      st.style.color = 'var(--green)';
      st.textContent = `✓ Conectado: ${d.name}`;
    } else { throw new Error('Resposta inesperada'); }
  } catch(e) {
    st.style.color = 'var(--red)';
    st.textContent = `✗ ${e.message}`;
  }
}

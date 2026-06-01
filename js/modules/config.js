// ─── MINHA CONTA ─────────────────────────────────────────────────────────────
function renderMinhaConta(){
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
    trialPct = Math.round((trialDaysLeft/30)*100);
  }

  const planLabel = {trial:'Teste Gratuito', basico:'Básico', profissional:'Profissional', empresarial:'Empresarial'}[plan] || plan;
  const planColor = plan==='trial'?'bg-amber': plan==='basico'?'bg-blue':'bg-green';

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
        ${plan==='trial'?`<div style="text-align:right">
          <div class="kpi-label">Dias restantes</div>
          <div style="font-size:28px;font-weight:700;color:${trialDaysLeft<=3?'var(--red)':trialDaysLeft<=7?'var(--amber)':'var(--green)'};margin-top:4px">${trialDaysLeft}</div>
        </div>`:''}
      </div>
      ${plan==='trial'?`
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:var(--muted)">
            <span>Período de teste</span>
            <span>${trialDaysLeft} dias restantes de 30</span>
          </div>
          <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${trialPct}%;background:${trialDaysLeft<=3?'var(--red)':trialDaysLeft<=7?'var(--amber)':'var(--green)'};border-radius:4px;transition:width .4s"></div>
          </div>
          ${trialDaysLeft<=7?`<div class="alert-warn" style="margin-top:12px;margin-bottom:0">⚠ Seu teste encerra em ${trialDaysLeft} dia(s). Assine para não perder o acesso.</div>`:''}
        </div>
        <div class="divider"></div>
        <div style="margin-bottom:16px">
          <div class="section-title" style="font-size:14px;margin-bottom:12px">Escolha seu plano</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
            ${[
              {key:'basico', name:'Básico', price:'R$ 97/mês', features:['1 usuário','500 produtos','Pedidos + NF + Caixa']},
              {key:'profissional', name:'Profissional', price:'R$ 197/mês', features:['5 usuários','Ilimitado','Todos os módulos'], highlight:true},
              {key:'empresarial', name:'Empresarial', price:'R$ 397/mês', features:['15 usuários','API','Suporte prioritário']}
            ].map(p=>`
              <div style="border:1.5px solid ${p.highlight?'var(--amber)':'var(--border2)'};border-radius:10px;padding:16px;${p.highlight?'background:rgba(245,158,11,.06)':''}">
                ${p.highlight?`<div style="font-size:10px;color:var(--amber);font-weight:700;letter-spacing:.06em;margin-bottom:6px">MAIS POPULAR</div>`:''}
                <div style="font-weight:700;font-size:15px;color:var(--text);margin-bottom:4px">${p.name}</div>
                <div style="font-size:18px;font-weight:700;color:${p.highlight?'var(--amber)':'var(--text2)'};margin-bottom:10px">${p.price}</div>
                ${p.features.map(f=>`<div style="font-size:12px;color:var(--muted);margin-bottom:4px">✓ ${f}</div>`).join('')}
                <button class="btn ${p.highlight?'btn-primary':'btn-ghost'}" style="width:100%;margin-top:12px;padding:9px" onclick="assinarPlano('${p.key}','${p.name}','${p.price}')">Assinar</button>
              </div>`).join('')}
          </div>
        </div>`:`
        <div class="row-between">
          <div style="font-size:13px;color:var(--text2)">Próximo vencimento: <b>${trialEndsAt?new Date(trialEndsAt).toLocaleDateString('pt-BR'):'—'}</b></div>
          <button class="btn btn-ghost" style="font-size:12px" onclick="assinarPlano('upgrade','Upgrade','')">Gerenciar assinatura</button>
        </div>`}
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
        Indique o ERP Distribuidora e ganhe <b style="color:var(--amber)">20% de comissão</b> recorrente enquanto o indicado for cliente ativo.
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
      ${referredBy?`<div style="font-size:12px;color:var(--muted);margin-top:8px;padding:8px 12px;background:var(--bg);border-radius:6px;border:1px solid var(--border)">Você foi indicado por um afiliado. Obrigado por escolher o ERP Distribuidora!</div>`:''}
      <div style="margin-top:12px;font-size:12px;color:var(--muted)">
        Para receber suas comissões, entre em contato: <a href="mailto:contato@erp-distribuidora.com.br" style="color:var(--amber)">contato@erp-distribuidora.com.br</a>
      </div>
    </div>

    </div>`;
}

function copyAffiliateLink(){
  const inp = el('affiliate-link-input');
  if(inp){ inp.select(); document.execCommand('copy'); showSyncStatus('✓ Link copiado!'); }
}

function assinarPlano(key, name, price){
  const msg = encodeURIComponent(`Olá! Quero assinar o plano ${name} (${price}) do ERP Distribuidora. Minha empresa: ${state.company?.name||'—'}`);
  window.open(`https://wa.me/55?text=${msg}`, '_blank');
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
function renderConfig(){
  const co=state.company||{};
  el("content").innerHTML=`
    <div class="section-title" style="margin-bottom:20px">Configurações da Empresa</div>
    <div class="card" style="max-width:580px">
      <div class="form-group"><label class="form-label">Nome / Razão Social</label><input id="cfg-name" class="form-input" value="${co.name||""}"></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">CNPJ</label><input id="cfg-cnpj" class="form-input" value="${co.cnpj||""}"></div>
        <div class="form-group"><label class="form-label">Telefone</label><input id="cfg-phone" class="form-input" value="${co.phone||""}"></div>
      </div>
      <div class="form-group"><label class="form-label">Endereço</label><input id="cfg-addr" class="form-input" value="${co.address||""}"></div>
      <div class="form-grid-2">
        <div class="form-group"><label class="form-label">Cidade</label><input id="cfg-city" class="form-input" value="${co.city||""}"></div>
        <div class="form-group"><label class="form-label">UF</label><input id="cfg-uf" class="form-input" value="${co.uf||"MS"}"></div>
      </div>
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
      <div class="form-group"><label class="form-label">Token Focus NFe</label><input id="cfg-focustoken" class="form-input" type="password" placeholder="Token da API Focus NFe" value="${co.focusToken||''}"><div style="font-size:11px;color:var(--muted);margin-top:4px">Obtido em app.focusnfe.com.br → Configurações → Token</div></div>
      <div class="form-group"><label class="form-label">Ambiente Focus NFe</label><select id="cfg-focusenv" class="form-input">
        <option value="homologacao" ${(!co.focusEnv||co.focusEnv==='homologacao')?'selected':''}>Homologação (testes)</option>
        <option value="producao" ${co.focusEnv==='producao'?'selected':''}>Produção</option>
      </select></div>
      <button class="btn btn-primary" onclick="saveConfig()">Salvar Configurações</button>
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
    </div>`;
}
function saveConfig(){
  const prev = state.company||{};
  state.company={...prev,name:el("cfg-name").value,cnpj:el("cfg-cnpj").value,phone:el("cfg-phone").value,address:el("cfg-addr").value,city:el("cfg-city").value,uf:el("cfg-uf").value,email:el("cfg-email").value,openingBalance:parseFloat(el("cfg-opening").value)||0,ie:el("cfg-ie").value,regime:el("cfg-regime").value,focusToken:el("cfg-focustoken").value,focusEnv:el("cfg-focusenv").value};
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
  a.download=`erp_distribuidor_backup_${today()}.json`; a.click();
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

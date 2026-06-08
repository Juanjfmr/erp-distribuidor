// ─── STATE ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "stoqio_v1";
// Bump CACHE_VERSION toda vez que deployar mudanças no frontend.
// Isso força o navegador a descartar localStorage obsoleto e buscar dados frescos do Firestore.
// SEMPRE incrementar ao finalizar uma sessão de desenvolvimento antes do deploy.
const CACHE_VERSION = 2;

// ─── PLANOS ───────────────────────────────────────────────────────────────────
const PLAN_LIMITS = {
  trial:        { users: 1, products: 50,    nfMonth: 10,   modules: ['basic','pro'] },
  basico:       { users: 1, products: 500,   nfMonth: 150,  modules: ['basic'] },
  profissional: { users: 5, products: 3000,  nfMonth: 1000, modules: ['basic','pro'] },
  empresarial:  { users: 99,products: 99999, nfMonth: 9999, modules: ['basic','pro','enterprise'] },
  owner:        { users: 99,products: 99999, nfMonth: 9999, modules: ['basic','pro','enterprise'] },
};

const MODULE_PLAN = {
  devolucoes:   'pro',
  relatorios:   'pro',
  comissoes:    'pro',
  tabelaPreco:  'pro',
  estoqueMin:   'pro',
  pdv:          'enterprise',
  api:          'enterprise',
};

function checkPlan(module) {
  const plan = window._plan || 'trial';
  const required = MODULE_PLAN[module];
  if (!required) return true;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  return limits.modules.includes(required);
}

function getPlanLimit(key) {
  const plan = window._plan || 'trial';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
  return limits[key];
}

function showPlanBlockModal(module) {
  const msgs = {
    devolucoes:  'Devoluções',
    relatorios:  'Relatórios Avançados e Curva ABC',
    comissoes:   'Comissão de vendedores',
    tabelaPreco: 'Tabela de preços por cliente',
    estoqueMin:  'Estoque mínimo e alertas',
    pdv:         'PDV (Ponto de Venda)',
    api:         'Acesso via API',
  };
  const nome = msgs[module] || module;
  const requiredPlan = MODULE_PLAN[module];
  const planNames = { pro: 'Profissional (R$197/mês)', enterprise: 'Empresarial (R$397/mês)' };
  const planMsg = planNames[requiredPlan] || 'um plano superior';
  showModal(`
    <div style="text-align:center;padding:24px">
      <div style="font-size:32px;margin-bottom:12px">🔒</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">Recurso bloqueado</div>
      <div style="color:var(--text2);margin-bottom:20px"><b>${nome}</b> está disponível a partir do plano <b>${planMsg}</b>.</div>
      <button class="btn btn-primary" onclick="navigate('minha-conta');closeModal()">Ver planos</button>
      <button class="btn" onclick="closeModal()" style="margin-left:8px">Fechar</button>
    </div>
  `);
}
const defaultState = {
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
  products:[], clients:[], suppliers:[],
  invoices:[], purchases:[],
  receivables:[], payables:[], transactions:[],
  stockMovements:[],
  currentView:"dashboard", contasTab:"receber", cashFilter:"todos",
  nfItems:[], compraItems:[], pedidoItems:[], nfCosts:[], relPeriod:"all", relTab:"geral",
  orders:[], returns:[],
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
  recurringExpenses: [],
};

let state = {};

function loadState(){
  // Se a versão do cache não bate, descarta localStorage inteiro
  // (evita usuário ficar preso em dados obsoletos após deploy)
  const cachedVer = localStorage.getItem('stoqio_cache_v');
  if (cachedVer !== String(CACHE_VERSION)) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem('stoqio_cache_v', String(CACHE_VERSION));
  }
  try{
    const s = localStorage.getItem(STORAGE_KEY);
    if(s){ state = JSON.parse(s); }
    else{ state = JSON.parse(JSON.stringify(defaultState)); }
    if(!state.stockMovements) state.stockMovements=[];
    if(!state.suppliers) state.suppliers=[];
    if(!state.purchases) state.purchases=[];
    if(!state.receivables) state.receivables=[];
    if(!state.payables) state.payables=[];
    if(!state.company) state.company=defaultState.company;
    if(!state.orders) state.orders=[];
    if(!state.returns) state.returns=[];
    if (!state.onboarding) state.onboarding = {
      complete: false, step: 0,
      checklist: { empresa:false, dados:false, pedido:false, nfe:false, recebimento:false, certificado:false }
    };
    if(!state.recurringExpenses) state.recurringExpenses=[];
    state.nfItems=[]; state.compraItems=[]; state.pedidoItems=[]; state.nfCosts=[];
  }catch(e){ state = JSON.parse(JSON.stringify(defaultState)); }
}
function saveState(){
  const toSave = Object.assign({},state);
  delete toSave.nfItems; delete toSave.compraItems; delete toSave.pedidoItems; delete toSave.nfCosts;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(toSave));
  saveToFirebase();
}

// ─── DESPESAS RECORRENTES ────────────────────────────────────────────────────
function processRecurringExpenses() {
  const todayStr = today();
  const recs = state.recurringExpenses || [];
  let processed = 0;
  const processedNames = [];
  // Só processa despesas que vencem EXATAMENTE hoje
  recs.filter(r => r.active && r.nextDueDate === todayStr).forEach(r => {
    state.transactions.push({
      id: uid(),
      date: r.nextDueDate,
      type: 'saida',
      category: r.category,
      description: r.description,
      amount: r.amount
    });
    // Avança próxima data
    const d = new Date(r.nextDueDate + 'T00:00:00');
    if (r.frequency === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (r.frequency === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (r.frequency === 'biweekly') {
      d.setDate(d.getDate() + 14);
    }
    r.nextDueDate = d.toISOString().slice(0, 10);
    processed++;
    processedNames.push(r.description);
  });
  if (processed > 0) {
    saveState();
    showSyncStatus(`✓ ${processed} despesa(s) processada(s): ${processedNames.join(', ')}`);
  }
  return processed;
}

function completeOnboardingStep(step) {
  if (!state.onboarding) return;
  state.onboarding.checklist[step] = true;
  const all = Object.values(state.onboarding.checklist);
  if (all.every(Boolean)) state.onboarding.complete = true;
  saveState();
}

// ─── SCANNER DE CÓDIGO DE BARRAS ─────────────────────────────────────────────
function scanBeep(ok=true){
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value=ok?880:300;
    gain.gain.setValueAtTime(0.3,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.15);
  }catch(e){}
}

function scanAddItem(modalType, code){
  if(!code) return;
  const clean = code.trim();
  const p = state.products.find(x=>x.active!==false&&x.ean===clean)
         || state.products.find(x=>x.active!==false&&x.code===clean)
         || state.products.find(x=>x.active!==false&&norm(x.name)===norm(clean));
  if(!p){
    scanBeep(false);
    const scanEl = el(modalType==='nf'?'nf-scan-ean':'ped-scan-ean');
    if(scanEl){ scanEl.style.borderColor='var(--red)'; setTimeout(()=>scanEl.style.borderColor='',1000); }
    showSyncStatus(`⚠ EAN não encontrado: ${clean}`, true);
    return;
  }
  if(modalType==='nf'){
    const existing=state.nfItems.find(it=>it.productId===p.id);
    if(existing){ existing.qty+=1; } else { state.nfItems.push({productId:p.id,name:p.name,unit:p.unit||'UN',qty:1,price:p.salePrice,itemDiscount:0}); }
    nfRenderItems();
  } else if(modalType==='ped'){
    const existing=state.pedidoItems.find(it=>it.productId===p.id);
    if(existing){ existing.qty+=1; } else { state.pedidoItems.push({productId:p.id,name:p.name,unit:p.unit,qty:1,price:p.salePrice,itemDiscount:0}); }
    pedidoRenderItems();
  } else if(modalType==='compra'){
    const existing=state.compraItems.find(it=>it.productId===p.id);
    if(existing){ existing.qty+=1; } else { state.compraItems.push({productId:p.id,name:p.name,qty:1,cost:p.costPrice||0,unit:p.unit||'UN'}); }
    compraRenderItems();
  }
  scanBeep(true);
  showSyncStatus(`✓ ${p.name} adicionado`);
}

function scanKeyHandler(e, modalType){
  if(e.key==='Enter'){
    e.preventDefault();
    const val = e.target.value.trim();
    scanAddItem(modalType, val);
    e.target.value='';
    e.target.focus();
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  const s = String(str);
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
const fmt = v => (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtNum = v => (v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtDate = d => { if(!d) return "—"; const [y,m,dd]=d.split("-"); return `${dd}/${m}/${y}`; };
const today = () => new Date().toISOString().slice(0,10);
const addDays = (ds,n) => { const d=new Date(ds+"T00:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const uid = () => Date.now()+Math.floor(Math.random()*9999);
const getProd = id => state.products.find(p=>p.id===id);
const getClient = id => state.clients.find(c=>c.id===id);
const getSupplier = id => state.suppliers.find(s=>s.id===id);
const el = id => document.getElementById(id);
const totalIn = (txs) => (txs||state.transactions).filter(t=>t.type==="entrada").reduce((s,t)=>s+t.amount,0);
const totalOut = (txs) => (txs||state.transactions).filter(t=>t.type==="saida").reduce((s,t)=>s+t.amount,0);
const isOverdue = dueDate => dueDate < today();
function getClientOpenBalance(clientId) {
  if (!clientId) return 0;
  return (state.receivables||[]).filter(r => r.clientId === clientId && r.status === 'aberta').reduce((s, r) => s + r.amount, 0);
}
function getClientOverdueBalance(clientId) {
  if (!clientId) return 0;
  return (state.receivables||[]).filter(r => r.clientId === clientId && r.status === 'aberta' && isOverdue(r.dueDate)).reduce((s, r) => s + r.amount, 0);
}
function isClientDelinquent(clientId) {
  return getClientOverdueBalance(clientId) > 0;
}
function checkClientCredit(clientId, newTotal) {
  // Returns { blocked: bool, reason: string, openAmt: number, creditLimit: number, overdueAmt: number }
  if (!clientId) return { blocked: false, reason: '', openAmt: 0, creditLimit: 0, overdueAmt: 0 };
  const client = getClient(clientId);
  if (!client) return { blocked: false, reason: '', openAmt: 0, creditLimit: 0, overdueAmt: 0 };
  const openAmt = getClientOpenBalance(clientId);
  const overdueAmt = getClientOverdueBalance(clientId);
  const creditLimit = client.creditLimit || 0;
  if (overdueAmt > 0) {
    return { blocked: true, reason: `Cliente inadimplente: ${fmt(overdueAmt)} vencido`, openAmt, creditLimit, overdueAmt };
  }
  if (creditLimit > 0 && (openAmt + newTotal) > creditLimit) {
    return { blocked: true, reason: `Limite de crédito excedido: ${fmt(openAmt)} em aberto + ${fmt(newTotal)} = ${fmt(openAmt + newTotal)} (limite: ${fmt(creditLimit)})`, openAmt, creditLimit, overdueAmt };
  }
  return { blocked: false, reason: '', openAmt, creditLimit, overdueAmt };
}
const norm = s => (s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const normWords = s => norm(s).replace(/\s+/g,'');
function prodSimilarity(a,b){
  if(norm(a)===norm(b)) return 1;
  if(normWords(a)===normWords(b)) return 0.95;
  const wa=norm(a).split(/\s+/).sort().join(' '), wb=norm(b).split(/\s+/).sort().join(' ');
  if(wa===wb) return 0.9;
  return 0;
}
let _saving = false;
var _nfSort = initSort('date','desc');
function _guardSave(){ if(_saving) return false; _saving=true; return true; }
function _doneSave(){ _saving=false; }
const DEFAULT_CAT_PROD=["Bebidas","Alimentos","Limpeza","Higiene","Outros"];
const DEFAULT_UNITS=["UN","CX","DZ","PCT","KG","LT","MT","FD"];
function getCatProd(){ return (state.company?.categories?.length ? state.company.categories : DEFAULT_CAT_PROD); }
function getUnits(){ return (state.company?.units?.length ? state.company.units : DEFAULT_UNITS); }
Object.defineProperty(window,'CAT_PROD',{get:()=>getCatProd(),configurable:true});
Object.defineProperty(window,'UNITS',{get:()=>getUnits(),configurable:true});
const PAY_TERMS=["À Vista","7 dias","14 dias","21 dias","28 dias","30 dias","35 dias","42 dias","30/60","30/60/90"];
const PAY_METHODS=["PIX","Boleto","Cheque","Dinheiro","Cartão de Débito","Cartão de Crédito","Duplicata","TED/DOC","Outro"];
const CAT_FIN={entrada:["Vendas","Outros","Financiamento","Juros"],saida:["Compras","Logística","Operacional","Salários","Impostos","Outros"]};

function generateReceivables(invoiceId,invoiceNumber,clientId,total,date,terms){
  const recs=[];
  let dates=[], shares=[];
  if(terms==="À Vista"){ dates=[date]; shares=[1]; }
  else if(terms==="7 dias"){ dates=[addDays(date,7)]; shares=[1]; }
  else if(terms==="14 dias"){ dates=[addDays(date,14)]; shares=[1]; }
  else if(terms==="21 dias"){ dates=[addDays(date,21)]; shares=[1]; }
  else if(terms==="28 dias"){ dates=[addDays(date,28)]; shares=[1]; }
  else if(terms==="30 dias"){ dates=[addDays(date,30)]; shares=[1]; }
  else if(terms==="30/60"){ dates=[addDays(date,30),addDays(date,60)]; shares=[0.5,0.5]; }
  else if(terms==="30/60/90"){ dates=[addDays(date,30),addDays(date,60),addDays(date,90)]; shares=[1/3,1/3,1/3]; }
  else{ const m=terms.match(/^(\d+)\s*dias?$/i); if(m){ dates=[addDays(date,parseInt(m[1]))]; shares=[1]; } else{ dates=[date]; shares=[1]; } }
  dates.forEach((d,i)=>{
    recs.push({id:uid()+(i*7),invoiceId,invoiceNumber,clientId,dueDate:d,amount:parseFloat((total*shares[i]).toFixed(2)),installment:i+1,total:dates.length,status:"aberta",paidAt:null});
  });
  return recs;
}

function generatePayables(purchaseId,purchaseNumber,supplierId,total,date,terms,description){
  const pays=[];
  let dates=[], shares=[];
  if(!terms||terms==="À Vista"){ dates=[date]; shares=[1]; }
  else if(terms==="30"){ dates=[addDays(date,30)]; shares=[1]; }
  else if(terms==="30/60"){ dates=[addDays(date,30),addDays(date,60)]; shares=[0.5,0.5]; }
  else if(terms==="30/60/90"){ dates=[addDays(date,30),addDays(date,60),addDays(date,90)]; shares=[1/3,1/3,1/3]; }
  else{ dates=[addDays(date,30)]; shares=[1]; }
  dates.forEach((d,i)=>{
    pays.push({id:uid()+(i*7),purchaseId,purchaseNumber,supplierId,dueDate:d,amount:parseFloat((total*shares[i]).toFixed(2)),installment:i+1,total:dates.length,status:"aberta",paidAt:null,description:description||purchaseNumber});
  });
  return pays;
}

// ─── TABLE SORT UTILITY ─────────────────────────────────────────────────────
// Uso: const sort = initSort('name','asc'); filterFn = () => filterProdutos();
// TH: <th onclick="prodSortBy('name')" class="sort-th">Produto ${sortIcon(_prodSort,'name')}</th>
// Sort dos dados: data = sortData(data, _prodSort, { name: p=>p.name, price: p=>p.salePrice });

function initSort(defaultCol, defaultDir) {
  return { col: defaultCol, dir: defaultDir || 'asc' };
}

function sortIcon(sortState, col) {
  if (sortState.col !== col) return '';
  return sortState.dir === 'asc' ? ' ▲' : ' ▼';
}

function sortData(data, sortState, getters) {
  if (!sortState || !sortState.col) return data;
  const getter = getters[sortState.col];
  if (!getter) return data;
  return [...data].sort((a, b) => {
    const va = getter(a), vb = getter(b);
    const cmp = (typeof va === 'number') ? (va - vb) : String(va||'').localeCompare(String(vb||''));
    return sortState.dir === 'asc' ? cmp : -cmp;
  });
}

function thSortable(label, col, sortState, onClickFn) {
  return `<th onclick="${onClickFn}('${col}')" class="sort-th" style="cursor:pointer;user-select:none;white-space:nowrap">${label}${sortIcon(sortState, col)}</th>`;
}

// ─── CEP → Endereço via BrasilAPI ────────────────────────────────────────────
async function buscarCep(prefix) {
  const raw = (document.getElementById(`${prefix}-cep`)?.value || '').replace(/\D/g,'');
  if (raw.length !== 8) return;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${raw}`);
    if (!r.ok) return;
    const d = await r.json();
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    if (prefix === 'cli') {
      set('fc-street', d.street); set('fc-district', d.neighborhood);
      set('fc-city', d.city);     set('fc-uf', d.state);
    } else if (prefix === 'cfg') {
      set('cfg-addr', d.street);  set('cfg-city', d.city);
      set('cfg-uf', d.state);
    }
  } catch(e) { /* silencioso */ }
}
window.buscarCep = buscarCep;

// ─── Feriados via BrasilAPI ──────────────────────────────────────────────────
let _feriadosCache = null;
async function getFeriados(ano) {
  if (_feriadosCache?.ano === ano) return _feriadosCache.datas;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    const lista = await r.json();
    const datas = new Set(lista.map(f => f.date));
    _feriadosCache = { ano, datas };
    return datas;
  } catch(e) { return new Set(); }
}

async function proximoDiaUtil(dateStr) {
  let d = new Date(dateStr + 'T12:00:00');
  const feriados = await getFeriados(d.getFullYear());
  let count = 0;
  while (count < 60) {
    const dow = d.getDay();
    const iso = d.toISOString().slice(0,10);
    if (dow !== 0 && dow !== 6 && !feriados.has(iso)) return iso;
    d.setDate(d.getDate() + 1);
    count++;
  }
  return dateStr;
}
window.proximoDiaUtil = proximoDiaUtil;

// ─── INPUT MASKS ─────────────────────────────────────────────────────────
function maskCNPJ(v){ v=v.replace(/\D/g,'').slice(0,14); return v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2'); }
function maskCEP(v){ v=v.replace(/\D/g,'').slice(0,8); return v.replace(/^(\d{5})(\d)/,'$1-$2'); }
function maskPhone(v){ v=v.replace(/\D/g,'').slice(0,11); if(v.length<=10) return v.replace(/^(\d{2})(\d{4})(\d)/,'($1) $2-$3'); return v.replace(/^(\d{2})(\d{5})(\d)/,'($1) $2-$3'); }
function unmask(v){ return (v||'').replace(/\D/g,''); }

function applyMask(el, type){
  const raw = el.value;
  if(type==='cnpj') el.value = maskCNPJ(raw);
  else if(type==='cep') el.value = maskCEP(raw);
  else if(type==='phone') el.value = maskPhone(raw);
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────
function emptyState(icon, title, subtitle, actionLabel, actionFn){
  return `<div style="text-align:center;padding:48px 24px">
    <div style="font-size:40px;margin-bottom:16px">${icon}</div>
    <div style="font-weight:700;font-size:15px;color:var(--text);margin-bottom:6px">${title}</div>
    <div style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:${actionLabel?'20':'0'}px">${subtitle}</div>
    ${actionLabel ? `<button class="btn btn-primary" onclick="${actionFn}">${actionLabel}</button>` : ''}
  </div>`;
}

window.maskCNPJ = maskCNPJ; window.maskCEP = maskCEP; window.maskPhone = maskPhone;
window.unmask = unmask; window.applyMask = applyMask; window.emptyState = emptyState;

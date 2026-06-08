// ─── MODAL ───────────────────────────────────────────────────────────────────
function showModal(html,large){
  el("modal-box").className="modal-box"+(large?" modal-box-lg":"");
  el("modal-box").innerHTML=html;
  el("modal").style.display="flex";
  // Focus trap: foca o modal para capturar Escape
  setTimeout(()=>{ const mb=el("modal-box"); if(mb) mb.focus(); }, 50);
}
function closeModal(){ el("modal").style.display="none"; state.nfItems=[]; state.compraItems=[]; state.pedidoItems=[]; state.nfCosts=[]; }
const openModal = showModal;

// ─── MODAL ESC + CLICK-OUTSIDE ──────────────────────────────────────────────
document.addEventListener('keydown', function(e){
  if(e.key==='Escape' && el('modal').style.display==='flex'){ closeModal(); }
});
el('modal').addEventListener('click', function(e){
  if(e.target===el('modal')) closeModal();
});

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
const PAGE_TITLES={dashboard:"Dashboard",produtos:"Produtos",clientes:"Clientes",fornecedores:"Fornecedores",pedidos:"Pedidos de Venda",notas:"Nota Fiscal",devolucoes:"Devoluções",compras:"Compras",contas:"Contas",caixa:"Fluxo de Caixa",relatorios:"Relatórios",config:"Configurações",onboarding:"Configuração Inicial"};
const MODULE_GUARD = {
  devolucoes: 'devolucoes',
  relatorios: 'relatorios',
  comissoes: 'comissoes',
  tabelaPreco: 'tabelaPreco',
  estoqueMin: 'estoqueMin',
  pdv: 'pdv',
  api: 'api',
};

function navigate(v){
  // Bloquear acesso a todos os módulos quando trial expirado ou conta bloqueada
  const plan = window._plan || 'trial';
  const trialEndsAt = window._trialEndsAt;
  const tenantStatus = window._tenantStatus;
  const trialExpired = plan === 'trial' && trialEndsAt && new Date(trialEndsAt) < new Date();
  const isBlocked = tenantStatus === 'bloqueado';

  if (plan !== 'owner' && (trialExpired || isBlocked)) {
    if (v !== 'minha-conta') {
      showModal(`
        <div style="text-align:center;padding:24px">
          <div style="font-size:32px;margin-bottom:12px">🔒</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:8px">${isBlocked ? 'Acesso suspenso' : 'Trial expirado'}</div>
          <div style="color:var(--text2);margin-bottom:20px">${isBlocked ? 'Sua conta está suspensa. Renove sua assinatura para acessar os módulos.' : 'Seu período de teste encerrou. Assine um plano para continuar.'}</div>
          <button class="btn btn-primary" onclick="navigate('minha-conta');closeModal()">Ver planos</button>
          <button class="btn" onclick="closeModal()" style="margin-left:8px">Fechar</button>
        </div>
      `);
      return;
    }
  }

  if (MODULE_GUARD[v] && !checkPlan(MODULE_GUARD[v])) {
    showPlanBlockModal(MODULE_GUARD[v]);
    return;
  }
  state.currentView=v;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===v));
  el("page-title").textContent=PAGE_TITLES[v]||v;
  render();
}
function render(){
  try {
    const fn = ({
      dashboard:typeof renderDashboard!=='undefined'?renderDashboard:0,
      produtos:typeof renderProdutos!=='undefined'?renderProdutos:0,
      clientes:typeof renderClientes!=='undefined'?renderClientes:0,
      fornecedores:typeof renderFornecedores!=='undefined'?renderFornecedores:0,
      pedidos:typeof renderPedidos!=='undefined'?renderPedidos:0,
      notas:typeof renderNotas!=='undefined'?renderNotas:0,
      devolucoes:typeof renderDevolucoes!=='undefined'?renderDevolucoes:0,
      compras:typeof renderCompras!=='undefined'?renderCompras:0,
      contas:typeof renderContas!=='undefined'?renderContas:0,
      caixa:typeof renderCaixa!=='undefined'?renderCaixa:0,
      relatorios:typeof renderRelatorios!=='undefined'?renderRelatorios:0,
      config:typeof renderConfig!=='undefined'?renderConfig:0,
      usuarios:typeof renderUsuarios!=='undefined'?renderUsuarios:0,
      'minha-conta':typeof renderMinhaConta!=='undefined'?renderMinhaConta:0,
      onboarding:typeof renderOnboarding!=='undefined'?renderOnboarding:0,
    })[state.currentView];
    if (typeof fn==='function') fn();
  } catch(e) {
    console.error('Render error:', state.currentView, e.message);
  }
  applyRoleUI();
}

// ─── ROLES & NAV CONTROL ─────────────────────────────────────────────────────
var ROLE_NAV = {
  admin:        ['dashboard','produtos','clientes','fornecedores','pedidos','notas','devolucoes','compras','contas','caixa','relatorios','config','usuarios','minha-conta','onboarding'],
  vendedor:     ['dashboard','produtos','clientes','fornecedores','pedidos','notas','devolucoes','compras','contas','caixa','relatorios','minha-conta','onboarding'],
  visualizador: ['dashboard','relatorios','minha-conta'],
  contador:     ['dashboard','relatorios','notas','caixa','contas','minha-conta'],
};
var ROLE_LABELS = { admin:'Admin', vendedor:'Vendedor', visualizador:'Visualizador', contador:'Contador' };
var ROLE_COLORS = { admin:'var(--amber)', vendedor:'var(--blue)', visualizador:'var(--muted)', contador:'var(--green)' };

function applyRoleUI() {
  if (!ROLE_NAV) return;
  const role = window._userRole || 'visualizador';
  const allowed = ROLE_NAV[role] || ROLE_NAV.visualizador;
  document.querySelectorAll('.nav-item[data-view]').forEach(n => {
    n.style.display = allowed.includes(n.dataset.view) ? '' : 'none';
  });
  const badge = document.getElementById('role-badge');
  if (badge) { badge.textContent = ROLE_LABELS[role]||role; badge.style.color = ROLE_COLORS[role]||'var(--muted)'; }
  // Sidebar mini-profile
  const sbEmail = document.getElementById('sb-email');
  const sbAvatar = document.getElementById('sb-avatar');
  if (sbEmail) {
    const email = window._currentUser?.email || 'usuário';
    sbEmail.textContent = email;
  }
  if (sbAvatar) {
    const name = window._userProfile?.name || window._currentUser?.email || '?';
    const initial = name.trim().charAt(0).toUpperCase();
    sbAvatar.textContent = initial;
  }
  // Theme toggle sync
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    const isDark = document.documentElement.classList.contains('dark');
    themeBtn.textContent = isDark ? '☀️' : '🌙';
  }
  if (role === 'visualizador' || role === 'contador') {
    document.querySelectorAll('.btn-primary, .btn-danger, .btn-sm.btn-red, .btn-sm.btn-amber').forEach(b => b.style.display='none');
  }
  if (!allowed.includes(state.currentView)) { navigate('dashboard'); }
  // Marcar visualmente itens de nav bloqueados por plano
  document.querySelectorAll('.nav-item[data-view]').forEach(n => {
    const guard = MODULE_GUARD[n.dataset.view];
    const locked = guard && !checkPlan(guard);
    const existing = n.querySelector('.plan-lock');
    if (locked && !existing) {
      const lock = document.createElement('span');
      lock.className = 'plan-lock';
      lock.textContent = ' 🔒';
      lock.style.fontSize = '10px';
      n.appendChild(lock);
    } else if (!locked && existing) {
      existing.remove();
    }
  });
}

// ─── SIDEBAR RESPONSIVA ──────────────────────────────────────────────────────
function toggleSidebar(){
  const sb=document.getElementById('sidebar');
  const ov=document.getElementById('sidebar-overlay');
  if(sb.classList.contains('open')){sb.classList.remove('open');ov.classList.remove('show');}
  else{sb.classList.add('open');ov.classList.add('show');}
}
function toggleTheme(){
  const html=document.documentElement;
  const isDark=html.classList.toggle('dark');
  localStorage.setItem('stoqio_theme', isDark?'dark':'light');
  const btn=document.getElementById('theme-toggle');
  if(btn) btn.textContent=isDark?'☀️':'🌙';
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}
document.addEventListener('click',function(e){
  if(e.target.closest('.nav-item')) setTimeout(closeSidebar,50);
},true);

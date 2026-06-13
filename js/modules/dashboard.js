// ─── DASHBOARD ───────────────────────────────────────────────────────────────
window._dashPeriod = window._dashPeriod || 'mes';
window._feedTab = window._feedTab || 'nfs';

function fmtDateRel(dateStr){
  if(!dateStr) return '—';
  const d=new Date(dateStr+'T00:00:00'); // força parse local, não UTC
  const now=new Date();
  const diffDays=Math.round((now-d)/(1000*60*60*24));
  if(diffDays<0) return d.toLocaleDateString('pt-BR'); // data futura → mostrar data
  if(diffDays===0) return 'hoje';
  if(diffDays===1) return 'ontem';
  if(diffDays<7) return diffDays+'d';
  return d.toLocaleDateString('pt-BR');
}

function renderDashboard(){
  const period = window._dashPeriod || 'mes';
  const now = new Date();
  let dateFrom, dateTo = today();
  if(period === 'hoje'){ dateFrom = today(); }
  else if(period === 'semana'){ const d=new Date();d.setDate(d.getDate()-6);dateFrom=d.toISOString().slice(0,10); }
  else if(period === 'mes'){ dateFrom=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10); }
  else if(period === 'mesant'){ const y=now.getMonth()===0?now.getFullYear()-1:now.getFullYear();const m=now.getMonth()===0?11:now.getMonth()-1;dateFrom=new Date(y,m,1).toISOString().slice(0,10);dateTo=new Date(y,m+1,0).toISOString().slice(0,10); }

  const nfsPeriod = state.invoices.filter(n=>n.status!=="cancelada"&&n.date>=dateFrom&&n.date<=dateTo);
  const totalVendas = nfsPeriod.reduce((s,n)=>s+n.total,0);
  const totalNFs = nfsPeriod.length;
  const tIn=totalIn(), tOut=totalOut(), saldo=tIn-tOut;
  const overdueRec=state.receivables.filter(r=>r.status==="aberta"&&isOverdue(r.dueDate));
  const aReceber=state.receivables.filter(r=>r.status==="aberta").reduce((s,r)=>s+r.amount,0);

  // Pedidos pendentes (não cancelados, não faturados)
  const pedidosPendentes = (state.orders||[]).filter(o=>o.status!=="cancelado"&&o.status!=="faturado");
  const totalPedidosPendentes = pedidosPendentes.reduce((s,o)=>s+(o.total||0),0);

  const lowStock=state.products.filter(p=>p.active!==false&&p.stock<=p.minStock);
  const recentNF=[...state.invoices].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  const recentOrders=[...(state.orders||[])].sort((a,b)=>b.date?.localeCompare(a.date)||0).slice(0,10);
  const recentRec=state.receivables.filter(r=>r.status==="aberta").sort((a,b)=>b.date?.localeCompare(a.date)||0).slice(0,10);

  // ─── Notificações ──────────────────────────────────────────────────────────
  clearNotifications();
  if (lowStock.length) {
    const names = lowStock.map(p => `${escapeHtml(p.name)} (${p.stock} ${p.unit||'UN'})`).join(', ');
    addNotification('estoque', `${lowStock.length} produto(s) com estoque baixo`,
      names.substring(0,120)+(names.length>120?'...':''),
      'Ver produtos', "navigate('produtos');toggleNotifications(new Event('click'))");
  }
  if (overdueRec.length) {
    const totalVenc = overdueRec.reduce((s,r)=>s+r.amount,0);
    addNotification('inadimplencia', `${overdueRec.length} parcela(s) vencida(s)`,
      `Total vencido: ${fmt(totalVenc)}.`,
      'Ver contas', "navigate('contas');toggleNotifications(new Event('click'))");
  }
  if (pedidosPendentes.length) {
    addNotification('operacional', `${pedidosPendentes.length} pedido(s) pendente(s)`,
      `Total: ${fmt(totalPedidosPendentes)}.`,
      'Ver pedidos', "navigate('pedidos');toggleNotifications(new Event('click'))");
  }
  // Notificação fiscal via sino
  if (typeof needsBanner==='function' && needsBanner(state.company)) {
    const cfg = getBannerConfig(state.company);
    addNotification('fiscal', cfg.titulo||'Configure sua NF-e',
      cfg.texto||'Configure dados fiscais para emitir NFs.',
      'Configurar', "navigate('config');toggleNotifications(new Event('click'))");
  }
  updateNotifBell();

  // ─── Onboarding (card amigável, some quando completo) ────────────────────
  const ob = state.onboarding;
  const onboardingHtml = (!ob||ob.complete) ? '' : (()=>{
    const items = [
      {key:'empresa',label:'Dados da empresa'},
      {key:'dados',label:'Importar produtos e clientes'},
      {key:'pedido',label:'Criar primeiro pedido'},
      {key:'nfe',label:'Emitir primeira NF-e'},
      {key:'recebimento',label:'Primeiro recebimento'},
    ];
    const done = items.filter(i=>ob.checklist?.[i.key]).length;
    const pct = Math.round(done/items.length*100);
    return `
      <div class="card" style="padding:16px 20px;margin-bottom:20px;border-left:3px solid var(--primary);background:var(--bg-elevated)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--text)">👋 Bem-vindo à Stoqio!</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">Complete os passos abaixo e comece a vender em minutos</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="navigate('onboarding')">Continuar →</button>
        </div>
        <div style="background:var(--border);border-radius:4px;height:5px;margin:12px 0 10px">
          <div style="background:var(--primary);height:100%;width:${pct}%;border-radius:4px;transition:width .4s"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px 16px">
          ${items.map(i=>`
            <div style="display:flex;align-items:center;gap:5px;font-size:12px;color:${ob.checklist?.[i.key]?'var(--success)':'var(--text-muted)'}">
              <span style="font-size:10px">${ob.checklist?.[i.key]?'✓':'○'}</span> ${i.label}
            </div>
          `).join('')}
        </div>
      </div>`;
  })();

  // ─── Feed tabs ──────────────────────────────────────────────────────────
  const feedTab = window._feedTab||'nfs';
  function feedRow(icon, label, value, time, status){
    const statusColor = status==='✅'?'var(--success)':status==='⚠️'?'var(--warning)':status==='❌'?'var(--danger)':'var(--text-muted)';
    return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="font-size:14px;width:20px;text-align:center">${icon}</span>
      <span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</span>
      <span class="mono" style="font-size:12px;color:var(--text)">${value}</span>
      <span style="font-size:11px;color:var(--text-muted);min-width:45px;text-align:right">${time}</span>
      <span style="font-size:12px;color:${statusColor}">${status}</span>
    </div>`;
  }

  let feedContent = '';
  if (feedTab==='nfs') {
    feedContent = recentNF.length
      ? recentNF.map(n=>feedRow('<svg width=\"14\" height=\"14\" style=\"vertical-align:middle\"><use href=\"#icon-file-text\"/></svg>', (state.clients.find(c=>c.id==n.clientId)?.name||'—'), fmt(n.total), fmtDateRel(n.date), n.status==='autorizada'?'✅':n.status==='cancelada'?'❌':'⏳')).join('')
      : emptyState('bar-chart','Nenhum dado ainda','Comece cadastrando produtos e clientes para ver o dashboard.','Ir para Produtos',"navigate('produtos')");
  } else if (feedTab==='pedidos') {
    feedContent = recentOrders.length
      ? recentOrders.map(o=>{
          const c=state.clients.find(cl=>cl.id==o.clientId);
          return feedRow('<svg width=\"14\" height=\"14\" style=\"vertical-align:middle\"><use href=\"#icon-clipboard\"/></svg>', (c?.name||'—'), fmt(o.total||0), fmtDateRel(o.date), o.status==='confirmado'?'✅':o.status==='rascunho'?'⏳':'❌');
        }).join('')
      : emptyState('bar-chart','Nenhum dado ainda','Comece cadastrando produtos e clientes para ver o dashboard.','Ir para Produtos',"navigate('produtos')");
  } else {
    feedContent = recentRec.length
      ? recentRec.map(r=>{
          const c=state.clients.find(cl=>cl.id==r.clientId);
          return feedRow('<svg width=\"14\" height=\"14\" style=\"vertical-align:middle\"><use href=\"#icon-credit-card\"/></svg>', (c?.name||'—'), fmt(r.amount), fmtDateRel(r.dueDate), isOverdue(r.dueDate)?'⚠️':'✅');
        }).join('')
      : emptyState('bar-chart','Nenhum dado ainda','Comece cadastrando produtos e clientes para ver o dashboard.','Ir para Produtos',"navigate('produtos')");
  }

  const kpiAccent = (color) => `position:absolute;top:0;left:0;right:0;height:3px;background:${color};border-radius:var(--radius-md) var(--radius-md) 0 0`;

  el("content").innerHTML = `
    ${onboardingHtml}

    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <div style="display:flex;gap:4px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px">
        ${['hoje','semana','mes','mesant'].map(p=>`<button class="btn-sm" style="${period===p?'background:var(--primary);color:#fff;border-color:var(--primary)':''}" onclick="window._dashPeriod='${p}';renderDashboard()">${p==='hoje'?'Hoje':p==='semana'?'7 dias':p==='mes'?'Este mês':'Mês anterior'}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="navigate('notas')" style="display:flex;align-items:center;gap:6px;font-size:13px"><svg width="13" height="13" style="vertical-align:middle"><use href="#icon-plus"/></svg> Nova NF-e</button>
        <button class="btn btn-ghost" onclick="navigate('pedidos')" style="display:flex;align-items:center;gap:6px;font-size:13px"><svg width="13" height="13" style="vertical-align:middle"><use href="#icon-package"/></svg> Pedido</button>
        <button class="btn btn-ghost" onclick="navigate('clientes')" style="display:flex;align-items:center;gap:6px;font-size:13px"><svg width="13" height="13" style="vertical-align:middle"><use href="#icon-users"/></svg> Cliente</button>
      </div>
    </div>

    <div class="kpi-grid" style="gap:12px;margin-bottom:16px">
      <div class="kpi" style="position:relative;overflow:hidden">
        <div style="${kpiAccent('linear-gradient(90deg,var(--primary),#818cf8)')}"></div>
        <div class="kpi-label" style="padding-top:4px">Faturamento</div>
        <div class="kpi-value" style="color:var(--primary)">${fmt(totalVendas)}</div>
        <div class="kpi-sub">${totalNFs} NF${totalNFs!==1?'s':''} emitida${totalNFs!==1?'s':''}</div>
      </div>
      <div class="kpi" style="position:relative;overflow:hidden">
        <div style="${kpiAccent(saldo>=0?'linear-gradient(90deg,var(--success),#34d399)':'linear-gradient(90deg,var(--danger),#f87171)')}"></div>
        <div class="kpi-label" style="padding-top:4px">Saldo em Caixa</div>
        <div class="kpi-value" style="color:${saldo>=0?'var(--success)':'var(--danger)'}">${fmt(saldo)}</div>
        <div class="kpi-sub">Entradas − Saídas</div>
      </div>
      <div class="kpi" style="position:relative;overflow:hidden">
        <div style="${kpiAccent('linear-gradient(90deg,var(--warning),#fcd34d)')}"></div>
        <div class="kpi-label" style="padding-top:4px">A Receber</div>
        <div class="kpi-value" style="color:var(--warning)">${fmt(aReceber)}</div>
        <div class="kpi-sub">${state.receivables.filter(r=>r.status==='aberta').length} parcela${state.receivables.filter(r=>r.status==='aberta').length!==1?'s':''} em aberto</div>
      </div>
      <div class="kpi" style="position:relative;overflow:hidden">
        <div style="${kpiAccent(overdueRec.length?'linear-gradient(90deg,var(--danger),#f87171)':'linear-gradient(90deg,var(--success),#34d399)')}"></div>
        <div class="kpi-label" style="padding-top:4px">Vencidas</div>
        <div class="kpi-value" style="color:${overdueRec.length?'var(--danger)':'var(--success)'}">${fmt(overdueRec.reduce((s,r)=>s+r.amount,0))}</div>
        <div class="kpi-sub">${overdueRec.length} parcela${overdueRec.length!==1?'s':''} vencida${overdueRec.length!==1?'s':''}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr auto;gap:12px;margin-bottom:16px;align-items:stretch">
      <div class="card" style="margin-bottom:0;padding:16px 20px;background:linear-gradient(135deg,var(--primary-subtle),transparent 70%);border-color:var(--primary-border);position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--primary),transparent)"></div>
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px">Pedidos Pendentes</div>
        <div style="display:flex;align-items:baseline;gap:10px">
          <span class="mono" style="font-size:32px;font-weight:700;color:var(--primary);line-height:1">${pedidosPendentes.length}</span>
          <span class="mono" style="font-size:16px;color:var(--text-secondary)">${fmt(totalPedidosPendentes)}</span>
        </div>
        ${pedidosPendentes.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:10px">${pedidosPendentes.slice(0,4).map(o=>{const c=state.clients.find(cl=>cl.id==o.clientId);return `<span style="font-size:10px;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:2px 6px;color:var(--text-secondary)">${c?.name?.substring(0,10)||'—'}</span>`;}).join('')}</div>`:'<div style="font-size:12px;color:var(--text-muted);margin-top:6px">Nenhum pedido pendente</div>'}
      </div>
      <div class="card" onclick="navigate('produtos')" style="margin-bottom:0;padding:16px 20px;cursor:pointer;min-width:130px;text-align:center;border-color:${lowStock.length?'rgba(245,158,11,.3)':'var(--border)'}">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px">Estoque Baixo</div>
        <div style="font-size:36px;font-weight:700;color:${lowStock.length?'var(--warning)':'var(--success)'};line-height:1">${lowStock.length}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px">produto${lowStock.length!==1?'s':''}</div>
      </div>
    </div>

    <div class="card" style="padding:0;margin-bottom:0">
      <div style="display:flex;border-bottom:1px solid var(--border);padding:0 16px">
        ${['nfs','pedidos','financeiro'].map(t=>`<button style="padding:10px 14px;font-size:13px;font-weight:500;background:none;border:none;border-bottom:2px solid ${feedTab===t?'var(--primary)':'transparent'};color:${feedTab===t?'var(--primary)':'var(--text-muted)'};cursor:pointer;transition:color .15s" onclick="window._feedTab='${t}';renderDashboard()">${t==='nfs'?'<svg width="13" height="13" style="vertical-align:middle"><use href="#icon-file-text"/></svg> NFs':t==='pedidos'?'<svg width="13" height="13" style="vertical-align:middle"><use href="#icon-clipboard"/></svg> Pedidos':'<svg width="13" height="13" style="vertical-align:middle"><use href="#icon-credit-card"/></svg> Financeiro'}</button>`).join('')}
      </div>
      <div style="padding:4px 16px 12px">
        ${feedContent}
        ${pedidosPendentes.length>5||recentNF.length>5||recentRec.length>5?`<div style="text-align:center;padding:8px;font-size:12px;color:var(--primary);cursor:pointer;opacity:.8" onclick="navigate('${feedTab==='pedidos'?'pedidos':feedTab==='financeiro'?'contas':'notas'}')">Ver todos →</div>`:''}
      </div>
    </div>`;
}

// ─── NOTIFICATION SYSTEM ─────────────────────────────────────────────────────
window._notifications = window._notifications || [];

function addNotification(type, title, msg, actionLabel, actionFn) {
  if (window._notifications.some(n => n.title === title)) return;
  window._notifications.push({ id: Date.now(), type, title, msg, actionLabel, actionFn, read: false });
}

function clearNotifications() { window._notifications = []; }

function updateNotifBell() {
  const badge = document.getElementById('notif-badge');
  const n = window._notifications.length;
  if (badge) { badge.textContent = n; badge.style.display = n > 0 ? 'flex' : 'none'; }
}

function toggleNotifications(e) {
  e.stopPropagation();
  const dd = document.getElementById('notif-dropdown');
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  if (isOpen) { dd.classList.remove('open'); }
  else { renderNotifDropdown(); dd.classList.add('open'); }
}

function renderNotifDropdown() {
  const dd = document.getElementById('notif-dropdown');
  if (!dd) return;
  const notifs = window._notifications;
  const tipoIcone = { estoque:'📦', inadimplencia:'💰', vencimento:'📅', fiscal:'🧾', operacional:'⚙️' };
  const tipoCor = { estoque:'var(--warning)', inadimplencia:'var(--danger)', vencimento:'var(--warning)', fiscal:'var(--warning)', operacional:'var(--info)' };
  if (!notifs.length) { dd.innerHTML = '<div class="notif-empty">✅ Nenhuma notificação</div>'; return; }
  dd.innerHTML = notifs.map(n => `
    <div class="notif-item">
      <span class="notif-icon">${tipoIcone[n.type]||'📌'}</span>
      <div class="notif-body">
        <div class="notif-title" style="color:${tipoCor[n.type]||'var(--text)'}">${n.title}</div>
        <div class="notif-msg">${n.msg}</div>
        ${n.actionLabel?`<span class="notif-action" onclick="${n.actionFn}">→ ${n.actionLabel}</span>`:''}
      </div>
    </div>`).join('');
}

// Fecha dropdown ao clicar fora
document.addEventListener('click', (e) => {
  const dd = document.getElementById('notif-dropdown');
  const bell = document.getElementById('notif-bell');
  if (dd && dd.classList.contains('open') && !dd.contains(e.target) && e.target !== bell && !bell?.contains(e.target)) {
    dd.classList.remove('open');
  }
});

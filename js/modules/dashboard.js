// ─── DASHBOARD ───────────────────────────────────────────────────────────────
window._dashPeriod = window._dashPeriod || 'mes';

function renderFiscalBanner() {
  if (!needsBanner(state.company)) return '';
  const cfg = getBannerConfig(state.company);
  const isReadOnly = state.user?.role === 'visualizador' || state.user?.role === 'contador';
  const cta = isReadOnly ? '' :
    `<button class="btn-sm" onclick="${cfg.ctaAction}" style="margin-left:12px;flex-shrink:0">${cfg.ctaLabel}</button>`;
  return `<div style="background:rgba(245,158,11,.1);border-bottom:1px solid rgba(245,158,11,.3);padding:8px 16px;display:flex;align-items:center;gap:8px;font-size:13px">
    <span>${cfg.icone}</span>
    <span style="flex:1">${cfg.texto}</span>
    ${cta}
  </div>`;
}

// ─── NOTIFICATION SYSTEM ─────────────────────────────────────────────────────
window._notifications = window._notifications || [];

function addNotification(type, title, msg, actionLabel, actionFn) {
  // Evita duplicatas (mesmo título)
  if (window._notifications.some(n => n.title === title)) return;
  window._notifications.push({ id: Date.now(), type, title, msg, actionLabel, actionFn, read: false });
}

function clearNotifications() {
  window._notifications = [];
}

function updateNotifBell() {
  const badge = document.getElementById('notif-badge');
  const n = window._notifications.length;
  if (badge) {
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }
}

function toggleNotifications(e) {
  e.stopPropagation();
  const dd = document.getElementById('notif-dropdown');
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  if (isOpen) {
    dd.classList.remove('open');
  } else {
    renderNotifDropdown();
    dd.classList.add('open');
  }
}

function renderNotifDropdown() {
  const dd = document.getElementById('notif-dropdown');
  if (!dd) return;
  const notifs = window._notifications;

  const tipoIcone = {
    estoque: '📦', inadimplencia: '💰', vencimento: '📅', fiscal: '🧾', operacional: '⚙️'
  };
  const tipoCor = {
    estoque: 'var(--amber)', inadimplencia: 'var(--red)', vencimento: 'var(--amber)', fiscal: 'var(--amber)', operacional: 'var(--blue)'
  };

  if (!notifs.length) {
    dd.innerHTML = '<div class="notif-empty">✅ Nenhuma notificação</div>';
    return;
  }

  dd.innerHTML = notifs.map(n => `
    <div class="notif-item">
      <span class="notif-icon">${tipoIcone[n.type] || '📌'}</span>
      <div class="notif-body">
        <div class="notif-title" style="color:${tipoCor[n.type] || 'var(--text)'}">${n.title}</div>
        <div class="notif-msg">${n.msg}</div>
        ${n.actionLabel ? `<span class="notif-action" onclick="${n.actionFn}">→ ${n.actionLabel}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// Fecha dropdown ao clicar fora
document.addEventListener('click', (e) => {
  const dd = document.getElementById('notif-dropdown');
  const bell = document.getElementById('notif-bell');
  if (dd && dd.classList.contains('open') && !dd.contains(e.target) && e.target !== bell && !bell?.contains(e.target)) {
    dd.classList.remove('open');
  }
});

function renderDashboard(){
  const period = window._dashPeriod || 'mes';
  const now = new Date();
  let dateFrom, dateTo = today();
  if(period === 'hoje'){
    dateFrom = today();
  } else if(period === 'semana'){
    const d = new Date(); d.setDate(d.getDate()-6);
    dateFrom = d.toISOString().slice(0,10);
  } else if(period === 'mes'){
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  } else if(period === 'mesant'){
    const y = now.getMonth()===0?now.getFullYear()-1:now.getFullYear();
    const m = now.getMonth()===0?11:now.getMonth()-1;
    dateFrom = new Date(y,m,1).toISOString().slice(0,10);
    dateTo = new Date(y,m+1,0).toISOString().slice(0,10);
  }
  const nfsPeriod = state.invoices.filter(n=>n.status!=="cancelada"&&n.date>=dateFrom&&n.date<=dateTo);
  const totalVendas = nfsPeriod.reduce((s,n)=>s+n.total,0);
  const totalNFs = nfsPeriod.length;
  const tIn=totalIn(), tOut=totalOut(), saldo=tIn-tOut;
  const overdueRec=state.receivables.filter(r=>r.status==="aberta"&&isOverdue(r.dueDate));
  const aReceber=state.receivables.filter(r=>r.status==="aberta").reduce((s,r)=>s+r.amount,0);
  const inadMap={};
  overdueRec.forEach(r=>{ inadMap[r.clientId]=(inadMap[r.clientId]||0)+r.amount; });
  const top3inad=Object.entries(inadMap).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([cid,val])=>({client:state.clients.find(c=>c.id==cid),val}));
  const next7 = new Date(); next7.setDate(next7.getDate()+7);
  const next7str = next7.toISOString().slice(0,10);
  const vencendo = state.receivables.filter(r=>r.status==="aberta"&&!isOverdue(r.dueDate)&&r.dueDate<=next7str);
  const vencendoVal = vencendo.reduce((s,r)=>s+r.amount,0);
  const lowStock=state.products.filter(p=>p.active!==false&&p.stock<=p.minStock);
  const recentNF=[...state.invoices].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  
  // ─── Popula notificações ──────────────────────────────────────────────────
  clearNotifications();
  if (lowStock.length) {
    const names = lowStock.map(p => `${escapeHtml(p.name)} (${p.stock} ${p.unit||'UN'})`).join(', ');
    addNotification('estoque', `${lowStock.length} produto(s) com estoque baixo`,
      names.substring(0, 120) + (names.length > 120 ? '...' : ''),
      'Ver produtos', "navigate('produtos');toggleNotifications(new Event('click'))");
  }
  if (overdueRec.length) {
    const totalVenc = overdueRec.reduce((s,r)=>s+r.amount,0);
    addNotification('inadimplencia', `${overdueRec.length} parcela(s) vencida(s)`,
      `Total vencido: ${fmt(totalVenc)}. Clique para ver contas a receber.`,
      'Ver contas', "navigate('contas');toggleNotifications(new Event('click'))");
  }
  if (vencendo.length) {
    addNotification('vencimento', `${vencendo.length} parcela(s) vencendo em 7 dias`,
      `Total a vencer: ${fmt(vencendoVal)}.`,
      'Ver contas', "navigate('contas');toggleNotifications(new Event('click'))");
  }
  updateNotifBell();

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

  el("content").innerHTML = renderFiscalBanner() + `
    ${onboardingHtml}
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn-sm${period==='hoje'?' btn-amber':''}" onclick="window._dashPeriod='hoje';renderDashboard()">Hoje</button>
      <button class="btn-sm${period==='semana'?' btn-amber':''}" onclick="window._dashPeriod='semana';renderDashboard()">7 dias</button>
      <button class="btn-sm${period==='mes'?' btn-amber':''}" onclick="window._dashPeriod='mes';renderDashboard()">Este mês</button>
      <button class="btn-sm${period==='mesant'?' btn-amber':''}" onclick="window._dashPeriod='mesant';renderDashboard()">Mês anterior</button>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Vendas do Período</div><div class="kpi-value">${fmt(totalVendas)}</div><div class="kpi-sub">${totalNFs} notas</div></div>
      <div class="kpi"><div class="kpi-label">Saldo em Caixa</div><div class="kpi-value" style="color:${saldo>=0?"var(--green)":"var(--red)"}">${fmt(saldo)}</div><div class="kpi-sub">Entradas − Saídas</div></div>
      <div class="kpi"><div class="kpi-label">A Receber (total aberto)</div><div class="kpi-value text-amber">${fmt(aReceber)}</div><div class="kpi-sub">${state.receivables.filter(r=>r.status==="aberta").length} parcelas em aberto</div></div>
      <div class="kpi"><div class="kpi-label">Vencidas</div><div class="kpi-value text-red">${fmt(overdueRec.reduce((s,r)=>s+r.amount,0))}</div><div class="kpi-sub">${overdueRec.length} parcela(s) vencida(s)</div></div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="section-title" style="margin-bottom:14px">Top Inadimplentes</div>
        ${top3inad.length
          ? top3inad.map(({client,val})=>`<div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
              <div style="font-size:13px;color:var(--text2)">${client?client.name:"—"}</div>
              <span class="badge bg-red">${fmt(val)}</span>
            </div>`).join("")
          : `<div style="color:var(--green);font-size:13px;padding:8px 0">Nenhuma inadimplência no momento</div>`}
      </div>
      <div class="card">
        <div class="section-title" style="margin-bottom:8px">A vencer nos próximos 7 dias</div>
        <div class="kpi-value text-amber" style="font-size:22px;margin-bottom:12px">${fmt(vencendoVal)}</div>
        ${vencendo.slice(0,5).map(r=>{const c=state.clients.find(cl=>cl.id==r.clientId);return`<div class="row-between" style="padding:6px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-size:12px;color:var(--text2)">${c?c.name:"—"}</div><div class="text-muted" style="font-size:11px">${fmtDate(r.dueDate)}</div></div>
          <div class="mono" style="font-size:12px">${fmt(r.amount)}</div>
        </div>`;}).join("")}
        ${vencendo.length===0?`<div class="text-muted" style="font-size:13px">Nenhuma parcela vencendo em 7 dias</div>`:""}
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="section-title" style="margin-bottom:14px">Últimas Notas</div>
      <table><thead><tr><th>Número</th><th>Data</th><th>Total</th><th>Status</th></tr></thead><tbody>
        ${recentNF.map(n=>`<tr class="${n.status==="cancelada"?"cancelled-row":""}">
          <td class="mono text-amber">${n.number}</td><td>${fmtDate(n.date)}</td>
          <td class="mono">${fmt(n.total)}</td>
          <td><span class="badge ${n.status==="paga"?"bg-green":n.status==="parcial"?"bg-blue":n.status==="cancelada"?"bg-gray":"bg-amber"}">${n.status}</span></td>
        </tr>`).join("")}
      </tbody></table>
    </div>`;
}

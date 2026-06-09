// ─── CONTAS ──────────────────────────────────────────────────────────────────
var _contasRecSort = initSort('vencimento','asc');
var _contasPagSort = initSort('vencimento','asc');

function contasRecSortBy(col){
  if(_contasRecSort.col===col) _contasRecSort.dir=_contasRecSort.dir==="asc"?"desc":"asc";
  else { _contasRecSort.col=col; _contasRecSort.dir="asc"; }
  renderContas();
}
function contasPagSortBy(col){
  if(_contasPagSort.col===col) _contasPagSort.dir=_contasPagSort.dir==="asc"?"desc":"asc";
  else { _contasPagSort.col=col; _contasPagSort.dir="asc"; }
  renderContas();
}

function renderContas(){
  const tab=state.contasTab||"receber";
  const recAbertas=state.receivables.filter(r=>r.status==="aberta");
  const payAbertas=state.payables.filter(p=>p.status==="aberta");
  const totalRec=recAbertas.reduce((s,r)=>s+r.amount,0);
  const totalPay=payAbertas.reduce((s,p)=>s+p.amount,0);
  const overdueRec=recAbertas.filter(r=>isOverdue(r.dueDate));
  const overduePay=payAbertas.filter(p=>isOverdue(p.dueDate));

  const fOverdue=(el("contas-f-overdue")||{}).checked||false;
  let tableHTML="";
  if(tab==="receber"){
    var sortedRec=[...state.receivables];
    if(fOverdue) sortedRec=sortedRec.filter(r=>isOverdue(r.dueDate)&&r.status==="aberta");
    sortedRec=sortData(sortedRec, _contasRecSort, {
      nota: r=>r.invoiceNumber,
      parcela: r=>String(r.installment),
      cliente: r=>{var c=getClient(r.clientId);return c?c.name:'';},
      vencimento: r=>r.dueDate,
      atraso: r=>isOverdue(r.dueDate)&&r.status==="aberta"?Math.floor((new Date()-new Date(r.dueDate+'T00:00:00'))/86400000):0,
      valor: r=>r.amount,
      status: r=>r.status
    });
    const aging = {
      corrente: recAbertas.filter(r=>!isOverdue(r.dueDate)).reduce((s,r)=>s+r.amount,0),
      ate30: overdueRec.filter(r=>{ const d=Math.floor((new Date()-new Date(r.dueDate+'T00:00:00'))/86400000); return d>=1&&d<=30; }).reduce((s,r)=>s+r.amount,0),
      de31a60: overdueRec.filter(r=>{ const d=Math.floor((new Date()-new Date(r.dueDate+'T00:00:00'))/86400000); return d>=31&&d<=60; }).reduce((s,r)=>s+r.amount,0),
      acima60: overdueRec.filter(r=>{ const d=Math.floor((new Date()-new Date(r.dueDate+'T00:00:00'))/86400000); return d>60; }).reduce((s,r)=>s+r.amount,0),
    };
    tableHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
        <div class="kpi" style="padding:12px"><div class="kpi-label" style="font-size:10px">Em dia</div><div class="kpi-value text-green" style="font-size:16px">${fmt(aging.corrente)}</div></div>
        <div class="kpi" style="padding:12px"><div class="kpi-label" style="font-size:10px">Venc. 1–30d</div><div class="kpi-value text-amber" style="font-size:16px">${fmt(aging.ate30)}</div></div>
        <div class="kpi" style="padding:12px"><div class="kpi-label" style="font-size:10px">Venc. 31–60d</div><div class="kpi-value" style="font-size:16px;color:var(--amber)">${fmt(aging.de31a60)}</div></div>
        <div class="kpi" style="padding:12px"><div class="kpi-label" style="font-size:10px">Venc. +60d</div><div class="kpi-value text-red" style="font-size:16px">${fmt(aging.acima60)}</div></div>
      </div>
      <table><thead><tr><th onclick="contasRecSortBy('nota')" style="cursor:pointer;user-select:none;white-space:nowrap">Nota${sortIcon(_contasRecSort,'nota')}</th><th onclick="contasRecSortBy('parcela')" style="cursor:pointer;user-select:none;white-space:nowrap">Parcela${sortIcon(_contasRecSort,'parcela')}</th><th onclick="contasRecSortBy('cliente')" style="cursor:pointer;user-select:none;white-space:nowrap">Cliente${sortIcon(_contasRecSort,'cliente')}</th><th onclick="contasRecSortBy('vencimento')" style="cursor:pointer;user-select:none;white-space:nowrap">Vencimento${sortIcon(_contasRecSort,'vencimento')}</th><th onclick="contasRecSortBy('atraso')" style="cursor:pointer;user-select:none;white-space:nowrap">Atraso${sortIcon(_contasRecSort,'atraso')}</th><th onclick="contasRecSortBy('valor')" style="cursor:pointer;user-select:none;white-space:nowrap">Valor${sortIcon(_contasRecSort,'valor')}</th><th onclick="contasRecSortBy('status')" style="cursor:pointer;user-select:none;white-space:nowrap">Status${sortIcon(_contasRecSort,'status')}</th><th></th></tr></thead><tbody>
        ${sortedRec.map(r=>{const c=getClient(r.clientId);const overdue=isOverdue(r.dueDate)&&r.status==="aberta";const daysLate=(overdue&&r.status==="aberta")?Math.floor((new Date()-new Date(r.dueDate+'T00:00:00'))/86400000):0;return`<tr>
          <td class="mono text-amber">${r.invoiceNumber}</td>
          <td class="mono">${r.installment}/${r.total}${r.isSaldo?` <span class="badge bg-amber" style="font-size:10px">saldo</span>`:""}</td>
          <td class="text-white">${c?c.name:"—"}</td>
          <td class="mono ${overdue?"text-red":""}">${fmtDate(r.dueDate)}${overdue?" ⚠":""}</td>
          <td class="mono ${overdue&&r.status==='aberta'?'text-red':'text-muted'}">${overdue&&r.status==='aberta'?daysLate+'d':'—'}</td>
          <td class="mono fw-bold">${fmt(r.amount)}</td>
          <td><span class="badge ${r.status==="paga"?"bg-green":r.status==="cancelada"?"bg-gray":overdue?"bg-red":"bg-amber"}">${r.status==="aberta"&&overdue?"vencida":r.status}</span></td>
          <td>${r.status==="aberta"?`<button class="btn-sm btn-green" onclick="payReceivable(${r.id})">Receber</button>${state?.company?.asaasKey?`<button class="btn-sm" style="background:#6366f1;color:#fff;margin-left:3px" onclick="cobrar(${r.id},'PIX')"><svg width="14" height="14" style="vertical-align:middle"><use href="#icon-smartphone"/></svg></button><button class="btn-sm" style="background:#0ea5e9;color:#fff;margin-left:2px" onclick="cobrar(${r.id},'BOLETO')"><svg width="14" height="14" style="vertical-align:middle"><use href="#icon-file-text"/></svg></button>`:''}`:`<span class="text-muted mono" style="font-size:11px">${r.paidAt?fmtDate(r.paidAt):""}</span>`}</td>
        </tr>`}).join('')||emptyState('credit-card','Nenhuma conta encontrada','Todas as contas a receber e a pagar aparecerao aqui.','','');}
      </tbody></table>`;
  } else {
    var sortedPag=[...state.payables];
    if(fOverdue) sortedPag=sortedPag.filter(p=>isOverdue(p.dueDate)&&p.status==="aberta");
    sortedPag=sortData(sortedPag, _contasPagSort, {
      compra: p=>p.purchaseNumber||p.description,
      parcela: p=>String(p.installment),
      fornecedor: p=>{var s=getSupplier(p.supplierId);return s?s.name:'';},
      vencimento: p=>p.dueDate,
      valor: p=>p.amount,
      status: p=>p.status
    });
    tableHTML=`
      <table><thead><tr><th onclick="contasPagSortBy('compra')" style="cursor:pointer;user-select:none;white-space:nowrap">Compra${sortIcon(_contasPagSort,'compra')}</th><th onclick="contasPagSortBy('parcela')" style="cursor:pointer;user-select:none;white-space:nowrap">Parcela${sortIcon(_contasPagSort,'parcela')}</th><th onclick="contasPagSortBy('fornecedor')" style="cursor:pointer;user-select:none;white-space:nowrap">Fornecedor${sortIcon(_contasPagSort,'fornecedor')}</th><th onclick="contasPagSortBy('vencimento')" style="cursor:pointer;user-select:none;white-space:nowrap">Vencimento${sortIcon(_contasPagSort,'vencimento')}</th><th onclick="contasPagSortBy('valor')" style="cursor:pointer;user-select:none;white-space:nowrap">Valor${sortIcon(_contasPagSort,'valor')}</th><th onclick="contasPagSortBy('status')" style="cursor:pointer;user-select:none;white-space:nowrap">Status${sortIcon(_contasPagSort,'status')}</th><th></th></tr></thead><tbody>
        ${sortedPag.map(p=>{const s=getSupplier(p.supplierId);const overdue=isOverdue(p.dueDate)&&p.status==="aberta";return`<tr>
          <td class="mono text-amber">${p.purchaseNumber||p.description}</td>
          <td class="mono">${p.installment}/${p.total}${p.isSaldo?` <span class="badge bg-amber" style="font-size:10px">saldo</span>`:""}</td>
          <td class="text-white">${s?s.name:"—"}</td>
          <td class="mono ${overdue?"text-red":""}">${fmtDate(p.dueDate)}${overdue?" ⚠":""}</td>
          <td class="mono fw-bold">${fmt(p.amount)}</td>
          <td><span class="badge ${p.status==="paga"?"bg-green":overdue?"bg-red":"bg-amber"}">${p.status==="aberta"&&overdue?"vencida":p.status}</span></td>
          <td>${p.status==="aberta"?`<button class="btn-sm btn-red" onclick="payPayable(${p.id})">Pagar</button>`:`<span class="text-muted mono" style="font-size:11px">${p.paidAt?fmtDate(p.paidAt):""}</span>`}</td>
        </tr>`}).join('')||emptyState('credit-card','Nenhuma conta encontrada','Todas as contas a receber e a pagar aparecerao aqui.','','');}
      </tbody></table>`;
  }

  el("content").innerHTML=`
    <div class="kpi-grid-2" style="margin-bottom:20px">
      <div class="kpi"><div class="kpi-label">A Receber (em aberto)</div>
        <div class="kpi-value text-green">${fmt(totalRec)}</div>
        <div class="kpi-sub">${recAbertas.length} parcelas · ${overdueRec.length} vencida(s)</div>
      </div>
      <div class="kpi"><div class="kpi-label">A Pagar (em aberto)</div>
        <div class="kpi-value text-red">${fmt(totalPay)}</div>
        <div class="kpi-sub">${payAbertas.length} parcelas · ${overduePay.length} vencida(s)</div>
      </div>
    </div>
    <div class="row-between" style="margin-bottom:12px">
      <div class="tabs" style="margin-bottom:0;border-bottom:none">
        <div class="tab ${tab==="receber"?"active":""}" onclick="state.contasTab='receber';renderContas()">A Receber (${recAbertas.length})</div>
        <div class="tab ${tab==="pagar"?"active":""}" onclick="state.contasTab='pagar';renderContas()">A Pagar (${payAbertas.length})</div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer">
        <input type="checkbox" id="contas-f-overdue" onchange="renderContas()" ${fOverdue?"checked":""}> Só vencidas
      </label>
    </div>
    <div class="card">${tableHTML}</div>`;
}
function payReceivable(id){
  const r=state.receivables.find(x=>x.id===id);
  if(!r||r.status!=="aberta") return;
  const c=getClient(r.clientId);
  const overdue=isOverdue(r.dueDate);
  showModal(`<div class="modal-title">Registrar Recebimento</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
      Cliente: <b style="color:var(--text)">${c?c.name:"—"}</b> &nbsp;|&nbsp;
      NF: <b style="color:var(--amber)">${r.invoiceNumber}</b> &nbsp;|&nbsp;
      Parcela: <b>${r.installment}/${r.total}</b>
    </div>
    ${overdue?`<div class="alert-red">⚠ Parcela vencida desde ${fmtDate(r.dueDate)}</div>`:""}
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Data de Recebimento</label>
        <input id="pr-date" type="date" class="form-input" value="${today()}">
      </div>
      <div class="form-group"><label class="form-label">Valor a Receber (R$) <span class="text-muted" style="font-size:10px">— reduza para pagamento parcial</span></label>
        <input id="pr-amt" type="number" step="0.01" min="0.01" class="form-input" value="${r.amount}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background:var(--green)" onclick="confirmarPayReceivable(${id})">✓ Confirmar Recebimento</button>
    </div>`);
}
async function confirmarPayReceivable(id){
  if(!_guardSave()) return;
  const r=state.receivables.find(x=>x.id===id);
  if(!r||r.status!=="aberta"){ _doneSave(); return; }
  const payDate=el("pr-date").value||today();
  const amt=parseFloat(el("pr-amt").value)||r.amount;
  if(amt<r.amount-0.01){
    const remainder=parseFloat((r.amount-amt).toFixed(2));
    state.receivables.push({...r,id:uid(),amount:remainder,paidAt:null,status:"aberta",installment:r.total+1,total:r.total+1,isSaldo:true});
    r.amount=parseFloat(amt.toFixed(2));
  }
  r.status="paga"; r.paidAt=payDate;
  state.transactions.push({id:uid(),date:payDate,type:"entrada",category:"Vendas",description:`Recebimento ${r.installment}/${r.total} ${r.invoiceNumber}`,amount:parseFloat(amt.toFixed(2))});
  const nfRecs=state.receivables.filter(x=>x.invoiceId===r.invoiceId&&x.status!=="cancelada");
  const allPaid=nfRecs.every(x=>x.status==="paga");
  const anyPaid=nfRecs.some(x=>x.status==="paga");
  const nf=state.invoices.find(x=>x.id===r.invoiceId);
  if(nf) nf.status=allPaid?"paga":anyPaid?"parcial":"emitida";
  try{ await saveToFirebase(); closeModal(); renderContas(); showSyncStatus(`✓ Recebimento de ${fmt(parseFloat(amt.toFixed(2)))} registrado`); }
  finally{ _doneSave(); }
}
function payPayable(id){
  const p=state.payables.find(x=>x.id===id);
  if(!p||p.status!=="aberta") return;
  const s=getSupplier(p.supplierId);
  const overdue=isOverdue(p.dueDate);
  showModal(`<div class="modal-title">Registrar Pagamento</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
      Fornecedor: <b style="color:var(--text)">${s?s.name:"—"}</b> &nbsp;|&nbsp;
      Compra: <b style="color:var(--amber)">${p.purchaseNumber||p.description}</b> &nbsp;|&nbsp;
      Parcela: <b>${p.installment}/${p.total}</b>
    </div>
    ${overdue?`<div class="alert-red">⚠ Parcela vencida desde ${fmtDate(p.dueDate)}</div>`:""}
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Data de Pagamento</label>
        <input id="pp-date" type="date" class="form-input" value="${today()}">
      </div>
      <div class="form-group"><label class="form-label">Valor a Pagar (R$) <span class="text-muted" style="font-size:10px">— reduza para pagamento parcial</span></label>
        <input id="pp-amt" type="number" step="0.01" min="0.01" class="form-input" value="${p.amount}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background:var(--green)" onclick="confirmarPayPayable(${id})">✓ Confirmar Pagamento</button>
    </div>`);
}
async function confirmarPayPayable(id){
  if(!_guardSave()) return;
  const p=state.payables.find(x=>x.id===id);
  if(!p||p.status!=="aberta"){ _doneSave(); return; }
  const payDate=el("pp-date").value||today();
  const amt=parseFloat(el("pp-amt").value)||p.amount;
  if(amt<p.amount-0.01){
    const remainder=parseFloat((p.amount-amt).toFixed(2));
    state.payables.push({...p,id:uid(),amount:remainder,paidAt:null,status:"aberta",installment:p.total+1,total:p.total+1,isSaldo:true});
    p.amount=parseFloat(amt.toFixed(2));
  }
  p.status="paga"; p.paidAt=payDate;
  const sup=getSupplier(p.supplierId);
  state.transactions.push({id:uid(),date:payDate,type:"saida",category:"Compras",description:`Pagamento ${p.installment}/${p.total} ${p.purchaseNumber||p.description}${sup?" — "+sup.name:""}`,amount:parseFloat(amt.toFixed(2))});
  const compraId=p.purchaseId;
  const allPays=state.payables.filter(x=>x.purchaseId==compraId&&x.status!=="cancelada");
  const allPaid=allPays.every(x=>x.status==="paga");
  const anyPaid=allPays.some(x=>x.status==="paga");
  const compra=state.purchases.find(x=>x.id==compraId);
  if(compra) compra.status=allPaid?"paga":anyPaid?"parcial":"a pagar";
  try{ await saveToFirebase(); closeModal(); renderContas(); showSyncStatus(`✓ Pagamento de ${fmt(parseFloat(amt.toFixed(2)))} registrado`); }
  finally{ _doneSave(); }
}

async function cobrar(id, tipo) {
  if (!state?.company?.asaasKey) return alert('Configure a chave Asaas em Configurações → Financeiro.');
  const r = state.receivables.find(x => x.id === id);
  if (!r) return;
  const client = getClient(r.clientId);
  if (!client?.cnpj) return alert('Cliente sem CPF/CNPJ cadastrado. Adicione o documento em Cadastros → Clientes.');

  const btns = document.querySelectorAll(`[onclick*="cobrar(${id},'${tipo}')"]`);
  btns.forEach(b => b.disabled = true);

  try {
    const result = await asaasGerarCobranca(r, client, tipo);

    const pixHtml = `
      ${result.pixImage ? `<div style="text-align:center;margin:12px 0"><img src="data:image/png;base64,${result.pixImage}" style="width:180px;height:180px;border-radius:8px"></div>` : ''}
      <div class="form-group">
        <label class="form-label">Pix Copia e Cola</label>
        <textarea class="form-input" rows="3" readonly onclick="this.select()" style="font-size:11px;font-family:monospace">${result.pixCopiaCola}</textarea>
      </div>
      <button class="btn btn-secondary" data-copy="${(result.pixCopiaCola||'').replace(/"/g,'&quot;')}" onclick="copyFromDataAttr(this)"><svg width="14" height="14" style="vertical-align:middle"><use href="#icon-clipboard"/></svg> Copiar chave Pix</button>`;

    const boletoHtml = `
      <div class="form-group">
        <label class="form-label">Linha Digitável</label>
        <textarea class="form-input" rows="2" readonly onclick="this.select()" style="font-size:11px;font-family:monospace">${result.linhaDigitavel||''}</textarea>
      </div>
      <button class="btn btn-secondary" data-copy="${(result.linhaDigitavel||'').replace(/"/g,'&quot;')}" onclick="copyFromDataAttr(this)"><svg width="14" height="14" style="vertical-align:middle"><use href="#icon-clipboard"/></svg> Copiar código</button>
      ${result.boletoUrl ? `<a href="${result.boletoUrl}" target="_blank" class="btn btn-secondary" style="margin-left:6px"><svg width="14" height="14" style="vertical-align:middle"><use href="#icon-printer"/></svg> Imprimir boleto</a>` : ''}`;

    showModal(`
      <div class="modal-title">${tipo==='PIX'?'📱 Pix Gerado':'🏦 Boleto Gerado'}</div>
      <p style="font-size:13px;color:var(--muted)">${client.name} — ${fmt(r.amount)} — venc. ${fmtDate(r.dueDate)}</p>
      ${tipo==='PIX' ? pixHtml : boletoHtml}
      <div class="modal-footer" style="margin-top:14px;gap:8px">
        ${result.invoiceUrl ? `<a href="${result.invoiceUrl}" target="_blank" class="btn btn-secondary"><svg width="14" height="14" style="vertical-align:middle"><use href="#icon-link"/></svg> Ver fatura online</a>` : ''}
        <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
      </div>`);
  } catch(e) {
    alert(`Erro ao gerar cobrança: ${e.message}`);
  } finally {
    btns.forEach(b => b.disabled = false);
  }
}

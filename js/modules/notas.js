// ─── NOTA FISCAL ─────────────────────────────────────────────────────────────
function renderNotas(){
  const nfMonths=new Set();
  state.invoices.forEach(n=>{ if(n.date) nfMonths.add(n.date.slice(0,7)); });
  const sortedNfMonths=[...nfMonths].sort().reverse();
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Notas Fiscais</div>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <input id="nf-f-search" class="form-input" style="width:160px" placeholder="Buscar NF/cliente..." oninput="filterNotas()">
        <select id="nf-f-status" class="form-input" style="width:130px" onchange="filterNotas()">
          <option value="">Todos status</option>
          <option value="emitida">Emitida</option>
          <option value="paga">Paga</option>
          <option value="parcial">Parcial</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select id="nf-f-period" class="form-input" style="width:150px" onchange="filterNotas()">
          <option value="">Todos os meses</option>
          ${sortedNfMonths.map(m=>{const [y,mo]=m.split("-");const ml=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(mo)-1];return`<option value="${m}">${ml}/${y}</option>`;}).join("")}
        </select>
        <button class="btn btn-primary" onclick="openNFModal()">+ Nova Nota Fiscal</button>
        <button class="btn btn-ghost" style="padding:8px 12px;font-size:12px" onclick="renderNFeRecebidas()" title="NFs emitidas contra seu CNPJ">📥 Recebidas</button>
        <button class="btn btn-ghost" style="padding:8px 12px;font-size:12px" onclick="inutilizarNumeracaoModal()" title="Inutilizar faixa de numeração">🔢 Inutilizar</button>
        <button class="btn btn-ghost" style="padding:8px 12px;font-size:12px" onclick="importarNFeModal()" title="Importar NF de outro sistema">📄 Importar</button>
      </div>
    </div>
    <div class="card" style="overflow-x:auto"><table><thead><tr>
      ${[["number","Número"],["date","Data"],["clientId","Cliente"],["total","Total"],["","Pagamento"],["","Status"],["","Ações"]].map(([col,lbl])=>col?`<th style="cursor:pointer;user-select:none;white-space:nowrap" onclick="nfSortBy('${col}')">${lbl}${sortIcon(_nfSort, col)}</th>`:`<th>${lbl}</th>`).join("")}
    </tr></thead><tbody id="nf-tbody"></tbody></table></div>`;
  filterNotas();
}
function nfSortBy(col){
  if(_nfSort.col===col) _nfSort.dir=_nfSort.dir==="asc"?"desc":"asc";
  else { _nfSort.col=col; _nfSort.dir="desc"; }
  renderNotas();
}
function filterNotas(){
  const fSearch=norm((el("nf-f-search")||{}).value||"");
  const fStatus=(el("nf-f-status")||{}).value||"";
  const fPeriod=(el("nf-f-period")||{}).value||"";
  const tbody=el("nf-tbody"); if(!tbody) return;
  var filtered=[...state.invoices]
    .filter(n=>(!fStatus||n.status===fStatus)&&(!fPeriod||n.date?.startsWith(fPeriod))&&(!fSearch||norm(n.number).includes(fSearch)||norm(getClient(n.clientId)?.name).includes(fSearch)));
  var sorted=sortData(filtered, _nfSort, {
    number: n=>n.number,
    date: n=>n.date,
    clientId: n=>{var c=getClient(n.clientId);return c?c.name:'';},
    total: n=>n.total
  });
  tbody.innerHTML=sorted.length?sorted.map(n=>{
    const c=getClient(n.clientId);
    const statusColor={paga:"bg-green",parcial:"bg-blue",emitida:"bg-amber",cancelada:"bg-gray"}[n.status]||"bg-gray";
    return`<tr class="${n.status==="cancelada"?"cancelled-row":""}">
      <td class="mono text-amber">${n.number}</td>
      <td>${fmtDate(n.date)}</td>
      <td class="text-white fw-bold">${getNFClientName(n)}</td>
      <td class="mono fw-bold">${fmt(n.total)}${n.discount>0?`<span class="text-muted" style="font-size:11px;margin-left:4px" title="Desconto de ${n.discount}% = ${fmt(n.subtotal*n.discount/100)}">-${n.discount}%</span>`:""}</td>
      <td><span class="badge bg-blue" style="font-size:10px">${n.paymentTerms}</span></td>
      <td><span class="badge ${statusColor}">${n.status==="emitida"?"pendente":n.status}</span></td>
      <td><div class="row">
        <button class="btn-sm btn-amber" onclick="viewNF(${n.id})">Ver</button>
        <button class="btn-sm" onclick="printNF(${n.id})" title="Imprimir"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>
        ${n.danfeUrl?`<a href="${n.danfeUrl}" target="_blank" class="btn-sm" style="background:var(--blue);color:#fff;text-decoration:none">DANFE</a>`:''}
        ${(n.status==="emitida"||n.status==="parcial")?`<button class="btn-sm btn-green" onclick="darBaixaNF(${n.id})">↓ Receber</button>`:""}
        ${n.status!=="cancelada"&&n.status!=="paga"?`<button class="btn-sm btn-red" onclick="cancelNF(${n.id})">Cancelar</button>`:""}
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="7" class="empty">Nenhuma nota encontrada.</td></tr>`;
}

async function openNFModal(){
  state.nfItems=[];
  state.nfCosts=[];
  const nextNum=await getNextNFNumber();
  showModal(`
    <div class="modal-title">Emitir Nota Fiscal — <span class="text-amber mono">${nextNum}</span></div>
    <div class="form-grid-2">
      <div class="form-group" style="position:relative">
        <label class="form-label">Cliente</label>
        <input id="nf-client-search" class="form-input" placeholder="Buscar por nome, CNPJ ou cidade..." oninput="nfClientSearch(this.value)" autocomplete="off" style="padding-right:32px">
        <div id="nf-client-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;z-index:200;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.4)"></div>
        <input id="nf-client" type="hidden" value="">
        <div id="nf-client-selected" style="display:none;margin-top:6px;padding:6px 10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:6px;font-size:12px;display:flex;justify-content:space-between;align-items:center">
          <span id="nf-client-selected-name" style="color:var(--amber);font-weight:600"></span>
          <span style="cursor:pointer;color:var(--muted);font-size:11px" onclick="nfClientClear()">✕ trocar</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button type="button" class="btn-sm" onclick="nfClientAvulso()" style="font-size:11px">+ Consumidor Final (avulso)</button>
          <button type="button" class="btn-sm btn-amber" onclick="nfClientNovo()" style="font-size:11px">+ Novo cliente</button>
        </div>
        <div id="nf-credit-alert" class="alert-red" style="display:none"></div>
      </div>
      <div class="form-group"><label class="form-label">Data de Emissão</label>
        <input id="nf-date" type="date" class="form-input" value="${today()}" onclick="this.showPicker?.()">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Condição de Pagamento</label>
        <select id="nf-terms" class="form-input">
          ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Forma de Pagamento</label>
        <select id="nf-method" class="form-input">
          <option value="">Não informado</option>
          ${PAY_METHODS.map(m=>`<option>${m}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
        <input id="nf-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="0" oninput="nfUpdateTotals()">
      </div>
      <div class="form-group">
        <label class="form-label">Frete (R$) — Quem paga?</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="nf-freight-val" type="number" min="0" step="0.01" class="form-input" value="0" oninput="nfFreightUpdate()" style="flex:1">
          <div style="display:flex;border:1px solid var(--border2);border-radius:6px;overflow:hidden;flex-shrink:0">
            <button id="nf-ft-cli" type="button" class="nf-ft-btn nf-ft-active" onclick="nfFreightWho('cli')" title="Frete incluso na NF — cliente paga">Cliente</button>
            <button id="nf-ft-emp" type="button" class="nf-ft-btn" onclick="nfFreightWho('emp')" title="Custo interno — não aparece na NF">Empresa</button>
          </div>
        </div>
        <div id="nf-freight-hint" style="font-size:11px;color:var(--muted);margin-top:4px">Incluso no valor da NF — cliente paga</div>
        <input id="nf-freight" type="hidden" value="0">
        <input id="nf-freight-int" type="hidden" value="0">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Observações <span class="text-muted" style="font-size:10px;font-weight:400">— aparece no PDF</span></label>
        <input id="nf-obs" class="form-input" placeholder="Observações da nota...">
      </div>
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">ITENS DA NOTA</div>
    <div style="display:flex;align-items:center;gap:8px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.25);border-radius:6px;padding:8px 12px;margin-bottom:8px">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v3M3 12v3M3 19v2M8 5v3M8 12v3M8 19v2M13 5v3M13 12v3M13 19v2M18 5v10M18 19v2M21 5v10M21 19v2"/></svg>
      <input id="nf-scan-ean" class="form-input" style="flex:1;background:transparent;border:none;outline:none;padding:0;font-family:var(--font-m);font-size:13px" placeholder="Scanner EAN — aponte e leia o código (Enter para adicionar)" onkeydown="scanKeyHandler(event,'nf')" autocomplete="off">
    </div>
    <div style="margin-bottom:10px">
      <input id="nf-prod-search" class="form-input" style="width:100%;margin-bottom:6px" placeholder="Buscar produto pelo nome..." oninput="nfRenderProdList(this.value)" autocomplete="off">
      <div id="nf-prod-list" style="max-height:210px;overflow-y:auto;border:1px solid var(--border);border-radius:6px"></div>
    </div>
    <div id="nf-items-list"></div>
    <div id="nf-totals"></div>
    <div class="divider"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:6px;cursor:pointer" onclick="toggleNfCosts()">
        <div style="font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.06em">CUSTOS E TAXAS ADICIONAIS</div>
        <span id="nf-costs-toggle" style="font-size:11px;color:var(--muted)">▸</span>
        <span style="font-size:10px;color:var(--muted);font-weight:400">(logística, embalagem, taxas — opcional)</span>
      </div>
      <button class="btn btn-ghost" id="nf-costs-add-btn" style="padding:3px 10px;font-size:12px;display:none" onclick="nfAddCost()">+ Adicionar</button>
    </div>
    <div id="nf-costs-list" style="display:none"></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      ${canEmitNFe(state.company)?`<button class="btn btn-ghost" onclick="previewDANFeModal()">👁 Pré-visualizar DANFe</button>`:''}
      <button class="btn btn-primary" onclick="emitirNF('${nextNum}')">Emitir Nota</button>
    </div>`,true);
  nfRenderItems();
  nfRenderProdList("");
  nfRenderCosts();
  setTimeout(()=>{ const s=el("nf-scan-ean"); if(s) s.focus(); },100);
}
function nfFreightWho(who){
  const val=parseFloat(el("nf-freight-val")?.value)||0;
  const hint=el("nf-freight-hint");
  const btnCli=el("nf-ft-cli"); const btnEmp=el("nf-ft-emp");
  if(who==='cli'){
    if(el("nf-freight")) el("nf-freight").value=val;
    if(el("nf-freight-int")) el("nf-freight-int").value=0;
    if(btnCli) btnCli.classList.add("nf-ft-active");
    if(btnEmp) btnEmp.classList.remove("nf-ft-active");
    if(hint) hint.textContent="Incluso no valor da NF — cliente paga";
  } else {
    if(el("nf-freight")) el("nf-freight").value=0;
    if(el("nf-freight-int")) el("nf-freight-int").value=val;
    if(btnCli) btnCli.classList.remove("nf-ft-active");
    if(btnEmp) btnEmp.classList.add("nf-ft-active");
    if(hint) hint.textContent="Custo interno — não aparece na NF do cliente";
  }
  nfUpdateTotals();
}
function nfFreightUpdate(){
  const who=el("nf-ft-emp")?.classList.contains("nf-ft-active")?'emp':'cli';
  nfFreightWho(who);
}
function toggleNfCosts(){
  const list=el("nf-costs-list"); const btn=el("nf-costs-add-btn"); const tog=el("nf-costs-toggle");
  if(!list) return;
  const open=list.style.display==='none';
  list.style.display=open?'block':'none';
  if(btn) btn.style.display=open?'':'none';
  if(tog) tog.textContent=open?'▾':'▸';
}
function nfAddCost(){
  if(!state.nfCosts) state.nfCosts=[];
  state.nfCosts.push({description:"",value:0,clientPays:true});
  const list=el("nf-costs-list");
  if(list&&list.style.display==='none') toggleNfCosts();
  nfRenderCosts();
}
function nfRemCost(i){
  state.nfCosts.splice(i,1);
  nfRenderCosts();
  nfRenderItems();
}
function nfCostChange(i,field,val){
  if(!state.nfCosts[i]) return;
  if(field==="value") state.nfCosts[i].value=Math.max(0, parseFloat(val)||0);
  else if(field==="description") state.nfCosts[i].description=val;
  else if(field==="clientPays") state.nfCosts[i].clientPays=val;
  nfRenderItems();
}
function nfRenderCosts(){
  const listEl=el("nf-costs-list"); if(!listEl) return;
  const costs=state.nfCosts||[];
  if(!costs.length){
    listEl.innerHTML=`<div style="color:var(--muted);font-size:13px;padding:6px 0;text-align:center">Nenhum custo adicional</div>`;
    return;
  }
  listEl.innerHTML=costs.map((c,i)=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
      <input class="form-input" style="flex:2;min-width:140px" placeholder="Descrição do custo" value="${(c.description||'').replace(/"/g,'&quot;')}" oninput="nfCostChange(${i},'description',this.value)">
      <input type="number" min="0" step="0.01" class="form-input" style="width:110px" placeholder="R$ 0,00" value="${c.value||''}" oninput="nfCostChange(${i},'value',this.value)">
      <label style="display:flex;align-items:center;gap:5px;color:var(--text2);font-size:12px;white-space:nowrap;cursor:pointer">
        <input type="checkbox" ${c.clientPays?"checked":""} onchange="nfCostChange(${i},'clientPays',this.checked)">
        <span>Cliente paga</span>
      </label>
      <span style="font-size:11px;color:var(--muted);white-space:nowrap">${c.clientPays?"→ entra no total da NF":"→ lança saída no caixa"}</span>
      <button class="btn-sm btn-red" onclick="nfRemCost(${i})">✕</button>
    </div>`).join("");
}
function nfRenderProdList(search){
  const listEl=el("nf-prod-list");
  if(!listEl) return;
  const q=norm(search||"");
  const prods=state.products.filter(p=>p.active!==false&&(!q||norm(p.name).includes(q)||(p.code&&norm(p.code).includes(q))));
  if(!prods.length){ listEl.innerHTML=`<div style="padding:14px;text-align:center;color:var(--muted);font-size:13px">Nenhum produto encontrado</div>`; return; }
  listEl.innerHTML=prods.map(p=>`
    <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border);background:var(--bg2);transition:background .1s" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='var(--bg2)'">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
        <div style="font-size:11px;color:var(--muted)">${p.unit} &nbsp;·&nbsp; Estoque: <span style="color:${p.stock>0?'var(--green)':'var(--red)'}">${p.stock}</span></div>
      </div>
      <div style="min-width:72px;text-align:right;color:var(--amber);font-size:13px;font-weight:600;flex-shrink:0">${fmt(p.salePrice)}</div>
      <input type="number" id="nf-row-qty-${p.id}" class="form-input" value="1" min="1" style="width:58px;padding:4px 6px;flex-shrink:0" title="Quantidade">
      <input type="number" id="nf-row-disc-${p.id}" class="form-input" value="0" min="0" max="100" style="width:52px;padding:4px 6px;flex-shrink:0" placeholder="Desc%">
      <button class="btn btn-primary" style="padding:4px 10px;font-size:12px;flex-shrink:0" id="nf-row-btn-${p.id}" onclick="nfAddItemFromList(${p.id})">+ Add</button>
    </div>`).join("");
}
function nfAddItemFromList(prodId){
  const p=getProd(prodId);
  if(!p) return;
  const qty=parseInt(el(`nf-row-qty-${prodId}`)?.value)||1;
  const disc=parseFloat(el(`nf-row-disc-${prodId}`)?.value)||0;
  const currentInCart=(state.nfItems.find(it=>it.productId===prodId)?.qty||0);
  const totalQty=currentInCart+qty;
  if(p.stock>=0 && totalQty>p.stock){
    if(!confirm(`Atenção: estoque disponível de "${p.name}" é ${p.stock} ${p.unit||'un'}, mas você está adicionando ${totalQty} no total. Continuar mesmo assim?`)) return;
  }
  const existing=state.nfItems.find(it=>it.productId===prodId);
  if(existing){ existing.qty+=qty; }
  else{ state.nfItems.push({productId:p.id,name:p.name,unit:p.unit||'UN',qty,price:p.salePrice,itemDiscount:disc}); }
  const qEl=el(`nf-row-qty-${prodId}`); if(qEl) qEl.value="1";
  const dEl=el(`nf-row-disc-${prodId}`); if(dEl) dEl.value="0";
  const btn=el(`nf-row-btn-${prodId}`);
  if(btn){ btn.textContent="✓ Adicionado"; btn.style.background="var(--green)"; setTimeout(()=>{ btn.textContent="+ Add"; btn.style.background=""; },900); }
  nfRenderItems();
}
function nfAddItem(){ /* legacy — kept for compatibility */ }
function nfRemItem(i){ state.nfItems.splice(i,1); nfRenderItems(); }
function nfEditItemQty(i, val){
  const qty=parseInt(val)||1;
  if(qty<1) return;
  if(state.nfItems[i]) state.nfItems[i].qty=qty;
  nfRenderItems();
}
function nfGetSubtotal(){ return state.nfItems.reduce((s,it)=>s+(it.qty*it.price*(1-(it.itemDiscount||0)/100)),0); }
function nfUpdateTotals(){ nfRenderItems(); }
function nfRenderItems(){
  const sub=nfGetSubtotal();
  const disc=parseFloat((el("nf-disc")||{}).value)||0;
  const freight=parseFloat((el("nf-freight")||{}).value)||0;
  const clientCosts=(state.nfCosts||[]).filter(c=>c.clientPays).reduce((s,c)=>s+(parseFloat(c.value)||0),0);
  const total=sub*(1-disc/100)+freight+clientCosts;
  if(el("nf-items-list")) el("nf-items-list").innerHTML=state.nfItems.length?`
    <div class="items-box">
      ${state.nfItems.map((it,i)=>{const p=getProd(it.productId);const lineTotal=it.qty*it.price*(1-(it.itemDiscount||0)/100);return`
        <div class="item-row" style="align-items:center">
          <div style="flex:1;min-width:0">
            <span style="font-size:13px;color:var(--text2)">${it.name||p?.name||"?"}</span>
          </div>
          <div class="row" style="gap:6px;align-items:center">
            <input type="number" min="1" step="1" value="${it.qty}" style="width:60px;padding:3px 6px" class="form-input"
              oninput="nfEditItemQty(${i},this.value)" title="Quantidade">
            <span class="mono text-muted" style="font-size:12px">× ${fmt(it.price)}</span>
            ${it.itemDiscount>0?`<span class="badge bg-amber" style="font-size:10px">${it.itemDiscount}%</span>`:""}
            <span class="mono text-white" style="min-width:80px;text-align:right">${fmt(lineTotal)}</span>
            <button class="btn-sm btn-red" onclick="nfRemItem(${i})">✕</button>
          </div>
        </div>`}).join("")}
    </div>`:"";
  if(el("nf-totals")) el("nf-totals").innerHTML=state.nfItems.length?`
    <div class="totals-box" style="margin-top:12px">
      <div class="row-between" style="margin-bottom:6px"><span class="text-muted">Subtotal</span><span class="mono">${fmt(sub)}</span></div>
      ${disc>0?`<div class="row-between" style="margin-bottom:6px"><span class="text-muted">Desconto (${disc}%)</span><span class="mono text-red">− ${fmt(sub*disc/100)}</span></div>`:""}
      ${freight>0?`<div class="row-between" style="margin-bottom:6px"><span class="text-muted">Frete PDF</span><span class="mono">+ ${fmt(freight)}</span></div>`:""}
      ${clientCosts>0?`<div class="row-between" style="margin-bottom:6px"><span class="text-muted">Custos (cliente paga)</span><span class="mono">+ ${fmt(clientCosts)}</span></div>`:""}
      <div class="row-between" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
        <span style="font-family:var(--font-d);font-weight:700">TOTAL</span>
        <span style="font-family:var(--font-m);font-weight:700;font-size:18px;color:var(--amber)">${fmt(total)}</span>
      </div>
    </div>`:"";
}
async function emitirNF(num){
  if(!_guardSave()) return;
  if(!el("nf-client").value){
    _doneSave();
    const typed = (el("nf-client-search")?.value||'').trim();
    if(typed) return alert(`O cliente "${typed}" não foi selecionado.\n\nClique no nome na lista de sugestões, ou use "+ Consumidor Final" para emitir sem cadastro.`);
    return alert("Selecione o cliente ou clique em '+ Consumidor Final'.");
  }
  const _rawClientIdVal = el("nf-client").value;
  const _isAvulsoVal = _rawClientIdVal === 'avulso';
  if(!_isAvulsoVal && canEmitNFe(state.company)){
    const _clientVal = getClient(parseInt(_rawClientIdVal));
    if(_clientVal){
      const missing=[];
      if(!(_clientVal.street||'').trim()) missing.push('Logradouro');
      if(!(_clientVal.city||'').trim()) missing.push('Cidade');
      if(!(_clientVal.uf||'').trim()) missing.push('UF');
      if(!(_clientVal.cep||'').trim()) missing.push('CEP');
      if(missing.length){
        _doneSave();
        return alert(`O cadastro deste cliente está incompleto para emissão de NF-e.\n\nCampos ausentes: ${missing.join(', ')}.\n\nAcesse Clientes → editar cliente e preencha antes de emitir.`);
      }
    }
  }
  if(!state.nfItems.length){ _doneSave(); return alert("Adicione pelo menos um item."); }
  const sub=nfGetSubtotal();
  const disc=parseFloat(el("nf-disc").value)||0;
  const freight=parseFloat(el("nf-freight").value)||0;
  const freightInt=parseFloat(el("nf-freight-int")?.value)||0;
  const obs=(el("nf-obs")?.value||"").trim();
  const costs=[...(state.nfCosts||[])].filter(c=>c.description||c.value>0);
  const clientCosts=costs.filter(c=>c.clientPays).reduce((s,c)=>s+(parseFloat(c.value)||0),0);
  const total=parseFloat((sub*(1-disc/100)+freight+clientCosts).toFixed(2));
  const date=el("nf-date").value;
  if(date > today()){
    _doneSave();
    return alert("A data de emissão não pode ser futura. Corrija o campo Data de Emissão.");
  }
  const rawClientId=el("nf-client").value;
  const isAvulso=rawClientId==='avulso';
  const clientId=isAvulso?null:parseInt(rawClientId);
  const terms=el("nf-terms").value;
  const paymentMethod=el("nf-method")?.value||'';
  const client=clientId?getClient(clientId):null;
  const cc = checkClientCredit(clientId, total);
  if(cc.blocked){
    if(!confirm(`⚠ Atenção: ${cc.reason}\n\nDeseja emitir a nota mesmo assim?`)){
      _doneSave(); return;
    }
  }
  const stockWarnings=state.nfItems.filter(it=>{const p=getProd(it.productId);return p&&p.stock<it.qty;});
  if(stockWarnings.length){
    const msg=stockWarnings.map(it=>{const p=getProd(it.productId);return `• ${p.name}: estoque ${p.stock}, pedido ${it.qty}`;}).join("\n");
    alert(`Estoque insuficiente. Não é possível emitir a nota:\n\n${msg}`);
    _doneSave(); return;
  }
  try{
    const nf={id:uid(),number:num,date,clientId:isAvulso?null:clientId,clientName:isAvulso?"Consumidor Final":null,items:[...state.nfItems],discount:disc,freight,paymentTerms:terms,paymentMethod,subtotal:parseFloat(sub.toFixed(2)),total,status:"emitida"};
    if(obs) nf.notes=obs;
    if(freightInt>0) nf.internalFreight=freightInt;
    if(costs.length) nf.costs=costs;
    state.nfItems.forEach(it=>{
      const p=state.products.find(x=>x.id===it.productId);
      if(p){ p.stock=Math.max(0,p.stock-it.qty); state.stockMovements.push({id:uid(),date,productId:it.productId,type:"saida",qty:it.qty,reason:"Venda",reference:num}); }
    });
    const recs=generateReceivables(nf.id,num,clientId,total,date,terms);
    state.receivables.push(...recs);
    if(freightInt>0){
      state.transactions.push({id:uid(),date,type:"saida",category:"Logística",description:`Frete interno — ${num}`,amount:freightInt});
    }
    costs.filter(c=>!c.clientPays&&c.value>0).forEach(c=>{
      state.transactions.push({id:uid(),date,type:"saida",category:"Operacional",description:`${c.description||"Custo operacional"} — ${num}`,amount:parseFloat(c.value)||0});
    });
    if(terms==="À Vista") nf.status="emitida";

    if(canEmitNFe(state.company)){
      showSyncStatus('Emitindo NF-e na SEFAZ… aguarde (pode levar até 30s).');
      const resultado = await emitirNFe(nf, state.company, state.products, state.clients);
      if(!resultado.success){
        nf.items.forEach(it=>{ const p=state.products.find(x=>x.id===it.productId); if(p) p.stock+=it.qty; });
        state.stockMovements=state.stockMovements.filter(m=>m.reference!==num);
        state.receivables=state.receivables.filter(r=>r.invoiceId!==nf.id);
        state.transactions=state.transactions.filter(t=>!t.description?.endsWith(`— ${num}`));
        _doneSave();
        return alert('Erro ao emitir NF-e:\n' + resultado.error);
      }
      nf.chaveNFe = resultado.chave;
      nf.danfeUrl = resultado.danfeUrl;
      nf.focusRef = resultado.focusRef;
      showSyncStatus('✓ NF-e autorizada — chave: ...' + (resultado.chave||'').slice(-8));
    }

    state.invoices.push(nf);
    await saveToFirebase(); closeModal(); filterNotas();
    if(!canEmitNFe(state.company)) showSyncStatus("✓ Fatura emitida");
  }finally{ _doneSave(); }
}
function viewNF(id){
  const n=state.invoices.find(x=>x.id===id);
  const c=getClient(n.clientId);
  const recs=state.receivables.filter(r=>r.invoiceId===id);
  const statusColor={paga:"bg-green",parcial:"bg-blue",emitida:"bg-amber",cancelada:"bg-gray"}[n.status]||"bg-gray";
  showModal(`
    <div class="row-between" style="margin-bottom:20px">
      <div class="modal-title" style="margin:0">${n.number}</div>
      <div class="row"><span class="badge ${statusColor}">${n.status}</span>
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick="printNF(${n.id})">🖨 Imprimir</button>
      </div>
    </div>
    <div class="form-grid-2" style="margin-bottom:16px">
      <div><div class="kpi-label">Cliente</div><div style="font-size:14px;margin-top:4px;font-weight:600">${getNFClientName(n)}</div></div>
      <div><div class="kpi-label">Data / Pagamento</div><div style="font-size:14px;margin-top:4px">${fmtDate(n.date)} · ${n.paymentTerms}${n.paymentMethod?` · ${n.paymentMethod}`:''}</div></div>
    </div>
    <table><thead><tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Desc.</th><th>Total</th></tr></thead><tbody>
      ${n.items.map(it=>{const p=getProd(it.productId);const d=it.itemDiscount||0;const t=it.qty*it.price*(1-d/100);return`<tr>
        <td>${it.name||p?.name||"—"} <span class="text-muted mono" style="font-size:11px">${it.unit||p?.unit||""}</span></td>
        <td class="mono">${it.qty}</td><td class="mono">${fmt(it.price)}</td>
        <td class="mono">${d>0?d+"%":"—"}</td>
        <td class="mono">${fmt(t)}</td>
      </tr>`}).join("")}
    </tbody></table>
    <div class="totals-box" style="margin-top:14px">
      <div class="row-between" style="margin-bottom:4px"><span class="text-muted">Subtotal</span><span class="mono">${fmt(n.subtotal)}</span></div>
      ${n.discount>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Desconto (${n.discount}%)</span><span class="mono text-red">− ${fmt(n.subtotal*n.discount/100)} <span style="font-size:11px;opacity:.6">(${n.discount}%)</span></span></div>`:""}
      ${n.freight>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Frete PDF</span><span class="mono">+ ${fmt(n.freight)}</span></div>`:""}
      ${(n.costs||[]).filter(c=>c.clientPays).map(c=>`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">${c.description||"Custo"} <span style="font-size:10px">(cliente)</span></span><span class="mono">+ ${fmt(c.value||0)}</span></div>`).join("")}
      <div class="row-between" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
        <span style="font-family:var(--font-d);font-weight:700">TOTAL</span>
        <span class="mono fw-bold text-amber" style="font-size:16px">${fmt(n.total)}</span>
      </div>
      ${n.returnedTotal>0?`<div class="row-between" style="margin-top:4px"><span class="text-muted">Devolvido</span><span class="mono text-red">− ${fmt(n.returnedTotal)}</span></div><div class="row-between" style="padding-top:4px;border-top:1px dashed var(--border);margin-top:4px"><span style="font-size:12px;font-weight:600">Líquido recebível</span><span class="mono fw-bold" style="font-size:13px">${fmt(Math.max(0,n.total-n.returnedTotal))}</span></div>`:""}
      ${n.internalFreight>0?`<div class="row-between" style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--border)"><span class="text-muted" style="font-size:12px">Frete Interno (caixa)</span><span class="mono text-red" style="font-size:12px">− ${fmt(n.internalFreight)}</span></div>`:""}
      ${(n.costs||[]).filter(c=>!c.clientPays&&c.value>0).map(c=>`<div class="row-between" style="margin-top:4px"><span class="text-muted" style="font-size:12px">${c.description||"Custo"} (caixa)</span><span class="mono text-red" style="font-size:12px">− ${fmt(c.value||0)}</span></div>`).join("")}
    </div>
    ${n.notes?`<div style="margin-top:12px;padding:10px 12px;background:var(--bg2);border-radius:6px;border:1px solid var(--border)"><span style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Observações</span><div style="margin-top:6px;font-size:13px;color:var(--text2)">${n.notes}</div></div>`:""}
    ${recs.length?`<div style="margin-top:16px"><div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px;letter-spacing:.06em">PARCELAS</div>
    <table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
      ${recs.map(r=>`<tr>
        <td class="mono">${r.installment}/${r.total}</td>
        <td class="mono ${isOverdue(r.dueDate)&&r.status==="aberta"?"text-red":""}">${fmtDate(r.dueDate)}${isOverdue(r.dueDate)&&r.status==="aberta"?" ⚠":""}</td>
        <td class="mono">${fmt(r.amount)}</td>
        <td><span class="badge ${r.status==="paga"?"bg-green":r.status==="cancelada"?"bg-gray":"bg-amber"}">${r.status}</span></td>
      </tr>`).join("")}
    </tbody></table></div>`:""}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
      ${n.focusRef?`<button class="btn btn-ghost" onclick="viewNF(${n.id});closeModal();cartaCorrecaoModal('${n.focusRef}','${n.number}')">📝 CC-e</button><button class="btn btn-ghost" onclick="viewNF(${n.id});closeModal();enviarEmailNFModal('${n.focusRef}','${n.number}')">📧 Email</button>`:''}
      ${(n.status==="emitida"||n.status==="paga"||n.status==="parcial")?`<button class="btn btn-ghost" onclick="openDevolucaoModal('${n.id}')">↩ Devolver</button>`:''}
      ${n.status!=="cancelada"&&n.status!=="paga"?`<button class="btn btn-danger" onclick="cancelNF('${n.id}');closeModal()">Cancelar NF</button>`:''}
    </div>`,true);
}
async function cancelNF(id){
  if(!_guardSave()) return;
  const n=state.invoices.find(x=>x.id==id);
  if(!n){ _doneSave(); return; }

  if(n.focusRef){
    const justificativa=prompt("Justificativa do cancelamento (mín. 15 caracteres):");
    if(!justificativa||justificativa.length<15){ _doneSave(); return alert("Justificativa deve ter no mínimo 15 caracteres."); }
    if(!confirm("Cancelar esta nota fiscal na SEFAZ? O estoque será restaurado.")) { _doneSave(); return; }
    showSyncStatus("Cancelando na SEFAZ...");
    const result=await cancelarNFe(n.focusRef,justificativa,state.company);
    if(!result.success){ _doneSave(); showSyncStatus("⚠ Erro: "+result.error,true); return alert("Erro ao cancelar NF-e:\n"+result.error); }
    n.justificativaCancelamento=justificativa;
  } else {
    if(!confirm("Cancelar esta nota fiscal? O estoque será restaurado.")) { _doneSave(); return; }
  }

  n.status="cancelada";
  n.canceladaEm=new Date().toISOString();
  n.items.forEach(it=>{
    const p=state.products.find(x=>x.id===it.productId);
    if(p){ p.stock+=it.qty; state.stockMovements.push({id:uid(),date:today(),productId:it.productId,type:"entrada",qty:it.qty,reason:"Cancelamento NF",reference:n.number}); }
  });
  state.receivables.forEach(r=>{ if(r.invoiceId==id&&r.status==="aberta") r.status="cancelada"; });
  try{ await saveToFirebase(); renderNotas(); showSyncStatus("✓ NF cancelada"); }
  finally{ _doneSave(); }
}

// NF client search functions
function nfClientSearch(q){
  const dd=el("nf-client-dropdown"); if(!dd) return;
  const term=norm(q||"");
  if(!term){ dd.style.display='none'; return; }
  const matches=state.clients.filter(c=>
    norm(c.name||"").includes(term)||
    norm(c.cnpj||"").includes(term)||
    norm(c.city||"").includes(term)
  ).slice(0,8);
  if(!matches.length){
    dd.innerHTML=`<div style="padding:12px 14px;color:var(--muted);font-size:13px">Nenhum cliente encontrado</div>`;
  } else {
    dd.innerHTML=matches.map(c=>{
      const overdue=state.receivables.filter(r=>r.clientId==c.id&&r.status==='aberta'&&isOverdue(r.dueDate));
      return`<div style="padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''" onclick="nfClientSelect(${c.id},'${c.name.replace(/'/g,"\\'")}')">
        <div>
          <div style="font-size:13px;color:var(--text);font-weight:600">${escapeHtml(c.name)}</div>
          <div style="font-size:11px;color:var(--muted)">${escapeHtml(c.cnpj||'')} ${c.city?'· '+escapeHtml(c.city):''}</div>
        </div>
        ${overdue.length?`<span class="badge bg-red" style="font-size:10px">${overdue.length} venc.</span>`:''}
      </div>`;
    }).join('');
  }
  dd.style.display='block';
}

function nfClientSelect(id, name){
  el("nf-client").value=id;
  el("nf-client-search").value='';
  const dd=el("nf-client-dropdown"); if(dd) dd.style.display='none';
  const sel=el("nf-client-selected"); if(sel) sel.style.display='flex';
  const nm=el("nf-client-selected-name"); if(nm) nm.textContent=name;
  checkClienteNF(id);
  const c=getClient(id);
  if(c?.payterm){
    const sel2=el("nf-terms");
    if(sel2) [...sel2.options].forEach(o=>{ o.selected=o.value===c.payterm||o.text===c.payterm; });
  }
}

function nfClientClear(){
  el("nf-client").value='';
  el("nf-client-search").value='';
  const sel=el("nf-client-selected"); if(sel) sel.style.display='none';
  const alert=el("nf-credit-alert"); if(alert) alert.style.display='none';
  setTimeout(()=>{ el("nf-client-search")?.focus(); },50);
}

function nfClientAvulso(){
  el("nf-client").value='avulso';
  el("nf-client-search").value='';
  const dd=el("nf-client-dropdown"); if(dd) dd.style.display='none';
  const sel=el("nf-client-selected"); if(sel) sel.style.display='flex';
  const nm=el("nf-client-selected-name"); if(nm) nm.textContent='Consumidor Final (sem cadastro)';
  const alert=el("nf-credit-alert"); if(alert) alert.style.display='none';
}

function nfClientNovo(){
  const dd=el("nf-client-dropdown"); if(dd) dd.style.display='none';
  const searchVal=el("nf-client-search")?.value||'';
  showModal(`<div class="modal-title">Cadastro Rápido de Cliente</div>
    <div class="form-group"><label class="form-label">Nome / Razão Social *</label>
      <input id="qc-name" class="form-input" value="${searchVal.replace(/"/g,'&quot;')}" placeholder="Nome do cliente">
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">CNPJ / CPF</label>
        <input id="qc-cnpj" class="form-input" placeholder="00.000.000/0001-00">
      </div>
      <div class="form-group"><label class="form-label">Telefone</label>
        <input id="qc-phone" class="form-input" placeholder="(00) 00000-0000">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Cidade</label>
        <input id="qc-city" class="form-input">
      </div>
      <div class="form-group"><label class="form-label">Forma de Pagamento Padrão</label>
        <select id="qc-payterm" class="form-input">
          <option value="">Selecione...</option>
          ${PAY_TERMS.map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal();openNFModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="nfSalvarClienteRapido()">Salvar e voltar à NF</button>
    </div>`);
  setTimeout(()=>el("qc-name")?.focus(),100);
}

async function nfSalvarClienteRapido(){
  const name=el("qc-name")?.value.trim();
  if(!name){ alert("Informe o nome do cliente."); return; }
  const novo={id:uid(),name,cnpj:el("qc-cnpj")?.value||'',phone:el("qc-phone")?.value||'',city:el("qc-city")?.value||'',payterm:el("qc-payterm")?.value||'',creditLimit:0};
  state.clients.push(novo);
  await saveToFirebase();
  closeModal();
  openNFModal();
  setTimeout(()=>nfClientSelect(novo.id, novo.name),200);
}

document.addEventListener('click', e=>{
  if(!e.target.closest('#nf-client-search')&&!e.target.closest('#nf-client-dropdown')){
    const dd=el("nf-client-dropdown"); if(dd) dd.style.display='none';
  }
});

function getNFClientName(nf){
  if(nf.clientId){ const c=getClient(nf.clientId); if(c) return c.name; }
  return nf.clientName||'Consumidor Final';
}

function checkClienteNF(clientId){
  const alert = document.getElementById('nf-credit-alert');
  if(!alert) return;
  const cc = checkClientCredit(clientId, 0); // pass 0 to check overdue only
  if(cc.blocked){
    alert.style.display='block';
    alert.style.background='rgba(245,158,11,.12)';
    alert.style.border='1px solid rgba(245,158,11,.35)';
    alert.style.color='var(--amber)';
    alert.innerHTML=`⚠ <b>Atenção:</b> ${cc.reason}. O sistema alertará antes de emitir.`;
  } else if(cc.openAmt > 0 && cc.creditLimit > 0){
    alert.style.display='block';
    alert.style.background='rgba(245,158,11,.08)';
    alert.style.border='1px solid rgba(245,158,11,.2)';
    alert.style.color='var(--amber)';
    alert.innerHTML=`ℹ ${fmt(cc.openAmt)} em aberto — limite de crédito: ${fmt(cc.creditLimit)} (${fmt(Math.max(0, cc.creditLimit - cc.openAmt))} disponível)`;
  } else if(cc.openAmt > 0){
    alert.style.display='block';
    alert.style.background='rgba(245,158,11,.08)';
    alert.style.border='1px solid rgba(245,158,11,.2)';
    alert.style.color='var(--amber)';
    alert.innerHTML=`ℹ ${fmt(cc.openAmt)} em aberto (sem limite de crédito configurado)`;
  } else {
    alert.style.display='none';
  }
}

// ─── DAR BAIXA NF ─────────────────────────────────────────────────────────────
function darBaixaNF(nfId){
  const nf=state.invoices.find(n=>n.id==nfId);
  if(!nf) return;
  const recs=state.receivables.filter(r=>r.invoiceId===nf.id&&r.status==="aberta");
  if(!recs.length){ alert("Não há parcelas em aberto para esta nota."); return; }
  const c=getClient(nf.clientId);
  showModal(`<div class="modal-title">Registrar Recebimento — ${nf.number}</div>
    <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">Cliente: <b style="color:var(--text)">${c?c.name:"—"}</b> &nbsp;|&nbsp; Total da NF: <b style="color:var(--amber)">${fmt(nf.total)}</b></div>
    <div class="form-group"><label class="form-label">Data de Recebimento</label>
      <input id="bx-date" type="date" class="form-input" value="${today()}">
    </div>
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:10px;letter-spacing:.06em">PARCELAS EM ABERTO</div>
    <table class="table">
      <thead><tr><th><input type="checkbox" checked onchange="document.querySelectorAll('.bx-chk').forEach(c=>c.checked=this.checked)"></th><th>Parcela</th><th>Vencimento</th><th>Valor a Receber</th></tr></thead>
      <tbody>${recs.map(r=>`<tr>
        <td><input type="checkbox" class="bx-chk" data-id="${r.id}" checked></td>
        <td style="color:var(--muted)">${r.installment}/${r.total}</td>
        <td style="color:${isOverdue(r.dueDate)?"var(--red)":"var(--text)"}">${fmtDate(r.dueDate)}${isOverdue(r.dueDate)?" ⚠":""}</td>
        <td><input type="number" class="form-input bx-amt" data-id="${r.id}" value="${r.amount}" step="0.01" min="0.01" style="width:130px" title="Altere para registrar pagamento parcial"></td>
      </tr>`).join("")}</tbody>
    </table>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" style="background:var(--green)" onclick="confirmarBaixa(${nf.id})">✓ Confirmar Recebimento</button>
    </div>`);
}
async function confirmarBaixa(nfId){
  if(!_guardSave()) return;
  const payDate=el("bx-date").value||today();
  const chks=document.querySelectorAll(".bx-chk:checked");
  if(!chks.length){ _doneSave(); alert("Selecione ao menos uma parcela."); return; }
  let totalRecebido=0;
  chks.forEach(chk=>{
    const r=state.receivables.find(x=>x.id==chk.dataset.id);
    const amtInput=document.querySelector(`.bx-amt[data-id="${chk.dataset.id}"]`);
    const amt=parseFloat(amtInput?.value)||r?.amount||0;
    if(r&&r.status==="aberta"){
      if(amt<r.amount-0.01){
        const remainder=parseFloat((r.amount-amt).toFixed(2));
        state.receivables.push({...r,id:uid(),amount:remainder,paidAt:null,status:"aberta",installment:r.total+1,total:r.total+1,isSaldo:true});
        r.amount=parseFloat(amt.toFixed(2));
      }
      r.status="paga"; r.paidAt=payDate;
      totalRecebido+=parseFloat(amt.toFixed(2));
      state.transactions.push({id:uid(),date:payDate,type:"entrada",category:"Vendas",description:`Recebimento ${r.installment}/${r.total} — ${r.invoiceNumber||"NF"}`,amount:parseFloat(amt.toFixed(2))});
    }
  });
  const nfRecs=state.receivables.filter(x=>x.invoiceId===nfId&&x.status!=="cancelada");
  const allPaid=nfRecs.every(x=>x.status==="paga");
  const anyPaid=nfRecs.some(x=>x.status==="paga");
  const nf=state.invoices.find(x=>x.id===nfId);
  if(nf) nf.status=allPaid?"paga":anyPaid?"parcial":"emitida";
  try{ await saveToFirebase(); closeModal(); filterNotas(); showSyncStatus(`✓ Recebimento de ${fmt(totalRecebido)} registrado no caixa`); }
  finally{ _doneSave(); }
}

function nfFilterProds(search){ nfRenderProdList(search); }

// ─── NOVAS FUNCIONALIDADES FOCUS NFe ──────────────────────────────────────────

// Carta de Correção (CC-e)
function cartaCorrecaoModal(focusRef, numero){
  showModal(`<div class="modal-title">Carta de Correção — ${numero||focusRef}</div>
    <div class="form-group"><label class="form-label">Texto da correção (mín. 15 caracteres)</label>
      <textarea id="cce-texto" class="form-input" style="min-height:100px" placeholder="Ex: O endereço correto do destinatário é Rua X, 123..."></textarea>
    </div>
    <p style="font-size:12px;color:var(--muted)">Não é possível corrigir: valores de imposto, dados do emitente/destinatário que mudem as partes, ou data de emissão.</p>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="executarCartaCorrecao('${focusRef}')">Enviar CC-e</button>
    </div>`);
}
async function executarCartaCorrecao(focusRef){
  if(!_guardSave()) return;
  const texto = (document.getElementById('cce-texto')?.value||'').trim();
  if(texto.length < 15){ _doneSave(); return alert('O texto da correção deve ter no mínimo 15 caracteres.'); }
  showSyncStatus('Enviando carta de correção...');
  const result = await cartaCorrecaoNFe(focusRef, texto, state.company);
  _doneSave();
  if(result.success){ closeModal(); showSyncStatus('✓ Carta de correção enviada'); }
  else alert('Erro: ' + result.error);
}

// Enviar NF por Email
function enviarEmailNFModal(focusRef, numero){
  const c = state.clients.find(c => state.invoices.find(n => n.focusRef===focusRef)?.clientId === c.id);
  const emailDefault = c?.email || '';
  showModal(`<div class="modal-title">Enviar NF por Email — ${numero||focusRef}</div>
    <div class="form-group"><label class="form-label">Emails (separados por vírgula, máx. 10)</label>
      <input id="nf-email-list" class="form-input" value="${emailDefault}" placeholder="cliente@email.com, contador@email.com">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="executarEnviarEmail('${focusRef}')">📧 Enviar</button>
    </div>`);
}
async function executarEnviarEmail(focusRef){
  if(!_guardSave()) return;
  const raw = (document.getElementById('nf-email-list')?.value||'').trim();
  if(!raw){ _doneSave(); return alert('Informe ao menos um email.'); }
  const emails = raw.split(',').map(e => e.trim()).filter(Boolean);
  showSyncStatus('Enviando...');
  const result = await enviarNFeEmail(focusRef, emails, state.company);
  _doneSave();
  if(result.success){ closeModal(); showSyncStatus(`✓ Email enviado para ${emails.length} destinatário(s)`); }
  else alert('Erro: ' + result.error);
}

// Pré-visualizar DANFe
async function previewDANFeModal(){
  if(!_guardSave()) return;
  if(!el("nf-client").value){ _doneSave(); return alert("Selecione um cliente primeiro."); }
  if(!state.nfItems.length){ _doneSave(); return alert("Adicione pelo menos um item."); }

  const rawClientId = el("nf-client").value;
  const isAvulso = rawClientId === 'avulso';
  const clientId = isAvulso ? null : parseInt(rawClientId);
  const sub = nfGetSubtotal();
  const disc = parseFloat(el("nf-disc").value)||0;
  const freight = parseFloat(el("nf-freight").value)||0;
  const clientCosts = (state.nfCosts||[]).filter(c=>c.clientPays).reduce((s,c)=>s+(parseFloat(c.value)||0),0);
  const total = parseFloat((sub*(1-disc/100)+freight+clientCosts).toFixed(2));
  const date = el("nf-date").value;

  const previewInvoice = {
    id: 'preview', clientId: isAvulso ? null : clientId, clientName: isAvulso ? 'Consumidor Final' : null,
    items: [...state.nfItems], discount: disc, freight, subtotal: parseFloat(sub.toFixed(2)), total,
  };

  showSyncStatus('Gerando pré-visualização...');
  const result = await previsualizarDANFe(previewInvoice, state.company, state.products, state.clients);
  _doneSave();
  if(result.success && result.danfeUrl){
    window.open(result.danfeUrl, '_blank');
    showSyncStatus('✓ DANFe de pré-visualização aberta');
  } else {
    alert('Erro na pré-visualização: ' + (result.error || 'URL não disponível'));
  }
}

// Inutilizar Numeração
function inutilizarNumeracaoModal(){
  showModal(`<div class="modal-title">Inutilizar Numeração de NF-e</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Use quando um número de NF foi pulado por erro. Em situação normal a API controla a numeração automaticamente.</p>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Série</label>
        <input id="inut-serie" class="form-input" value="1" placeholder="1">
      </div>
      <div class="form-group"><label class="form-label">CNPJ</label>
        <input id="inut-cnpj" class="form-input" value="${(state.company.cnpj||'').replace(/\D/g,'')}" placeholder="00000000000000">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Número Inicial</label>
        <input id="inut-ini" type="number" class="form-input" placeholder="100">
      </div>
      <div class="form-group"><label class="form-label">Número Final</label>
        <input id="inut-fim" type="number" class="form-input" placeholder="100">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Justificativa (mín. 15 caracteres)</label>
      <textarea id="inut-just" class="form-input" style="min-height:80px" placeholder="Ex: Número de NF pulado por erro operacional..."></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" onclick="executarInutilizar()">Inutilizar</button>
    </div>`);
}
async function executarInutilizar(){
  if(!_guardSave()) return;
  const cnpj = document.getElementById('inut-cnpj')?.value||'';
  const serie = document.getElementById('inut-serie')?.value||'';
  const ini = parseInt(document.getElementById('inut-ini')?.value);
  const fim = parseInt(document.getElementById('inut-fim')?.value);
  const just = document.getElementById('inut-just')?.value||'';
  if(!cnpj||!serie||isNaN(ini)||isNaN(fim)||!just){ _doneSave(); return alert('Preencha todos os campos.'); }
  showSyncStatus('Inutilizando...');
  const result = await inutilizarNumeracao(cnpj, serie, ini, fim, just, state.company);
  _doneSave();
  if(result.success){ closeModal(); showSyncStatus('✓ Numeração inutilizada. Protocolo: '+result.protocolo); }
  else alert('Erro: ' + result.error);
}

// Importar NF-e (XML)
function importarNFeModal(){
  showModal(`<div class="modal-title">Importar NF-e</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Cole o XML completo de uma NF-e própria já emitida em outro sistema. A empresa emitente deve estar cadastrada na Focus.</p>
    <div class="form-group"><label class="form-label">XML da NF-e</label>
      <textarea id="import-xml" class="form-input" style="min-height:200px;font-family:monospace;font-size:11px" placeholder="Cole o XML aqui..."></textarea>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="executarImportarNFe()">Importar</button>
    </div>`);
}
async function executarImportarNFe(){
  if(!_guardSave()) return;
  const xml = document.getElementById('import-xml')?.value?.trim();
  if(!xml){ _doneSave(); return alert('Cole o XML da NF-e.'); }
  showSyncStatus('Importando...');
  const result = await importarNFe(xml, state.company);
  _doneSave();
  if(result.success){ closeModal(); showSyncStatus('✓ NF-e importada. Chave: '+(result.chave||'sucesso')); }
  else alert('Erro: ' + result.error);
}

// NF-e Recebidas (entrada)
async function renderNFeRecebidas(){
  if(!_guardSave()) return;
  showSyncStatus('Buscando NFs recebidas...');
  const result = await listarNFeRecebidas(state.company);
  _doneSave();
  const notas = result.notas || [];
  showModal(`<div class="modal-title">NF-e Recebidas <span style="font-size:12px;font-weight:400;color:var(--muted)">(${notas.length}${result.total?', total: '+result.total:''})</span></div>
    ${notas.length ? `<div style="max-height:60vh;overflow-y:auto"><table><thead><tr><th>Chave/Número</th><th>Emitente</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      ${notas.map(n=>`<tr>
        <td class="mono" style="font-size:11px">${n.chave_nfe||n.chave||'—'}</td>
        <td>${n.nome_emitente||'—'}</td>
        <td class="mono">${n.valor_total?fmt(parseFloat(n.valor_total)):'—'}</td>
        <td><span class="badge ${n.status==='autorizado'?'bg-green':'bg-amber'}">${n.status||'—'}</span></td>
        <td>
          <button class="btn-sm" onclick="verNFeRecebidaDetalhe('${n.chave_nfe||n.chave}')">Ver</button>
          <button class="btn-sm btn-amber" onclick="manifestarNFeModal('${n.chave_nfe||n.chave}')">Manifestar</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>` : '<p style="text-align:center;color:var(--muted)">Nenhuma NF recebida encontrada.</p>'}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
    </div>`, true);
}

async function verNFeRecebidaDetalhe(chave){
  if(!_guardSave()) return;
  const result = await consultarNFeRecebida(chave, state.company);
  _doneSave();
  if(result.error){ alert('Erro: '+result.error); return; }
  showModal(`<div class="modal-title">NF-e Recebida</div>
    <pre style="background:var(--bg2);padding:16px;border-radius:8px;font-size:12px;overflow:auto;max-height:60vh">${JSON.stringify(result, null, 2)}</pre>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="renderNFeRecebidas()">← Voltar</button>
      <button class="btn btn-primary" onclick="manifestarNFeModal('${chave}')">Manifestar</button>
    </div>`, true);
}

function manifestarNFeModal(chave){
  showModal(`<div class="modal-title">Manifestação do Destinatário</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Registre sua posição sobre esta NF recebida perante a SEFAZ.</p>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Tipo de Manifestação</label>
        <select id="mani-tipo" class="form-input" onchange="document.getElementById('mani-just-group').style.display=this.value==='confirmacao'||this.value==='nao_realizada'?'block':'none'">
          <option value="ciencia">Ciência da operação</option>
          <option value="confirmacao">Operação realizada (confirmação)</option>
          <option value="desconhecimento">Desconhecimento da operação</option>
          <option value="nao_realizada">Operação não realizada</option>
        </select>
      </div>
      <div class="form-group" id="mani-just-group" style="display:none"><label class="form-label">Justificativa (mín. 15 caracteres)</label>
        <input id="mani-just" class="form-input" placeholder="Justificativa...">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="renderNFeRecebidas()">Cancelar</button>
      <button class="btn btn-primary" onclick="executarManifestar('${chave}')">Registrar</button>
    </div>`);
}
async function executarManifestar(chave){
  if(!_guardSave()) return;
  const tipo = document.getElementById('mani-tipo')?.value;
  const just = document.getElementById('mani-just')?.value||'';
  showSyncStatus('Registrando manifestação...');
  const result = await manifestarNFe(chave, tipo, just, state.company);
  _doneSave();
  if(result.success){ closeModal(); showSyncStatus('✓ Manifestação registrada'); }
  else alert('Erro: ' + result.error);
}

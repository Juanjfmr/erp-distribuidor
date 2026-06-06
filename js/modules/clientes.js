// ─── CLIENTES ────────────────────────────────────────────────────────────────
var _cliSort=initSort('nome','asc');
function cliSortBy(col){
  if(_cliSort.col===col) _cliSort.dir=_cliSort.dir==='asc'?'desc':'asc';
  else{_cliSort.col=col;_cliSort.dir='asc';}
  filterClientes();
}
function renderClientes(){
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Clientes</div>
      <div class="row">
        <input id="cli-search" class="form-input" style="width:200px" placeholder="Buscar cliente..." oninput="filterClientes()">
        <button class="btn btn-primary" onclick="openClientModal()">+ Novo Cliente</button>
      </div>
    </div>
    <div class="card"><table><thead><tr>
      <th onclick="cliSortBy('nome')" class="sort-th">Nome${sortIcon(_cliSort,'nome')}</th><th onclick="cliSortBy('cnpj')" class="sort-th">CNPJ/CPF${sortIcon(_cliSort,'cnpj')}</th><th onclick="cliSortBy('cidade')" class="sort-th">Cidade${sortIcon(_cliSort,'cidade')}</th><th onclick="cliSortBy('telefone')" class="sort-th">Telefone${sortIcon(_cliSort,'telefone')}</th><th onclick="cliSortBy('credito')" class="sort-th">Limite Crédito${sortIcon(_cliSort,'credito')}</th><th onclick="cliSortBy('situacao')" class="sort-th">Situação${sortIcon(_cliSort,'situacao')}</th><th></th>
    </tr></thead>
    <tbody id="cli-tbody"></tbody></table></div>`;
  filterClientes();
}
function filterClientes(){
  const q=norm((el("cli-search")||{}).value||"");
  let data=state.clients.filter(c=>!q||norm(c.name).includes(q)||norm(c.cnpj).includes(q)||norm(c.city).includes(q));
  data=sortData(data,_cliSort,{nome:c=>c.name,cnpj:c=>c.cnpj||'',cidade:c=>c.city||'',telefone:c=>c.phone||'',credito:c=>c.creditLimit||0,situacao:c=>{
    const openRecs=state.receivables.filter(r=>r.clientId===c.id&&r.status==="aberta");
    const overdue=openRecs.some(r=>isOverdue(r.dueDate));
    if(overdue) return 2;
    if(openRecs.length>0) return 1;
    return 0;
  }});
  const tbody=el("cli-tbody"); if(!tbody) return;
  tbody.innerHTML=data.length?data.map(c=>{
    const openRecs=state.receivables.filter(r=>r.clientId===c.id&&r.status==="aberta");
    const openAmt=openRecs.reduce((s,r)=>s+r.amount,0);
    const overdue=openRecs.some(r=>isOverdue(r.dueDate));
    const oldest=state.receivables.filter(r=>r.clientId===c.id&&r.status==="aberta"&&isOverdue(r.dueDate)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
    const daysLate=oldest?Math.floor((new Date()-new Date(oldest.dueDate+'T00:00:00'))/86400000):0;
    return`<tr>
      <td class="text-white fw-bold">${c.name}</td>
      <td class="mono">${c.cnpj||"—"}</td>
      <td>${c.city||"—"}</td><td>${c.phone||"—"}</td>
      <td class="mono">${fmt(c.creditLimit||0)}</td>
      <td><span class="badge ${overdue?"bg-red":openAmt>0?"bg-amber":"bg-green"}">${overdue?"Inadimplente · "+daysLate+"d":openAmt>0?"Em aberto: "+fmt(openAmt):"Em dia"}</span></td>
      <td><div class="row">
        <button class="btn-sm btn-amber" onclick="openClientModal(${c.id})">Editar</button>
        <button class="btn-sm" onclick="deleteClient(${c.id})">✕</button>
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="7" class="empty">Nenhum cliente encontrado.</td></tr>`;
}
function openClientModal(id){
  const c=id?state.clients.find(x=>x.id===id):null;
  showModal(`<div class="modal-title">${c?"Editar Cliente":"Novo Cliente"}</div>
    <div class="form-group"><label class="form-label">Nome / Razão Social</label><input id="fc-name" class="form-input" value="${c?c.name:""}"></div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">CNPJ / CPF</label><input id="fc-cnpj" class="form-input" value="${c?c.cnpj||"":""}" onblur="buscarCnpjCliente()"></div>
      <div class="form-group"><label class="form-label">Cidade</label><input id="fc-city" class="form-input" value="${c?c.city||"":""}"></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Telefone</label><input id="fc-phone" class="form-input" value="${c?c.phone||"":""}"></div>
      <div class="form-group"><label class="form-label">E-mail</label><input id="fc-email" class="form-input" value="${c?c.email||"":""}"></div>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Inscrição Estadual</label><input id="fc-ie" class="form-input" placeholder="Isento ou número" value="${c?c.ie||'':''}"></div>
      <div class="form-group"><label class="form-label">CEP</label><input id="fc-cep" class="form-input" placeholder="00000-000" value="${c?c.cep||'':''}"></div>
      <div class="form-group"><label class="form-label">UF</label><select id="fc-uf" class="form-input">${['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(u=>`<option${c&&c.uf===u?' selected':''}>${u}</option>`).join('')}</select></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Logradouro</label><input id="fc-street" class="form-input" placeholder="Rua, Av..." value="${c?c.street||'':''}"></div>
      <div class="form-group"><label class="form-label">Bairro</label><input id="fc-district" class="form-input" value="${c?c.district||'':''}"></div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Forma de Pagamento Padrão</label><select id="fc-payterm" class="form-input"><option value="">Selecione...</option><option${c&&c.payterm==='avista'?' selected':''} value="avista">À Vista</option><option${c&&c.payterm==='30'?' selected':''} value="30">30 dias</option><option${c&&c.payterm==='30-60'?' selected':''} value="30-60">30/60 dias</option><option${c&&c.payterm==='30-60-90'?' selected':''} value="30-60-90">30/60/90 dias</option><option${c&&c.payterm==='28ddl'?' selected':''} value="28ddl">28 DDL</option></select></div>
      <div class="form-group"><label class="form-label">Limite de Crédito (R$)</label><input id="fc-credit" class="form-input" type="number" step="0.01" value="${c?c.creditLimit||0:0}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveClient(${id||""})">Salvar</button>
    </div>`);
}
function saveClient(id){
  const name=el("fc-name").value.trim();
  if(!name) return alert("Informe o nome.");
  const obj={name,cnpj:el("fc-cnpj").value,city:el("fc-city").value,phone:el("fc-phone").value,email:el("fc-email").value,creditLimit:parseFloat(el("fc-credit").value)||0,ie:el("fc-ie").value,cep:el("fc-cep").value,uf:el("fc-uf").value,street:el("fc-street").value,district:el("fc-district").value,payterm:el("fc-payterm").value};
  if(id) state.clients=state.clients.map(c=>c.id===id?{...obj,id}:c);
  else state.clients.push({...obj,id:uid()});
  saveState(); closeModal(); renderClientes();
  showSyncStatus(id?"✓ Cliente atualizado":"✓ Cliente cadastrado");
}
function deleteClient(id){
  const refs=[];
  if((state.invoices||[]).some(n=>n.clientId==id&&n.status!=="cancelada")) refs.push("notas fiscais");
  if((state.orders||[]).some(o=>o.clientId==id&&o.status!=="cancelado")) refs.push("pedidos");
  if((state.receivables||[]).some(r=>r.clientId==id&&r.status==="aberta")) refs.push("recebíveis em aberto");
  if(refs.length){ alert("Não é possível excluir: cliente possui "+refs.join(", ")+" vinculado(s)."); return; }
  if(confirm("Remover cliente?")){ state.clients=state.clients.filter(c=>c.id!==id); saveState(); renderClientes(); }
}
async function buscarCnpjCliente() {
  const raw = el('fc-cnpj').value.replace(/\D/g,'');
  if (raw.length !== 14) return;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
    if (!r.ok) return;
    const d = await r.json();
    if (d.razao_social) el('fc-name').value = d.razao_social;
    if (d.municipio)    el('fc-city').value = d.municipio;
    if (d.uf)           el('fc-uf').value = d.uf;
    if (d.cep)          el('fc-cep').value = d.cep.replace(/(\d{5})(\d{3})/,'$1-$2');
    if (d.logradouro)   el('fc-street').value = d.logradouro;
    if (d.bairro)       el('fc-district').value = d.bairro;
    if (d.telefone)     el('fc-phone').value = d.telefone;
    if (d.email)        el('fc-email').value = d.email;
  } catch(e) { /* silencioso — usuário preenche manualmente */ }
}
window.buscarCnpjCliente = buscarCnpjCliente;

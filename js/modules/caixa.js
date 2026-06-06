// ─── CAIXA ───────────────────────────────────────────────────────────────────
function renderCaixa(){
  const filter=state.cashFilter||"todos";
  const dateFrom=(el("cx-from")||{}).value||"";
  const dateTo=(el("cx-to")||{}).value||"";
  const catFilter=(el("cx-cat")||{}).value||"";
  let txs=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date));
  if(filter!=="todos") txs=txs.filter(t=>t.type===filter);
  if(dateFrom) txs=txs.filter(t=>t.date>=dateFrom);
  if(dateTo) txs=txs.filter(t=>t.date<=dateTo);
  if(catFilter) txs=txs.filter(t=>t.category===catFilter);
  const openingBalance = parseFloat(state.company?.openingBalance||0);
  const saldo = openingBalance + totalIn() - totalOut();
  const allCats=[...new Set(state.transactions.map(t=>t.category))].sort();

  const now = new Date();
  const d7 = new Date(); d7.setDate(d7.getDate()+7);
  const d30 = new Date(); d30.setDate(d30.getDate()+30);
  const d7str = d7.toISOString().slice(0,10);
  const d30str = d30.toISOString().slice(0,10);
  const todayStr = today();
  const prev7rec = state.receivables.filter(r=>r.status==="aberta"&&r.dueDate>todayStr&&r.dueDate<=d7str).reduce((s,r)=>s+r.amount,0);
  const prev7pay = state.payables.filter(p=>p.status==="aberta"&&p.dueDate>todayStr&&p.dueDate<=d7str).reduce((s,p)=>s+p.amount,0);

  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Fluxo de Caixa</div>
      <button class="btn btn-primary" onclick="openTxModal()">+ Lançamento Manual</button>
    </div>
    <div class="kpi-grid" style="margin-bottom:16px">
      <div class="kpi"><div class="kpi-label">Saldo Atual</div><div class="kpi-value" style="color:${saldo>=0?"var(--green)":"var(--red)"}">${fmt(saldo)}</div><div class="kpi-sub">Abertura + entradas − saídas</div></div>
      <div class="kpi"><div class="kpi-label">Entradas (total)</div><div class="kpi-value text-green">${fmt(totalIn())}</div></div>
      <div class="kpi"><div class="kpi-label">Saídas (total)</div><div class="kpi-value text-red">${fmt(totalOut())}</div></div>
      <div class="kpi"><div class="kpi-label">Previsão 7 dias</div><div class="kpi-value" style="color:${(saldo+prev7rec-prev7pay)>=0?"var(--green)":"var(--red)"}">${fmt(saldo+prev7rec-prev7pay)}</div><div class="kpi-sub">+${fmt(prev7rec)} −${fmt(prev7pay)}</div></div>
    </div>
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div class="row" style="flex-wrap:wrap;gap:12px">
        <div class="row" style="gap:8px">
          ${["todos","entrada","saida"].map(f=>`<button class="btn ${filter===f?"btn-primary":"btn-ghost"}" style="padding:6px 14px;font-size:12px" onclick="state.cashFilter='${f}';renderCaixa()">${f==="todos"?"Todos":f==="entrada"?"Entradas":"Saídas"}</button>`).join("")}
        </div>
        <div class="row" style="gap:8px;flex:1;flex-wrap:wrap">
          <input id="cx-from" type="date" class="form-input" style="width:140px" value="${dateFrom}" onchange="renderCaixa()" placeholder="De">
          <input id="cx-to" type="date" class="form-input" style="width:140px" value="${dateTo}" onchange="renderCaixa()" placeholder="Até">
          <select id="cx-cat" class="form-input" style="width:150px" onchange="renderCaixa()">
            <option value="">Todas categorias</option>
            ${allCats.map(c=>`<option${catFilter===c?" selected":""}>${c}</option>`).join("")}
          </select>
          <button class="btn btn-ghost" style="padding:6px 12px;font-size:12px" onclick="clearCxFilters()">Limpar</button>
        </div>
      </div>
    </div>
    <div class="card"><table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th></th></tr></thead><tbody>
      ${txs.map(t=>`<tr>
        <td class="mono">${fmtDate(t.date)}</td>
        <td><span class="badge ${t.type==="entrada"?"bg-green":"bg-red"}">${t.type}</span></td>
        <td>${t.category}</td>
        <td>${t.description}</td>
        <td class="mono fw-bold" style="color:${t.type==="entrada"?"var(--green)":"var(--red)"}">${t.type==="entrada"?"+":"−"}${fmt(t.amount)}</td>
        <td><button class="btn-sm btn-red" onclick="deleteTx(${t.id})">✕</button></td>
      </tr>`).join("")||`<tr><td colspan="6" class="empty">Nenhuma transação encontrada.</td></tr>`}
    </tbody></table></div>

    <!-- Despesas Fixas / Recorrentes -->
    <div class="card" style="margin-top:16px">
      <div class="row-between" style="margin-bottom:12px">
        <div class="section-title" style="margin:0">🔁 Despesas Fixas</div>
        <button class="btn btn-primary btn-sm" onclick="openRecurringModal()">+ Nova</button>
      </div>
      ${(state.recurringExpenses||[]).length === 0
        ? `<div class="empty" style="padding:24px">Nenhuma despesa recorrente cadastrada.<br><span style="font-size:12px;color:var(--muted)">Ex: Aluguel, Internet, Salários — lançados automaticamente todo mês.</span></div>`
        : `<table><thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Frequência</th><th>Próx. vencimento</th><th>Ativo</th><th></th></tr></thead><tbody>
          ${state.recurringExpenses.map((r,i)=>`
            <tr style="${!r.active?'opacity:.4':''}">
              <td class="text-white">${r.description}</td>
              <td>${r.category}</td>
              <td class="mono text-red">${fmt(r.amount)}</td>
              <td><span class="badge bg-blue" style="font-size:11px">${r.frequency==='monthly'?'Mensal':r.frequency==='weekly'?'Semanal':r.frequency==='biweekly'?'Quinzenal':r.frequency}</span></td>
              <td class="mono" style="color:${r.nextDueDate<today()?'var(--red)':''}">${fmtDate(r.nextDueDate)}${r.nextDueDate<today()?' ⚠':''}</td>
              <td><button class="btn-sm ${r.active?'bg-green':'bg-gray'}" onclick="toggleRecurring(${i})" style="font-size:10px;min-width:50px">${r.active?'Sim':'Não'}</button></td>
              <td><button class="btn-sm btn-amber" onclick="openRecurringModal(${i})">Editar</button><button class="btn-sm btn-red" onclick="deleteRecurring(${i})">✕</button></td>
            </tr>`).join('')}
        </tbody></table>`}
    </div>`;
}
function clearCxFilters(){ state.cashFilter="todos"; renderCaixa(); }
function openTxModal(){
  showModal(`<div class="modal-title">Novo Lançamento Manual</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Tipo</label>
        <select id="tx-type" class="form-input" onchange="updateTxCats()">
          <option value="entrada">Entrada</option><option value="saida">Saída</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Data</label>
        <input id="tx-date" type="date" class="form-input" value="${today()}">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Categoria</label>
        <select id="tx-cat" class="form-input">
          ${CAT_FIN.entrada.map(c=>`<option>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label>
        <input id="tx-val" type="number" step="0.01" class="form-input">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Descrição</label>
      <input id="tx-desc" class="form-input">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveTx()">Salvar</button>
    </div>`);
}
function updateTxCats(){
  const t=el("tx-type").value;
  el("tx-cat").innerHTML=(CAT_FIN[t]||[]).map(c=>`<option>${c}</option>`).join("");
}
function saveTx(){
  const desc=el("tx-desc").value.trim();
  const val=parseFloat(el("tx-val").value);
  if(!desc||!val) return alert("Preencha descrição e valor.");
  state.transactions.push({id:uid(),date:el("tx-date").value,type:el("tx-type").value,category:el("tx-cat").value,description:desc,amount:val});
  saveState(); closeModal(); renderCaixa();
}
function deleteTx(id){ if(confirm("Remover este lançamento?")){ state.transactions=state.transactions.filter(t=>t.id!==id); saveState(); renderCaixa(); } }

// ─── DESPESAS RECORRENTES ────────────────────────────────────────────────────
function openRecurringModal(index){
  const r = index !== undefined ? state.recurringExpenses[index] : null;
  const cats = CAT_FIN.saida;
  showModal(`<div class="modal-title">${r?'Editar':'Nova'} Despesa Fixa</div>
    <div class="form-group"><label class="form-label">Descrição</label>
      <input id="rec-desc" class="form-input" value="${r?r.description:''}" placeholder="Ex: Aluguel, Internet, Salário...">
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Categoria</label>
        <select id="rec-cat" class="form-input">
          ${cats.map(c=>`<option ${r&&r.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Valor (R$)</label>
        <input id="rec-val" type="number" step="0.01" class="form-input" value="${r?r.amount:''}">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Frequência</label>
        <select id="rec-freq" class="form-input">
          <option value="monthly" ${r&&r.frequency==='monthly'?'selected':''}>Mensal</option>
          <option value="biweekly" ${r&&r.frequency==='biweekly'?'selected':''}>Quinzenal</option>
          <option value="weekly" ${r&&r.frequency==='weekly'?'selected':''}>Semanal</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Próximo Vencimento</label>
        <input id="rec-date" type="date" class="form-input" value="${r?r.nextDueDate:today()}" onclick="this.showPicker?.()">
      </div>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text2)">
        <input type="checkbox" id="rec-active" ${!r||r.active!==false?'checked':''} style="accent-color:var(--green);width:16px;height:16px"> Ativo
      </label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveRecurring(${index!==undefined?index:''})">Salvar</button>
    </div>`);
}
function saveRecurring(index){
  const desc = el('rec-desc').value.trim();
  const val = parseFloat(el('rec-val').value);
  if(!desc||!val) return alert('Preencha descrição e valor.');
  const obj = {
    id: uid(),
    description: desc,
    category: el('rec-cat').value,
    amount: val,
    frequency: el('rec-freq').value,
    nextDueDate: el('rec-date').value,
    active: el('rec-active').checked
  };
  if(index!=='') {
    obj.id = state.recurringExpenses[index].id;
    state.recurringExpenses[index] = obj;
  } else {
    state.recurringExpenses.push(obj);
  }
  saveState(); closeModal(); renderCaixa();
  showSyncStatus(index!==''?'✓ Despesa atualizada':'✓ Despesa recorrente cadastrada');
}
function toggleRecurring(index){
  state.recurringExpenses[index].active = !state.recurringExpenses[index].active;
  saveState(); renderCaixa();
}
function deleteRecurring(index){
  if(!confirm('Remover esta despesa recorrente?')) return;
  state.recurringExpenses.splice(index,1);
  saveState(); renderCaixa();
}

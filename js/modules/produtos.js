// ─── PRODUTOS ────────────────────────────────────────────────────────────────
var _prodSort=initSort('nome','asc');
function prodSortBy(col){
  if(_prodSort.col===col) _prodSort.dir=_prodSort.dir==='asc'?'desc':'asc';
  else{_prodSort.col=col;_prodSort.dir='asc';}
  filterProdutos();
}
function renderProdutos(){
  const cats=[...new Set(state.products.map(p=>p.category))].sort();
  el("content").innerHTML=`
    <div class="section-header">
      <div class="section-title">Catálogo de Produtos</div>
      <div class="row">
        <input id="prod-search" class="form-input" style="width:160px" placeholder="Buscar..." oninput="filterProdutos()">
        <select id="prod-filter-cat" class="form-input" style="width:130px" onchange="filterProdutos()">
          <option value="">Categoria</option>
          ${cats.map(c=>`<option value="${c}">${c}</option>`).join("")}
        </select>
        <select id="prod-filter-stock" class="form-input" style="width:130px" onchange="filterProdutos()">
          <option value="">Estoque</option>
          <option value="ok">OK</option>
          <option value="baixo">Baixo</option>
          <option value="zerado">Zerado</option>
        </select>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer;white-space:nowrap">
          <input type="checkbox" id="prod-show-inactive" onchange="filterProdutos()"> Inativos
        </label>
        <button class="btn btn-primary" onclick="openProdModal()">+ Novo Produto</button>
      </div>
    </div>
    <div class="card"><table><thead><tr>
      <th onclick="prodSortBy('codigo')" class="sort-th">Código${sortIcon(_prodSort,'codigo')}</th><th onclick="prodSortBy('ean')" class="sort-th">EAN${sortIcon(_prodSort,'ean')}</th><th onclick="prodSortBy('nome')" class="sort-th">Produto${sortIcon(_prodSort,'nome')}</th><th onclick="prodSortBy('categoria')" class="sort-th">Categoria${sortIcon(_prodSort,'categoria')}</th><th onclick="prodSortBy('custo')" class="sort-th">Preço Custo${sortIcon(_prodSort,'custo')}</th><th onclick="prodSortBy('venda')" class="sort-th">Preço Venda${sortIcon(_prodSort,'venda')}</th><th onclick="prodSortBy('margem')" class="sort-th">Margem${sortIcon(_prodSort,'margem')}</th><th onclick="prodSortBy('estoque')" class="sort-th">Estoque${sortIcon(_prodSort,'estoque')}</th><th onclick="prodSortBy('status')" class="sort-th">Status${sortIcon(_prodSort,'status')}</th><th></th>
    </tr></thead><tbody id="prod-tbody"></tbody></table></div>`;
  filterProdutos();
}
function filterProdutos(){
  const search=(el("prod-search")||{}).value||"";
  const filterCat=(el("prod-filter-cat")||{}).value||"";
  const filterStock=(el("prod-filter-stock")||{}).value||"";
  const showInactive=(el("prod-show-inactive")||{}).checked||false;
  let data=state.products.filter(p=>{
    if(!showInactive&&p.active===false) return false;
    const mS=!search||norm(p.name).includes(norm(search))||norm(p.code).includes(norm(search));
    const mC=!filterCat||p.category===filterCat;
    const mK=!filterStock||(filterStock==="ok"&&p.stock>p.minStock)||(filterStock==="baixo"&&p.stock>0&&p.stock<=p.minStock)||(filterStock==="zerado"&&p.stock===0);
    return mS&&mC&&mK;
  });
  data=sortData(data,_prodSort,{codigo:p=>p.code,ean:p=>p.ean||'',nome:p=>p.name,categoria:p=>p.category,custo:p=>p.costPrice||0,venda:p=>p.salePrice,margem:p=>p.costPrice>0?((p.salePrice-p.costPrice)/p.salePrice):0,estoque:p=>p.stock,status:p=>p.active===false?0:1});
  const tbody=el("prod-tbody");
  if(!tbody) return;
  tbody.innerHTML=data.length?data.map(p=>{
    const inactive=p.active===false;
    const margin=p.costPrice>0?((p.salePrice-p.costPrice)/p.salePrice*100):0;
    const st=inactive?"bg-gray":p.stock<=p.minStock?"bg-red":p.stock<=p.minStock*1.5?"bg-amber":"bg-green";
    const stl=inactive?"Inativo":p.stock<=p.minStock?"Baixo":p.stock<=p.minStock*1.5?"Atenção":"OK";
    return`<tr style="${inactive?"opacity:.5":""}">
      <td class="mono text-amber">${p.code}</td>
      <td class="mono">${p.ean||'—'}</td>
      <td class="text-white fw-bold">${p.name}</td>
      <td>${p.category}</td>
      <td class="mono">${fmt(p.costPrice||0)}</td>
      <td class="mono">${fmt(p.salePrice)}</td>
      <td class="mono" style="color:${margin>=30?"var(--green)":margin>=15?"var(--amber)":"var(--red)"}">${margin.toFixed(1)}%</td>
      <td class="mono">${p.stock} ${p.unit}</td>
      <td><span class="badge ${st}">${stl}</span></td>
      <td><div class="row">
        ${inactive
          ?`<button class="btn-sm" style="background:var(--green);color:#000" onclick="reativarProd(${p.id})">Reativar</button>`
          :`<button class="btn-sm btn-amber" onclick="openProdModal(${p.id})">Editar</button>
            <button class="btn-sm" onclick="viewMovements(${p.id})" title="Movimentações">📋</button>
            <button class="btn-sm" onclick="viewPriceHistory(${p.id})" title="Histórico de preço">📈</button>
            <button class="btn-sm btn-red" onclick="deleteProd(${p.id})" title="Inativar produto">✕</button>`}
      </div></td>
    </tr>`;}).join(""):`<tr><td colspan="10" class="empty">Nenhum produto.</td></tr>`;
}
function openProdModal(id){
  const p=id?state.products.find(x=>x.id===id):null;
  showModal(`<div class="modal-title">${p?"Editar Produto":"Novo Produto"}</div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Código</label><input id="f-code" class="form-input" value="${p?p.code:"PRD"+String(uid()).slice(-3)}"></div>
      <div class="form-group"><label class="form-label">Categoria</label><select id="f-cat" class="form-input">${CAT_PROD.map(c=>`<option${p&&p.category===c?" selected":""}>${c}</option>`).join("")}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Nome do Produto</label><input id="f-name" class="form-input" value="${p?p.name:""}"></div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">Unidade</label><select id="f-unit" class="form-input">${UNITS.map(u=>`<option${p&&p.unit===u?" selected":""}>${u}</option>`).join("")}</select></div>
      <div class="form-group"><label class="form-label">Preço de Custo (R$)</label><input id="f-cost" class="form-input" type="number" step="0.01" value="${p?p.costPrice||"":""}"></div>
      <div class="form-group"><label class="form-label">Preço de Venda (R$)</label><input id="f-price" class="form-input" type="number" step="0.01" value="${p?p.salePrice:""}"></div>
    </div>
    <div class="form-grid-3">
      <div class="form-group"><label class="form-label">EAN / Código de Barras</label><input id="f-ean" class="form-input" value="${p?p.ean||'':''}"></div>
      <div class="form-group"><label class="form-label">NCM</label><input id="f-ncm" class="form-input" placeholder="0000.00.00" maxlength="10" value="${p?p.ncm||'':''}" oninput="updateSTTip()"></div>
      <div class="form-group"><label class="form-label">CFOP Padrão</label><input id="f-cfop" class="form-input" placeholder="5102" maxlength="5" value="${p?p.cfop||'':''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Origem da Mercadoria</label><select id="f-origem" class="form-input">
      <option value="0" ${(!p||!p.origem||p.origem==='0')?'selected':''}>0 — Nacional</option>
      <option value="1" ${p&&p.origem==='1'?'selected':''}>1 — Estrangeira (importação direta)</option>
      <option value="2" ${p&&p.origem==='2'?'selected':''}>2 — Estrangeira (adquirida no mercado interno)</option>
    </select></div>
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label" style="display:flex;align-items:center;gap:6px;cursor:pointer">
          <input type="checkbox" id="f-st" style="width:auto;margin:0" onchange="updateSTTip()" ${p&&p.st?'checked':''}> 
          ICMS-ST (Substituição Tributária)
        </label>
        <span id="st-tip" class="tip" data-tip="ICMS-ST: o imposto já foi recolhido pelo fabricante (Ambev, Coca-Cola, etc). A NF-e sairá com CST 60 e CFOP 5405. Ative para produtos como cervejas, refrigerantes e águas." style="margin-top:2px">ⓘ O que é?</span>
      </div>
      <div class="form-group">
        <label class="form-label" style="visibility:hidden">placeholder</label>
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group"><label class="form-label">Estoque Atual</label><input id="f-stock" class="form-input" type="number" value="${p?p.stock:0}"></div>
      <div class="form-group"><label class="form-label">Estoque Mínimo</label><input id="f-min" class="form-input" type="number" value="${p?p.minStock:0}"></div>
    </div>
    ${p?`<div class="form-group"><label class="form-label">Motivo da alteração de preço (se houver)</label><input id="f-note" class="form-input" placeholder="Ex: Reajuste de tabela, novo fornecedor..."></div>`:""}
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveProd(${id||""})">Salvar Produto</button>
    </div>`);
}
function saveProd(id){
  // Verificar limite do plano para novo produto
  const isNew = !id;
  if (isNew) {
    const limite = getPlanLimit('products');
    const ativos = state.products.filter(p => p.active !== false).length;
    if (ativos >= limite) {
      showModal(`
        <div style="text-align:center;padding:24px">
          <div style="font-size:32px;margin-bottom:12px">🔒</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:8px">Limite atingido</div>
          <div style="color:var(--text2);margin-bottom:20px">
            Seu plano permite até <b>${limite} produtos</b>. Você tem <b>${ativos}</b> cadastrados.<br>
            Faça upgrade para cadastrar mais.
          </div>
          <button class="btn btn-primary" onclick="navigate('minha-conta');closeModal()">Ver planos</button>
          <button class="btn" onclick="closeModal()" style="margin-left:8px">Fechar</button>
        </div>
      `);
      return;
    }
  }
  const name=el("f-name").value.trim();
  if(!name) return alert("Informe o nome do produto.");
  const newSale=parseFloat(el("f-price").value)||0;
  const newCost=parseFloat(el("f-cost").value)||0;
  if(!newCost||newCost<=0) return alert("O preço de custo é obrigatório.");
  const others=state.products.filter(p=>p.id!==id&&p.active!==false);
  const exact=others.find(p=>norm(p.name)===norm(name));
  if(exact) return alert(`Produto com nome igual já cadastrado: "${exact.name}"`);
  const similar=others.find(p=>prodSimilarity(p.name,name)>=0.9);
  if(similar&&!confirm(`Produto similar já cadastrado: "${similar.name}"\nDeseja cadastrar mesmo assim?`)) return;
  let savedId=id;
  if(id){
    const p=state.products.find(x=>x.id===id);
    const ph=p.priceHistory||[];
    if(newSale!==p.salePrice||newCost!==p.costPrice){
      ph.push({date:today(),salePrice:newSale,costPrice:newCost,note:el("f-note")?el("f-note").value||"Atualização":"Atualização"});
    }
    state.products=state.products.map(x=>x.id===id?{...x,code:el("f-code").value,name,category:el("f-cat").value,unit:el("f-unit").value,salePrice:newSale,costPrice:newCost,stock:parseInt(el("f-stock").value)||0,minStock:parseInt(el("f-min").value)||0,priceHistory:ph,ean:el("f-ean").value.trim(),ncm:el("f-ncm").value.trim(),cfop:el("f-cfop").value.trim(),origem:el("f-origem").value,st:el("f-st").checked}:x);
  }else{
    savedId=uid();
    state.products.push({id:savedId,code:el("f-code").value,name,category:el("f-cat").value,unit:el("f-unit").value,salePrice:newSale,costPrice:newCost,stock:parseInt(el("f-stock").value)||0,minStock:parseInt(el("f-min").value)||0,active:true,priceHistory:[{date:today(),salePrice:newSale,costPrice:newCost,note:"Cadastro inicial"}],ean:el("f-ean").value.trim(),ncm:el("f-ncm").value.trim(),cfop:el("f-cfop").value.trim(),origem:el("f-origem").value,st:el("f-st").checked});
  }
  saveState();
  showSyncStatus(id?"✓ Produto atualizado":"✓ Produto cadastrado");
  const draft=state.compraDraft;
  if(draft){ state.compraDraft=null; closeModal(); openCompraModal({...draft,returnProdId:savedId}); }
  else{ closeModal(); renderProdutos(); }
}
function deleteProd(id){
  if(!confirm("Inativar produto?\nEle deixará de aparecer nas listas, mas será preservado no histórico de notas fiscais.")) return;
  state.products=state.products.map(p=>p.id===id?{...p,active:false}:p);
  saveState(); filterProdutos();
  showSyncStatus("✓ Produto inativado");
}
function reativarProd(id){
  if(!confirm("Reativar este produto?")) return;
  state.products=state.products.map(p=>p.id===id?{...p,active:true}:p);
  saveState(); filterProdutos();
  showSyncStatus("✓ Produto reativado");
}
function viewPriceHistory(id){
  const p=getProd(id);
  const hist=(p.priceHistory||[]).slice().reverse();
  showModal(`<div class="modal-title">Histórico de Preços — ${p.name}</div>
    <table><thead><tr><th>Data</th><th>Preço Custo</th><th>Preço Venda</th><th>Margem</th><th>Obs.</th></tr></thead><tbody>
    ${hist.map(h=>{const m=h.costPrice>0?((h.salePrice-h.costPrice)/h.salePrice*100):0;return`<tr>
      <td class="mono">${fmtDate(h.date)}</td><td class="mono">${fmt(h.costPrice||0)}</td><td class="mono">${fmt(h.salePrice)}</td>
      <td class="mono" style="color:${m>=30?"var(--green)":m>=15?"var(--amber)":"var(--red)"}">${m.toFixed(1)}%</td>
      <td class="text-muted">${h.note||""}</td>
    </tr>`}).join("")}
    </tbody></table>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Fechar</button></div>`);
}
function viewMovements(id){
  const p=getProd(id);
  const movs=state.stockMovements.filter(m=>m.productId===id).slice().reverse();
  showModal(`<div class="modal-title">Movimentações — ${p.name}</div>
    <div class="row-between" style="margin-bottom:12px">
      <span>Estoque atual: <b class="text-amber mono">${p.stock} ${p.unit}</b></span>
    </div>
    <table><thead><tr><th>Data</th><th>Tipo</th><th>Qtd</th><th>Motivo</th><th>Ref.</th></tr></thead><tbody>
    ${movs.length?movs.map(m=>`<tr>
      <td class="mono">${fmtDate(m.date)}</td>
      <td><span class="badge ${m.type==="entrada"?"bg-green":"bg-red"}">${m.type}</span></td>
      <td class="mono">${m.qty}</td><td>${m.reason}</td><td class="mono text-muted">${m.reference||"—"}</td>
    </tr>`).join(""):`<tr><td colspan="5" class="empty">Sem movimentações.</td></tr>`}
    </tbody></table>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Fechar</button></div>`);
}

// ─── Auto-detecção de ICMS-ST ────────────────────────────────────────────────
// Bebidas (NCM 2201-2203) têm ST na maioria dos estados
function updateSTTip() {
  const ncm = (document.getElementById('f-ncm')?.value || '').replace(/\D/g, '');
  const cb = document.getElementById('f-st');
  const tip = document.getElementById('st-tip');
  if (!cb || !tip) return;
  
  const isBeverage = /^220[123]/.test(ncm);
  
  if (isBeverage && !cb.checked) {
    cb.checked = true;
    tip.setAttribute('data-tip', '⚠️ Detectado: este NCM é de bebida — geralmente sujeito a ICMS-ST. O imposto já foi recolhido pelo fabricante. A NF-e sairá com CST 60 e CFOP 5405. Desmarque se sua operação for diferente.');
    tip.innerHTML = '⚠️ ICMS-ST ativado automaticamente';
    tip.style.color = 'var(--amber)';
  } else if (!isBeverage && cb.checked) {
    tip.setAttribute('data-tip', 'ICMS-ST ativado manualmente. A NF-e sairá com CST 60 e CFOP 5405.');
    tip.innerHTML = 'ⓘ Ativado manualmente';
    tip.style.color = 'var(--muted)';
  } else if (!isBeverage) {
    tip.setAttribute('data-tip', 'ICMS-ST: o imposto já foi recolhido pelo fabricante. A NF-e sairá com CST 60 e CFOP 5405. Ative para produtos como cervejas, refrigerantes e águas.');
    tip.innerHTML = 'ⓘ O que é?';
    tip.style.color = 'var(--muted)';
  } else {
    tip.setAttribute('data-tip', '✅ ICMS-ST ativo. A NF-e sairá com CST 60 e CFOP 5405. O fabricante já recolheu o imposto.');
    tip.innerHTML = '✅ Ativo para bebidas';
    tip.style.color = 'var(--green)';
  }
}

// ─── PRINT NF ────────────────────────────────────────────────────────────────
function printNF(id){
  const n=state.invoices.find(x=>x.id===id);
  const client=getClient(n.clientId);
  const co=state.company;
  const recs=state.receivables.filter(r=>r.invoiceId===id);
  const w=window.open("","_blank","width=800,height=600");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${n.number}</title>
  <style>
    @page{size:A4;margin:12mm 15mm}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#111;line-height:1.5;margin:0;padding:0}
    .box{border:1.5px solid #333;border-radius:3px;padding:10px 12px;margin-bottom:14px}
    .header{display:flex;gap:16px;align-items:flex-start}
    .header-left{flex:1;display:flex;align-items:flex-start;gap:14px;min-width:0}
    .header-left img.logo{max-height:75px;max-width:200px;width:auto;height:auto;object-fit:contain;flex-shrink:0}
    .co-name{font-size:18px;font-weight:700;margin:0 0 4px}
    .co-info{font-size:10px;color:#444;line-height:1.55}
    .nf-info{text-align:right;flex-shrink:0;white-space:nowrap}
    .nf-number{font-size:16px;font-weight:700;margin:0 0 6px;letter-spacing:.02em}
    .nf-detail{font-size:10px;color:#444}
    .section-label{font-weight:700;font-size:10px;text-transform:uppercase;color:#333;margin-bottom:6px;letter-spacing:.08em;border-bottom:1px solid #ccc;padding-bottom:3px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#e8e8e8;padding:7px 9px;text-align:left;border:1.5px solid #999;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#111;font-weight:700}
    td{padding:6px 9px;border:1.5px solid #bbb}
    td.mono{font-family:'Consolas','Courier New',monospace}
    .totals{margin-top:10px}
    .totals table{width:250px;margin-left:auto}
    .totals td{padding:4px 9px;border:none;text-align:right;font-size:11px}
    .totals td:first-child{text-align:left;color:#444}
    .total-final td{border-top:2.5px solid #111 !important;font-weight:700;font-size:14px;padding-top:8px;color:#111}
    .total-final td:last-child{font-size:15px}
    .footer{margin-top:18px;padding-top:10px;border-top:1.5px solid #888;font-size:9px;color:#777;text-align:center}
    .client-info{font-size:12px;color:#111}
    .client-info .label{color:#555;font-size:10px}
    .notes-box{border:1.5px solid #333;border-radius:3px;padding:10px 12px;margin-bottom:14px;font-size:11px;color:#111;line-height:1.5}
    .notes-box .label{font-weight:700;font-size:10px;text-transform:uppercase;color:#333;letter-spacing:.08em;border-bottom:1px solid #ccc;padding-bottom:3px;display:block;margin-bottom:6px}
  </style></head><body>
  <div class="box">
    <div class="header">
      <div class="header-left">
        ${co.logo?`<img src="${co.logo}" class="logo" alt="Logo">`:''}
        <div>
          <div class="co-name">${co.name||"Empresa"}</div>
          <div class="co-info">
            ${co.cnpj?"CNPJ: "+co.cnpj+"<br>":""}
            ${co.address?co.address+"<br>":""}
            ${co.city?co.city+(co.uf?" - "+co.uf:"")+"<br>":""}
            ${co.phone?"Tel: "+co.phone+"<br>":""}
            ${co.email?co.email+"<br>":""}
          </div>
        </div>
      </div>
      <div class="nf-info">
        <div class="nf-number">${n.number}</div>
        <div class="nf-detail">${fmtDate(n.date)}</div>
        <div class="nf-detail">${n.status.toUpperCase()}</div>
      </div>
    </div>
  </div>
  <div class="box">
    <div class="section-label">Destinatário</div>
    <div class="client-info"><b>${client?client.name:"—"}</b><br>
    ${client&&client.cnpj?"<span class=\"label\">CNPJ/CPF: </span>"+client.cnpj+"<br>":""}
    ${client&&client.address?"<span class=\"label\">Endereço: </span>"+client.address+(client.number?", "+client.number:"")+" - "+client.city+(client.uf?"/"+client.uf:"")+"<br>":""}
    ${client&&client.phone?"<span class=\"label\">Tel: </span>"+client.phone+"<br>":""}
  </div></div>
  <div class="box" style="padding:0">
    <div class="section-label" style="margin:10px 12px 0">Itens</div>
    <table style="border-top:1.5px solid #999;margin-top:6px"><thead><tr><th>#</th><th>Produto</th><th>Qtd</th><th>Un.</th><th>Preço Unit.</th><th>Desc.</th><th>Total</th></tr></thead><tbody>
    ${n.items.map((it,i)=>{const p=getProd(it.productId);const disc=it.itemDiscount||0;const t=it.qty*it.price*(1-disc/100);return`<tr><td>${i+1}</td><td>${p?p.name:"—"}</td><td>${it.qty}</td><td>${p?p.unit:"UN"}</td><td class="mono">R$ ${fmtNum(it.price)}</td><td>${disc>0?disc+"%":"—"}</td><td class="mono">R$ ${fmtNum(t)}</td></tr>`}).join("")}
  </tbody></table></div>
  <div class="box" style="padding:10px 12px">
    <div class="totals"><table>
      <tr><td>Subtotal</td><td>R$ ${fmtNum(n.subtotal)}</td></tr>
      ${n.discount>0?`<tr><td>Desconto (${n.discount}%)</td><td>- R$ ${fmtNum(n.subtotal*n.discount/100)}</td></tr>`:""}
      ${n.freight>0?`<tr><td>Frete</td><td>R$ ${fmtNum(n.freight)}</td></tr>`:""}
      ${(n.costs||[]).filter(c=>c.clientPays&&c.value>0).map(c=>`<tr><td>${c.description||"Custo"}</td><td>R$ ${fmtNum(c.value||0)}</td></tr>`).join("")}
      <tr class="total-final"><td><b>TOTAL</b></td><td><b>R$ ${fmtNum(n.total)}</b></td></tr>
    </table></div>
  </div>
  ${n.notes?`<div class="notes-box"><span class="label">Observações</span>${n.notes}</div>`:""}
  <div class="box">
    <div class="section-label">Condições de Pagamento: ${n.paymentTerms}</div>
    ${recs.length>1?`<table style="margin-top:6px"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
    ${recs.map(r=>`<tr><td>${r.installment}/${r.total}</td><td>${fmtDate(r.dueDate)}</td><td class="mono">R$ ${fmtNum(r.amount)}</td><td>${r.status.toUpperCase()}</td></tr>`).join("")}
    </tbody></table>`:recs.length===1?`<div style="font-size:11px;margin-top:4px">Vencimento: ${fmtDate(recs[0].dueDate)} — R$ ${fmtNum(recs[0].amount)}</div>`:""}
  </div>
  <div class="footer">Documento gerado pela Stoqio em ${fmtDate(today())}</div>
</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

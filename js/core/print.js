// ─── PRINT NF ────────────────────────────────────────────────────────────────
function printNF(id){
  const n=state.invoices.find(x=>x.id===id);
  const client=getClient(n.clientId);
  const co=state.company;
  const recs=state.receivables.filter(r=>r.invoiceId===id);
  const w=window.open("","_blank","width=800,height=600");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${n.number}</title>
  <style>
    @page{size:A4;margin:15mm 18mm}
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a1a;line-height:1.5;margin:0;padding:0}
    .header{display:flex;gap:18px;border-bottom:2px solid #1a1a1a;padding-bottom:14px;margin-bottom:18px;align-items:flex-start}
    .header-left{flex:1;display:flex;align-items:flex-start;gap:12px;min-width:0}
    .header-left img.logo{max-height:38px;max-width:100px;width:auto;height:auto;object-fit:contain;flex-shrink:0;margin-top:1px}
    .co-name{font-size:16px;font-weight:700;margin:0 0 3px}
    .co-info{font-size:10px;color:#555;line-height:1.55}
    .nf-info{text-align:right;flex-shrink:0;white-space:nowrap}
    .nf-number{font-size:15px;font-weight:700;margin:0 0 5px;letter-spacing:.02em}
    .nf-detail{font-size:10px;color:#555}
    .section{margin-bottom:16px}
    .section-label{font-weight:600;font-size:10px;text-transform:uppercase;color:#666;margin-bottom:5px;letter-spacing:.06em}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#f5f5f5;padding:7px 9px;text-align:left;border:1px solid #ddd;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#555;font-weight:600}
    td{padding:6px 9px;border:1px solid #ddd}
    td.mono{font-family:'Consolas','Courier New',monospace}
    .totals{margin-top:14px}
    .totals table{width:240px;margin-left:auto}
    .totals td{padding:4px 9px;border:none;text-align:right;font-size:11px}
    .totals td:first-child{text-align:left;color:#555}
    .total-final td{border-top:2px solid #1a1a1a !important;font-weight:700;font-size:13px;padding-top:7px;color:#1a1a1a}
    .total-final td:last-child{font-size:14px}
    .footer{margin-top:22px;padding-top:12px;border-top:1px solid #ccc;font-size:9px;color:#999;text-align:center}
    .parcelas{margin-top:16px}
    .parcelas table{font-size:10px}
    .notes-box{margin-top:14px;padding:10px 12px;background:#fafafa;border:1px solid #eee;border-radius:4px;font-size:11px;color:#333;line-height:1.5}
    .client-info{font-size:12px;color:#1a1a1a}
    .client-info .label{color:#555;font-size:10px}
  </style></head><body>
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
  <div class="section"><div class="section-label">Destinatário</div>
    <div class="client-info"><b>${client?client.name:"—"}</b><br>
    ${client&&client.cnpj?"<span class=\"label\">CNPJ/CPF: </span>"+client.cnpj+"<br>":""}
    ${client&&client.address?"<span class=\"label\">Endereço: </span>"+client.address+(client.number?", "+client.number:"")+" - "+client.city+(client.uf?"/"+client.uf:"")+"<br>":""}
    ${client&&client.phone?"<span class=\"label\">Tel: </span>"+client.phone+"<br>":""}
  </div></div>
  <div class="section"><div class="section-label">Itens</div>
  <table><thead><tr><th>#</th><th>Produto</th><th>Qtd</th><th>Un.</th><th>Preço Unit.</th><th>Desc.</th><th>Total</th></tr></thead><tbody>
  ${n.items.map((it,i)=>{const p=getProd(it.productId);const disc=it.itemDiscount||0;const t=it.qty*it.price*(1-disc/100);return`<tr><td>${i+1}</td><td>${p?p.name:"—"}</td><td>${it.qty}</td><td>${p?p.unit:"UN"}</td><td class="mono">R$ ${fmtNum(it.price)}</td><td>${disc>0?disc+"%":"—"}</td><td class="mono">R$ ${fmtNum(t)}</td></tr>`}).join("")}
  </tbody></table></div>
  <div class="totals"><table>
    <tr><td>Subtotal</td><td>R$ ${fmtNum(n.subtotal)}</td></tr>
    ${n.discount>0?`<tr><td>Desconto (${n.discount}%)</td><td>- R$ ${fmtNum(n.subtotal*n.discount/100)}</td></tr>`:""}
    ${n.freight>0?`<tr><td>Frete</td><td>R$ ${fmtNum(n.freight)}</td></tr>`:""}
    ${(n.costs||[]).filter(c=>c.clientPays&&c.value>0).map(c=>`<tr><td>${c.description||"Custo"}</td><td>R$ ${fmtNum(c.value||0)}</td></tr>`).join("")}
    <tr class="total-final"><td><b>TOTAL</b></td><td><b>R$ ${fmtNum(n.total)}</b></td></tr>
  </table></div>
  ${n.notes?`<div class="notes-box"><b style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.06em">Observações</b><br>${n.notes}</div>`:""}
  <div class="parcelas"><div class="section-label">Condições de Pagamento: ${n.paymentTerms}</div>
  ${recs.length>1?`<table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr></thead><tbody>
  ${recs.map(r=>`<tr><td>${r.installment}/${r.total}</td><td>${fmtDate(r.dueDate)}</td><td class="mono">R$ ${fmtNum(r.amount)}</td><td>${r.status.toUpperCase()}</td></tr>`).join("")}
  </tbody></table>`:recs.length===1?`<div style="font-size:11px">Vencimento: ${fmtDate(recs[0].dueDate)} — R$ ${fmtNum(recs[0].amount)}</div>`:""}
  </div>
  <div class="footer">Documento gerado pelo ${co.name||"Stoqio"} em ${fmtDate(today())}</div>
</body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

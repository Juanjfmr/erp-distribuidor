const fs = require('fs');
const path = require('path');
const d = 'C:\\Users\\juana\\Claudecode\\stoqio\\js\\modules\\';

// [file, oldSubstring, newSubstring] - simple substring replacement
const reps = [
  // 1. produtos.js
  [d+'produtos.js',
    'join(""):`<tr><td colspan="10" class="empty"><div style="padding:12px"><svg width="32" height="32" style="display:block;margin:0 auto 8px;color:var(--text-muted)"><use href="#icon-package"/></svg><br><b>Nenhum produto cadastrado</b><br><span style="font-size:12px;color:var(--muted)">Cadastre seu primeiro produto ou importe via CSV</span></div></td></tr>',
    "join(''):emptyState('package','Nenhum produto cadastrado','Adicione seu primeiro produto para começar a vender.','+ Novo produto','openProdModal()')"],
  // 2. clientes.js
  [d+'clientes.js',
    'join(""):`<tr><td colspan="7" class="empty"><div style="padding:12px">👥<br><b>Nenhum cliente encontrado</b><br><span style="font-size:12px;color:var(--muted)">Cadastre seu primeiro cliente ou busque por CNPJ</span></div></td></tr>',
    "join(''):emptyState('users','Nenhum cliente cadastrado','Adicione seu primeiro cliente para começar a registrar pedidos.','+ Novo cliente','openClientModal()')"],
  // 3. fornecedores.js
  [d+'fornecedores.js',
    'join(""):`<tr><td colspan="7" class="empty"><div style="padding:12px">🏭<br><b>Nenhum fornecedor encontrado</b><br><span style="font-size:12px;color:var(--muted)">Cadastre fornecedores para criar ordens de compra</span></div></td></tr>',
    "join(''):emptyState('truck','Nenhum fornecedor cadastrado','Cadastre fornecedores para registrar compras.','+ Novo fornecedor','openSupplierModal()')"],
  // 4. pedidos.js
  [d+'pedidos.js',
    'join(""):`<tr><td colspan="7" class="empty"><div style="padding:12px"><svg width="32" height="32" style="display:block;margin:0 auto 8px;color:var(--text-muted)"><use href="#icon-clipboard"/></svg><br><b>Nenhum pedido encontrado</b><br><span style="font-size:12px;color:var(--muted)">Crie seu primeiro pedido de venda para começar</span></div></td></tr>',
    "join(''):emptyState('shopping-cart','Nenhum pedido encontrado','Os pedidos aparecerao aqui apos serem criados.','+ Novo pedido','openPedidoModal()')"],
  // 5. notas.js
  [d+'notas.js',
    'join(""):`<tr><td colspan="7" class="empty"><div style="padding:12px"><svg width="32" height="32" style="display:block;margin:0 auto 8px;color:var(--text-muted)"><use href="#icon-file-text"/></svg><br><b>Nenhuma nota fiscal encontrada</b><br><span style="font-size:12px;color:var(--muted)">Emita sua primeira NF-e para começar a faturar</span></div></td></tr>',
    "join(''):emptyState('file-text','Nenhuma nota fiscal encontrada','As notas fiscais emitidas aparecerao aqui.','','')"],
  // 6. compras.js
  [d+'compras.js',
    'join(""):`<tr><td colspan="9" class="empty"><div style="padding:12px"><svg width="32" height="32" style="display:block;margin:0 auto 8px;color:var(--text-muted)"><use href="#icon-shopping-cart"/></svg><br><b>Nenhuma compra encontrada</b><br><span style="font-size:12px;color:var(--muted)">Registre sua primeira ordem de compra para controlar suprimentos</span></div></td></tr>',
    "join(''):emptyState('shopping-cart','Nenhuma compra registrada','Registre compras para controlar seu estoque e contas a pagar.','+ Nova compra','openCompraModal()')"],
  // 7a. contas.js - receivables
  [d+'contas.js',
    'join("")||`<tr><td colspan="8" class="empty"><div style="padding:12px"><svg width="32" height="32" style="display:block;margin:0 auto 8px;color:var(--text-muted)"><use href="#icon-credit-card"/></svg><br><b>Nenhum lançamento a receber</b><br><span style="font-size:12px;color:var(--muted)">Os recebimentos aparecem aqui após faturar pedidos</span></div></td></tr>',
    "join('')||emptyState('credit-card','Nenhuma conta encontrada','Todas as contas a receber e a pagar aparecerao aqui.','','')"],
  // 7b. contas.js - payables
  [d+'contas.js',
    'join("")||`<tr><td colspan="7" class="empty"><div style="padding:12px"><svg width="32" height="32" style="display:block;margin:0 auto 8px;color:var(--text-muted)"><use href="#icon-credit-card"/></svg><br><b>Nenhum lançamento a pagar</b><br><span style="font-size:12px;color:var(--muted)">Os pagamentos aparecem aqui após registrar compras</span></div></td></tr>',
    "join('')||emptyState('credit-card','Nenhuma conta encontrada','Todas as contas a receber e a pagar aparecerao aqui.','','')"],
  // 8. caixa.js
  [d+'caixa.js',
    'join("")||`<tr><td colspan="6" class="empty"><div style="padding:12px"><svg width="32" height="32" style="display:block;margin:0 auto 8px;color:var(--text-muted)"><use href="#icon-bar-chart"/></svg><br><b>Nenhuma transação no período</b><br><span style="font-size:12px;color:var(--muted)">Lançamentos manuais ou baixas de contas aparecem aqui</span></div></td></tr>',
    "join('')||emptyState('trending-up','Nenhuma transacao encontrada','As movimentacoes do fluxo de caixa aparecerao aqui.','','')"],
  // 9a. dashboard.js - NFs empty
  [d+'dashboard.js',
    `'<div class="empty" style="padding:24px">Nenhuma NF emitida no período</div>'`,
    `emptyState('bar-chart','Nenhum dado ainda','Comece cadastrando produtos e clientes para ver o dashboard.','Ir para Produtos',"navigate('produtos')")`],
  // 9b. dashboard.js - pedidos empty
  [d+'dashboard.js',
    `'<div class="empty" style="padding:24px">Nenhum pedido ainda</div>'`,
    `emptyState('bar-chart','Nenhum dado ainda','Comece cadastrando produtos e clientes para ver o dashboard.','Ir para Produtos',"navigate('produtos')")`],
  // 9c. dashboard.js - recebiveis empty
  [d+'dashboard.js',
    `'<div class="empty" style="padding:24px">Nenhum recebível pendente</div>'`,
    `emptyState('bar-chart','Nenhum dado ainda','Comece cadastrando produtos e clientes para ver o dashboard.','Ir para Produtos',"navigate('produtos')")`],
];

let ok = 0, fail = 0;
for (const [fp, old, nw] of reps) {
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes(old)) {
    c = c.replace(old, nw);
    fs.writeFileSync(fp, c, 'utf8');
    console.log('OK ' + path.basename(fp));
    ok++;
  } else {
    console.log('FAIL ' + path.basename(fp) + ' - old string not found');
    fail++;
  }
}
console.log(`\nDone: ${ok} ok, ${fail} fail`);

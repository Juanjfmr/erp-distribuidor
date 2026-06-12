// functions/_businessContext.js
// Contexto compartilhado de negócio extraído de aiChat.js e aiPlaybook.js.
// Originalmente duplicado idêntico — centralizado aqui para evitar drift.
const admin = require('firebase-admin');
const db = admin.firestore();

const _COLS = ['products','clients','suppliers','invoices','purchases','receivables','payables','transactions','stockMovements','orders','returns'];

async function loadCollections(companyId) {
  const colSnaps = await Promise.all(
    _COLS.map(c => db.collection('empresas').doc(companyId).collection(c).get())
  );
  const collections = {};
  _COLS.forEach((colName, i) => {
    const items = [];
    colSnaps[i].forEach(d => items.push(d.data()));
    collections[colName] = items;
  });
  return collections;
}

// ─── Versão usada por aiChat.js ────────────────────────────────────────────────
// Retorno: JSON string indentado (2 spaces). Fallback: '' string vazia.
async function buildBusinessContext(companyId) {
  const snap = await db.collection('empresas').doc(companyId).get();
  if (!snap.exists) return '';

  const data = snap.data();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const mesStr = todayStr.slice(0, 7);

  const cols = await loadCollections(companyId);

  const products = (cols.products || []).filter(p => p.active !== false);
  const clients  = (cols.clients  || []);
  const invoices = (cols.invoices || []);
  const orders   = (cols.orders   || []);
  const receivables = (cols.receivables || []);
  const payables    = (cols.payables    || []);
  const transactions = (cols.transactions || []);

  // KPIs do mês
  const mesInvoices = invoices.filter(n => n.date?.startsWith(mesStr) && n.status !== 'cancelada');
  const faturamentoMes = mesInvoices.reduce((s, n) => s + (n.total || 0), 0);
  const nfsMes = mesInvoices.length;

  // A receber (em aberto)
  const receivablesOpen = receivables.filter(r => r.status === 'aberta');
  const totalReceber = receivablesOpen.reduce((s, r) => s + (r.amount || 0), 0);

  // Vencidos
  const overdue = receivablesOpen.filter(r => r.dueDate < todayStr);
  const totalVencido = overdue.reduce((s, r) => s + (r.amount || 0), 0);

  // Clientes inadimplentes
  const overdueClientIds = [...new Set(overdue.map(r => r.clientId))];
  const overdueClients = overdueClientIds.map(cid => {
    const c = clients.find(cl => cl.id === cid);
    const amt = overdue.filter(r => r.clientId === cid).reduce((s, r) => s + (r.amount || 0), 0);
    return { nome: c?.name || 'Desconhecido', valorVencido: amt };
  }).sort((a, b) => b.valorVencido - a.valorVencido).slice(0, 5);

  // Produtos com estoque baixo (< 10)
  const lowStock = products.filter(p => p.stock != null && p.stock < 10 && p.stock >= 0)
    .sort((a, b) => a.stock - b.stock).slice(0, 10);

  // Últimos pedidos
  const recentOrders = [...orders].sort((a, b) => b.id - a.id).slice(0, 5);

  // Fluxo de caixa do mês
  const mesTx = transactions.filter(t => t.date?.startsWith(mesStr));
  const entradas = mesTx.filter(t => t.type === 'entrada').reduce((s, t) => s + (t.amount || 0), 0);
  const saidas   = mesTx.filter(t => t.type === 'saida').reduce((s, t) => s + (t.amount || 0), 0);

  const ctx = {
    empresa: data.company?.name || 'Empresa',
    mes: mesStr,
    faturamentoMes,
    nfsMes,
    totalReceber,
    totalVencido,
    clientesInadimplentes: overdueClients,
    fluxoCaixa: { entradas, saidas, saldo: entradas - saidas },
    produtosBaixoEstoque: lowStock.map(p => ({ nome: p.name, estoque: p.stock, unidade: p.unit || 'UN' })),
    ultimosPedidos: recentOrders.map(o => {
      const c = clients.find(cl => cl.id === o.clientId);
      return { numero: o.number, cliente: c?.name || 'Avulso', total: o.total, status: o.status, data: o.date };
    }),
    totalProdutos: products.length,
    totalClientes: clients.length,
  };

  return JSON.stringify(ctx, null, 2);
}

// ─── Versão usada por aiPlaybook.js ────────────────────────────────────────────
// Retorno: JSON string sem indentação. Fallback: '{}'.
async function buildBusinessContextPlaybook(companyId) {
  const snap = await db.collection('empresas').doc(companyId).get();
  if (!snap.exists) return '{}';

  const data = snap.data();
  const todayStr = new Date().toISOString().slice(0, 10);
  const mesStr = todayStr.slice(0, 7);
  const mesAnteriorStr = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  const cols = await loadCollections(companyId);

  const products = (cols.products || []).filter(p => p.active !== false);
  const clients  = (cols.clients  || []);
  const invoices = (cols.invoices || []);
  const orders   = (cols.orders   || []);
  const receivables = (cols.receivables || []);
  const payables    = (cols.payables    || []);
  const transactions = (cols.transactions || []);

  // Vendas do mês atual
  const mesInvoices = invoices.filter(n => n.date?.startsWith(mesStr) && n.status !== 'cancelada');
  const faturamentoMes = mesInvoices.reduce((s, n) => s + (n.total || 0), 0);

  // Vendas do mês anterior (para comparar tendência)
  const mesAntInvoices = invoices.filter(n => n.date?.startsWith(mesAnteriorStr) && n.status !== 'cancelada');
  const faturamentoMesAnt = mesAntInvoices.reduce((s, n) => s + (n.total || 0), 0);

  // Recebíveis
  const receivablesOpen = receivables.filter(r => r.status === 'aberta');
  const totalReceber = receivablesOpen.reduce((s, r) => s + (r.amount || 0), 0);
  const overdue = receivablesOpen.filter(r => r.dueDate < todayStr);
  const totalVencido = overdue.reduce((s, r) => s + (r.amount || 0), 0);

  // Clientes inadimplentes
  const overdueClientIds = [...new Set(overdue.map(r => r.clientId))];
  const overdueClients = overdueClientIds.map(cid => {
    const c = clients.find(cl => cl.id === cid);
    const amt = overdue.filter(r => r.clientId === cid).reduce((s, r) => s + (r.amount || 0), 0);
    const oldest = overdue.filter(r => r.clientId === cid).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    const daysLate = oldest ? Math.floor((new Date() - new Date(oldest.dueDate + 'T00:00:00')) / 86400000) : 0;
    return { nome: c?.name || 'Desconhecido', valorVencido: amt, diasAtraso: daysLate };
  }).sort((a, b) => b.valorVencido - a.valorVencido).slice(0, 8);

  // Produtos estoque baixo
  const lowStock = products.filter(p => p.stock != null && p.stock < 10 && p.stock >= 0)
    .sort((a, b) => a.stock - b.stock).slice(0, 10);

  // Produtos zerados
  const outOfStock = products.filter(p => p.stock === 0);

  // Últimos pedidos (status)
  const recentOrders = [...orders].sort((a, b) => b.id - a.id).slice(0, 8);

  // Contas a pagar vencidas
  const payablesOverdue = payables.filter(p => p.status === 'aberta' && p.dueDate < todayStr);
  const totalPagarVencido = payablesOverdue.reduce((s, p) => s + (p.amount || 0), 0);

  // Fluxo de caixa
  const mesTx = transactions.filter(t => t.date?.startsWith(mesStr));
  const entradas = mesTx.filter(t => t.type === 'entrada').reduce((s, t) => s + (t.amount || 0), 0);
  const saidas   = mesTx.filter(t => t.type === 'saida').reduce((s, t) => s + (t.amount || 0), 0);

  // Clientes sem compras recentes (últimos 30 dias)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const activeClientIds = [...new Set(
    invoices.filter(n => n.date >= thirtyDaysAgo && n.status !== 'cancelada').map(n => n.clientId)
  )];
  const inactiveClients = clients
    .filter(c => !activeClientIds.includes(c.id))
    .slice(0, 5)
    .map(c => c.name);

  return JSON.stringify({
    empresa: data.company?.name || 'Empresa',
    mes: todayStr.slice(0, 7),
    faturamentoMes,
    faturamentoMesAnterior: faturamentoMesAnt,
    tendenciaFaturamento: faturamentoMesAnt > 0
      ? ((faturamentoMes - faturamentoMesAnt) / faturamentoMesAnt * 100).toFixed(1) + '%'
      : 'N/A (sem dados do mês anterior)',
    nfsMes: mesInvoices.length,
    totalReceber,
    totalVencido,
    totalPagarVencido,
    clientesInadimplentes: overdueClients,
    produtosEstoqueBaixo: lowStock.map(p => ({ nome: p.name, estoque: p.stock })),
    produtosZerados: outOfStock.map(p => p.name).slice(0, 8),
    clientesSemCompra30dias: inactiveClients,
    pedidosRascunho: recentOrders.filter(o => o.status === 'rascunho').length,
    pedidosConfirmadosPendentes: recentOrders.filter(o => o.status === 'confirmado').length,
    fluxoCaixa: { entradas, saidas, saldo: entradas - saidas },
    totalProdutos: products.length,
    totalClientes: clients.length,
  });
}

module.exports = {
  loadCollections,
  buildBusinessContext,
  buildBusinessContextPlaybook,
};

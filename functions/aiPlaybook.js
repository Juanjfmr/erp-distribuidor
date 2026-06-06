// functions/aiPlaybook.js
// Callable function — analisa operação e retorna alertas estruturados.
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// ─── Monta contexto do negócio (replicado de aiChat) ──────────────────────────
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

async function buildBusinessContext(companyId) {
  const snap = await db.collection('empresas').doc(companyId).get();
  if (!snap.exists) return '{}';

  const data = snap.data();
  const todayStr = new Date().toISOString().slice(0, 10);
  const mesStr = todayStr.slice(0, 7);
  const mesAnteriorStr = (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  // Lê dados das subcoleções (formato atual do frontend)
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

// ─── System prompt do playbook ────────────────────────────────────────────────
const PLAYBOOK_PROMPT = `Você é o Playbook do Stoqio ERP, um analista de operações que monitora dados financeiros e operacionais.

Seu papel: analisar o contexto do negócio e gerar alertas proativos e recomendações acionáveis.

Retorne sua resposta como um objeto JSON com o seguinte formato (apenas JSON, sem markdown ou texto adicional):
{
  "alertaGeral": "resumo de 1-2 frases sobre a situação geral do negócio",
  "alertas": [
    {
      "tipo": "inadimplencia|estoque|faturamento|cliente|operacional",
      "severidade": "alta|media|baixa",
      "titulo": "título curto e direto",
      "mensagem": "1-2 frases explicando o problema e a ação sugerida",
      "acao": "ação concreta que o usuário pode tomar (ex: 'Acesse Contas → Receber e entre em contato com o cliente')"
    }
  ]
}

Regras:
- Gere no máximo 6 alertas — priorize os mais impactantes.
- Se não houver problemas relevantes, o array de alertas pode ter 0 itens.
- Seja específico: use nomes de clientes, valores exatos, datas.
- Para cada alerta, SEMPRE sugira uma ação concreta dentro do ERP.
- Alertas de severidade "alta" = risco financeiro imediato.
- Não invente dados — use apenas o que está no contexto.
- O "alertaGeral" deve dar um panorama honesto, mesmo que seja positivo.`;

// ─── Handler ──────────────────────────────────────────────────────────────────
exports.aiPlaybook = functions.runWith({ secrets: ['DEEPSEEK_API_KEY'] }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const uid = context.auth.uid;
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Usuário não encontrado.');
  }
  const companyId = userSnap.data().companyId;
  if (!companyId) {
    throw new functions.https.HttpsError('failed-precondition', 'Empresa não configurada.');
  }

  const businessCtx = await buildBusinessContext(companyId);

  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: PLAYBOOK_PROMPT },
      { role: 'user', content: `Analise a operação deste negócio e gere alertas:\n${businessCtx}` },
    ],
    temperature: 0.5,
    max_tokens: 1200,
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('DeepSeek API error:', response.status, errText);
    throw new functions.https.HttpsError('internal', 'Erro ao consultar a IA.');
  }

  const result = await response.json();
  const raw = result.choices?.[0]?.message?.content || '{}';

  // Parse JSON da resposta (pode vir com markdown ```json)
  let parsed;
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('JSON parse error:', e.message, 'Raw:', raw.slice(0, 200));
    // Fallback: retorna raw como alertaGeral
    parsed = { alertaGeral: raw, alertas: [] };
  }

  return {
    alertaGeral: parsed.alertaGeral || '',
    alertas: (parsed.alertas || []).slice(0, 6),
    analisadoEm: new Date().toISOString(),
  };
});

// functions/aiChat.js
// Callable function — proxy seguro para DeepSeek API.
// Autenticação automática via Firebase Auth (onCall).
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

// ─── Monta contexto do negócio ─────────────────────────────────────────────────
async function buildBusinessContext(companyId) {
  const snap = await db.collection('empresas').doc(companyId).get();
  if (!snap.exists) return '';

  const data = snap.data();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const mesStr = todayStr.slice(0, 7);
  const anoStr = todayStr.slice(0, 4);

  const products = (data.products || []).filter(p => p.active !== false);
  const clients  = (data.clients  || []);
  const invoices = (data.invoices || []);
  const orders   = (data.orders   || []);
  const receivables = (data.receivables || []);
  const payables    = (data.payables    || []);
  const transactions = (data.transactions || []);

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

// ─── System prompt do assistente ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é o Stoqio Assistant, um consultor de gestão empresarial integrado ao ERP Stoqio.

Seu papel: ajudar o usuário a entender os dados do negócio e sugerir ações.

Regras:
- Responda SEMPRE em português do Brasil.
- Seja direto e objetivo. Máximo 3 parágrafos por resposta.
- Use os dados de contexto fornecidos para responder com precisão.
- Se o usuário perguntar algo que não está no contexto, diga que não tem essa informação e sugira onde encontrá-la no sistema.
- Quando relevante, sugira ações práticas (ex: "Que tal ligar para o cliente X que está devendo R$ Y?")
- Formate valores em reais (R$).
- NUNCA invente dados. Se não souber, admita.
- Mantenha um tom profissional mas amigável.`;

// ─── Handler ──────────────────────────────────────────────────────────────────
exports.aiChat = functions.runWith({ secrets: ['DEEPSEEK_API_KEY'] }).https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
  }

  const { message } = data;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Mensagem inválida.');
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

  // Busca contexto do negócio
  const businessCtx = await buildBusinessContext(companyId);

  // Monta payload para DeepSeek
  const payload = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Contexto atual do negócio (dados reais do ERP):\n${businessCtx}` },
      { role: 'user', content: message.trim() },
    ],
    temperature: 0.7,
    max_tokens: 800,
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
  const reply = result.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';

  return { reply };
});

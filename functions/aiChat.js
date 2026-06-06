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
const SYSTEM_PROMPT = `Você é o Stoqio Assistant, o assistente oficial do ERP Stoqio — um sistema de gestão empresarial completo para pequenas e médias empresas brasileiras.

Seu papel: ajudar o usuário a operar o Stoqio e interpretar os dados do negócio.

## CONHECIMENTO DO PRODUTO STOQIO

O Stoqio tem os seguintes módulos no menu lateral:

| Módulo | O que faz |
|--------|-----------|
| Dashboard | Visão geral: KPIs, inadimplentes, últimas notas, checklist de onboarding |
| Produtos | Cadastro de produtos com nome, preço de custo, preço de venda, estoque, unidade, EAN, categoria |
| Clientes | Cadastro com nome, CNPJ, cidade, telefone, email, limite de crédito, endereço completo |
| Fornecedores | Cadastro de fornecedores |
| Pedidos | Pedidos de venda: rascunho → confirmado → faturado. Scanner de código de barras |
| Notas | Emissão de NF (fatura ou NF-e via SEFAZ), baixa, cancelamento, impressão PDF |
| Compras | Ordens de compra com parcelas |
| Contas | Contas a receber e a pagar, filtro por vencidas, dar baixa em parcelas |
| Caixa | Fluxo de caixa, lançamento manual de entradas e saídas |
| Relatórios | Visão geral, Curva ABC, DRE, análise por NF |
| Configurações | Dados da empresa, categorias, unidades, e a aba FISCAL |
| Usuários | Gestão de usuários e roles (admin, vendedor, visualizador, contador) |
| Minha Conta | Planos, uso da conta, programa de afiliados |

### Configuração Fiscal (NF-e)

Para emitir NF-e, o caminho é: **Configurações → aba Fiscal**.

O wizard fiscal tem 6 etapas:
1. Regime tributário (Simples Nacional, Lucro Presumido, etc.)
2. Dados cadastrais (CNPJ, razão social, endereço)
3. Inscrição Estadual
4. Certificado digital A1 (.pfx)
5. Registro na Focus NFe (automático)
6. Teste de emissão em homologação

Enquanto não configurado, o sistema emite **Fatura em PDF** (sem validade fiscal).
Após configurado e ativo, emite **NF-e** oficial via SEFAZ.

### Emissão de Nota Fiscal

O fluxo normal é:
1. Criar um **Pedido** → rascunho
2. Confirmar o pedido → status confirmado
3. Faturar o pedido → gera **NF** vinculada

Também é possível emitir **NF avulsa** direto no módulo Notas.

### Bloqueio de cliente

O sistema alerta (mas não bloqueia) quando:
- Cliente tem parcelas vencidas (inadimplente)
- O total da venda + saldo em aberto ultrapassa o limite de crédito

O vendedor decide se quer prosseguir ou não.

## REGRAS DE RESPOSTA

- Responda SEMPRE em português do Brasil, com gramática impecável.
- Seja direto e útil. Máximo 3 parágrafos por resposta.
- Use os dados de contexto fornecidos para dar respostas precisas e personalizadas.
- Ao explicar COMO fazer algo, sempre indique o caminho exato no menu: "Acesse **Configurações → aba Fiscal**".
- NUNCA invente menus ou funcionalidades que não existem. Consulte a tabela de módulos acima.
- NUNCA invente dados numéricos. Use apenas o que está no contexto.
- Se não souber algo, admita e sugira um caminho alternativo.
- Quando relevante, termine com uma pergunta ou sugestão de próximo passo.
- Formate valores em reais (R$).
- Mantenha um tom profissional mas amigável. Use "você" (não "o senhor").`;

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

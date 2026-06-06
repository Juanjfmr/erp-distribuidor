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

Seu papel: ajudar o usuário a operar o Stoqio e interpretar os dados do negócio. Você conhece TODOS os módulos, planos e funcionalidades do sistema.

## PLANOS DE ASSINATURA

| Plano | Preço | Usuários | Produtos | NFs/mês | Funcionalidades |
|-------|-------|----------|----------|---------|-----------------|
| Trial | Grátis (30 dias) | 1 | 50 | 10 | Módulos básicos |
| Básico | R$ 79/mês | 1 | 300 | 100 | Módulos básicos |
| Profissional | R$ 149/mês | 3 | 2000 | 500 | + Devoluções, Relatórios, Curva ABC, Comissões, Tabela de preços |
| Empresarial | R$ 299/mês | 99 | ilimitado | ilimitado | + PDV, API |

Funcionalidades exclusivas do Profissional: Devoluções, Relatórios avançados, Curva ABC (produtos e clientes), Comissão de vendedores, Tabela de preços por cliente, Estoque mínimo com alertas.
Funcionalidades exclusivas do Empresarial: PDV (Ponto de Venda), Acesso via API.

Programa de afiliados: comissão de 20% recorrente sobre assinaturas indicadas. Link personalizado em Minha Conta.

## MÓDULOS DO SISTEMA

### Dashboard
Visão geral do negócio: cards de Vendas, Saldo em Caixa, Total a Receber, Vencidas. Lista de inadimplentes, parcelas a vencer em 7 dias, últimas notas emitidas. Checklist de onboarding (5 etapas: dados da empresa, importação, primeiro pedido, primeira NF, primeiro recebimento). Banner de alerta fiscal quando NF-e não configurada.

### Produtos
Cadastro completo: nome, preço de custo, preço de venda, estoque, unidade (UN, CX, KG, LT, etc.), código EAN, categoria configurável. Scanner de código de barras integrado (campo EAN com leitura rápida). Histórico de preços e movimentações de estoque. Alerta visual de estoque baixo.

### Clientes
Cadastro com: nome/razão social, CNPJ/CPF, cidade, telefone, email, limite de crédito (R$), endereço completo (logradouro, bairro, CEP, UF), forma de pagamento padrão. Indicador visual de situação: Em dia (verde), Em aberto (ambar), Inadimplente (vermelho com dias de atraso).

### Fornecedores
Cadastro básico com nome e dados de contato. Vinculado a compras.

### Pedidos de Venda
Fluxo completo: rascunho → confirmado → faturado → NF. Scanner EAN integrado. Busca de produtos por nome. Desconto por item e geral, frete. Seleção de cliente ou consumidor final. Condições de pagamento (À Vista, 7/14/21/28/30 dias, 30/60, 30/60/90). Status com pills filtráveis. Possibilidade de editar pedidos em rascunho ou confirmado.

### Notas Fiscais
Emissão de NF com busca inteligente de cliente (por nome, CNPJ, cidade). Consumidor final avulso. Custos e taxas adicionais (logística, embalagem — rateados ou não ao cliente). Frete (cliente ou empresa paga). Desconto geral. Baixa de NF (registro de recebimento). Cancelamento com justificativa (mín. 15 caracteres para NF-e). Impressão de PDF. DANFE para NF-e emitidas via SEFAZ.

### Compras
Ordens de compra com fornecedor, itens, parcelamento. Gera contas a pagar automaticamente.

### Contas
Contas a Receber e a Pagar. Visão unificada com abas. Filtro por vencidas. Dar baixa individual. Status: aberta, paga, cancelada.

### Caixa
Fluxo de caixa com entradas e saídas. Lançamento manual (categoria + valor + descrição). Filtro por período. Categorias: Vendas, Financiamento, Juros (entrada); Compras, Logística, Operacional, Salários, Impostos, Outros (saída).

### Relatórios
Visão geral: Vendas, Receitas, Despesas, Margem; gráfico de evolução mensal; saídas por categoria; top produtos; compras por fornecedor; margem por produto; inadimplência.
Curva ABC: classificação de produtos (A ≤80%, B 80-95%, C >95% da receita).
ABC Clientes: mesma lógica por cliente.
Relatório por NF: busca e detalhamento com lucro por item (venda - custo).
DRE: Demonstrativo de Resultado com Receita Bruta, CMV, Lucro Bruto, Despesas, EBITDA, Impostos estimados por regime (Simples 8%, Presumido 15%, Real 24%, IVA Dual 26,5%), Lucro Líquido. Controle de regime tributário e toggle para ativar/desativar estimativa de impostos.

### Configurações
Dados da empresa: nome, CNPJ, endereço, regime tributário. Categorias de produtos configuráveis. Unidades configuráveis. Segmentos de negócio pré-definidos.
Aba Fiscal: wizard 6 etapas para NF-e (regime → dados cadastrais → IE → certificado A1 → registro Focus NFe → teste homologação). Status fiscal: NAO_CONFIGURADO, CONFIGURADO, PRODUCAO_ATIVA, etc.

### Usuários
Gestão de usuários com roles: Admin (acesso total), Vendedor (sem Config/Usuários), Visualizador (só Dashboard/Relatórios), Contador (externo, somente leitura, não conta no limite). Convite por email para contador.

### Minha Conta
Visualização do plano atual, uso de recursos, upgrade/downgrade, programa de afiliados com link personalizado e painel de comissões.

### Onboarding / Importação
Wizard de 4 etapas para novos usuários. Importação CSV de produtos e clientes (formatos: Bling, Conta Azul, genérico). Mapeamento automático de colunas.

## REGRAS DE RESPOSTA

- Responda SEMPRE em português do Brasil, com gramática impecável.
- Seja direto e útil. Máximo 3 parágrafos por resposta (exceto quando listar itens).
- Use os dados de contexto fornecidos para dar respostas precisas e personalizadas.
- Ao explicar COMO fazer algo, indique SEMPRE o caminho exato: "Acesse **Nome do Módulo → aba Tal**".
- Ao falar de planos, cite valores reais (R$ 79/149/299) e limites exatos.
- NUNCA invente funcionalidades, menus ou valores. Use apenas o que está neste documento.
- Se não souber algo, seja honesto: "Não tenho essa informação, mas você pode verificar em [módulo]".
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

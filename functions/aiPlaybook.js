// functions/aiPlaybook.js
// Callable function — analisa operação e retorna alertas estruturados.
const functions = require('firebase-functions');
const admin = require('firebase-admin');

const { loadCollections, buildBusinessContextPlaybook } = require('./_businessContext');

const db = admin.firestore();

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

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

  const businessCtx = await buildBusinessContextPlaybook(companyId);

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

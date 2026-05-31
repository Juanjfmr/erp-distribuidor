# Plano F3 — Gerador de Conteúdo de Marketing (admin.html)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "Conteúdo" no admin.html onde o operador escolhe o tema e formato, e a IA gera 3 variações de post para Instagram/LinkedIn no tom da marca — sem aparecer com rosto, sem automatizar publicação.

**Architecture:** Nova aba no `admin.html` existente. Chama `payAffiliate` Firebase Function como modelo de chamada autenticada (reutiliza o padrão já estabelecido). Chama Anthropic API via `anthropicProxy` Firebase Function (Plano F1). Resultado exibido em cards copiáveis.

**Tech Stack:** JavaScript ES Modules inline no admin.html, Anthropic API via Firebase Function proxy, sem dependências externas adicionais.

**Pré-requisito:** Plano F1 (anthropicProxy Firebase Function) deve estar deployado.

---

## Estrutura de Arquivos

```
admin.html      ← modificar — adicionar aba Conteúdo e Log do Agente
```

---

## Task 1: Adicionar aba Conteúdo no admin.html

**Files:**
- Modify: `admin.html`

- [ ] **Step 1: Adicionar nav-item de Conteúdo na sidebar**

Em `admin.html`, no bloco `.nav`, após o item de Pagamentos, adicionar:

```html
<div class="nav-item" data-page="conteudo" onclick="navigate('conteudo',this)">
  <span class="icon">✦</span>Conteúdo
</div>
<div class="nav-item" data-page="agentlog" onclick="navigate('agentlog',this)">
  <span class="icon">◌</span>Log do Agente
</div>
```

- [ ] **Step 2: Adicionar página de Conteúdo**

No bloco `.content` do `admin.html`, após a página de pagamentos, adicionar:

```html
<div class="page" id="page-conteudo">
  <div class="table-card" style="padding:24px;margin-bottom:16px">
    <h2 style="margin-bottom:20px">Gerador de Conteúdo</h2>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
      <div>
        <label class="form-label">Tema</label>
        <select class="form-select" id="ct-tema">
          <option value="feature">Nova feature do sistema</option>
          <option value="caso_uso_distribuidor">Caso de uso — Distribuidora</option>
          <option value="caso_uso_petshop">Caso de uso — Pet Shop</option>
          <option value="caso_uso_farma">Caso de uso — Farmácia</option>
          <option value="dica_gestao">Dica de gestão para distribuidores</option>
          <option value="dado_setor">Dado/estatística do setor</option>
          <option value="comparativo">Por que trocar planilha por ERP</option>
          <option value="nfe">Obrigatoriedade de NF-e para MEI</option>
        </select>
      </div>
      <div>
        <label class="form-label">Formato</label>
        <select class="form-select" id="ct-formato">
          <option value="carrossel_instagram">Carrossel Instagram (5 slides)</option>
          <option value="post_linkedin">Post LinkedIn</option>
          <option value="legenda_video">Legenda de vídeo curto (Reels/TikTok)</option>
          <option value="thread_twitter">Thread Twitter/X</option>
        </select>
      </div>
    </div>

    <div style="margin-bottom:16px">
      <label class="form-label">Contexto adicional (opcional)</label>
      <textarea id="ct-contexto" class="form-input" rows="3"
        placeholder="Ex: Foco em distribuidoras de bebidas no Amazonas. Tom descontraído mas profissional."></textarea>
    </div>

    <button class="btn btn-primary" onclick="gerarConteudo()" id="ct-btn">
      ✦ Gerar 3 variações
    </button>
  </div>

  <div id="ct-resultado"></div>
</div>
```

- [ ] **Step 3: Adicionar página Log do Agente**

Após a página de Conteúdo, adicionar:

```html
<div class="page" id="page-agentlog">
  <div class="table-card">
    <div class="table-header">
      <h2>Log do Agente IA</h2>
      <button class="btn btn-ghost" onclick="loadAgentLog()">↻ Atualizar</button>
    </div>
    <table>
      <thead>
        <tr><th>Data/Hora</th><th>Tenant</th><th>Ação</th><th>Detalhes</th><th>Módulo</th><th>Plano</th></tr>
      </thead>
      <tbody id="agentlog-tbody">
        <tr><td colspan="6"><div class="loading">Carregando...</div></td></tr>
      </tbody>
    </table>
  </div>
</div>
```

- [ ] **Step 4: Commitar**

```bash
git add admin.html
git commit -m "feat: adicionar estrutura HTML das abas Conteúdo e Log do Agente no admin"
```

---

## Task 2: Implementar gerador de conteúdo

**Files:**
- Modify: `admin.html` — adicionar função gerarConteudo() no bloco `<script type="module">`

- [ ] **Step 1: Adicionar função gerarConteudo() no script do admin.html**

No bloco `<script type="module">` do `admin.html`, após a função `loadPagamentos()`, adicionar:

```javascript
// ── CONTEÚDO ──────────────────────────────────────────────────────────────────

const BRAND_VOICE = `
Marca: ERP Distribuidora
Tom: Profissional mas acessível. Direto ao ponto. Sem jargão excessivo.
Público: Donos de pequenas distribuidoras, atacadistas e varejistas no Brasil.
Proposta de valor: ERP completo para distribuidores com NF-e inclusa, configurado para o seu ramo, sem pagar por módulos que não usa.
Diferenciais: Segmentação por ramo de negócio, onboarding guiado, preço justo (Básico R$79, Profissional R$149, Empresarial R$299).
CTA padrão: "Teste grátis por 30 dias em erpdistribuidor.com.br"
Nunca mencionar nomes de concorrentes diretamente.
Nunca prometer funcionalidades não existentes.
`;

const TEMA_LABELS = {
  feature: 'Nova feature do sistema',
  caso_uso_distribuidor: 'Caso de uso — Distribuidora',
  caso_uso_petshop: 'Caso de uso — Pet Shop',
  caso_uso_farma: 'Caso de uso — Farmácia',
  dica_gestao: 'Dica de gestão para distribuidores',
  dado_setor: 'Dado/estatística do setor',
  comparativo: 'Por que trocar planilha por ERP',
  nfe: 'Obrigatoriedade de NF-e para MEI',
};

const FORMATO_LABELS = {
  carrossel_instagram: 'Carrossel Instagram (5 slides)',
  post_linkedin: 'Post LinkedIn',
  legenda_video: 'Legenda de vídeo curto',
  thread_twitter: 'Thread Twitter/X',
};

window.gerarConteudo = async function() {
  const tema = el('ct-tema').value;
  const formato = el('ct-formato').value;
  const contexto = el('ct-contexto').value.trim();
  const btn = el('ct-btn');
  const resultado = el('ct-resultado');

  btn.disabled = true;
  btn.textContent = '⏳ Gerando...';
  resultado.innerHTML = '<div class="loading">Gerando 3 variações...</div>';

  const prompt = `
Você é um redator especialista em marketing B2B para software de gestão empresarial no Brasil.

${BRAND_VOICE}

Gere EXATAMENTE 3 variações de conteúdo para o formato: ${FORMATO_LABELS[formato]}
Tema: ${TEMA_LABELS[tema]}
${contexto ? `Contexto adicional: ${contexto}` : ''}

Formato da resposta — retorne APENAS JSON válido, sem markdown:
{
  "variacoes": [
    {
      "titulo": "Título ou gancho da variação",
      "conteudo": "Texto completo do post",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "angulo": "Descrição do ângulo/abordagem desta variação"
    }
  ]
}

Instruções específicas por formato:
- carrossel_instagram: Estruture em slides separados por "---". Máximo 150 caracteres por slide. 5 slides.
- post_linkedin: 800-1200 caracteres. Quebras de linha estratégicas. Emojis com moderação.
- legenda_video: 150-300 caracteres. Gancho forte na primeira linha. CTA no final.
- thread_twitter: 5-7 tweets numerados. Máximo 280 caracteres cada.
`;

  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(`${FUNCTIONS_BASE}/anthropicProxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Parse do JSON retornado
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    const variacoes = parsed.variacoes || [];

    resultado.innerHTML = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--text2)">
        ${variacoes.length} variações geradas para <b>${TEMA_LABELS[tema]}</b> — ${FORMATO_LABELS[formato]}
      </div>
      ${variacoes.map((v, i) => `
        <div class="table-card" style="padding:20px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="font-weight:700;margin-bottom:4px">Variação ${i+1}: ${v.titulo}</div>
              <div style="font-size:11px;color:var(--text2);font-family:var(--mono)">${v.angulo}</div>
            </div>
            <button class="btn btn-ghost" onclick="copiarConteudo(${i})" id="copy-btn-${i}">📋 Copiar</button>
          </div>
          <div id="conteudo-${i}" style="white-space:pre-wrap;font-size:13px;line-height:1.6;background:var(--surface2);padding:16px;border-radius:8px;margin-bottom:12px">${v.conteudo}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${(v.hashtags||[]).map(h => `<span style="background:rgba(79,110,247,.12);color:var(--accent);padding:2px 8px;border-radius:4px;font-size:11px;font-family:var(--mono)">#${h.replace('#','')}</span>`).join('')}
          </div>
        </div>
      `).join('')}
    `;

    // Salvar no Firestore para histórico
    try {
      await addDoc(collection(db, 'contentHistory'), {
        tema, formato, variacoes,
        geradoEm: new Date().toISOString(),
      });
    } catch(e) { console.warn('Erro ao salvar histórico:', e); }

  } catch(e) {
    resultado.innerHTML = `<div style="color:var(--red);padding:16px">Erro ao gerar conteúdo: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '✦ Gerar 3 variações';
  }
};

window.copiarConteudo = function(idx) {
  const el_conteudo = document.getElementById(`conteudo-${idx}`);
  const btn = document.getElementById(`copy-btn-${idx}`);
  if (!el_conteudo) return;
  navigator.clipboard.writeText(el_conteudo.textContent).then(() => {
    btn.textContent = '✓ Copiado!';
    setTimeout(() => { btn.textContent = '📋 Copiar'; }, 2000);
  });
};

// ── LOG DO AGENTE ─────────────────────────────────────────────────────────────

async function loadAgentLog() {
  el('agentlog-tbody').innerHTML = '<tr><td colspan="6"><div class="loading">Carregando...</div></td></tr>';

  try {
    // Buscar logs de todos os tenants (últimos 100)
    const logsSnap = await getDocs(
      query(
        collection(db, 'agentLogs'), // coleção global de logs
        orderBy('timestamp', 'desc'),
        limit(100)
      )
    );

    const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (logs.length === 0) {
      el('agentlog-tbody').innerHTML = '<tr><td colspan="6"><div class="empty">Nenhuma ação registrada ainda.</div></td></tr>';
      return;
    }

    el('agentlog-tbody').innerHTML = logs.map(log => {
      const tenant = _tenants.find(t => t.id === log.companyId);
      return `<tr>
        <td><span style="font-family:var(--mono);font-size:11px;color:var(--text2)">${fmtDate(log.timestamp)}</span></td>
        <td style="font-weight:600">${tenant?.name || log.companyId || '—'}</td>
        <td><span class="status ${_logStatusClass(log.type)}">${log.type}</span></td>
        <td style="font-size:12px;color:var(--text2);max-width:200px;overflow:hidden;text-overflow:ellipsis">${log.details || '—'}</td>
        <td><span style="font-size:11px;font-family:var(--mono)">${log.view || '—'}</span></td>
        <td>${planBadge(log.plan)}</td>
      </tr>`;
    }).join('');

  } catch(e) {
    el('agentlog-tbody').innerHTML = `<tr><td colspan="6" style="color:var(--red)">Erro: ${e.message}</td></tr>`;
  }
}

function _logStatusClass(type) {
  const map = {
    extend_trial: 'trial',
    apply_coupon: 'ativo',
    navigate: 'bloqueado',
    onboarding: 'ativo',
  };
  return map[type] || 'bloqueado';
}
```

- [ ] **Step 2: Adicionar Conteúdo e Log ao PAGE_TITLES e PAGE_LOADERS**

No script do `admin.html`, atualizar os objetos existentes:

```javascript
// Substituir:
const PAGE_TITLES = { dashboard:'Dashboard', tenants:'Tenants', afiliados:'Afiliados', pagamentos:'Pagamentos' };
const PAGE_LOADERS = { dashboard:loadDashboard, tenants:loadTenants, afiliados:loadAfiliados, pagamentos:loadPagamentos };

// Por:
const PAGE_TITLES = { dashboard:'Dashboard', tenants:'Tenants', afiliados:'Afiliados', pagamentos:'Pagamentos', conteudo:'Conteúdo', agentlog:'Log do Agente' };
const PAGE_LOADERS = { dashboard:loadDashboard, tenants:loadTenants, afiliados:loadAfiliados, pagamentos:loadPagamentos, conteudo:()=>{}, agentlog:loadAgentLog };
```

- [ ] **Step 3: Adicionar imports necessários ao script do admin.html**

No bloco de imports do Firebase, adicionar `addDoc` e `orderBy`:

```javascript
import { getFirestore, collection, getDocs, doc, updateDoc, orderBy, query, where, limit, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
```

- [ ] **Step 4: Commitar e push**

```bash
git add admin.html
git commit -m "feat: gerador de conteúdo de marketing e log do agente no admin.html"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ 8 temas de conteúdo disponíveis
- ✅ 4 formatos (carrossel, LinkedIn, vídeo, thread)
- ✅ Contexto adicional opcional
- ✅ 3 variações geradas por chamada
- ✅ Cada variação com título, conteúdo, hashtags e ângulo
- ✅ Botão de copiar por variação
- ✅ Histórico salvo no Firestore
- ✅ Log do agente com todas as ações dos tenants
- ✅ Chamada via anthropicProxy (API key protegida)
- ✅ Brand voice da marca embutido no prompt

**Atenção:** A coleção `agentLogs` usada no log do admin é diferente da coleção `agentLog` dentro de cada empresa. Para o log do admin funcionar, o `agentTools.js` deve salvar também em uma coleção global `agentLogs` com o `companyId`. Atualizar `_logAction()` no `agentTools.js`:

```javascript
// Adicionar após o addDoc existente em _logAction():
await addDoc(collection(window._db, 'agentLogs'), {
  companyId: window._companyId,
  type, details,
  timestamp: new Date().toISOString(),
  view: state.currentView,
  plan: window._plan,
});
```

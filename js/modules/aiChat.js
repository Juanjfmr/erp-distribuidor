// ─── AI CHAT WIDGET ───────────────────────────────────────────────────────────
// Widget flutuante de chat com IA no canto inferior direito.

let _aiChatOpen = false;
let _aiChatMessages = [];
let _aiChatLoading = false;

// Injetado no DOM quando o app carrega
function aiChatInit() {
  // Só injeta se não existir ainda
  if (document.getElementById('ai-chat-widget')) return;

  const html = `
  <div id="ai-chat-widget" style="display:none">
    <!-- Botão flutuante -->
    <div id="ai-chat-btn" onclick="aiChatToggle()" title="Stoqio AI — Assistente"
      style="position:fixed;bottom:24px;right:24px;z-index:9999;width:52px;height:52px;border-radius:50%;
        background:linear-gradient(135deg,#6366f1,#4338ca);border:none;cursor:pointer;display:flex;
        align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(29,78,216,.4);
        transition:transform .2s,box-shadow .2s"
      onmouseover="this.style.transform='scale(1.08)';this.style.boxShadow='0 6px 24px rgba(29,78,216,.55)'"
      onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 16px rgba(29,78,216,.4)'">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 0 1 7.07 17.07L21 21l-1.93-1.93A10 10 0 1 1 12 2z"/>
        <path d="M7.5 9.5h9M7.5 13.5h5"/>
      </svg>
    </div>

    <!-- Painel de chat -->
    <div id="ai-chat-panel" style="display:none;position:fixed;bottom:88px;right:24px;z-index:9998;
      width:380px;max-height:520px;background:var(--bg2,#1a1a2e);border:1px solid var(--border,#333);
      border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.5);flex-direction:column;overflow:hidden;
      font-family:var(--font,-apple-system,sans-serif)">

      <!-- Cabeçalho -->
      <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;
        background:linear-gradient(135deg,rgba(37,99,235,.15),rgba(29,78,216,.1));
        border-bottom:1px solid var(--border,#333)">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4338ca);
          display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 2a10 10 0 0 1 7.07 17.07L21 21l-1.93-1.93A10 10 0 1 1 12 2z"/>
          </svg>
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:var(--text,#e0e0e0);line-height:1.2">Stoqio AI</div>
          <div style="font-size:11px;color:var(--muted,#888)">Assistente de gestão</div>
        </div>
        <button id="ai-playbook-btn" onclick="aiPlaybookRun()" title="Analisar operação — detectar alertas"
          style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);color:var(--amber);cursor:pointer;
            font-size:12px;padding:5px 10px;border-radius:8px;white-space:nowrap;transition:all .2s"
          onmouseover="this.style.background='rgba(245,158,11,.22)'"
          onmouseout="this.style.background='rgba(245,158,11,.12)'">🔔 Analisar</button>
        <button onclick="aiChatToggle()" style="background:none;border:none;color:var(--muted,#888);cursor:pointer;
          font-size:18px;padding:4px 8px;line-height:1;border-radius:6px"
          onmouseover="this.style.background='rgba(255,255,255,.05)'"
          onmouseout="this.style.background='none'"><svg width="14" height="14" style="vertical-align:middle"><use href="#icon-x"/></svg></button>
      </div>

      <!-- Mensagens -->
      <div id="ai-chat-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;
        min-height:200px;max-height:340px">
        <div style="display:flex;gap:8px">
          <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4338ca);
            display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-start">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 2a10 10 0 0 1 7.07 17.07L21 21l-1.93-1.93A10 10 0 1 1 12 2z"/>
            </svg>
          </div>
          <div style="background:var(--bg3,#252540);border-radius:12px;border-top-left-radius:4px;padding:10px 14px;
            font-size:13px;color:var(--text2,#bbb);max-width:85%;line-height:1.5">
            👋 Olá! Sou o assistente do <b>Stoqio</b>. Pergunte sobre seu negócio — faturamento, clientes inadimplentes, produtos com estoque baixo, pedidos recentes… Estou aqui pra ajudar!
          </div>
        </div>
      </div>

      <!-- Input -->
      <div style="padding:12px;border-top:1px solid var(--border,#333);display:flex;gap:8px;align-items:flex-end">
        <textarea id="ai-chat-input" rows="1" placeholder="Pergunte algo sobre seu negócio..."
          style="flex:1;background:var(--bg3,#252540);border:1px solid var(--border2,#444);border-radius:10px;
            padding:10px 14px;color:var(--text,#e0e0e0);font-size:13px;resize:none;outline:none;
            font-family:var(--font,-apple-system,sans-serif);max-height:100px;line-height:1.4"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiChatSend()}"
          oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
        <button id="ai-chat-send" onclick="aiChatSend()"
          style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4338ca);
            border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
            transition:opacity .2s"
          onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Mostrar quando o app estiver visível
  const observer = new MutationObserver(() => {
    const app = document.getElementById('app');
    const widget = document.getElementById('ai-chat-widget');
    if (app && widget) {
      widget.style.display = app.style.display === 'none' ? 'none' : 'block';
    }
  });
  const app = document.getElementById('app');
  if (app) {
    observer.observe(app, { attributes: true, attributeFilter: ['style'] });
    if (app.style.display !== 'none') {
      document.getElementById('ai-chat-widget').style.display = 'block';
    }
  }
}

function aiChatToggle() {
  _aiChatOpen = !_aiChatOpen;
  const panel = document.getElementById('ai-chat-panel');
  const btn = document.getElementById('ai-chat-btn');
  if (!panel) return;

  if (_aiChatOpen) {
    panel.style.display = 'flex';
    if (btn) btn.style.display = 'none';
    setTimeout(() => {
      const input = document.getElementById('ai-chat-input');
      if (input) input.focus();
      aiChatScrollDown();
    }, 100);
  } else {
    panel.style.display = 'none';
    if (btn) btn.style.display = 'flex';
  }
}

function aiChatScrollDown() {
  const msgs = document.getElementById('ai-chat-msgs');
  if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 50);
}

function aiChatAddMsg(role, text) {
  const msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;

  const isAI = role === 'ai';

  if (isAI) {
    // Remove typing indicator se existir
    const typing = document.getElementById('ai-chat-typing');
    if (typing) typing.remove();
  }

  const div = document.createElement('div');
  div.style.cssText = `display:flex;gap:8px;${isAI ? '' : 'justify-content:flex-end'}`;

  if (isAI) {
    div.innerHTML = `
      <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4338ca);
        display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-start">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2a10 10 0 0 1 7.07 17.07L21 21l-1.93-1.93A10 10 0 1 1 12 2z"/></svg>
      </div>
      <div style="background:var(--bg3,#252540);border-radius:12px;border-top-left-radius:4px;padding:10px 14px;
        font-size:13px;color:var(--text2,#bbb);max-width:85%;line-height:1.5;white-space:pre-wrap">${escapeHtml(text)}</div>`;
  } else {
    div.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(37,99,235,.25),rgba(29,78,216,.15));
        border-radius:12px;border-top-right-radius:4px;padding:10px 14px;
        font-size:13px;color:var(--text,#e0e0e0);max-width:85%;line-height:1.5;white-space:pre-wrap">${escapeHtml(text)}</div>`;
  }

  msgs.appendChild(div);
  aiChatScrollDown();
}

function aiChatShowTyping() {
  const msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) return;

  const div = document.createElement('div');
  div.id = 'ai-chat-typing';
  div.style.cssText = 'display:flex;gap:8px';
  div.innerHTML = `
    <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4338ca);
      display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-start">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2a10 10 0 0 1 7.07 17.07L21 21l-1.93-1.93A10 10 0 1 1 12 2z"/></svg>
    </div>
    <div style="background:var(--bg3,#252540);border-radius:12px;border-top-left-radius:4px;padding:10px 14px;
      display:flex;gap:4px;align-items:center">
      <span class="ai-dot" style="width:6px;height:6px;border-radius:50%;background:var(--muted,#666);animation:aiBounce .6s infinite alternate"></span>
      <span class="ai-dot" style="width:6px;height:6px;border-radius:50%;background:var(--muted,#666);animation:aiBounce .6s .2s infinite alternate"></span>
      <span class="ai-dot" style="width:6px;height:6px;border-radius:50%;background:var(--muted,#666);animation:aiBounce .6s .4s infinite alternate"></span>
    </div>`;
  msgs.appendChild(div);
  aiChatScrollDown();

  // Injeta keyframes se não existirem
  if (!document.getElementById('ai-chat-style')) {
    const style = document.createElement('style');
    style.id = 'ai-chat-style';
    style.textContent = `@keyframes aiBounce{from{transform:translateY(0);opacity:.4}to{transform:translateY(-5px);opacity:1}}`;
    document.head.appendChild(style);
  }
}

async function aiChatSend() {
  if (_aiChatLoading) return;
  const input = document.getElementById('ai-chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  _aiChatLoading = true;
  input.value = '';
  input.style.height = 'auto';
  const sendBtn = document.getElementById('ai-chat-send');
  if (sendBtn) sendBtn.style.opacity = '.4';

  aiChatAddMsg('user', text);
  aiChatShowTyping();

  try {
    const callable = window._httpsCallable(window._functions, 'aiChat');
    const result = await callable({ message: text });
    aiChatAddMsg('ai', result.data.reply);
  } catch (e) {
    aiChatAddMsg('ai', '❌ Erro ao consultar o assistente. Tente novamente em instantes.');
    console.error('aiChat error:', e);
  }

  _aiChatLoading = false;
  if (sendBtn) sendBtn.style.opacity = '1';
  input.focus();
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Playbook — Analisar operação ─────────────────────────────────────────────
let _playbookRunning = false;

async function aiPlaybookRun() {
  if (_playbookRunning) return;
  _playbookRunning = true;

  const btn = document.getElementById('ai-playbook-btn');
  if (btn) { btn.textContent = '⏳ Analisando...'; btn.style.opacity = '.6'; }

  const msgs = document.getElementById('ai-chat-msgs');
  if (!msgs) { _playbookRunning = false; return; }

  // Abre o chat se fechado
  if (!_aiChatOpen) aiChatToggle();

  // Limpa mensagens anteriores e mostra loading
  msgs.innerHTML = '';
  aiChatShowTyping();

  try {
    const callable = window._httpsCallable(window._functions, 'aiPlaybook');
    const result = await callable({});
    const data = result.data;

    // Remove typing
    const typing = document.getElementById('ai-chat-typing');
    if (typing) typing.remove();

    // Cabeçalho
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px';
    header.innerHTML = '<span style="font-size:14px">🔔</span><span style="font-size:13px;font-weight:700;color:var(--text)">Análise da Operação</span>';
    msgs.appendChild(header);

    // Alerta geral
    if (data.alertaGeral) {
      const div = document.createElement('div');
      div.style.cssText = 'background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--blue);line-height:1.5';
      div.textContent = data.alertaGeral;
      msgs.appendChild(div);
    }

    // Cards de alerta
    const severidadeColor = { alta: '#ef4444', media: '#f59e0b', baixa: '#6b7280' };
    const tipoIcone = { inadimplencia: '💰', estoque: '📦', faturamento: '📊', cliente: '👤', operacional: '⚙️' };

    if (data.alertas && data.alertas.length) {
      data.alertas.forEach(a => {
        const card = document.createElement('div');
        const cor = severidadeColor[a.severidade] || '#6b7280';
        card.style.cssText = `background:var(--bg3);border:1px solid var(--border);border-left:3px solid ${cor};border-radius:8px;padding:10px 12px;margin-bottom:10px`;
        card.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:13px">${tipoIcone[a.tipo] || '📌'}</span>
            <span style="font-size:13px;font-weight:700;color:var(--text)">${escapeHtml(a.titulo || '')}</span>
            <span style="font-size:10px;background:${cor}22;color:${cor};padding:1px 6px;border-radius:4px;font-weight:700;margin-left:auto">${(a.severidade||'').toUpperCase()}</span>
          </div>
          <div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:4px">${escapeHtml(a.mensagem || '')}</div>
          ${a.acao ? `<div style="font-size:11px;color:var(--amber);background:rgba(245,158,11,.06);padding:4px 8px;border-radius:4px">→ ${escapeHtml(a.acao)}</div>` : ''}`;
        msgs.appendChild(card);
      });
    } else {
      const div = document.createElement('div');
      div.style.cssText = 'text-align:center;padding:20px;color:var(--green);font-size:13px';
      div.innerHTML = '✅ <b>Nenhum alerta crítico encontrado.</b><br><span style="font-size:11px;color:var(--muted)">A operação parece estar sob controle.</span>';
      msgs.appendChild(div);
    }

    aiChatScrollDown();
  } catch (e) {
    const typing = document.getElementById('ai-chat-typing');
    if (typing) typing.remove();
    aiChatAddMsg('ai', '❌ Erro ao analisar a operação. Tente novamente.');
    console.error('aiPlaybook error:', e);
  }

  _playbookRunning = false;
  if (btn) { btn.textContent = '🔔 Analisar'; btn.style.opacity = '1'; }
}

// Auto-init quando o DOM estiver pronto e state carregar
document.addEventListener('DOMContentLoaded', () => {
  // Aguarda um pouco pro state e firebase inicializarem
  setTimeout(aiChatInit, 1500);
});
// Fallback: se DOMContentLoaded já passou
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  setTimeout(aiChatInit, 1500);
}

// ─── WhatsApp Floating Action Button ─────────────────────────────────────────
// Botão flutuante canto inferior direito. Número só é revelado ao clicar.
// Sem import/export — script global, carregado via <script src> em index.html,
// landing-v2.html, app.html, termos.html, privacidade.html.

(function () {
  'use strict';

  // Configuração — número entra aqui, único lugar no código
  var FAB_PHONE = '5521978775256';
  var FAB_DISPLAY_NUMBER = '(21) 97877-5256';
  var FAB_PREFILL_TEXT = 'Olá, vim pelo site do Stoqio e gostaria de saber mais.';
  var FAB_EMAIL = 'contato@stoqio.com.br';

  // Idempotente — não injeta duas vezes se script for carregado em duplicidade
  if (window.__stoqioFabMounted) return;
  window.__stoqioFabMounted = true;

  function injectStyles() {
    if (document.getElementById('stoqio-fab-styles')) return;
    var css = ''
      + '.stoq-fab-btn{position:fixed;bottom:24px;right:24px;z-index:9999;'
      + 'width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;'
      + 'background:#25D366;color:#fff;font-size:0;display:flex;align-items:center;'
      + 'justify-content:center;box-shadow:0 6px 20px rgba(37,211,102,.45),'
      + '0 2px 6px rgba(0,0,0,.2);transition:transform .2s,box-shadow .2s;'
      + 'animation:stoq-fab-pulse 2.4s ease-in-out infinite;outline:none}'
      + '.stoq-fab-btn:hover{transform:scale(1.08);box-shadow:0 8px 24px rgba(37,211,102,.55),0 3px 8px rgba(0,0,0,.25)}'
      + '.stoq-fab-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}'
      + '.stoq-fab-btn svg{width:32px;height:32px;display:block}'
      + '@keyframes stoq-fab-pulse{0%,100%{box-shadow:0 6px 20px rgba(37,211,102,.45),0 2px 6px rgba(0,0,0,.2)}'
      + '50%{box-shadow:0 6px 28px rgba(37,211,102,.7),0 2px 6px rgba(0,0,0,.2)}}'
      + '@media (prefers-reduced-motion: reduce){.stoq-fab-btn{animation:none}}'
      + '@media (max-width:480px){.stoq-fab-btn{bottom:16px;right:16px;width:56px;height:56px}}'
      + '.stoq-fab-panel{position:fixed;bottom:96px;right:24px;z-index:9998;'
      + 'width:320px;max-width:calc(100vw - 32px);border-radius:16px;'
      + 'background:#0f0f1a;color:#f1f5f9;border:1px solid rgba(255,255,255,.08);'
      + 'box-shadow:0 24px 48px rgba(0,0,0,.35),0 2px 8px rgba(0,0,0,.2);'
      + 'padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'
      + 'transform:translateY(8px) scale(.96);opacity:0;pointer-events:none;'
      + 'transition:transform .18s ease,opacity .18s ease}'
      + '.stoq-fab-panel.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}'
      + '.stoq-fab-panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}'
      + '.stoq-fab-panel h3{font-size:16px;font-weight:600;margin:0;color:#f1f5f9}'
      + '.stoq-fab-panel .stoq-close{background:transparent;border:none;color:#94a3b8;'
      + 'font-size:22px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:6px}'
      + '.stoq-fab-panel .stoq-close:hover{background:rgba(255,255,255,.06);color:#f1f5f9}'
      + '.stoq-fab-panel p{margin:0 0 14px;font-size:13px;color:#94a3b8;line-height:1.5}'
      + '.stoq-fab-number{font-size:20px;font-weight:600;letter-spacing:.3px;'
      + 'color:#a78bfa;margin:0 0 16px;font-variant-numeric:tabular-nums}'
      + '.stoq-fab-cta{display:flex;align-items:center;justify-content:center;gap:8px;'
      + 'width:100%;background:#25D366;color:#fff;border:none;border-radius:10px;'
      + 'padding:12px 16px;font-size:14px;font-weight:600;cursor:pointer;'
      + 'text-decoration:none;transition:background .15s;font-family:inherit}'
      + '.stoq-fab-cta:hover{background:#1ebe5d}'
      + '.stoq-fab-cta svg{width:18px;height:18px}'
      + '.stoq-fab-mail{display:block;margin-top:12px;font-size:12px;color:#64748b;'
      + 'text-align:center;text-decoration:none}'
      + '.stoq-fab-mail:hover{color:#94a3b8}'
      + '.stoq-fab-mail strong{color:#cbd5e1;font-weight:500}'
      // Variante light (para páginas claras: privacidade.html, termos.html)
      + 'body.stoq-fab-light .stoq-fab-panel{background:#fff;color:#0f172a;border:1px solid #e2e8f0;box-shadow:0 24px 48px rgba(15,23,42,.18),0 2px 8px rgba(15,23,42,.08)}'
      + 'body.stoq-fab-light .stoq-fab-panel h3{color:#0f172a}'
      + 'body.stoq-fab-light .stoq-fab-panel p{color:#64748b}'
      + 'body.stoq-fab-light .stoq-fab-number{color:#7c3aed}'
      + 'body.stoq-fab-light .stoq-fab-mail{color:#94a3b8}'
      + 'body.stoq-fab-light .stoq-fab-mail strong{color:#475569}'
      + 'body.stoq-fab-light .stoq-fab-panel .stoq-close{color:#64748b}'
      + 'body.stoq-fab-light .stoq-fab-panel .stoq-close:hover{background:rgba(15,23,42,.06);color:#0f172a}'
      // Mobile
      + '@media (max-width:480px){.stoq-fab-panel{bottom:84px;right:16px;width:auto;left:16px}}';
    var style = document.createElement('style');
    style.id = 'stoqio-fab-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Detecta tema claro para ativar variante light
  function detectLightTheme() {
    if (document.body.classList.contains('stoq-fab-light')) return;
    // Heurística simples: se body tem background claro (RGB total > 600), ativa light
    var bg = window.getComputedStyle(document.body).backgroundColor;
    var m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      var sum = parseInt(m[1], 10) + parseInt(m[2], 10) + parseInt(m[3], 10);
      if (sum > 600) document.body.classList.add('stoq-fab-light');
    }
  }

  function buildFab() {
    var btn = document.createElement('button');
    btn.className = 'stoq-fab-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Fale com a gente no WhatsApp');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'stoq-fab-panel');
    btn.innerHTML = ''
      + '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">'
      + '<path fill="currentColor" d="M16.001 3C9.373 3 4 8.373 4 15c0 2.41.71 4.66 1.937 6.553L4 29l7.62-1.99A11.95 11.95 0 0 0 16.001 27C22.629 27 28 21.627 28 15S22.629 3 16.001 3zm0 21.6a9.55 9.55 0 0 1-4.871-1.334l-.349-.207-4.522 1.18 1.208-4.41-.227-.36A9.6 9.6 0 1 1 25.6 15 9.61 9.61 0 0 1 16.001 24.6zm5.546-7.18c-.302-.151-1.787-.882-2.064-.982-.277-.1-.479-.151-.681.151-.202.302-.78.982-.957 1.184-.176.202-.353.227-.655.076-.302-.151-1.275-.47-2.43-1.498-.898-.8-1.504-1.79-1.681-2.092-.176-.302-.019-.466.132-.617.135-.135.302-.353.453-.53.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.53-.076-.151-.681-1.64-.933-2.246-.246-.59-.496-.51-.681-.52l-.58-.01c-.202 0-.53.076-.806.378-.277.302-1.058 1.033-1.058 2.518 0 1.486 1.083 2.92 1.234 3.121.151.202 2.13 3.252 5.166 4.561.722.312 1.286.498 1.726.637.725.231 1.385.198 1.906.12.582-.087 1.787-.73 2.04-1.436.252-.706.252-1.31.176-1.436-.076-.126-.277-.202-.58-.353z"/>'
      + '</svg>';
    return btn;
  }

  function buildPanel() {
    var panel = document.createElement('div');
    panel.className = 'stoq-fab-panel';
    panel.id = 'stoq-fab-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Fale com a equipe Stoqio');
    panel.innerHTML = ''
      + '<div class="stoq-fab-panel-head">'
      +   '<h3>Fale com a gente</h3>'
      +   '<button class="stoq-close" type="button" aria-label="Fechar">&times;</button>'
      + '</div>'
      + '<p>Atendimento humano, responde rápido.</p>'
      + '<p class="stoq-fab-number">' + FAB_DISPLAY_NUMBER + '</p>'
      + '<a class="stoq-fab-cta" href="https://wa.me/' + FAB_PHONE + '?text=' + encodeURIComponent(FAB_PREFILL_TEXT) + '" target="_blank" rel="noopener noreferrer">'
      +   '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">'
      +     '<path fill="currentColor" d="M16.001 3C9.373 3 4 8.373 4 15c0 2.41.71 4.66 1.937 6.553L4 29l7.62-1.99A11.95 11.95 0 0 0 16.001 27C22.629 27 28 21.627 28 15S22.629 3 16.001 3zm0 21.6a9.55 9.55 0 0 1-4.871-1.334l-.349-.207-4.522 1.18 1.208-4.41-.227-.36A9.6 9.6 0 1 1 25.6 15 9.61 9.61 0 0 1 16.001 24.6z"/>'
      +   '</svg>'
      +   'Abrir conversa no WhatsApp'
      + '</a>'
      + '<a class="stoq-fab-mail" href="mailto:' + FAB_EMAIL + '">Ou envie um e-mail: <strong>' + FAB_EMAIL + '</strong></a>';
    return panel;
  }

  function mountWhatsappFab() {
    if (document.getElementById('stoq-fab-panel')) return;
    injectStyles();
    detectLightTheme();

    var panel = buildPanel();
    var btn = buildFab();

    document.body.appendChild(panel);
    document.body.appendChild(btn);

    function open() {
      panel.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
      panel.classList.contains('open') ? close() : open();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });
    panel.querySelector('.stoq-close').addEventListener('click', close);
    document.addEventListener('click', function (e) {
      if (!panel.classList.contains('open')) return;
      if (panel.contains(e.target) || btn.contains(e.target)) return;
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });
  }

  // Auto-mount
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWhatsappFab);
  } else {
    mountWhatsappFab();
  }
})();

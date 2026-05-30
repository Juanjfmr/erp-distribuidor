// ─── INIT ────────────────────────────────────────────────────────────────────
(function init(){
  loadState();
  const days=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const months=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const now=new Date();
  el("topbar-date").textContent=`${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  el("sb-footer").textContent=`v2.0 · ${state.company&&state.company.name?state.company.name:"2R Comércio"}`;
  render();
})();

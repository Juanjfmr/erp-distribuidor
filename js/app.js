// ─── INIT ────────────────────────────────────────────────────────────────────
(function init(){
  loadState();
  const days=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const months=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const now=new Date();
  el("topbar-date").textContent=`${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  el("sb-footer").textContent=`v2.0 · ${state.company&&state.company.name?state.company.name:"2R Comércio"}`;
  // Auto-completar onboarding se a empresa já tem dados reais (evita bloquear empresas existentes)
  if (state.onboarding && !state.onboarding.complete) {
    const hasData = (state.products && state.products.length > 0)
      || (state.clients && state.clients.length > 0)
      || (state.invoices && state.invoices.length > 0)
      || (state.receivables && state.receivables.length > 0)
      || (state.transactions && state.transactions.length > 0);
    if (hasData) {
      state.onboarding.complete = true;
      saveState();
    }
  }
  if (shouldShowOnboarding && shouldShowOnboarding()) {
    state.currentView = 'onboarding';
  }
  render();
})();

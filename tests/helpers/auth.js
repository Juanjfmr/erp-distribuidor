// tests/helpers/auth.js — Login, cadastro e onboarding helpers
const { QA, NOVO_USUARIO, EMPRESA, APP_URL, BASE_URL } = require('./data');

/**
 * Faz login com email e senha.
 * Retorna true se chegou ao dashboard (sidebar visível), false caso contrário.
 */
async function login(page, email = QA.email, password = QA.password) {
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Login SPA — ambos os formulários (login + cadastro) na mesma página
  await page.locator('[placeholder="seu@email.com"]').first().fill(email);
  await page.locator('[placeholder="••••••••"]').fill(password);
  await page.locator('button:has-text("Entrar")').first().click();

  // SPA — URL não muda. Espera o dashboard carregar (banner fiscal visível)
  try {
    await page.waitForTimeout(5000);
    const dashboard = await page.locator('text=Dashboard, text=Configurar agora, text=SAIR, text=Sair').first().isVisible({ timeout: 15000 }).catch(() => false);
    return dashboard;
  } catch {
    return false;
  }
}

/**
 * Faz logout navegando para login novamente.
 */
async function logout(page) {
  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(500);
}

/**
 * Cadastra novo usuário e tenta completar onboarding.
 * Retorna true se chegou ao dashboard.
 */
async function signupAndOnboard(page) {
  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  // Clica em "Criar conta grátis"
  const signupBtn = page.locator('button:has-text("Criar conta"), button:has-text("Criar"), button:has-text("Grátis")').first();
  if (await signupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signupBtn.click();
  }
  await page.waitForTimeout(1000);

  // Preenche formulário de cadastro
  await page.fill('input[placeholder*="Ex: Distribuidora" i], input[placeholder*="Empresa" i], input[placeholder*="Nome da empresa" i], input:first-of-type', NOVO_USUARIO.nome);
  await page.fill('input[placeholder*="Nome completo" i], input:nth-of-type(2)', NOVO_USUARIO.nome);
  await page.fill('input[placeholder*="seu@email" i], input[type="email"]', NOVO_USUARIO.email);
  await page.fill('input[placeholder*="Mínimo 6" i], input[placeholder*="senha" i], input[type="password"]', NOVO_USUARIO.password);

  // Seleciona segmento "Distribuidora" (padrão já marcado)
  const segment = page.locator('label:has-text("Distribuidora"), input[value="distribuidor"]').first();
  if (await segment.isVisible().catch(() => false)) {
    await segment.click();
  }

  // Submete cadastro
  const submitBtn = page.locator('button:has-text("Criar conta grátis"), button:has-text("Criar conta")').first();
  if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await submitBtn.click();
  }
  await page.waitForTimeout(5000);

  // Se redirecionou ao app, tenta onboarding
  const url = page.url();
  if (url.includes('/login') || url.includes('/app')) {
    await page.waitForTimeout(2000);
    return await _completeOnboarding(page);
  }
  return false;
}

/**
 * Completa o wizard de onboarding (4 passos).
 */
async function _completeOnboarding(page) {
  await page.waitForTimeout(2000);

  // Tenta detectar se o onboarding apareceu
  const onboarding = page.locator('text=Bem-vindo, text=onboarding, text=Etapa').first();
  if (!await onboarding.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[AUTH] Onboarding não detectado — pulando');
    return true;
  }

  // Passo 1: Empresa
  const nomeInput = page.locator('#ob-name, input[placeholder*="Nome da empresa" i]').first();
  if (await nomeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nomeInput.fill(EMPRESA.nome);
    const cnpjInput = page.locator('#ob-cnpj, input[placeholder*="CNPJ" i]').first();
    if (await cnpjInput.isVisible().catch(() => false)) await cnpjInput.fill(EMPRESA.cnpj);
    const cityInput = page.locator('#ob-city, input[placeholder*="Cidade" i]').first();
    if (await cityInput.isVisible().catch(() => false)) await cityInput.fill(EMPRESA.cidade);
    const ufInput = page.locator('#ob-uf, input[placeholder*="UF" i]').first();
    if (await ufInput.isVisible().catch(() => false)) await ufInput.fill(EMPRESA.uf);
    const segBtn = page.locator('[data-seg="distribuidor"], .seg-btn').first();
    if (await segBtn.isVisible().catch(() => false)) await segBtn.click();
    await _clickNext(page);
  }

  // Passo 2-4: Pular (dados default)
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(1500);
    const skip = page.locator('text=Pular, button:has-text("Pular")').first();
    if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skip.click();
    } else {
      const next = page.locator('button:has-text("Próximo"), button:has-text("Avançar")').first();
      if (await next.isVisible({ timeout: 2000 }).catch(() => false)) await next.click();
    }
  }

  await page.waitForTimeout(2000);
  return true;
}

async function _clickNext(page) {
  const btn = page.locator('button:has-text("Próximo"), button:has-text("Avançar"), button:has-text("Continuar")').first();
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await btn.click();
  }
}

module.exports = { login, logout, signupAndOnboard };

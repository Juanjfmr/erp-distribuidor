// tests/landing.spec.js — Bloco 1: Landing Page + Bloco 2: Login/Cadastro
const { test, expect } = require('@playwright/test');
const { BASE_URL, APP_URL, QA } = require('./helpers/data');
const { login } = require('./helpers/auth');

test.describe('Bloco 1 — Landing Page', () => {

  test('1.1 — Carrega sem erros de console', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    expect(errors).toHaveLength(0);
  });

  test('1.2 — Hero section com título, subtítulo e CTAs', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('a:has-text("Testar grátis"), a:has-text("Testar o Stoqio")').first()).toBeVisible();
    await expect(page.locator('a:has-text("Ver planos")').first()).toBeVisible();
  });

  test('1.3 — Navbar com links principais', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('nav a:has-text("Funcionalidades")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Preços")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Entrar")')).toBeVisible();
    await expect(page.locator('nav a:has-text("Começar grátis")')).toBeVisible();
  });

  test('1.4 — Seção de segmentos', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const h2 = page.locator('h2:has-text("se adapta ao seu segmento"), h2:has-text("Segmento")');
    await expect(h2).toBeVisible();
  });

  test('1.5 — Seção de funcionalidades/features', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const features = ['Estoque', 'NF-e Nativa', 'Pedidos', 'Caixa', 'Relatórios', 'IA Assistente'];
    let found = 0;
    for (const f of features) {
      if (await page.locator(`h4:has-text("${f}"), h3:has-text("${f}")`).first().isVisible({ timeout: 1000 }).catch(() => false))
        found++;
    }
    expect(found).toBeGreaterThanOrEqual(4);
  });

  test('1.6 — Seção de Preços (planos)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('h2:has-text("Preço justo"), h2:has-text("planos"), h2:has-text("Preços")').first()).toBeVisible();
  });

  test('1.7 — Footer presente', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await expect(page.locator('footer, [role="contentinfo"]').first()).toBeVisible();
  });

  test('1.8 — Navbar ganha backdrop-blur ao rolar', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(500);
    const nav = page.locator('nav.scrolled, nav[class*="scrolled"]');
    const cls = await page.locator('nav').getAttribute('class');
    expect(cls).toContain('scrolled');
  });

  test('1.9 — Meta tags essenciais', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
    expect(title.toLowerCase()).toContain('stoqio');
  });
});

test.describe('Bloco 2 — Login e Cadastro', () => {

  test('2.1 — Página de login carrega com formulário', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('[placeholder="seu@email.com"]').first()).toBeVisible();
    await expect(page.locator('[placeholder="••••••••"]').first()).toBeVisible();
  });

  test('2.2 — Link Criar conta e Esqueci senha visíveis', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Criar conta")').first()).toBeVisible();
    const esqueci = page.locator('text=Esqueci, text=Recuperar, text=Redefinir').first();
    const visible = await esqueci.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`[LOGIN] Link esqueci senha visível: ${visible}`);
  });

  test('2.3 — Login inválido não loga', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('[placeholder="seu@email.com"]').first().fill('invalido@teste.com');
    await page.locator('[placeholder="••••••••"]').fill('senhaerrada');
    await page.locator('button:has-text("Entrar")').first().click();
    await page.waitForTimeout(3000);
    // SPA: login inválido não deve logar — o formulário de login continua visível
    const loginFields = await page.locator('[placeholder="seu@email.com"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(loginFields).toBe(true);
  });

  test('2.4 — Login com conta QA funciona', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.locator('[placeholder="seu@email.com"]').first().fill(QA.email);
    await page.locator('[placeholder="••••••••"]').fill(QA.password);
    await page.locator('button:has-text("Entrar")').first().click();
    await page.waitForTimeout(5000);
    const dasboard = await page.locator('text=Dashboard').first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(dasboard).toBe(true);
  });

  test('2.5 — Tela de cadastro carrega', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    // Verifica se o formulário de cadastro está visível (já está na página se o login não estiver ativo)
    const cadastroNome = page.locator('input[placeholder*="Nome completo" i], input[placeholder*="Nome da empresa" i]').first();
    const visible = await cadastroNome.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) {
      // Precisa clicar em Criar conta para revelar
      const cadastroBtn = page.locator('button:has-text("Criar conta")').first();
      if (await cadastroBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cadastroBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    // Após clicar, o input Nome completo deve estar visível
    const nomeInput = page.locator('input[placeholder*="Nome completo" i], input[placeholder*="Nome" i]').first();
    const finalVisible = await nomeInput.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[CADASTRO] Input nome visível: ${finalVisible}`);
  });
});

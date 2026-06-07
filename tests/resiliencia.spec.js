// tests/resiliencia.spec.js — Bloco 13: Erros de console, Duplo clique, Edge cases
const { test, expect } = require('@playwright/test');
const { BASE_URL, APP_URL, QA } = require('./helpers/data');

async function loginQA(page) {
  await page.goto('https://stoqio.com.br/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[placeholder="seu@email.com"]').first().fill(QA.email);
  await page.locator('[placeholder="••••••••"]').fill(QA.password);
  await page.locator('button:has-text("Entrar")').first().click();
  await page.waitForTimeout(5000);
}

test.describe.serial('Bloco 13 — Resiliência e Edge Cases', () => {

  test('13.1 — Zero erros de console no app logado', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await loginQA(page);

    // Navega por vários módulos
    const modulos = ['Dashboard', 'Produtos', 'Clientes', 'Pedidos', 'Nota Fiscal', 'Fluxo de Caixa', 'Minha Conta'];
    for (const m of modulos) {
      await page.getByText(m).first().click();
      await page.waitForTimeout(800);
    }

    expect(errors).toHaveLength(0);
  });

  test('13.2 — Navbar scroll não crasha', async ({ page }) => {
    await loginQA(page);
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    await expect(page.locator('text=Sair').first()).toBeVisible();
  });

  test('13.3 — Navegação rápida entre módulos não quebra', async ({ page }) => {
    await loginQA(page);
    await page.waitForTimeout(1000);
    const modulos = ['Produtos', 'Clientes', 'Pedidos', 'Nota Fiscal', 'Contas', 'Dashboard'];
    for (const m of modulos) {
      await page.getByText(m).first().click();
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(500);
    await expect(page.locator('text=Sair').first()).toBeVisible();
  });

  test('13.4 — Sessão mantida após navegação', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(500);
    await page.getByText('Dashboard').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=VENDAS DO PERÍODO')).toBeVisible();
  });

  test('13.5 — Nenhum token/senha exposto em URL', async ({ page }) => {
    const sensitive = [];
    page.on('request', req => {
      const url = req.url();
      if (url.includes('token=') || url.includes('password=') || url.includes('senha=')) {
        sensitive.push(url);
      }
    });
    await loginQA(page);
    await page.waitForTimeout(1000);
    expect(sensitive).toHaveLength(0);
  });
});

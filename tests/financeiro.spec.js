// tests/financeiro.spec.js — Bloco 7: Compras, Contas, Caixa + Bloco 8: Devoluções, Relatórios
const { test, expect } = require('@playwright/test');
const { QA } = require('./helpers/data');

async function loginQA(page) {
  await page.goto('https://stoqio.com.br/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[placeholder="seu@email.com"]').first().fill(QA.email);
  await page.locator('[placeholder="••••••••"]').fill(QA.password);
  await page.locator('button:has-text("Entrar")').first().click();
  await page.waitForTimeout(5000);
}

function navClick(page, name) {
  return page.getByText(name).first().click();
}

test.describe('Bloco 7 — Compras, Contas e Caixa', () => {

  test('7.1 — Compras carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Compras');
    await page.waitForTimeout(1000);
    // Apenas verifica que não crashou (sidebar + header still visible)
    await expect(page.locator('text=Sair').first()).toBeVisible();
  });

  test('7.2 — Contas carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Contas');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Sair').first()).toBeVisible();
  });

  test('7.3 — Fluxo de Caixa carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Fluxo de Caixa');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Sair').first()).toBeVisible();
  });

  test('7.4 — Dashboard mostra KPIs', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Dashboard');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=VENDAS DO PERÍODO')).toBeVisible();
    await expect(page.locator('text=SALDO EM CAIXA')).toBeVisible();
    await expect(page.locator('text=A RECEBER')).toBeVisible();
  });

  test('7.5 — Filtros de período no Dashboard', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Dashboard');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Hoje")')).toBeVisible();
    await expect(page.locator('button:has-text("Este mês")')).toBeVisible();
    await expect(page.locator('button:has-text("7 dias")')).toBeVisible();
  });
});

test.describe('Bloco 8 — Devoluções e Relatórios', () => {

  test('8.1 — Devoluções carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Devoluções');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Sair').first()).toBeVisible();
  });

  test('8.2 — Relatórios carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Relatórios');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Sair').first()).toBeVisible();
  });
});

// tests/pedido.spec.js — Bloco 5: Ciclo do Pedido
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

test.describe.serial('Bloco 5 — Ciclo do Pedido', () => {

  test('5.1 — Módulo Pedidos carrega', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Pedidos de Venda').first()).toBeVisible();
  });

  test('5.2 — Botão + Novo Pedido visível', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Novo Pedido")')).toBeVisible();
  });

  test('5.3 — Filtros de status (Todos / Rascunho / Confirmado / Faturado / Cancelado)', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Todos (')).toBeVisible();
    await expect(page.locator('text=Cancelado (')).toBeVisible();
  });

  test('5.4 — Tabela de pedidos com columns corretas', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    const cols = ['NÚMERO', 'CLIENTE', 'TOTAL', 'STATUS'];
    for (const c of cols) {
      await expect(page.locator(`th:has-text("${c}"), [class*="header"]:has-text("${c}")`).first()).toBeVisible({ timeout: 2000 });
    }
  });
});

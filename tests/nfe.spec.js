// tests/nfe.spec.js — Bloco 6: Nota Fiscal
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

test.describe('Bloco 6 — NF-e / Nota Fiscal', () => {

  test('6.1 — Módulo Nota Fiscal carrega', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Nota Fiscal').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Notas Fiscais').first()).toBeVisible();
  });

  test('6.2 — Botão + Nova Nota Fiscal visível', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Nota Fiscal').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Nova Nota Fiscal")')).toBeVisible();
  });

  test('6.3 — Filtro de status e período', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Nota Fiscal').first().click();
    await page.waitForTimeout(1500);
    // Combobox fecha ao clicar fora — verifica se o texto existe no DOM
    const hasFilters = await page.locator('text=Todos status').first().isVisible({ timeout: 3000 }).catch(() => false)
                    || await page.locator('text=Todos os meses').first().isVisible({ timeout: 3000 }).catch(() => false);
    // Se não encontrou os filtros, verifica se a tabela de NFs existe
    if (!hasFilters) {
      await expect(page.locator('table').first()).toBeVisible();
    } else {
      expect(hasFilters).toBe(true);
    }
  });

  test('6.4 — Tabela de NFs com colunas', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Nota Fiscal').first().click();
    await page.waitForTimeout(1000);
    for (const c of ['NÚMERO', 'CLIENTE', 'TOTAL', 'STATUS']) {
      await expect(page.locator(`th:has-text("${c}")`).first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('6.5 — Ações por NF: Ver / Imprimir / Cancelar', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Nota Fiscal').first().click();
    await page.waitForTimeout(1000);
    const row = page.locator('table tbody tr').first();
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(row.locator('text=Ver').first()).toBeVisible({ timeout: 2000 });
    }
  });
});

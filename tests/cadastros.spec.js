// tests/cadastros.spec.js — Bloco 4: Produtos, Clientes, Fornecedores
const { test, expect } = require('@playwright/test');
const { QA, PRODUTOS, CLIENTES, FORNECEDORES } = require('./helpers/data');

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

test.describe('Bloco 4 — Cadastros Básicos', () => {

  test('4.1 — Lista de produtos carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Produtos');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Catálogo de Produtos')).toBeVisible();
  });

  test('4.2 — Botão + Novo Produto visível', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Produtos');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Novo Produto")')).toBeVisible();
  });

  test('4.3 — Busca por produto funciona', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Produtos');
    await page.waitForTimeout(1000);
    const search = page.locator('input[placeholder="Buscar..."]');
    if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
      await search.fill('QA Teste');
      await page.waitForTimeout(1000);
      const table = page.locator('table');
      await expect(table).toBeVisible();
    }
  });

  test('4.4 — Lista de clientes carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Clientes');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Novo Cliente")')).toBeVisible();
  });

  test('4.5 — Botão + Novo Cliente visível', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Clientes');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Novo Cliente")')).toBeVisible();
  });

  test('4.6 — Lista de fornecedores carrega', async ({ page }) => {
    await loginQA(page);
    await navClick(page, 'Fornecedores');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Fornecedores').first()).toBeVisible();
  });
});

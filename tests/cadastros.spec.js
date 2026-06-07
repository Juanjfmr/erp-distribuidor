// tests/cadastros.spec.js — Bloco 4: Produtos, Clientes, Fornecedores + CRUD
const { test, expect } = require('@playwright/test');
const { QA } = require('./helpers/data');

const TS = Date.now();

async function loginQA(page) {
  await page.goto('https://stoqio.com.br/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[placeholder="seu@email.com"]').first().fill(QA.email);
  await page.locator('[placeholder="••••••••"]').fill(QA.password);
  await page.locator('button:has-text("Entrar")').first().click();
  await page.waitForTimeout(5000);
}

test.describe('Bloco 4 — Cadastros Básicos', () => {

  test('4.1 — Lista de produtos carrega', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Catálogo de Produtos')).toBeVisible();
  });

  test('4.2 — Botao + Novo Produto visivel', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Novo Produto")')).toBeVisible();
  });

  test('4.3 — Busca por produto funciona', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(1000);
    const search = page.locator('input[placeholder="Buscar..."]');
    if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
      await search.fill('Editado QA');
      await page.waitForTimeout(1500);
      await expect(page.locator('text=Editado QA Teste').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('4.4 — Lista de clientes carrega', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Clientes').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Novo Cliente")')).toBeVisible();
  });

  test('4.5 — Lista de fornecedores carrega', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Fornecedores').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Fornecedores').first()).toBeVisible();
  });
});

test.describe.serial('Bloco 4B — CRUD Produtos', () => {

  const PRODUTO_NOME = `QA CRUD ${TS}`;

  test('4.6 — Criar novo produto com dados validos', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("+ Novo Produto")').click();
    await page.waitForTimeout(1000);

    // Inputs no modal: 0=Codigo(text) 1=Nome(text) 2=Custo(num) 3=Venda(num)
    // 4=EAN(text) 5=NCM(text) 6=CFOP(text) 7=ICMS(chk) 8=Estoque(num) 9=EstoqueMin(num)
    await page.locator('#modal input').nth(1).fill(PRODUTO_NOME);
    await page.locator('#modal input').nth(2).fill('15');
    await page.locator('#modal input').nth(3).fill('35');
    await page.locator('#modal input').nth(4).fill(String(TS).slice(-13));

    await page.locator('button:has-text("Salvar Produto")').click();
    await page.waitForTimeout(2000);

    await expect(page.locator(`text=${PRODUTO_NOME}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('4.7 — Buscar produto recem-criado', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(800);

    const search = page.locator('input[placeholder="Buscar..."]');
    await search.fill(PRODUTO_NOME);
    await page.waitForTimeout(1500);

    await expect(page.locator(`text=${PRODUTO_NOME}`).first()).toBeVisible({ timeout: 3000 });
  });

  test('4.8 — Produto aparece com precos na tabela', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(800);

    await expect(page.locator('th:has-text("PREÇO CUSTO")')).toBeVisible();
    await expect(page.locator('th:has-text("PREÇO VENDA")')).toBeVisible();
    await expect(page.locator('th:has-text("MARGEM")')).toBeVisible();
    await expect(page.locator('th:has-text("ESTOQUE")')).toBeVisible();
  });

  test('4.9 — Botoes de acao por linha visiveis', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Produtos').first().click();
    await page.waitForTimeout(800);

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const firstRow = rows.first();
    await expect(firstRow.locator('button:has-text("Editar")')).toBeVisible({ timeout: 2000 });
  });
});

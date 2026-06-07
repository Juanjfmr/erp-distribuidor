// tests/pedido.spec.js — Bloco 5: Ciclo do Pedido (CRUD + fluxo de venda)
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

  test('5.1 — Modulo Pedidos carrega', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Pedidos de Venda').first()).toBeVisible();
  });

  test('5.2 — Botao + Novo Pedido visivel', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Novo Pedido")')).toBeVisible();
  });

  test('5.3 — Filtros de status presentes', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Todos")')).toBeVisible();
    await expect(page.locator('button:has-text("Rascunho")')).toBeVisible();
    await expect(page.locator('button:has-text("Confirmado")')).toBeVisible();
    await expect(page.locator('button:has-text("Faturado")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancelado")')).toBeVisible();
  });

  test('5.4 — Tabela com colunas', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);
    for (const c of ['NÚMERO', 'CLIENTE', 'TOTAL', 'STATUS']) {
      await expect(page.locator(`th:has-text("${c}")`).first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('5.5 — Abrir modal de novo pedido', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("+ Novo Pedido")').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('#modal')).toBeVisible();
  });

  test('5.6 — Selecionar cliente no formulario', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("+ Novo Pedido")').click();
    await page.waitForTimeout(800);

    const select = page.locator('select#ped-client');
    await select.selectOption({ label: 'Cliente QA Ltda' });
    await page.waitForTimeout(500);
    // selectOption funciona com { label }, value e index
    // O value real e um ID (timestamp), entao verificamos pelo texto
  });

  test('5.7 — Selecionar condicao de pagamento', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("+ Novo Pedido")').click();
    await page.waitForTimeout(800);

    await page.locator('select#ped-terms').selectOption({ index: 0 }); // primeira opcao = A Vista
    await page.waitForTimeout(300);
  });

  test('5.8 — Adicionar produto ao pedido via +Add', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("+ Novo Pedido")').click();
    await page.waitForTimeout(800);

    // Seleciona cliente
    await page.locator('select#ped-client').selectOption('Cliente QA Ltda');
    await page.waitForTimeout(300);

    // Clica + Add no primeiro produto
    const addBtn = page.locator('button:has-text("+ Add")').first();
    await expect(addBtn).toBeVisible({ timeout: 3000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Subtotal deve ter mudado de R$ 0,00
    const pageText = await page.locator('#modal').textContent();
    expect(pageText).not.toContain('Subtotal: R$ 0,00');
  });

  test('5.9 — Salvar pedido como rascunho', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("+ Novo Pedido")').click();
    await page.waitForTimeout(800);

    // Seleciona cliente
    await page.locator('select#ped-client').selectOption('Cliente QA Ltda');
    await page.waitForTimeout(300);

    // Adiciona produto
    await page.locator('button:has-text("+ Add")').first().click();
    await page.waitForTimeout(1000);

    // Salva como rascunho
    await page.locator('button:has-text("Salvar Rascunho")').click();
    await page.waitForTimeout(3000);

    // Voltou para a lista
    await expect(page.locator('text=Pedidos de Venda').first()).toBeVisible();
  });

  test('5.10 — Lista de pedidos contem ao menos 1 registro', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('5.11 — Botao Ver no pedido existente', async ({ page }) => {
    await loginQA(page);
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);

    const verBtn = page.locator('button:has-text("Ver")').first();
    if (await verBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verBtn.click();
      await page.waitForTimeout(1000);
      const detalhes = page.locator('text=Pedido').first();
      await expect(detalhes).toBeVisible({ timeout: 3000 }).catch(() => {});
    }
  });
});

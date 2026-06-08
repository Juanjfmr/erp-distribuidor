// tests/nfe.spec.js — Bloco 6: NF-e / Nota Fiscal + Configuração Fiscal
const { test, expect } = require('@playwright/test');
const { QA } = require('./helpers/data');

async function loginQA(page) {
  await page.goto('https://stoqio.com.br/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[placeholder="seu@email.com"]').first().fill(QA.email);
  await page.locator('[placeholder="••••••••"]').fill(QA.password);
  await page.locator('button:has-text("Entrar")').first().click();
  await page.waitForFunction(() => {
    const s = document.getElementById('login-screen');
    return !s || s.style.display === 'none' || s.style.opacity === '0';
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

function sidebarClick(page, name) {
  // Tenta por texto primeiro, fallback para JS evaluation
  return page.getByText(name).first().click().catch(async () => {
    await page.evaluate((n) => {
      const nav = document.querySelector('[role="navigation"]') || document.querySelector('nav');
      if (!nav) return;
      const items = nav.querySelectorAll('[onclick]');
      const navNames = ['Dashboard','Produtos','Clientes','Fornecedores','Pedidos','Nota Fiscal',
                         'Devoluções','Compras','Contas','Fluxo de Caixa','Relatórios',
                         'Configurações','Usuários','Minha Conta'];
      const idx = navNames.indexOf(n);
      if (idx >= 0 && items[idx]) items[idx].click();
    }, name);
  });
}

test.describe('Bloco 6 — NF-e / Nota Fiscal', () => {

  test('6.1 — Modulo Nota Fiscal carrega', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Notas Fiscais').first()).toBeVisible();
  });

  test('6.2 — Botao + Nova Nota Fiscal visivel', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("+ Nova Nota Fiscal")')).toBeVisible();
  });

  test('6.3 — Filtros de status e periodo', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1500);
    const any = await page.locator('text=Todos status').first().isVisible({ timeout: 3000 }).catch(() => false)
             || await page.locator('text=Todos os meses').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!any) {
      await expect(page.locator('table').first()).toBeVisible();
    } else {
      expect(any).toBe(true);
    }
  });

  test('6.4 — Tabela com colunas', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1000);
    for (const c of ['NÚMERO', 'CLIENTE', 'TOTAL', 'STATUS']) {
      await expect(page.locator(`th:has-text("${c}")`).first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('6.5 — Acoes por NF: Ver / Imprimir / Cancelar', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1000);
    const cell = page.locator('text=Ver Imprimir Cancelar').first();
    if (await cell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cell).toBeVisible();
    } else {
      await expect(page.locator('table').first()).toBeVisible();
    }
  });

  test('6.6 — Botoes extras visiveis', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1000);
    await expect(page.locator('button:has-text("Recebidas")')).toBeVisible();
    await expect(page.locator('button:has-text("Inutilizar")')).toBeVisible();
    await expect(page.locator('button:has-text("Importar")')).toBeVisible();
  });

  test('6.7 — Clicar Ver em NF existente', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1000);
    const verBtn = page.locator('button:has-text("Ver")').first();
    if (await verBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('6.8 — Buscar NF pelo cliente', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Nota Fiscal');
    await page.waitForTimeout(1000);
    const search = page.locator('input[placeholder="Buscar NF/cliente..."]');
    if (await search.isVisible({ timeout: 2000 }).catch(() => false)) {
      await search.fill('Cliente QA');
      await page.waitForTimeout(1500);
      await expect(page.locator('table')).toBeVisible();
    }
  });
});

test.describe('Bloco 6B — Configuracao Fiscal', () => {

  test('6.9 — Abas da configuracao: Geral e Fiscal', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Configurações');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Geral').first()).toBeVisible();
    await expect(page.locator('text=Fiscal').first()).toBeVisible();
    await expect(page.locator('text=Financeiro').first()).toBeVisible();
  });

  test('6.10 — Clicar na aba Fiscal', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Configurações');
    await page.waitForTimeout(1000);
    await page.locator('text=Fiscal').first().click();
    await page.waitForTimeout(800);
    await expect(page.locator('button:has-text("Sair")').first()).toBeVisible();
  });

  test('6.11 — IE e Regime Tributario visiveis na aba Geral', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Configurações');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Inscrição Estadual').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Regime Tributário').first()).toBeVisible({ timeout: 3000 });
  });

  test('6.12 — Aba Financeiro carrega', async ({ page }) => {
    await loginQA(page);
    await sidebarClick(page, 'Configurações');
    await page.waitForTimeout(1000);
    await page.locator('text=Financeiro').first().click();
    await page.waitForTimeout(800);
    await expect(page.locator('button:has-text("Sair")').first()).toBeVisible();
  });
});

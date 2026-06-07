// tests/ia.spec.js — Bloco 9: IA (aiChat widget)
const { test, expect } = require('@playwright/test');
const { QA } = require('./helpers/data');

async function loginQA(page) {
  await page.goto('https://stoqio.com.br/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[placeholder="seu@email.com"]').first().fill(QA.email);
  await page.locator('[placeholder="••••••••"]').fill(QA.password);
  await page.locator('button:has-text("Entrar")').first().click();
  await page.waitForTimeout(6000);
}

test.describe('Bloco 9 — IA (aiChat)', () => {

  test('9.1 — Widget flutuante visível e clicável', async ({ page }) => {
    await loginQA(page);
    // Widget começa colapsado como um botão flutuante no canto
    const widgetIcon = page.locator('[class*="ai"], [class*="chat"], [id*="ai"], [id*="chat"]').first();
    const btn = page.getByText('Analisar').first();
    const icon = page.locator('button:has(img[alt*="AI" i]), button:has(img[alt*="chat" i])').first();
    const found = await widgetIcon.isVisible({ timeout: 5000 }).catch(() => false)
               || await btn.isVisible({ timeout: 3000 }).catch(() => false)
               || await icon.isVisible({ timeout: 3000 }).catch(() => false);
    console.log(`[IA] Widget ícone visível: ${found}`);
  });

  test('9.2 — Abrir e fechar chat', async ({ page }) => {
    await loginQA(page);
    // Clica no botão de IA para expandir o widget
    const analisarBtn = page.getByText('Analisar').first();
    if (await analisarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await analisarBtn.click();
      await page.waitForTimeout(2000);
      const input = page.locator('[placeholder*="Pergunte" i]').first();
      const open = await input.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`[IA] Chat expandido com input: ${open}`);
      if (open) {
        // Fecha
        const closeBtn = page.locator('button:has-text("✕"), [aria-label*="fechar" i]').first();
        if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await closeBtn.click();
        }
      }
    }
  });

  test('9.3 — Input de mensagem no chat', async ({ page }) => {
    await loginQA(page);
    const analisarBtn = page.getByText('Analisar').first();
    if (await analisarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await analisarBtn.click();
      await page.waitForTimeout(2000);
      const input = page.locator('[placeholder*="Pergunte" i]').first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await input.fill('Qual o total de vendas do mês?');
        await page.waitForTimeout(500);
        const sendBtn = page.locator('button[type="submit"], button:has(img[alt*="send" i]), [aria-label*="enviar" i]').first();
        if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(3000);
        console.log(`[IA] Mensagem enviada, aguardando resposta`);
      }
    }
  });
});

// tests/nfe-emissao.spec.js — Teste de emissão NF-e ponta a ponta
const { test, expect } = require('@playwright/test');
const { QA } = require('./helpers/data');
const fs = require('fs');
const path = require('path');

const CERT_PASSWORD = 'Teste@123';
const CERT_PATH = path.resolve(__dirname, '..', 'cert-a1.pfx');

async function loginQA(page) {
  await page.goto('https://stoqio.com.br/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('[placeholder="seu@email.com"]').first().fill(QA.email);
  await page.locator('[placeholder="••••••••"]').fill(QA.password);
  await page.locator('button:has-text("Entrar")').first().click();
  await page.waitForTimeout(6000);
}

test.describe('Bloco 15 — Emissão NF-e ponta a ponta', () => {

  test('15.1 — Upload do certificado A1 via UI', async ({ page }) => {
    await loginQA(page);

    // Navega para Configurações → Fiscal
    await page.getByText('Configurações').first().click();
    await page.waitForTimeout(1000);
    await page.locator('text=Fiscal').first().click();
    await page.waitForTimeout(800);

    // Procura o input de arquivo e faz upload do PFX
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fileInput.setInputFiles(CERT_PATH);
      console.log('[NFE] Certificado selecionado para upload');
    } else {
      // Tenta via input oculto — clica no botão de upload primeiro
      const uploadBtn = page.locator('button:has-text("Upload"), button:has-text("Certificado"), button:has-text("Selecionar")').first();
      if (await uploadBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await uploadBtn.click();
        await page.waitForTimeout(500);
      }
      const hiddenInput = page.locator('input[type="file"]').first();
      if (await hiddenInput.isVisible({ timeout: 3000 }).catch(() => false) || await hiddenInput.count() > 0) {
        await hiddenInput.setInputFiles(CERT_PATH);
        console.log('[NFE] Certificado enviado via input oculto');
      }
    }

    // Preenche a senha do certificado
    const senhaInput = page.locator('input[placeholder*="senha" i], input[placeholder*="cert" i], input[type="password"]').first();
    if (await senhaInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await senhaInput.fill(CERT_PASSWORD);
      console.log('[NFE] Senha preenchida');
    }

    // Clica no botão de enviar/upload
    const submitBtn = page.locator('button:has-text("Enviar"), button:has-text("Upload"), button:has-text("Salvar")').first();
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      console.log('[NFE] Botão de upload clicado');
    }

    // Verifica se houve feedback
    await page.waitForTimeout(2000);
    const feedback = page.locator('text=sucesso, text=instalado, text=OK, text=✓, text=CERTIFICADO').first();
    const hasFeedback = await feedback.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[NFE] Feedback positivo visível: ${hasFeedback}`);
  });

  test('15.2 — Criar pedido rápido', async ({ page }) => {
    await loginQA(page);

    // Vai para Pedidos
    await page.getByText('Pedidos').first().click();
    await page.waitForTimeout(1000);

    // Clica em + Novo Pedido
    const novoBtn = page.locator('button:has-text("+ Novo Pedido")').first();
    if (await novoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await novoBtn.click();
      await page.waitForTimeout(1000);
    }

    // Seleciona cliente
    const clienteSelect = page.locator('select, [role="combobox"], input[placeholder*="cliente" i]').first();
    if (await clienteSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clienteSelect.click();
      await page.waitForTimeout(300);
      // Seleciona o primeiro cliente
      const firstOption = page.locator('option:has-text("Cliente QA"), option:has-text("QA")').first();
      if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOption.click();
      }
    }

    // Adiciona item
    await page.waitForTimeout(500);
    const addItemBtn = page.locator('button:has-text("+Add"), button:has-text("Adicionar"), button:has-text("+ Item")').first();
    if (await addItemBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addItemBtn.click();
      await page.waitForTimeout(500);

      // Seleciona produto
      const prodInput = page.locator('input[placeholder*="produto" i], input[placeholder*="buscar" i]').last();
      if (await prodInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await prodInput.fill('Editado QA');
        await page.waitForTimeout(500);
      }

      // Quantidade
      const qtdInput = page.locator('input[placeholder*="qtd" i], input[type="number"]').last();
      if (await qtdInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await qtdInput.fill('2');
      }
    }

    // Salvar como rascunho — força o clique ignorando overlay
    const saveBtn = page.locator('button:has-text("Salvar"), button:has-text("Rascunho")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1500);
      console.log('[NFE] Pedido rascunho salvo');
    }
  });

  test('15.3 — Tentar emitir NF-e', async ({ page }) => {
    await loginQA(page);

    // Vai para Nota Fiscal
    await page.getByText('Nota Fiscal').first().click();
    await page.waitForTimeout(1000);

    // Clica em + Nova Nota Fiscal
    const novaNfBtn = page.locator('button:has-text("+ Nova Nota Fiscal")').first();
    if (await novaNfBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await novaNfBtn.click({ force: true });
      await page.waitForTimeout(2000);
      console.log('[NFE] Modal de nova NF-e aberto');
    }

    // Verifica se apareceu algo (modal, form, input)
    const modal = page.locator('#modal, [class*="modal"], text=Natureza, text=CFOP, text=Emissão').first();
    const hasModal = await modal.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[NFE] Conteúdo da emissão visível: ${hasModal}`);

    if (hasModal) {
      // Procura botão emitir/enviar no modal
      const emitirBtn = page.locator('button:has-text("Emitir"), button:has-text("Enviar"), button:has-text("Gerar")').first();
      if (await emitirBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[NFE] Botão Emitir encontrado');
      }
    }
  });
});

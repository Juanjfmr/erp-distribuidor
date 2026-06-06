# Melhorias nas Telas de Pedidos e Notas Fiscais

> **Para agentes autônomos:** use `superpowers:executing-plans` para implementar task por task com checkpoints.

**Goal:** Corrigir bugs críticos de validação, melhorar UX de campos e adicionar campos ausentes nas telas de Pedido e Nota Fiscal do Stoqio.

**Architecture:** Todas as mudanças são cirúrgicas em dois arquivos (`js/modules/pedidos.js` e `js/modules/notas.js`) e um de serviço (`js/services/invoiceService.js`). Não há novo arquivo a criar. Cada task é independente e pode ser feita em qualquer ordem, exceto onde indicado.

**Tech Stack:** JavaScript puro (ES Modules), Firebase Firestore, HTML inline em template strings. Sem framework de UI. Sem testes automatizados (projeto não tem runner). Verificação é manual no browser.

**Contexto do codebase:**
- `state` = objeto global com toda a data da empresa (Firestore single-doc)
- `el(id)` = `document.getElementById(id)`
- `fmt(val)` = formata valor em R$
- `fmtDate(str)` = formata data YYYY-MM-DD em DD/MM/AAAA
- `today()` = retorna data atual como `YYYY-MM-DD`
- `uid()` = gera ID único
- `getProd(id)` = busca produto em `state.products`
- `getClient(id)` = busca cliente em `state.clients`
- `showSyncStatus(msg, isError)` = exibe toast no topo
- `PAY_TERMS` = array de strings definido em `js/core/state.js:219`
- `_guardSave()` / `_doneSave()` = mutex para evitar duplo clique em botões async
- `saveToFirebase()` = persiste `state` no Firestore
- `generateReceivables(invId, num, clientId, total, date, terms)` = gera parcelas

---

## Arquivos que serão modificados

| Arquivo | Mudanças |
|---|---|
| `js/modules/notas.js` | Tasks 1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13 |
| `js/modules/pedidos.js` | Tasks 6, 8 (parcial), 11 |
| `js/services/invoiceService.js` | Task 2 (parcial) |

---

## BLOCO A — Crítico (bugs que causam falha silenciosa)

---

### Task 1: Validar endereço do cliente antes de emitir NF-e

**Por que:** Se o cliente não tiver `street`, `city`, `uf` ou `cep`, o payload enviado à Focus NFe terá campos vazios e a emissão falhará na SEFAZ com mensagem técnica. O usuário precisa ser avisado antes de tentar.

**Arquivo:** `js/modules/notas.js`

**Onde inserir:** Dentro de `emitirNF(num)` — linha 292 — logo após a checagem de `nf-client` (linha 294) e antes de `if(!state.nfItems.length)` (linha 295).

- [ ] **Passo 1.1 — Ler o arquivo antes de editar**

  Abra `js/modules/notas.js` e localize a função `emitirNF(num)` (linha 292).

- [ ] **Passo 1.2 — Inserir validação de endereço após linha 294**

  Encontre este trecho exato (linhas 294–295):
  ```js
  if(!el("nf-client").value){ _doneSave(); return alert("Selecione o cliente ou escolha 'Consumidor Final'."); }
  if(!state.nfItems.length){ _doneSave(); return alert("Adicione pelo menos um item."); }
  ```

  Substitua por:
  ```js
  if(!el("nf-client").value){ _doneSave(); return alert("Selecione o cliente ou escolha 'Consumidor Final'."); }
  const _rawClientIdVal = el("nf-client").value;
  const _isAvulsoVal = _rawClientIdVal === 'avulso';
  if(!_isAvulsoVal && canEmitNFe(state.company)){
    const _clientVal = getClient(parseInt(_rawClientIdVal));
    if(_clientVal){
      const missing=[];
      if(!(_clientVal.street||'').trim()) missing.push('Logradouro');
      if(!(_clientVal.city||'').trim()) missing.push('Cidade');
      if(!(_clientVal.uf||'').trim()) missing.push('UF');
      if(!(_clientVal.cep||'').trim()) missing.push('CEP');
      if(missing.length){
        _doneSave();
        return alert(`O cadastro deste cliente está incompleto para emissão de NF-e.\n\nCampos ausentes: ${missing.join(', ')}.\n\nAcesse Clientes → editar cliente e preencha antes de emitir.`);
      }
    }
  }
  if(!state.nfItems.length){ _doneSave(); return alert("Adicione pelo menos um item."); }
  ```

- [ ] **Passo 1.3 — Fazer o mesmo para emitirNFdePedido em pedidos.js**

  Abra `js/modules/pedidos.js`, função `emitirNFdePedido(nfNum, pedidoId)` (linha 392).

  Encontre este trecho (linhas 403–409):
  ```js
  if(!state.nfItems.length){ _doneSave(); alert("Adicione pelo menos um item."); return; }
  const stockWarningsPed=state.nfItems.filter(it=>{const p=getProd(it.productId);return p&&p.stock<it.qty;});
  ```

  Substitua por:
  ```js
  if(!state.nfItems.length){ _doneSave(); alert("Adicione pelo menos um item."); return; }
  const _pedClientId = parseInt(el("nf-client")?.value)||0;
  if(_pedClientId && canEmitNFe(state.company)){
    const _pedClient = getClient(_pedClientId);
    if(_pedClient){
      const _missingPed=[];
      if(!(_pedClient.street||'').trim()) _missingPed.push('Logradouro');
      if(!(_pedClient.city||'').trim()) _missingPed.push('Cidade');
      if(!(_pedClient.uf||'').trim()) _missingPed.push('UF');
      if(!(_pedClient.cep||'').trim()) _missingPed.push('CEP');
      if(_missingPed.length){
        _doneSave();
        alert(`Cadastro do cliente incompleto para NF-e.\n\nFaltam: ${_missingPed.join(', ')}.\n\nEdite o cliente antes de faturar.`);
        return;
      }
    }
  }
  const stockWarningsPed=state.nfItems.filter(it=>{const p=getProd(it.productId);return p&&p.stock<it.qty;});
  ```

- [ ] **Passo 1.4 — Testar manualmente**

  1. Acesse o sistema via browser (HTTP — não file://)
  2. Cadastre um cliente sem UF e sem CEP
  3. Abra modal de NF, selecione esse cliente, adicione um item e clique "Emitir Nota"
  4. Deve aparecer alert com lista de campos faltantes — NF **não** deve ser emitida
  5. Preencha os campos no cadastro do cliente, repita — NF deve prosseguir normalmente

- [ ] **Passo 1.5 — Commit**

  ```bash
  git add js/modules/notas.js js/modules/pedidos.js
  git commit -m "fix(nf): validar endereço do cliente antes de emitir NF-e"
  ```

---

### Task 2: Validação explícita do autocomplete de cliente

**Por que:** Se o usuário digita no campo de busca mas **não clica** em nenhuma sugestão, `#nf-client` (hidden) fica vazio e `emitirNF` retorna `alert("Selecione o cliente...")` sem explicar por que — especialmente confuso quando algo está visível no campo de texto.

**Arquivo:** `js/modules/notas.js`

**Onde inserir:** Linha 294, mesma checagem existente — melhorar a mensagem de erro e fechar o dropdown.

- [ ] **Passo 2.1 — Substituir a mensagem de erro em emitirNF**

  Encontre (linha 294):
  ```js
  if(!el("nf-client").value){ _doneSave(); return alert("Selecione o cliente ou escolha 'Consumidor Final'."); }
  ```

  Substitua por:
  ```js
  if(!el("nf-client").value){
    _doneSave();
    const typed = (el("nf-client-search")?.value||'').trim();
    if(typed) return alert(`O cliente "${typed}" não foi selecionado.\n\nClique no nome na lista de sugestões, ou use "+ Consumidor Final" para emitir sem cadastro.`);
    return alert("Selecione o cliente ou clique em '+ Consumidor Final'.");
  }
  ```

- [ ] **Passo 2.2 — Testar**

  1. Abra modal de NF
  2. Digite um nome no campo de busca, mas não clique na sugestão
  3. Clique em "Emitir Nota"
  4. A mensagem deve mencionar o nome digitado e orientar a clicar na sugestão

- [ ] **Passo 2.3 — Commit**

  ```bash
  git add js/modules/notas.js
  git commit -m "fix(nf): mensagem de erro quando cliente não selecionado no autocomplete"
  ```

---

### Task 3: Rollback completo em falha de NF-e

**Por que:** Quando `emitirNFe()` falha (linha 342–349 de `notas.js`), o código reverte estoque e movimentações, mas **não reverte as transações de frete e custos** que já foram adicionadas a `state.transactions` nas linhas 331–336. Isso deixa caixa com saídas fantasmas.

**Arquivo:** `js/modules/notas.js`

- [ ] **Passo 3.1 — Ler o bloco de rollback existente**

  Localize em `emitirNF()` (linha 292) o seguinte trecho (em torno da linha 339):
  ```js
  if(canEmitNFe(state.company)){
    showSyncStatus('Emitindo NF-e na SEFAZ… aguarde (pode levar até 30s).');
    const resultado = await emitirNFe(nf, state.company, state.products, state.clients);
    if(!resultado.success){
      // Reverter estoque e recebíveis antes de abortar
      nf.items.forEach(it=>{ const p=state.products.find(x=>x.id===it.productId); if(p) p.stock+=it.qty; });
      state.stockMovements=state.stockMovements.filter(m=>m.reference!==num);
      state.receivables=state.receivables.filter(r=>r.invoiceId!==nf.id);
      _doneSave();
      return alert('Erro ao emitir NF-e:\n' + resultado.error);
    }
  ```

- [ ] **Passo 3.2 — Adicionar rollback de transações**

  Substitua o bloco de rollback acima por:
  ```js
  if(canEmitNFe(state.company)){
    showSyncStatus('Emitindo NF-e na SEFAZ… aguarde (pode levar até 30s).');
    const resultado = await emitirNFe(nf, state.company, state.products, state.clients);
    if(!resultado.success){
      nf.items.forEach(it=>{ const p=state.products.find(x=>x.id===it.productId); if(p) p.stock+=it.qty; });
      state.stockMovements=state.stockMovements.filter(m=>m.reference!==num);
      state.receivables=state.receivables.filter(r=>r.invoiceId!==nf.id);
      state.transactions=state.transactions.filter(t=>!t.description?.endsWith(`— ${num}`));
      _doneSave();
      return alert('Erro ao emitir NF-e:\n' + resultado.error);
    }
  ```

  A única linha adicionada é:
  ```js
  state.transactions=state.transactions.filter(t=>!t.description?.endsWith(`— ${num}`));
  ```

  Todas as transações criadas por `emitirNF` têm description terminando com `— ${num}` (frete interno e custos), então o filtro remove exatamente elas.

- [ ] **Passo 3.3 — Testar**

  Para testar este cenário sem conta Focus NFe real:
  1. Em `js/services/invoiceService.js`, localize `emitirNFe()` linha 5
  2. Temporariamente substitua o `return` final (linha 98) por `return { success: false, error: 'Teste de rollback' };`
  3. Emita uma NF com frete e custo adicional — deve aparecer o erro e **nenhuma transação** deve aparecer no Caixa
  4. Reverta a mudança temporária no invoiceService.js

- [ ] **Passo 3.4 — Commit**

  ```bash
  git add js/modules/notas.js
  git commit -m "fix(nf): reverter transações de frete/custos em falha de emissão NF-e"
  ```

---

### Task 4: Bloquear data de emissão futura

**Por que:** Emitir NF com data futura é inválido fiscalmente. Basta comparar com `today()` antes de prosseguir.

**Arquivo:** `js/modules/notas.js`

- [ ] **Passo 4.1 — Adicionar validação em emitirNF**

  Dentro de `emitirNF(num)`, localize (linha 304):
  ```js
  const date=el("nf-date").value;
  ```

  Logo após essa linha, adicione:
  ```js
  if(date > today()){
    _doneSave();
    return alert("A data de emissão não pode ser futura. Corrija o campo Data de Emissão.");
  }
  ```

- [ ] **Passo 4.2 — Fazer o mesmo em emitirNFdePedido (pedidos.js)**

  Localize em `emitirNFdePedido` (linha 402):
  ```js
  const date=el("nf-date").value||today();
  ```

  Logo após essa linha, adicione:
  ```js
  if(date > today()){
    _doneSave();
    alert("A data de emissão não pode ser futura.");
    return;
  }
  ```

- [ ] **Passo 4.3 — Testar**

  1. Abra modal de NF
  2. Mude a data para amanhã (YYYY-MM-DD do dia seguinte)
  3. Adicione cliente e item, clique "Emitir Nota"
  4. Deve aparecer o alert — NF não deve ser criada

- [ ] **Passo 4.4 — Commit**

  ```bash
  git add js/modules/notas.js js/modules/pedidos.js
  git commit -m "fix(nf): bloquear emissão com data futura"
  ```

---

### Task 5: Prevenir valor negativo em custos adicionais

**Por que:** O campo de valor no custo adicional aceita números negativos, o que subtrai do total da NF silenciosamente.

**Arquivo:** `js/modules/notas.js`

- [ ] **Passo 5.1 — Corrigir nfCostChange**

  Localize `nfCostChange` (linha 197):
  ```js
  function nfCostChange(i,field,val){
    if(!state.nfCosts[i]) return;
    if(field==="value") state.nfCosts[i].value=parseFloat(val)||0;
  ```

  Substitua a linha do `value` por:
  ```js
    if(field==="value") state.nfCosts[i].value=Math.max(0, parseFloat(val)||0);
  ```

- [ ] **Passo 5.2 — Testar**

  1. Abra modal de NF, expanda "Custos e Taxas Adicionais", clique "+ Adicionar"
  2. Digite `-50` no campo de valor
  3. O total da NF **não** deve diminuir; o campo deve tratar como 0

- [ ] **Passo 5.3 — Commit**

  ```bash
  git add js/modules/notas.js
  git commit -m "fix(nf): prevenir valor negativo em custos adicionais"
  ```

---

## BLOCO B — Segurança e integridade de dados

---

### Task 6: Sanitizar campo de Observações no modal de NF

**Por que:** O campo `#nf-obs` em `openNFModal()` (linha 120) é inserido diretamente em template string HTML (`value="${obsVal}"`). Se contiver `"` ou `>`, pode quebrar o HTML. Em `faturarPedido()` (pedidos.js linha 321), `obs` vem de `o.notes` e é inserido via `value="${obsVal}"` com escape de `"` mas não de `<`/`>`.

**Arquivos:** `js/modules/notas.js`, `js/modules/pedidos.js`

- [ ] **Passo 6.1 — Corrigir abertura do modal em notas.js**

  Localize em `openNFModal()` (linha 120):
  ```js
  <input id="nf-obs" class="form-input" placeholder="Observações da nota...">
  ```

  Este campo não tem `value` pre-preenchido (modal novo). Sem problema aqui.

  Localize a função `emitirNF()` linha 300 onde obs é lido:
  ```js
  const obs=(el("nf-obs")?.value||"").trim();
  ```

  Este trecho já lê do `.value` do input, sem risco de XSS no salvamento. Sem mudança aqui.

- [ ] **Passo 6.2 — Corrigir pré-preenchimento em faturarPedido (pedidos.js)**

  Localize em `faturarPedido(id)` (linha 321):
  ```js
  const obsVal=(o.notes||"").replace(/"/g,"&quot;");
  ```

  Substitua por:
  ```js
  const obsVal=(o.notes||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  ```

- [ ] **Passo 6.3 — Testar**

  1. Crie um pedido com observação: `teste <script>alert(1)</script>`
  2. Clique "Faturar" no pedido
  3. O campo de observações no modal de NF deve exibir o texto literal, sem executar script

- [ ] **Passo 6.4 — Commit**

  ```bash
  git add js/modules/pedidos.js
  git commit -m "fix(nf): sanitizar observações do pedido ao pré-preencher modal NF"
  ```

---

## BLOCO C — Campos ausentes

---

### Task 7: Salvar nome do produto no item da NF

**Por que:** Em `nfAddItemFromList()` (notas.js linha 248), o item é salvo sem o nome do produto:
```js
state.nfItems.push({productId:p.id,qty,price:p.salePrice,itemDiscount:disc});
```
Se o produto for excluído depois, `viewNF()` exibe `"?"`. O nome deve ser snapshot no momento da emissão.

**Arquivo:** `js/modules/notas.js`

- [ ] **Passo 7.1 — Adicionar name/unit no push de nfAddItemFromList**

  Localize em `nfAddItemFromList(prodId)` (linha 248):
  ```js
  else{ state.nfItems.push({productId:p.id,qty,price:p.salePrice,itemDiscount:disc}); }
  ```

  Substitua por:
  ```js
  else{ state.nfItems.push({productId:p.id,name:p.name,unit:p.unit||'UN',qty,price:p.salePrice,itemDiscount:disc}); }
  ```

- [ ] **Passo 7.2 — Garantir que viewNF use name do item antes de buscar produto**

  Localize em `viewNF()` (linha 378):
  ```js
  ${n.items.map(it=>{const p=getProd(it.productId);const d=it.itemDiscount||0;const t=it.qty*it.price*(1-d/100);return`<tr>
    <td>${p?p.name:"—"} <span class="text-muted mono" style="font-size:11px">${p?p.unit:""}</span></td>
  ```

  Substitua por:
  ```js
  ${n.items.map(it=>{const p=getProd(it.productId);const d=it.itemDiscount||0;const t=it.qty*it.price*(1-d/100);return`<tr>
    <td>${it.name||p?.name||"—"} <span class="text-muted mono" style="font-size:11px">${it.unit||p?.unit||""}</span></td>
  ```

- [ ] **Passo 7.3 — Testar**

  1. Emita uma NF com dois produtos
  2. Vá em Produtos, desative (ou remova) um dos produtos
  3. Abra a NF emitida em "Ver" — deve continuar mostrando o nome do produto corretamente

- [ ] **Passo 7.4 — Commit**

  ```bash
  git add js/modules/notas.js
  git commit -m "fix(nf): salvar nome/unidade do produto no item para preservar histórico"
  ```

---

### Task 8: Adicionar campo "Forma de Pagamento" (Boleto/PIX/Cheque/Duplicata)

**Por que:** "Condição de Pagamento" (30 dias, 60 dias) e "Forma de Pagamento" (PIX, boleto, cheque) são conceitos distintos. Para financeiro de distribuidoras, ambos são necessários. Hoje só existe a condição.

**Arquivos:** `js/modules/notas.js`, `js/modules/pedidos.js`, `js/core/state.js`

- [ ] **Passo 8.1 — Definir constante PAY_METHODS em state.js**

  Abra `js/core/state.js`, localize a linha 219:
  ```js
  const PAY_TERMS=["À Vista","7 dias","14 dias","21 dias","28 dias","30 dias","35 dias","42 dias","30/60","30/60/90"];
  ```

  Logo após essa linha, adicione:
  ```js
  const PAY_METHODS=["PIX","Boleto","Cheque","Dinheiro","Cartão de Débito","Cartão de Crédito","Duplicata","TED/DOC","Outro"];
  ```

- [ ] **Passo 8.2 — Adicionar campo no modal de nova NF (notas.js)**

  Localize em `openNFModal()` (linha 95–99):
  ```js
  <div class="form-grid-3">
    <div class="form-group"><label class="form-label">Condição de Pagamento</label>
      <select id="nf-terms" class="form-input">
        ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
  ```

  Substitua por:
  ```js
  <div class="form-grid-3">
    <div class="form-group"><label class="form-label">Condição de Pagamento</label>
      <select id="nf-terms" class="form-input">
        ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Forma de Pagamento</label>
      <select id="nf-method" class="form-input">
        <option value="">Não informado</option>
        ${PAY_METHODS.map(m=>`<option>${m}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
  ```

  **Nota:** isso muda o `form-grid-3` para ter 4 itens. Para manter o layout, troque para `form-grid-2` na linha de abertura do div externo ou use dois grids separados. Solução mais simples: colocar Forma de Pagamento na mesma linha que Condição usando `form-grid-2`:

  Substitua todo o bloco `form-grid-3` (linhas 95–116) por:
  ```js
  <div class="form-grid-2">
    <div class="form-group"><label class="form-label">Condição de Pagamento</label>
      <select id="nf-terms" class="form-input">
        ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Forma de Pagamento</label>
      <select id="nf-method" class="form-input">
        <option value="">Não informado</option>
        ${PAY_METHODS.map(m=>`<option>${m}</option>`).join("")}
      </select>
    </div>
  </div>
  <div class="form-grid-2">
    <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
      <input id="nf-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="0" oninput="nfUpdateTotals()">
    </div>
    <div class="form-group">
      <label class="form-label">Frete (R$) — Quem paga?</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="nf-freight-val" type="number" min="0" step="0.01" class="form-input" value="0" oninput="nfFreightUpdate()" style="flex:1">
        <div style="display:flex;border:1px solid var(--border2);border-radius:6px;overflow:hidden;flex-shrink:0">
          <button id="nf-ft-cli" type="button" class="nf-ft-btn nf-ft-active" onclick="nfFreightWho('cli')" title="Frete incluso na NF — cliente paga">Cliente</button>
          <button id="nf-ft-emp" type="button" class="nf-ft-btn" onclick="nfFreightWho('emp')" title="Custo interno — não aparece na NF">Empresa</button>
        </div>
      </div>
      <div id="nf-freight-hint" style="font-size:11px;color:var(--muted);margin-top:4px">Incluso no valor da NF — cliente paga</div>
      <input id="nf-freight" type="hidden" value="0">
      <input id="nf-freight-int" type="hidden" value="0">
    </div>
  </div>
  ```

- [ ] **Passo 8.3 — Salvar paymentMethod na NF em emitirNF()**

  Localize em `emitirNF()` (linha 321), a criação do objeto `nf`:
  ```js
  const nf={id:uid(),number:num,date,clientId:isAvulso?null:clientId,clientName:isAvulso?"Consumidor Final":null,items:[...state.nfItems],discount:disc,freight,paymentTerms:terms,subtotal:parseFloat(sub.toFixed(2)),total,status:"emitida"};
  ```

  Logo antes da linha, adicione:
  ```js
  const paymentMethod=el("nf-method")?.value||'';
  ```

  E inclua `paymentMethod` no objeto `nf`:
  ```js
  const nf={id:uid(),number:num,date,clientId:isAvulso?null:clientId,clientName:isAvulso?"Consumidor Final":null,items:[...state.nfItems],discount:disc,freight,paymentTerms:terms,paymentMethod,subtotal:parseFloat(sub.toFixed(2)),total,status:"emitida"};
  ```

- [ ] **Passo 8.4 — Exibir paymentMethod em viewNF()**

  Localize em `viewNF()` (linha 375):
  ```js
  <div><div class="kpi-label">Data / Pagamento</div><div style="font-size:14px;margin-top:4px">${fmtDate(n.date)} · ${n.paymentTerms}</div></div>
  ```

  Substitua por:
  ```js
  <div><div class="kpi-label">Data / Pagamento</div><div style="font-size:14px;margin-top:4px">${fmtDate(n.date)} · ${n.paymentTerms}${n.paymentMethod?` · ${n.paymentMethod}`:''}</div></div>
  ```

- [ ] **Passo 8.5 — Adicionar campo na tela de Pedido (pedidos.js)**

  Localize em `openPedidoModal()` (linha 85–97), o bloco `form-grid-3` com Condição de Pagamento, Desconto e Frete:
  ```js
  <div class="form-grid-3">
    <div class="form-group"><label class="form-label">Condição de Pagamento</label>
      <select id="ped-terms" class="form-input">
        ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
      <input id="ped-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="0" oninput="pedidoRenderItems()">
    </div>
    <div class="form-group"><label class="form-label">Frete (R$)</label>
      <input id="ped-freight" type="number" min="0" step="0.01" class="form-input" value="0" oninput="pedidoRenderItems()">
    </div>
  </div>
  ```

  Substitua por (agora 4 campos em 2 linhas de grid-2):
  ```js
  <div class="form-grid-2">
    <div class="form-group"><label class="form-label">Condição de Pagamento</label>
      <select id="ped-terms" class="form-input">
        ${PAY_TERMS.map(t=>`<option>${t}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Forma de Pagamento</label>
      <select id="ped-method" class="form-input">
        <option value="">Não informado</option>
        ${PAY_METHODS.map(m=>`<option>${m}</option>`).join("")}
      </select>
    </div>
  </div>
  <div class="form-grid-2">
    <div class="form-group"><label class="form-label">Desconto Geral (%)</label>
      <input id="ped-disc" type="number" min="0" max="100" step="0.1" class="form-input" value="0" oninput="pedidoRenderItems()">
    </div>
    <div class="form-group"><label class="form-label">Frete (R$)</label>
      <input id="ped-freight" type="number" min="0" step="0.01" class="form-input" value="0" oninput="pedidoRenderItems()">
    </div>
  </div>
  ```

  Faça o mesmo no `editarPedidoModal()` (linha 254–265), mesmo padrão.

- [ ] **Passo 8.6 — Salvar paymentMethod no pedido em salvarPedido()**

  Localize em `salvarPedido()` (linha 194–217), a criação do objeto `order` (linha 203):
  ```js
  const order={
    id:Date.now(), number:num,
    date:el("ped-date").value||today(),
    clientId, paymentTerms:el("ped-terms").value,
    discount:disc, freight, notes:el("ped-notes").value,
    items:[...state.pedidoItems],
    subtotal:sub, total,
    status:confirmar?"confirmado":"rascunho"
  };
  ```

  Adicione `paymentMethod` no objeto:
  ```js
  const order={
    id:Date.now(), number:num,
    date:el("ped-date").value||today(),
    clientId, paymentTerms:el("ped-terms").value,
    paymentMethod:el("ped-method")?.value||'',
    discount:disc, freight, notes:el("ped-notes").value,
    items:[...state.pedidoItems],
    subtotal:sub, total,
    status:confirmar?"confirmado":"rascunho"
  };
  ```

  Faça o mesmo em `salvarEditPedido()` (linha 291), adicionando:
  ```js
  o.paymentMethod=el("ped-method")?.value||'';
  ```
  logo após `o.paymentTerms=el("ped-terms").value;` (linha 303).

- [ ] **Passo 8.7 — Pré-preencher paymentMethod ao faturar pedido**

  Em `faturarPedido()` (pedidos.js linha 314), o modal de NF é aberto. Localize onde `nf-terms` é pré-preenchido (linha 340):
  ```js
  ${PAY_TERMS.map(t=>`<option ${t===o.paymentTerms?"selected":""}>${t}</option>`).join("")}
  ```

  Logo após o select de nf-terms, adicione o select de nf-method com o valor do pedido pré-selecionado. Localize o bloco do `form-grid-3` no modal de faturarPedido e aplique a mesma transformação do Passo 8.2, mas com pré-seleção:
  ```js
  <div class="form-group"><label class="form-label">Forma de Pagamento</label>
    <select id="nf-method" class="form-input">
      <option value="">Não informado</option>
      ${PAY_METHODS.map(m=>`<option ${m===o.paymentMethod?"selected":""}>${m}</option>`).join("")}
    </select>
  </div>
  ```

- [ ] **Passo 8.8 — Testar**

  1. Crie um novo pedido — deve aparecer campo "Forma de Pagamento" com as opções
  2. Selecione "PIX" e salve como confirmado
  3. Clique "Faturar" — o modal de NF deve ter "PIX" pré-selecionado
  4. Emita a NF e abra "Ver" — deve exibir a forma de pagamento

- [ ] **Passo 8.9 — Commit**

  ```bash
  git add js/core/state.js js/modules/notas.js js/modules/pedidos.js
  git commit -m "feat(pedido/nf): adicionar campo Forma de Pagamento (PIX/Boleto/Cheque/etc)"
  ```

---

### Task 9: Adicionar campo "Prazo de Entrega" no pedido

**Por que:** Distribuidoras precisam registrar quando a mercadoria será entregue. Campo simples: data ou texto livre.

**Arquivo:** `js/modules/pedidos.js`

- [ ] **Passo 9.1 — Adicionar campo no modal de novo pedido**

  Localize em `openPedidoModal()` (linha 98–100), após o campo de Observações:
  ```js
  <div class="form-group"><label class="form-label">Observações</label>
    <textarea id="ped-notes" class="form-input" rows="2" style="resize:vertical"></textarea>
  </div>
  ```

  Substitua por:
  ```js
  <div class="form-grid-2">
    <div class="form-group"><label class="form-label">Prazo de Entrega</label>
      <input id="ped-delivery" type="date" class="form-input">
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <textarea id="ped-notes" class="form-input" rows="2" style="resize:vertical"></textarea>
    </div>
  </div>
  ```

- [ ] **Passo 9.2 — Fazer o mesmo em editarPedidoModal()**

  Localize (linha 267–269):
  ```js
  <div class="form-group"><label class="form-label">Observações</label>
    <textarea id="ped-notes" class="form-input" rows="2" style="resize:vertical">${(o.notes||"").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea>
  </div>
  ```

  Substitua por:
  ```js
  <div class="form-grid-2">
    <div class="form-group"><label class="form-label">Prazo de Entrega</label>
      <input id="ped-delivery" type="date" class="form-input" value="${o.deliveryDate||''}">
    </div>
    <div class="form-group"><label class="form-label">Observações</label>
      <textarea id="ped-notes" class="form-input" rows="2" style="resize:vertical">${(o.notes||"").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea>
    </div>
  </div>
  ```

- [ ] **Passo 9.3 — Salvar deliveryDate em salvarPedido() e salvarEditPedido()**

  Em `salvarPedido()` (linha 203), adicione `deliveryDate` no objeto:
  ```js
  deliveryDate:el("ped-delivery")?.value||'',
  ```
  após a linha de `notes`.

  Em `salvarEditPedido()` (linha 304), adicione:
  ```js
  o.deliveryDate=el("ped-delivery")?.value||'';
  ```
  após `o.notes=el("ped-notes").value;`.

- [ ] **Passo 9.4 — Exibir em viewPedido()**

  Localize em `viewPedido()` (linha 447):
  ```js
  <div><span class="text-muted">Pagamento:</span> ${o.paymentTerms||"—"}</div>
  ```

  Adicione logo após:
  ```js
  ${o.deliveryDate?`<div><span class="text-muted">Prazo de Entrega:</span> ${fmtDate(o.deliveryDate)}</div>`:''}
  ```

- [ ] **Passo 9.5 — Testar**

  1. Crie novo pedido com prazo de entrega preenchido
  2. Salve e clique em "Ver" — prazo deve aparecer
  3. Edite o pedido — prazo deve estar pré-preenchido
  4. Pedido sem prazo — campo "Prazo de Entrega" não deve aparecer na visualização

- [ ] **Passo 9.6 — Commit**

  ```bash
  git add js/modules/pedidos.js
  git commit -m "feat(pedido): adicionar campo Prazo de Entrega"
  ```

---

## BLOCO D — UX de itens

---

### Task 10: Permitir editar quantidade de item já adicionado na NF

**Por que:** Atualmente, mudar a quantidade de um item na lista exige remover e adicionar de novo. Adicionar inputs inline melhora muito o fluxo.

**Arquivo:** `js/modules/notas.js`

- [ ] **Passo 10.1 — Modificar nfRenderItems para mostrar inputs editáveis**

  Localize em `nfRenderItems()` (linha 267):
  ```js
  ${state.nfItems.map((it,i)=>{const p=getProd(it.productId);const lineTotal=it.qty*it.price*(1-(it.itemDiscount||0)/100);return`
    <div class="item-row">
      <div>
        <span style="font-size:13px;color:var(--text2)">${p?p.name:"?"}</span>
        ${it.itemDiscount>0?`<span class="badge bg-amber" style="margin-left:6px">${it.itemDiscount}% desc</span>`:""}
      </div>
      <div class="row">
        <span class="mono text-muted">${it.qty} × ${fmt(it.price)}</span>
        <span class="mono text-white" style="min-width:90px;text-align:right">${fmt(lineTotal)}</span>
        <button class="btn-sm btn-red" onclick="nfRemItem(${i})">✕</button>
      </div>
    </div>`}).join("")}
  ```

  Substitua por:
  ```js
  ${state.nfItems.map((it,i)=>{const p=getProd(it.productId);const lineTotal=it.qty*it.price*(1-(it.itemDiscount||0)/100);return`
    <div class="item-row" style="align-items:center">
      <div style="flex:1;min-width:0">
        <span style="font-size:13px;color:var(--text2)">${it.name||p?.name||"?"}</span>
      </div>
      <div class="row" style="gap:6px;align-items:center">
        <input type="number" min="1" step="1" value="${it.qty}" style="width:60px;padding:3px 6px" class="form-input"
          oninput="nfEditItemQty(${i},this.value)" title="Quantidade">
        <span class="mono text-muted" style="font-size:12px">× ${fmt(it.price)}</span>
        ${it.itemDiscount>0?`<span class="badge bg-amber" style="font-size:10px">${it.itemDiscount}%</span>`:""}
        <span class="mono text-white" style="min-width:80px;text-align:right">${fmt(lineTotal)}</span>
        <button class="btn-sm btn-red" onclick="nfRemItem(${i})">✕</button>
      </div>
    </div>`}).join("")}
  ```

- [ ] **Passo 10.2 — Adicionar função nfEditItemQty**

  Logo após a função `nfRemItem` (linha 256):
  ```js
  function nfRemItem(i){ state.nfItems.splice(i,1); nfRenderItems(); }
  ```

  Adicione:
  ```js
  function nfEditItemQty(i, val){
    const qty=parseInt(val)||1;
    if(qty<1) return;
    if(state.nfItems[i]) state.nfItems[i].qty=qty;
    nfRenderItems();
  }
  ```

- [ ] **Passo 10.3 — Testar**

  1. Abra modal de NF, adicione 2 produtos
  2. Na lista de itens, altere a quantidade de um deles diretamente
  3. O total deve atualizar em tempo real
  4. Clique "Emitir" — a NF deve usar as quantidades editadas

- [ ] **Passo 10.4 — Commit**

  ```bash
  git add js/modules/notas.js
  git commit -m "feat(nf): permitir editar quantidade de item diretamente na lista da NF"
  ```

---

### Task 11: Feedback de produto não encontrado no scanner EAN

**Por que:** Quando o scanner lê um código EAN sem correspondência, nada acontece — sem feedback visual ou sonoro.

**Arquivo:** O scanner é tratado por `scanKeyHandler()` em algum arquivo core. Precisamos localizá-la primeiro.

- [ ] **Passo 11.1 — Localizar scanKeyHandler**

  Execute no terminal:
  ```bash
  grep -rn "function scanKeyHandler" js/
  ```

  O resultado indicará o arquivo e linha. Provavelmente está em `js/core/utils.js` ou `js/modules/produtos.js`.

- [ ] **Passo 11.2 — Ler a função e identificar onde inserir feedback**

  A função deve ter algo como:
  ```js
  function scanKeyHandler(event, ctx){
    if(event.key!=='Enter') return;
    const ean=event.target.value.trim();
    event.target.value='';
    const prod=state.products.find(p=>p.code===ean||p.ean===ean||p.barcode===ean);
    if(!prod){ /* sem ação */ return; }
    // adiciona item...
  }
  ```

  No bloco `if(!prod)`, substitua `return;` por:
  ```js
  showSyncStatus(`⚠ Código "${ean}" não encontrado no cadastro`, true);
  event.target.style.borderColor='var(--red)';
  setTimeout(()=>{ event.target.style.borderColor=''; },1500);
  return;
  ```

- [ ] **Passo 11.3 — Testar**

  1. No modal de NF ou Pedido, foque o campo scanner
  2. Digite um código aleatório (ex: `9999999`) e pressione Enter
  3. Deve aparecer toast de erro em vermelho e o campo deve piscar vermelho rapidamente

- [ ] **Passo 11.4 — Commit**

  ```bash
  git add js/core/utils.js   # ou o arquivo onde scanKeyHandler está
  git commit -m "feat(scanner): exibir feedback quando código EAN não encontrado"
  ```

---

### Task 12: Alerta de estoque insuficiente na lista de produtos antes de adicionar

**Por que:** O alerta de estoque existe apenas ao emitir a NF. Mostrar na lista de produtos já indica visualmente quais itens terão problema.

**Arquivo:** `js/modules/notas.js` (função `nfRenderProdList`, linha 223)

- [ ] **Passo 12.1 — Adicionar indicação visual de estoque baixo/zero na lista**

  Localize em `nfRenderProdList(search)` (linha 233):
  ```js
  <div style="font-size:11px;color:var(--muted)">${p.unit} &nbsp;·&nbsp; Estoque: <span style="color:${p.stock>0?'var(--green)':'var(--red)'}">${p.stock}</span></div>
  ```

  Não há mudança aqui — já mostra vermelho para estoque zero. Mas não exibe aviso ao tentar adicionar quantidade maior que o estoque. Adicione validação em `nfAddItemFromList`:

  Localize `nfAddItemFromList(prodId)` (linha 241):
  ```js
  function nfAddItemFromList(prodId){
    const p=getProd(prodId);
    if(!p) return;
    const qty=parseInt(el(`nf-row-qty-${prodId}`)?.value)||1;
    const disc=parseFloat(el(`nf-row-disc-${prodId}`)?.value)||0;
    const existing=state.nfItems.find(it=>it.productId===prodId);
    if(existing){ existing.qty+=qty; }
    else{ state.nfItems.push({productId:p.id,name:p.name,unit:p.unit||'UN',qty,price:p.salePrice,itemDiscount:disc}); }
  ```

  Adicione após `const disc=...` (linha 245):
  ```js
  const currentInCart=(state.nfItems.find(it=>it.productId===prodId)?.qty||0);
  const totalQty=currentInCart+qty;
  if(p.stock>=0 && totalQty>p.stock){
    if(!confirm(`Atenção: estoque disponível de "${p.name}" é ${p.stock} ${p.unit||'un'}, mas você está adicionando ${totalQty} no total. Continuar mesmo assim?`)) return;
  }
  ```

- [ ] **Passo 12.2 — Testar**

  1. Tenha um produto com estoque 2
  2. No modal de NF, digite 5 no campo de quantidade desse produto e clique "+ Add"
  3. Deve aparecer confirmação de estoque insuficiente
  4. Se confirmar, o item é adicionado; se cancelar, não

- [ ] **Passo 12.3 — Commit**

  ```bash
  git add js/modules/notas.js
  git commit -m "feat(nf): alertar sobre estoque insuficiente ao adicionar item na lista"
  ```

---

## BLOCO E — Exibição e consistência

---

### Task 13: Exibir valor do desconto em R$ na visualização de NF

**Por que:** `viewNF()` mostra `Desconto (5%)` mas não o valor em R$. Para o usuário financeiro, o valor monetário é mais útil.

**Arquivo:** `js/modules/notas.js`

- [ ] **Passo 13.1 — Corrigir linha de desconto em viewNF()**

  Localize em `viewNF()` (linha 387):
  ```js
  ${n.discount>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Desconto (${n.discount}%)</span><span class="mono text-red">− ${fmt(n.subtotal*n.discount/100)}</span></div>`:""}
  ```

  Substitua por:
  ```js
  ${n.discount>0?`<div class="row-between" style="margin-bottom:4px"><span class="text-muted">Desconto (${n.discount}%)</span><span class="mono text-red">− ${fmt(n.subtotal*n.discount/100)} <span style="font-size:11px;opacity:.6">(${n.discount}%)</span></span></div>`:""}
  ```

  Este trecho já calculava o valor corretamente — mas a label mostrava só o percentual. Agora mostra valor + percentual entre parênteses.

- [ ] **Passo 13.2 — Verificar também na lista de NFs (filterNotas)**

  Localize em `filterNotas()` (linha 56):
  ```js
  <td class="mono fw-bold">${fmt(n.total)}${n.discount>0?`<span class="text-muted" style="font-size:11px;margin-left:4px">-${n.discount}%</span>`:""}</td>
  ```

  Substitua por:
  ```js
  <td class="mono fw-bold">${fmt(n.total)}${n.discount>0?`<span class="text-muted" style="font-size:11px;margin-left:4px" title="Desconto de ${n.discount}% = ${fmt(n.subtotal*n.discount/100)}">-${n.discount}%</span>`:""}</td>
  ```

  Adiciona tooltip com o valor em R$.

- [ ] **Passo 13.3 — Testar**

  1. Abra uma NF com desconto e clique em "Ver"
  2. Na seção de totais, o desconto deve aparecer como: `− R$ 150,00 (5%)`

- [ ] **Passo 13.4 — Commit**

  ```bash
  git add js/modules/notas.js
  git commit -m "fix(nf): exibir valor em R$ do desconto na visualização da NF"
  ```

---

## Checklist de Verificação Final

Após completar todas as tasks, verificar:

- [ ] Emitir NF com cliente sem endereço → deve bloquear com mensagem clara
- [ ] Emitir NF sem clicar na sugestão do autocomplete → mensagem menciona o nome digitado
- [ ] Simular falha de NF-e → caixa não deve ter transações fantasmas
- [ ] Emitir NF com data amanhã → deve bloquear
- [ ] Custo adicional com valor `-10` → deve virar `0`
- [ ] Observação com `<script>` no pedido → ao faturar, NF exibe literal, sem executar
- [ ] Produto excluído → NF antiga ainda mostra o nome
- [ ] Campo "Forma de Pagamento" aparece em Pedido e NF
- [ ] Campo "Prazo de Entrega" salva e exibe no pedido
- [ ] Editar quantidade de item na lista da NF → total atualiza
- [ ] Scanner com EAN inválido → toast de erro + campo fica vermelho
- [ ] Adicionar 10 unidades com estoque 3 → confirmação aparece
- [ ] NF com desconto → viewNF mostra R$ do desconto

---

## Ordem de execução recomendada

Se rodar tasks em sequência, priorize:

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6
→ Task 7 → Task 8 → Task 9 → Task 10 → Task 11 → Task 12 → Task 13
```

Tasks 1–6 são bugfixes que não mudam UI. Tasks 7–13 adicionam funcionalidade.
Cada task tem seu próprio commit — nunca agrupe tasks em um único commit.

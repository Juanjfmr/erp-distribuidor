# Spec — Adequação à Reforma Tributária (IBS/CBS) na emissão de NF-e

> **Para o executor (DeepSeek):** implemente APENAS o que está descrito. Não refatore o que já funciona, não renomeie funções, não reformate linhas não afetadas, não "melhore" código adjacente. O recurso entra **desligado por padrão** (flag `ATIVO:false`) — a emissão atual de NF-e NÃO pode mudar de comportamento enquanto a flag estiver desligada. Toda mudança deve rastrear para um item das seções 4–6.

## 1. Contexto

Stoqio é um ERP multi-tenant em JS puro (sem framework, sem build). A NF-e é emitida via Focus NFe, montada em `js/services/invoiceService.js` na função `emitirNFe(invoice, company, products, clients)` (~linha 30) e duplicada em `previsualizarDANFe(...)` (~linha 124). O proxy `focusProxy` (Cloud Function) repassa o payload ao Focus.

A Reforma Tributária do Consumo (LC 214/2025, NT 2025.002) cria três tributos **"por fora"** — IBS, CBS, IS — que somam ao total da nota. A partir de **01/04/2026** a SEFAZ valida esses campos; obrigatório em produção em **03/08/2026** (Lucro Presumido/Real) e **04/01/2027** (Simples/MEI). Durante **2026** vale a **alíquota-teste fixa: 0,9% CBS + 0,1% IBS** — caráter informativo, sem aumento de carga.

**O Focus NFe já aceita os campos** (confirmado na doc deles). Falta a Stoqio: (a) guardar a classificação tributária por produto, (b) calcular os valores, (c) enviá-los no payload do item e nos totalizadores.

### Campos do Focus NFe (nomes exatos — usar exatamente estes)

Por item:
`ibs_cbs_situacao_tributaria`, `ibs_cbs_classificacao_tributaria`, `ibs_cbs_base_calculo`, `cbs_aliquota`, `cbs_valor`, `ibs_uf_aliquota`, `ibs_uf_valor`, `ibs_mun_aliquota`, `ibs_mun_valor`

Totalizadores (no objeto raiz do payload) — campos SEPARADOS, confirmados na doc canônica campos.focusnfe.com.br/nfe (NÃO existe campo combinado):
`cbs_valor_total`, `ibs_valor_total`, `is_valor_total`

## 2. Princípio de segurança da mudança (LER ANTES)

1. **Flag mestra `ATIVO:false`.** Com a flag desligada, `emitirNFe` e `previsualizarDANFe` produzem **exatamente o mesmo payload de hoje** — byte a byte. Os campos novos só aparecem quando a flag é `true`. Isso protege a produção: o operador liga a flag só para testar em homologação.
2. **Alíquotas e códigos são constantes nomeadas** no topo do arquivo, num bloco `RTC_CONFIG` — nunca espalhadas pelo código. São valores da fase-teste 2026 e precisam ser fáceis de ajustar.
3. **Valores calculados localmente.** Em 2026 o cálculo é aritmética trivial (percentual liso sobre a base). NÃO integrar nenhuma API externa de cálculo nesta tarefa.

## 3. Decisão de cálculo (fase-teste 2026)

Para cada item, base de cálculo = `valor_bruto` do item (o mesmo já calculado hoje).

```
ibs_cbs_base_calculo = valor_bruto
cbs_valor            = round(valor_bruto * CBS_ALIQUOTA / 100, 2)
ibs_uf_valor         = round(valor_bruto * IBS_UF_ALIQUOTA / 100, 2)
ibs_mun_valor        = round(valor_bruto * IBS_MUN_ALIQUOTA / 100, 2)
```

Totalizadores = somatório dos itens:
```
cbs_valor_total       = Σ cbs_valor
ibs_valor_total       = Σ (ibs_uf_valor + ibs_mun_valor)
ibs_cbs_is_valor_total = cbs_valor_total + ibs_valor_total   // IS = 0 nesta fase
```

> **Base legal (já cravada):** Art. 343 da LC 214/2025 — em 2026 o IBS é cobrado mediante **alíquota estadual de 0,1%** (integralmente estadual; município = 0). A fração municipal (0,05% UF + 0,05% mun) só vale a partir de 2027-2028, quando o cálculo já migra para a API oficial. Logo o default `IBS_UF_ALIQUOTA: 0.1 / IBS_MUN_ALIQUOTA: 0` está correto por lei — não há nada a validar.

## 4. Mudança A — cadastro do produto (`js/modules/produtos.js`)

Adicionar um campo de **Classificação Tributária IBS/CBS (`cClassTrib`)** ao produto.

**A1. Formulário** — em `openProdModal` (~linha 99–103), logo APÓS o `<div class="form-group">` do campo "Origem da Mercadoria" (`f-origem`), inserir um novo form-group:

```html
<div class="form-group"><label class="form-label">Classificação Tributária IBS/CBS (cClassTrib)</label>
  <input id="f-cclasstrib" class="form-input" placeholder="000001" maxlength="6" value="${p?escapeHtml(p.cClassTrib||''):''}">
  <span class="tip" data-tip="Código de classificação tributária da Reforma (IBS/CBS). Deixe em branco para usar o padrão de tributação integral (000001). Consulte seu contador para produtos com regime diferenciado." style="margin-top:2px">ⓘ O que é?</span>
</div>
```

(Use exatamente o id `f-cclasstrib`. Mantenha o padrão de escape e estilo dos campos vizinhos.)

**A2. Persistência** — em `saveProd`, adicionar `cClassTrib:el("f-cclasstrib").value.trim()` ao objeto do produto **nos dois lugares**: o `state.products.map(...)` de edição (~linha 165) e o `state.products.push({...})` de criação (~linha 168). Coloque a chave logo após `st:el("f-st").checked`.

Nada mais muda em produtos.js.

## 5. Mudança B — config de cálculo + helper (`js/services/invoiceService.js`)

**B1. Bloco de configuração** — no topo do arquivo, logo após o comentário de cabeçalho e antes de `const FOCUS_PROXY`, adicionar:

```js
// ─── Reforma Tributária do Consumo (IBS/CBS/IS) ────────────────────────────────
// Fase-teste 2026: alíquotas fixas, caráter informativo. Ligar ATIVO só para
// testar em homologação. Validar alíquotas/split antes da obrigatoriedade.
const RTC_CONFIG = {
  ATIVO: false,            // flag mestra — com false, o payload da NF-e não muda
  CBS_ALIQUOTA: 0.9,       // % fase-teste 2026
  IBS_UF_ALIQUOTA: 0.1,    // % fase-teste 2026 — TODO validar split UF/mun antes de 03/08/2026
  IBS_MUN_ALIQUOTA: 0,     // %
  CST_PADRAO: '000',       // situação tributária IBS/CBS — tributação integral
  CCLASSTRIB_PADRAO: '000001', // classificação tributária padrão — tributação integral
};

// Calcula os campos IBS/CBS de um item a partir da sua base (valor_bruto).
// Retorna {} quando RTC_CONFIG.ATIVO é false (não altera o payload atual).
function _rtcCamposItem(prod, valorBruto) {
  if (!RTC_CONFIG.ATIVO) return {};
  const r2 = n => parseFloat((n || 0).toFixed(2));
  const cbsValor = r2(valorBruto * RTC_CONFIG.CBS_ALIQUOTA / 100);
  const ibsUfValor = r2(valorBruto * RTC_CONFIG.IBS_UF_ALIQUOTA / 100);
  const ibsMunValor = r2(valorBruto * RTC_CONFIG.IBS_MUN_ALIQUOTA / 100);
  return {
    ibs_cbs_situacao_tributaria: RTC_CONFIG.CST_PADRAO,
    ibs_cbs_classificacao_tributaria: (prod && prod.cClassTrib) || RTC_CONFIG.CCLASSTRIB_PADRAO,
    ibs_cbs_base_calculo: r2(valorBruto),
    cbs_aliquota: RTC_CONFIG.CBS_ALIQUOTA,
    cbs_valor: cbsValor,
    ibs_uf_aliquota: RTC_CONFIG.IBS_UF_ALIQUOTA,
    ibs_uf_valor: ibsUfValor,
    ibs_mun_aliquota: RTC_CONFIG.IBS_MUN_ALIQUOTA,
    ibs_mun_valor: ibsMunValor,
  };
}

// Soma os totalizadores RTC a partir dos itens já montados. Retorna {} se inativo.
function _rtcTotais(itens) {
  if (!RTC_CONFIG.ATIVO) return {};
  const r2 = n => parseFloat((n || 0).toFixed(2));
  const cbsTot = r2(itens.reduce((s, it) => s + (it.cbs_valor || 0), 0));
  const ibsTot = r2(itens.reduce((s, it) => s + (it.ibs_uf_valor || 0) + (it.ibs_mun_valor || 0), 0));
  return { cbs_valor_total: cbsTot, ibs_valor_total: ibsTot, is_valor_total: 0 };
}
```

**B2. Injetar nos itens** — em `emitirNFe`, dentro do `.map((item, idx) => {...})` que monta `itens` (~linha 37–51), no objeto `return {...}` de cada item, fazer o spread dos campos RTC. Como o `valor_bruto` é calculado no próprio objeto, adicione a chamada usando a mesma expressão de base. Substituir o `return { ... };` do item para que termine com:

```js
      pis_situacao_tributaria: '07', cofins_situacao_tributaria: '07',
      ..._rtcCamposItem(prod, parseFloat((item.qty * item.price * (1 - (item.itemDiscount || 0) / 100)).toFixed(2))),
    };
```

(Mantenha todas as chaves existentes. Só acrescente a linha do spread `..._rtcCamposItem(...)` antes do fechamento `};`.)

**B3. Injetar totalizadores** — em `emitirNFe`, no objeto `payload` (~linha 53–71), após `items: itens,` no fim do objeto, fazer spread: substituir `forma_de_pagamento: [...], items: itens,` para terminar com:

```js
    forma_de_pagamento: [{ forma_pagamento: '01', valor: invoice.total }], items: itens,
    ..._rtcTotais(itens),
  };
```

**B4. Espelhar na pré-visualização** — aplicar **exatamente as mesmas duas mudanças** (B2 e B3) em `previsualizarDANFe` (~linha 131–158), que tem o mesmo `.map` e o mesmo `payload` duplicados. Os dois blocos precisam ficar idênticos.

Nenhuma outra função de invoiceService.js muda.

## 6. Proibições

1. Não criar arquivos novos. Não adicionar bibliotecas. Não chamar nenhuma API de cálculo externa.
2. Não alterar o comportamento com `ATIVO:false` — com a flag off, `_rtcCamposItem` e `_rtcTotais` retornam `{}` e o payload fica idêntico ao atual.
3. Não mexer em `cancelarNFe`, `consultarNFe`, NFC-e, NFS-e, CT-e, MDF-e nem em qualquer outra função.
4. Não tocar no `firestore.rules`, no proxy (`functions/`) nem em outros módulos além de `produtos.js` e `invoiceService.js`.
5. Não inventar códigos de `cClassTrib` ou CST diferentes dos defaults deste spec. Onde houver dúvida, use a constante.

## 7. Saída exigida

1. Os dois arquivos editados.
2. Tabela resumo: arquivo | função | o que foi adicionado — uma linha por mudança.
3. Confirmação explícita de que B2/B3 foram aplicados de forma idêntica em `emitirNFe` e em `previsualizarDANFe`.
4. Reportar qualquer trecho da seção 4–5 cuja linha/expressão divergiu do spec (em vez de adivinhar).

## 8. Critérios de aceitação (verificação pós-execução)

1. **Comportamento inalterado com flag off:** com `RTC_CONFIG.ATIVO=false`, emitir uma NF-e de teste e confirmar que o payload enviado ao Focus **não contém** nenhuma chave `ibs_*`/`cbs_*` (igual ao de hoje).
2. **Campos aparecem com flag on:** trocar para `ATIVO:true`, montar uma NF com 2 itens (ex.: valor_bruto 100,00 e 50,00) e confirmar por item:
   - `cbs_valor` = 0,90 e 0,45; `ibs_uf_valor` = 0,10 e 0,05; `ibs_mun_valor` = 0.
   - Totalizadores: `cbs_valor_total` = 1,35; `ibs_valor_total` = 0,15; `is_valor_total` = 0.
3. **cClassTrib do produto é respeitado:** produto com `cClassTrib` preenchido → o item sai com `ibs_cbs_classificacao_tributaria` igual ao do produto; produto sem o campo → sai `000001`.
4. **Cadastro persiste:** criar/editar produto preenchendo a Classificação Tributária e reabrir o modal — o valor reaparece no input `f-cclasstrib`.
5. `git diff` contém somente: o bloco `RTC_CONFIG`+helpers, dois spreads em cada uma das duas funções de invoiceService, e o campo `cClassTrib` no form e no save de produtos. Nada mais.
6. Nenhum erro novo no console ao abrir o modal de produto e ao pré-visualizar/emitir NF.

## 9. Nota de deploy (para o operador)

Feature → deploy em **v2 apenas** (regra do projeto). Ship **dormente** (`ATIVO:false`): em produção nada muda até alguém ligar a flag para testar em homologação antes de 01/07/2026. Commit sugerido: `feat: estrutura de IBS/CBS na NF-e (reforma tributária, flag desligada)`.

## 10. Roadmap (fora desta tarefa — não implementar agora)

- **2027+:** substituir o cálculo hardcodado pela **API oficial de cálculo da Receita** (Calculadora CBS/IBS/IS, REST, gratuita) quando as alíquotas reais e regimes diferenciados entrarem. Ponto de troca isolado: a função `_rtcCamposItem`.
- Tela de Configurações → Dados Fiscais: expor a flag e as alíquotas para o operador (hoje são constantes no código).

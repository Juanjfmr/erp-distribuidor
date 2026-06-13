# Spec — Correção de XSS armazenado (escape de dados de usuário)

> **Para o executor (DeepSeek):** tarefa cirúrgica de segurança. Aplique APENAS as mudanças descritas. Não refatore, não renomeie, não reformate, não corrija outros problemas que encontrar. Cada linha alterada deve ser uma das transformações da seção 3.

## 1. Contexto

ERP multi-tenant em JS puro (sem framework). A UI é montada com template strings injetadas via `innerHTML`. Dados digitados por usuários (nomes de clientes/fornecedores/produtos, dados da empresa, observações) entram nesses templates **sem escape** em vários módulos — XSS armazenado: um usuário com role `vendedor` pode cadastrar um nome contendo HTML que executa na sessão do `admin`.

**Já existe o helper correto** em `js/core/state.js:240`:

```js
function escapeHtml(str) // escapa & < > " ' — serve para texto E para atributos
```

Ele é global (sem import necessário — os scripts são carregados via tags no app.html). **Use somente ele. NÃO crie outra função de escape.**

## 2. Campos considerados dado de usuário (escapar sempre que interpolados em HTML)

- `*.name`, `*.fantasia`, `*.razao` de clientes, fornecedores, produtos, usuários
- `state.company.*`: name, fantasia, cnpj, ie, address, city, phone, email, e campos de fiscalData
- Observações/descrições: `obs`, `description`, `desc`, `notes`
- Categorias e unidades configuráveis (vêm de `state.company.categories/units`)
- Endereço/cidade/contato de qualquer entidade
- Nomes de itens dentro de NFs, pedidos, compras e devoluções (ex.: `it.name`, `item.desc`)

**NÃO escapar** (já são seguros ou não são dado de usuário): resultados de `fmt()`, `fmtNum()`, `fmtDate()`, ids numéricos, status internos fixos (`"paga"`, `"aberta"` etc.), ícones/SVG estáticos, classes CSS.

## 3. Transformações permitidas (únicas mudanças aceitas)

| Contexto | Antes | Depois |
|---|---|---|
| Texto em HTML | `<td>${c.name}</td>` | `<td>${escapeHtml(c.name)}</td>` |
| Atributo | `value="${p.name}"` | `value="${escapeHtml(p.name)}"` |
| Atributo sem aspas | `value=${x}` | `value="${escapeHtml(x)}"` (adicionar aspas duplas) |
| `<option>` | `<option>${c.name}</option>` | `<option>${escapeHtml(c.name)}</option>` |
| `<textarea>` | `<textarea>${cats}</textarea>` | `<textarea>${escapeHtml(cats)}</textarea>` |

Regra anti-duplo-escape: se a expressão já está dentro de `escapeHtml(...)`, **não mexa**.

## 4. Ocorrências mapeadas (linhas são referência aproximada — localize a expressão, não edite às cegas)

| Arquivo | Local aproximado | O quê |
|---|---|---|
| js/modules/contas.js | ~43–62 (renderContas, tabelas receber/pagar) | `c.name` / `s.name` de cliente e fornecedor nas linhas das tabelas |
| js/modules/notas.js | ~430 (viewNF) | nomes de itens da NF |
| js/modules/compras.js | ~364 (viewCompra) | nome do fornecedor |
| js/modules/compras.js | ~273 (compraRenderItems) | nome do produto |
| js/modules/pedidos.js | ~98 (openPedidoModal) | nome do cliente em `<option>` |
| js/modules/pedidos.js | ~424+ (faturarPedido) | nomes de itens no HTML do modal |
| js/modules/pedidos.js | ~299–359 (editarPedidoModal) | mesmos campos do openPedidoModal (HTML duplicado — corrigir nos dois) |
| js/modules/clientes.js | ~57 (openClientModal) | dados do cliente em atributos `value` |
| js/modules/fornecedores.js | ~52 (openSupplierModal) | dados do fornecedor em atributos `value` |
| js/modules/config.js | ~219+ (renderConfig) | dados da empresa em `value` dos inputs |
| js/modules/config.js | ~268, ~273 | conteúdo dos `<textarea>` de categorias/unidades |
| js/modules/fiscal.js | ~152, ~154 (wizard) | dados fiscais em `value` dos inputs |
| js/modules/produtos.js | ~79–84 (openProdModal) | categorias/unidades em `<option>` |

## 5. Varredura complementar (escopo fechado)

Além da tabela acima, **somente nos arquivos listados na seção 4**, procure outras interpolações `${...}` dos campos da seção 2 dentro de template strings de HTML e aplique a mesma transformação. Não abra arquivos fora dessa lista.

## 6. Proibições

1. Não alterar lógica, nomes de função, ordem de código ou formatação de linhas não afetadas.
2. Não remover o `escapeHtml` duplicado de aiChat.js (fora de escopo).
3. Não adicionar sanitização em `showModal` (nav.js) — a correção é nos chamadores.
4. Não introduzir bibliotecas nem novas funções.
5. Não tocar em arquivos fora da seção 4.

## 7. Saída exigida

1. Os arquivos editados.
2. Sumário em tabela: arquivo | linha | expressão antes | expressão depois — **uma linha por mudança**, sem omissão.
3. Lista de qualquer ocorrência da seção 4 que você NÃO encontrou (linha divergente, código mudou) — reportar em vez de adivinhar.

## 8. Critérios de aceitação (verificação pós-execução)

1. Cadastrar cliente com nome `<img src=x onerror=alert(1)>` → o nome aparece como TEXTO literal em: lista de clientes, contas a receber, modal de pedido, modal de NF, relatórios.
2. Cadastrar cliente com nome `" autofocus onfocus="alert(2)` → abrir o modal de edição do cliente: o input mostra o texto e nenhum alert dispara.
3. Produto com nome `<b>X</b>` → aparece literal em produtos, compras, devoluções e NF.
4. Nenhum erro novo no console ao navegar por todos os módulos.
5. `git diff` contém somente acréscimos de `escapeHtml(` e aspas em atributos — nenhuma outra mudança.

## 9. Nota de deploy (para o operador)

Bug fix de segurança → deploy em **main E v2** (regra do projeto). Commit sugerido: `fix: aplica escapeHtml em dados de usuário renderizados via innerHTML (XSS armazenado)`.

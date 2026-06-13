# Pendências & Backlog — Stoqio

> Atualizado em 2026-06-13. Registro de pendências da revisão módulo a módulo rumo a "sistema ótimo".
> Espelhado no GBrain (namespace `stoqio`, chave `stoqio-pendencias-pedidos-notas`).

## Revisão de módulos — progresso

A ideia é revisar **todos os módulos**, comparando campos/dropdowns com o mercado (Bling, Tiny, Conta Azul, Omie).

- ✅ [[pages/modulos/pedidos]] + [[pages/modulos/notas]] — revisados em 12/06/2026
- ⏳ Pendentes: [[pages/modulos/dashboard]], [[pages/modulos/produtos]], [[pages/modulos/clientes]], [[pages/modulos/fornecedores]], [[pages/modulos/compras]], [[pages/modulos/contas]], [[pages/modulos/caixa]], [[pages/modulos/relatorios]], [[pages/modulos/devolucoes]], [[pages/modulos/usuarios]], [[pages/modulos/config]], [[pages/modulos/minha-conta]]

## Entregue na revisão de Pedidos & Notas (12/06/2026)

| Item | Branch | Commit |
|---|---|---|
| 🔴 Fix fiscal: forma de pagamento real na NF-e (tpPag) — antes saía sempre Dinheiro/à vista | v2 + main | `f435b62` / `4e518bf` |
| 🔴 Fix: condição de pagamento padrão do cliente pré-preenche (`normalizePayterm`) | v2 + main | `7fe10c8` / `03fed18` |
| ✨ Condições de pagamento: padrão de mercado fixo + campo "Outros" (`payTermsExtra`) | v2 | `5761c97` |

## Backlog de Pedidos & Notas (features — v2 apenas)

> Cada uma exige `brainstorming` → `writing-plans` antes de codar.

1. **[ALTA] Campo Vendedor** em pedidos/notas — destrava comissão de vendedores (gap já no CLAUDE.md). **Próximo recomendado.**
2. **Modalidade de frete** (`modFrete` 0-CIF / 1-FOB / 9-Sem frete) + transportadora/volumes/peso no payload NF-e — hoje `invoiceService.js` não envia `modFrete`.
3. **Natureza da operação** configurável (Venda / Bonificação / Remessa / Devolução) — hoje fixo em "Venda de mercadoria".
4. **Entrada + parcelas** nas condições de pagamento (ex: "à vista + 30/60").
5. **Unificar fonte da condição de pagamento do cadastro de cliente** — `clientes.js` usa dropdown legado (`avista`/`30-60`); `normalizePayterm` é só band-aid na leitura. Cai na revisão de [[pages/modulos/clientes]].
6. **APIs nas telas:** cobrança **Asaas** embutida na emissão (`asaasService.js` já existe) · **cálculo de frete** por CEP+peso (Melhor Envio / Kangu) · **consulta de IE/SINTEGRA** via Focus antes de emitir (reduz rejeição de NF-e).

## Convenção a lembrar

- `CACHE_VERSION` em `js/core/state.js`: bump só quando muda a **forma dos dados** em localStorage, não para adição de função pura.

## Lição de design

- Público-alvo = **pequena distribuidora** → preferir **padrão de mercado sensato + escape ("Outros")**, nunca configuração aberta (textarea livre foi rejeitado).

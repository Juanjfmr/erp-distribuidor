# Análise de Precificação — Stoqio
**Data:** 2026-06-06
**Contexto:** ERP multi-tenant para distribuidoras, frontend vanilla JS + Firebase, checkout via Mercado Pago, afiliados 20%

---

## Sumário Executivo

O Stoqio tem 3 planos pagos (R$79 / R$149 / R$299) + trial, com diferenciação por **limites quantitativos** (produtos, NFs/mês, usuários) e **módulos de features**. A arquitetura de planos está implementada, mas o sistema de bloqueio (checkPlan + MODULE_GUARD) tem **gaps críticos** que fazem features 'pro' ficarem acessíveis no plano Básico.

---

## 1. Estrutura de Custo Atual

| Item | Custo estimado | Natureza |
|------|---------------|----------|
| Firebase (Spark/Blaze) | R$0–30/mês base + R$0,02/NF lida | Fixo + variável |
| Focus NFe (API NF-e) | R~0,30/NF emitida (homologação grátis) | Variável por NF |
| Mercado Pago (taxa) | ~1,99% por transação recorrente | % do MRR |
| Afiliados (comissão) | **20% recorrente** sobre cada assinatura indicada | % do MRR |
| DeepSeek API (AI Chat) | ~R$0,0003/chamada | Marginal |
| Domínio + DNS | ~R$50/ano | Fixo |
| Certificado A1 (por tenant) | ~R$200–400/ano (cobrado do cliente ou incluso) | Por tenant |

**Insight:** O maior custo variável não é infraestrutura — é **comissão de afiliados (20%)** e **Focus NFe por NF emitida**. O custo marginal por cliente é muito baixo comparado ao ticket médio (R$79–299), dando boa margem mesmo no plano Básico.

---

## 2. PLAN_LIMITS Atuais e Bugs Identificados

### 2.1 Limites atuais (do código em `state.js`)

| Plano | Usuários | Produtos | NFs/mês | Módulos |
|-------|----------|----------|---------|---------|
| Trial | 1 | 50 | 10 | basic |
| Básico (R$79) | 1 | 300 | 100 | basic |
| Profissional (R$149) | 3 | 2.000 | 500 | basic + pro |
| Empresarial (R$299) | 99 | ~ilimitado | ~ilimitado | basic + pro + enterprise |

### 2.2 Discrepância entre UI e PLAN_LIMITS

A UI (`renderMinhaConta` em `config.js`) mostra valores **diferentes** do que está em `PLAN_LIMITS`:

| Plano | PLAN_LIMITS (real) | Tela Minha Conta (UI) | Quem está errado? |
|-------|-------------------|----------------------|-------------------|
| Básico | 1 user, 300 prods | "1 usuário, **500** produtos" | UI inflou produtos |
| Profissional | 3 users, 2000 prods | "**5** usuários, Ilimitado" | UI inflou ambos |
| Empresarial | 99 users | "**15** usuários" | UI subestimou usuários |

👉 **Problema:** A UI vende algo diferente do que o código entrega. O SYSTEM_PROMPT do AI Chat acerta (1/300/100, 3/2000/500, 99/ilimitado/ilimitado).

### 2.3 Bugs no MODULE_GUARD (sistema de bloqueio)

O `MODULE_GUARD` em `nav.js` só bloqueia **2 módulos**: `devolucoes` e `relatorios`.

Mas `MODULE_PLAN` em `state.js` define **6 módulos** como premium:
- `devolucoes` → pro ✅ (guardado)
- `relatorios` → **NÃO ESTÁ EM MODULE_PLAN** (bug: guard existe mas checkPlan sempre retorna true)
- `comissoes` → pro ❌ (não guardado — acessível no Básico)
- `tabelaPreco` → pro ❌ (não guardado — acessível no Básico)
- `estoqueMin` → pro ❌ (não guardado — acessível no Básico)
- `pdv` → enterprise ❌ (não guardado)
- `api` → enterprise ❌ (não guardado)

**Na prática:** Plano Básico (R$79) tem acesso a comissões, tabela de preços, estoque mínimo — features que deveriam ser exclusivas do Profissional.

---

## 3. Feature Funnel: O Que Cada Módulo Realmente Desbloqueia

### 3.1 Features "Must-Have" (base do ERP — todo plano precisa)
São o core operacional. Sem elas, o produto não faz sentido para distribuidoras:

| Feature | Por que é must-have |
|---------|-------------------|
| **Dashboard** | Visão do negócio |
| **Produtos** | Catálogo, estoque, EAN |
| **Clientes** | Cadastro, limite de crédito |
| **Fornecedores** | Cadeia de suprimentos |
| **Pedidos de Venda** | Ciclo de venda central |
| **NF-e** | ✅ **OBRIGAÇÃO FISCAL** — não pode ser premium |
| **Compras** | Gestão de suprimentos |
| **Contas a Receber/Pagar** | Financeiro básico |
| **Caixa** | Fluxo de caixa diário |
| **Configurações** | Setup da empresa |

### 3.2 Features "Boa Alavanca de Upgrade" (doem perder)
São features que o usuário sente falta quando não tem, mas não bloqueiam a operação básica:

| Feature | Plano atual | Alavança? | Justificativa |
|---------|-------------|-----------|---------------|
| **Devoluções** | Pro | ⭐⭐⭐⭐⭐ | Distribuidora lida com devolução TODO DIA. É a feature que mais dói no Básico |
| **Curva ABC** | Pro | ⭐⭐⭐⭐ | Essencial para decisão de compras — sem ela, distribuidora compra no achismo |
| **Relatórios avançados** | Pro | ⭐⭐⭐ | DRE, análise por NF, exportação CSV |
| **Comissão de vendedores** | Pro | ⭐⭐⭐⭐ | Equipe de vendas quer saber quanto ganha. Se o dono não tem, vendedores pressionam |
| **Tabela de preços por cliente** | Pro | ⭐⭐⭐⭐⭐ | Distribuidora tem cliente que compra mais barato (atacado) e outro que paga mais (varejo). Sem isso, inviável |
| **Estoque mínimo + alertas** | Pro | ⭐⭐⭐ | Útil mas dá para viver sem as primeiras semanas |
| **PDV** | Enterprise | ⭐⭐⭐ | Futuro — só faz sentido quando tiver venda presencial |
| **API** | Enterprise | ⭐⭐⭐ | Futuro — integração com sistemas externos |

### 3.3 Features que NÃO estão implementadas (gaps atuais)
Features que estão no spec/roadmap mas não existem no código:

| Feature | Previsto para | Complexidade |
|---------|--------------|-------------|
| Conciliação bancária | Fase 3 | Alta |
| Múltiplos estoques/depósitos | Fase 3 | Alta |
| Controle de lote e validade | Fase 3 | Alta |
| Notificações (email/push) | Fase 3 | Média |
| Meta de vendas | Fase 2 | Média |
| Fluxo de caixa projetado | Fase 2 | Média |

---

## 4. Avaliação dos Limites Atuais

### Produtos
| Plano | Limite atual | Recomendação | Motivo |
|-------|-------------|--------------|--------|
| Trial | 50 | ✅ OK | Suficiente para testar |
| Básico | 300 | ⚠️ AUMENTAR para 500 | A UI já mostra 500. Distribuidora pequena tem 200-800 produtos. 300 é apertado |
| Profissional | 2.000 | ✅ OK | Cobre distribuidoras médias |
| Empresarial | ~ilimitado | ✅ OK | Premium |

### NFs/mês
| Plano | Limite atual | Recomendação | Motivo |
|-------|-------------|--------------|--------|
| Trial | 10 | ✅ OK | 10 NFs = testar o fluxo |
| Básico | 100 | ⚠️ AUMENTAR para 150 | Distribuidora pequena tira ~80-150 NFs/mês. 100 é justo mas vai forçar upgrade cedo demais |
| Profissional | 500 | ✅ OK | Transição suave |
| Empresarial | ~ilimitado | ✅ OK | Volume alto sem limite |

### Usuários
| Plano | Limite atual | Recomendação | Motivo |
|-------|-------------|--------------|--------|
| Trial | 1 | ✅ OK | Dono testa sozinho |
| Básico | 1 | ✅ Mantido | Plano de entrada individual. Dono + contador (grátis) resolve |
| Profissional | 3 | ⚠️ AUMENTAR para 5 | A UI já mostra 5. Distribuidora precisa de: dono/admin + vendedor + comprador + financeiro. 3 é pouco |
| Empresarial | 99 | ✅ OK | Ilimitado virtual |

### Correções obrigatórias no código
1. **Adicionar `relatorios` ao `MODULE_PLAN`** (como 'pro') — sem isso, o bloqueio não funciona
2. **Adicionar `comissoes`, `tabelaPreco`, `estoqueMin` ao `MODULE_GUARD`** — sem isso, estão liberados no Básico
3. **Sincronizar UI (`renderMinhaConta`) com `PLAN_LIMITS`** — os cards mostram valores errados
4. **Adicionar `pdv` e `api` ao `MODULE_GUARD`** (mesmo não implementados, já bloqueia visualmente)

---

## 5. Proposta de 4 Tiers com Preços e Limites

### Tabela Final Recomendada

| | **TRIAL** | **BÁSICO** | **PROFISSIONAL** ⭐ | **EMPRESARIAL** |
|---|---|---|---|---|
| **Preço** | R$ 0 (30 dias) | **R$ 79/mês** | **R$ 149/mês** | **R$ 299/mês** |
| **Usuários** | 1 | 1 | 5 | 99 |
| **Produtos** | 50 | 500 | 3.000 | Ilimitado |
| **NFs/mês** | 10 | 150 | 1.000 | Ilimitado |
| **NF-e (Focus NFe)** | ✅ | ✅ | ✅ | ✅ |
| **Pedidos + Compras** | ✅ | ✅ | ✅ | ✅ |
| **Caixa + Contas** | ✅ | ✅ | ✅ | ✅ |
| **Config + Dados** | ✅ | ✅ | ✅ | ✅ |
| **Devoluções** | ❌ | ❌ | ✅ | ✅ |
| **Curva ABC** | ❌ | ❌ | ✅ | ✅ |
| **Relatórios Avançados (DRE)** | ❌ | ❌ | ✅ | ✅ |
| **Comissão de Vendedores** | ❌ | ❌ | ✅ | ✅ |
| **Tabela Preços por Cliente** | ❌ | ❌ | ✅ | ✅ |
| **Estoque Mínimo + Alertas** | ❌ | ❌ | ✅ | ✅ |
| **PDV (em breve)** | ❌ | ❌ | ❌ | ✅ |
| **API (em breve)** | ❌ | ❌ | ❌ | ✅ |
| **Suporte Prioritário** | ❌ | ❌ | ❌ | ✅ |
| **Contador (role externa)** | ✅ grátis | ✅ grátis | ✅ grátis | ✅ grátis |

### 5.1 Lógica por trás dos limites propostos

**Básico (R$79):**
- 1 usuário: força o dono a comprar para a equipe quando crescer
- 500 produtos: alinhado com a UI já existente, cobre micro-distribuidoras
- 150 NFs/mês: dá folga para ~5 NFs/dia útil sem forçar upgrade no primeiro mês
- Sem devoluções e comissões: **principal alavanca de upgrade** — distribuidora SEMPRE precisa de devolução

**Profissional (R$149):**
- 5 usuários: dono + vendedor + comprador + financeiro + auxiliar
- 3.000 produtos: cobre 95% das distribuidoras médias
- 1.000 NFs/mês: ~40 NFs/dia útil — confortável para médio porte
- Devoluções + comissões + tabela de preços: o pacote completo de gestão comercial

**Empresarial (R$299):**
- 99 usuários (virtualmente ilimitado)
- Produtos e NFs ilimitados
- PDV (quando implementado) + API (quando implementada)
- Suporte prioritário — justifica o salto de R$149 para R$299

### 5.2 Posicionamento vs concorrência

| Concorrente | Plano equivalente | Preço |
|-------------|-------------------|-------|
| **Bling** | Básico | ~R$49 (mais limitado) |
| **Conta Azul** | Básico | ~R$99 |
| **Omie** | Básico | ~R$89 |
| **Tiny** | Básico | ~R$69 |
| **Stoqio** | **Básico** | **R$79** ⬅️ Bem posicionado |

| Concorrente | Plano Premium | Preço |
|-------------|--------------|-------|
| **Bling** | Completo | ~R$199 |
| **Conta Azul** | Completo | ~R$239 |
| **Omie** | Completo | ~R$249 |
| **Tiny** | Completo | ~R$179 |
| **Stoqio** | **Profissional** | **R$149** ⬅️ Agressivo, bom para crescer |
| **Stoqio** | **Empresarial** | **R$299** ⬅️ Alinhado, API+PDV como diferencial futuro |

### 5.3 MRR Estimado por cenário

| Cenário | 50 clientes | 100 clientes | 300 clientes |
|---------|------------|-------------|-------------|
| 50% Básico + 35% Pro + 15% Emp | R$5.570 | R$11.140 | R$33.420 |
| 40% Básico + 40% Pro + 20% Emp | R$5.190 | R$10.380 | R$31.140 |
| Considerando 20% de afiliados | -R$1.038 | -R$2.076 | -R$6.228 |
| **MRR líquido (cenário realista)** | **~R$4.500** | **~R$9.000** | **~R$27.000** |

---

## 6. Bugs e Ações Imediatas (Checklist Técnico)

### 🔴 Crítico — Corrigir antes de aceitar mais clientes pagantes

- [ ] `MODULE_GUARD` não lista `comissoes`, `tabelaPreco`, `estoqueMin` — features Pro livres no Básico
- [ ] `MODULE_PLAN` não contém `relatorios` — o guard existe mas checkPlan('relatorios') sempre retorna true
- [ ] UI do `renderMinhaConta` mostra limites diferentes do `PLAN_LIMITS` (300→500, 3→5, 99→15)

### 🟡 Melhoria — Fazer na próxima sprint

- [ ] Adicionar `pdv` e `api` ao `MODULE_GUARD` (mesmo não implementados, já bloqueia visualmente)
- [ ] Sincronizar `PLAN_LIMITS` com a UI (definir 500 prods no Básico, 5 users no Pro, 150 NFs no Básico)
- [ ] Extrair `renderMinhaConta` de `config.js` para `minha-conta.js` (já identificado no CLAUDE.md)

---

## 7. Recomendações Estratégicas

1. **Não mexa nos preços agora.** R$79/149/299 está bem posicionado vs concorrência. O problema não é preço — é o que cada plano entrega de fato.

2. **Corrija os bugs de guard antes de crescer.** Cada cliente no Básico com acesso a features Pro é MRR perdido (e cliente que nunca vai fazer upgrade porque já tem tudo de graça).

3. **Faça o trial de 30 dias bloquear DE VERDADE.** Hoje o trial tem `modules: ['basic']`, mas o guard não bloqueia tudo que deveria. Trial deve sentir a dor de não ter devoluções e comissões para forçar upgrade.

4. **Afiliados 20% é agressivo mas correto.** É prática padrão no mercado de ERPs brasileiros. O custo está embutido no MRR.

5. **PDV e API como "visto para o futuro".** Anunciar como "Em breve" no plano Empresarial já justifica o ticket de R$299 sem precisar implementar agora.

6. **Considere precificação por NF excedente** (ex: R$0,50/NF extra após o limite) em vez de forçar upgrade de plano só por volume de NFs. Isso reduz churn de clientes que querem ficar no Básico mas tiveram um mês atípico.

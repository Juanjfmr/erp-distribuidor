# Design Doc — Sistema de Precificação, Onboarding e Gaps de Produto
**Data:** 2026-05-30  
**Status:** Aprovado — aguardando plano de implementação  
**Contexto:** ERP Distribuidora — SaaS multi-tenant

---

## 1. Precificação

### 1.1 Planos e preços

| Plano | Preço/mês | Usuários | Produtos | NF-e/mês |
|---|---|---|---|---|
| **Básico** | R$ 79 | 1 | 300 | 100 |
| **Profissional** | R$ 149 | 3 | 2.000 | 500 |
| **Empresarial** | R$ 299 | Ilimitado | Ilimitado | Ilimitado |

### 1.2 Diferenciação por módulos

| Módulo / Feature | Básico | Profissional | Empresarial |
|---|---|---|---|
| Pedidos + NF-e + Financeiro | ✅ | ✅ | ✅ |
| Compras + Fornecedores | ✅ | ✅ | ✅ |
| Estoque básico | ✅ | ✅ | ✅ |
| Clientes + limite de crédito | ✅ | ✅ | ✅ |
| Caixa | ✅ | ✅ | ✅ |
| Devoluções | ❌ | ✅ | ✅ |
| Curva ABC (produtos e clientes) | ❌ | ✅ | ✅ |
| Relatórios avançados | ❌ | ✅ | ✅ |
| Múltiplos roles de usuário | ❌ | ✅ | ✅ |
| Tabela de preços por cliente | ❌ | ✅ | ✅ |
| Estoque mínimo + alertas | ❌ | ✅ | ✅ |
| Comissão de vendedores | ❌ | ✅ | ✅ |
| PDV (fase futura) | ❌ | ❌ | ✅ |
| API (fase futura) | ❌ | ❌ | ✅ |
| Suporte prioritário | ❌ | ❌ | ✅ |

### 1.3 Regras de negócio dos planos

- NF-e inclusa em todos os planos — não é feature premium
- Acesso de contador: visualizador externo sem login no sistema, sem custo, sem contar como usuário
- Trial: 30 dias, sem cartão de crédito obrigatório
- Bloqueio automático após 5 dias de inadimplência pós-trial
- Downgrade automático de features quando trial expira sem conversão

### 1.4 Implementação técnica do checkPlan()

```javascript
// js/core/state.js
const PLAN_LIMITS = {
  trial:        { users: 1, products: 50,    nfMonth: 10,  modules: ['basic'] },
  basico:       { users: 1, products: 300,   nfMonth: 100, modules: ['basic'] },
  profissional: { users: 3, products: 2000,  nfMonth: 500, modules: ['basic','pro'] },
  empresarial:  { users: 99, products: 99999, nfMonth: 9999, modules: ['basic','pro','enterprise'] }
};

const MODULE_PLAN = {
  devolucoes:  'pro',
  relatorios:  'pro',   // curva ABC, relatórios avançados
  comissoes:   'pro',
  tabelaPreco: 'pro',
  estoqueMin:  'pro',
  pdv:         'enterprise',
  api:         'enterprise',
};

function checkPlan(module) {
  const plan = window._plan || 'trial';
  const required = MODULE_PLAN[module];
  if (!required) return true;
  const limits = PLAN_LIMITS[plan];
  return limits.modules.includes(required);
}
```

---

## 2. Onboarding Guiado

### 2.1 Fluxo completo

```
Cadastro → Etapa 1 (Segmento + Empresa) → Etapa 2 (Importar/Cadastrar dados)
→ Etapa 3 (Primeiro pedido) → Etapa 4 (Primeira NF-e) → Dashboard com checklist
```

### 2.2 Etapas detalhadas

**Etapa 1 — Configuração inicial (2 min)**
- Seleção do segmento de negócio → pré-configura categorias automaticamente
- Dados da empresa: nome, CNPJ, endereço, telefone, email
- Regime tributário (Simples, Lucro Presumido, Lucro Real)

**Etapa 2 — Dados iniciais (10–30 min)**
Bifurcação com duas opções:
- **Migrar de outro sistema** → upload CSV/Excel (ver seção 3)
- **Começar do zero** → wizard rápido: cadastrar 3 produtos + 3 clientes guiados

**Etapa 3 — Primeiro pedido guiado (5 min)**
- Tooltip em cada campo explicando o que preencher
- Cliente e produto pré-selecionados com os dados que acabou de importar
- Confirmação visual ao salvar

**Etapa 4 — Primeira NF-e (5 min)**
- Faturar o pedido criado na etapa anterior
- "Aha moment" — cliente emite a primeira NF-e pelo sistema
- Mensagem de celebração + resumo do que o sistema faz a partir daqui

**Checklist de progresso (contínuo durante o trial)**
Visível no dashboard como barra de progresso:
- ✅ Empresa configurada
- ✅ Produtos importados
- ⬜ Primeiro pedido criado
- ⬜ Primeira NF-e emitida
- ⬜ Primeiro recebimento registrado
- ⬜ Certificado digital configurado

### 2.3 Implementação técnica

```javascript
// js/modules/onboarding.js — novo módulo
// state.onboarding = { complete: false, step: 1, checklist: {...} }
// Salvo no Firestore por tenant
// Quando checklist 100% completo → onboarding.complete = true → não exibe mais
```

---

## 3. Migração de Dados

### 3.1 Escopo

Entidades prioritárias (lançamento):
- **Produtos:** código, EAN, nome, categoria, unidade, preço custo, preço venda, estoque atual, NCM
- **Clientes:** nome, CNPJ/CPF, endereço, cidade, UF, telefone, email, limite de crédito, prazo pagamento
- **Fornecedores:** nome, CNPJ, contato, prazo pagamento

Entidades fase 2:
- Contas a receber/pagar em aberto
- Saldo inicial de caixa (já existe no Config)
- Histórico de pedidos

### 3.2 Formatos suportados

| Sistema | Formato | Observação |
|---|---|---|
| Bling | CSV exportado do sistema | Mapeamento de colunas específico |
| Conta Azul | CSV exportado | Mapeamento de colunas específico |
| Omie | CSV exportado | Mapeamento de colunas específico |
| Tiny/Olist | CSV exportado | Mapeamento de colunas específico |
| Genérico | CSV/Excel | Mapeamento manual pelo usuário |

### 3.3 Fluxo de importação

```
Upload arquivo → Detecção automática do sistema de origem
→ Preview dos dados mapeados (primeiras 10 linhas)
→ Usuário valida/corrige mapeamento
→ Importação com barra de progresso
→ Relatório: X importados, Y erros (com descrição)
→ Opção de desfazer importação
```

### 3.4 Regras de validação
- CNPJ duplicado → pergunta se atualiza ou ignora
- Produto sem preço → importa com preço 0, alerta no relatório
- Campo obrigatório vazio → linha rejeitada com descrição do erro
- Encoding: UTF-8 e ISO-8859-1 (Latin-1) suportados

---

## 4. Gaps Mapeados para Implementação Futura

### 4.1 Lançamento (obrigatório antes de cobrar clientes)

| # | Feature | Módulo afetado | Complexidade |
|---|---|---|---|
| 1 | `checkPlan()` — bloqueio real por plano | `nav.js`, `state.js` | Baixa |
| 2 | Onboarding guiado (etapas 1–4 + checklist) | `onboarding.js` (novo) | Média |
| 3 | Migração de dados via CSV | `onboarding.js` / `import.js` | Média |
| 4 | Trial: alterar de 14 para 30 dias | `firebase.js` | Baixa |
| 5 | Acesso de contador (visualizador externo) | `usuarios.js`, `nav.js` | Baixa |
| 6 | Strings do projeto antigo renomeadas | `state.js`, `config.js` | Baixa |
| 7 | **NF-e integrada via Focus NFe** | `invoiceService.js` (novo), `notas.js` | Alta |
| 7a | Campos fiscais em produtos (NCM, CFOP, origem) | `produtos.js` | Baixa |
| 7b | Campos fiscais na empresa (IE, regime tributário) | `config.js` | Baixa |
| 7c | Numeração atômica de NF no Firestore | `firebase.js`, `invoiceService.js` | Média |
| 7d | Emissão, cancelamento e CCe via API Focus NFe | `invoiceService.js` | Alta |
| 7e | DANFE PDF + chave de acesso no retorno | `notas.js` | Média |
| 7f | Sandbox Focus NFe para homologação | — | Baixa (configuração) |

### 4.2 Fase 2 — Pós-lançamento (primeiros 90 dias)

| # | Feature | Módulo afetado | Complexidade | Plano |
|---|---|---|---|---|
| 7 | Estoque mínimo + alerta de reposição | `produtos.js`, `dashboard.js` | Baixa | Pro |
| 8 | Tabela de preços por cliente | `clientes.js`, `pedidos.js`, `notas.js` | Média | Pro |
| 9 | Múltiplos endereços de entrega por cliente | `clientes.js`, `pedidos.js` | Baixa | Pro |
| 10 | Comissão de vendedores | `usuarios.js`, `relatorios.js` | Média | Pro |
| 11 | Fluxo de caixa projetado (próximos 30/60/90 dias) | `caixa.js`, `relatorios.js` | Média | Pro |
| 12 | Relatório de giro de estoque (produtos parados) | `relatorios.js` | Baixa | Pro |
| 13 | Histórico de compras por cliente | `clientes.js`, `pedidos.js` | Baixa | Pro |
| 14 | Meta de vendas por período/vendedor | `dashboard.js`, `relatorios.js` | Média | Pro |
| 15 | DRE simplificado (receita - CMV - despesas fixas) | `relatorios.js` (novo bloco) | Média | Pro |
| 16 | Prazo médio de recebimento | `relatorios.js` | Baixa | Pro |
| 17 | Desconto por volume no pedido | `pedidos.js`, `notas.js` | Baixa | Pro |
| 18 | Ordem de compra automática (sugestão por estoque mín.) | `compras.js` | Média | Pro |

### 4.3 Fase 3 — Expansão (6+ meses)

| # | Feature | Módulo afetado | Complexidade | Plano |
|---|---|---|---|---|
| 19 | Controle de lote e validade | `produtos.js`, `estoque.js` | Alta | Pro |
| 20 | PDV (`pdv.html` separado) | `pdv.js` (novo), `services/` | Alta | Empresarial |
| 21 | NFC-e (cupom fiscal varejo) | `invoiceService.js` | Alta | Empresarial |
| 22 | Múltiplos estoques/depósitos | `produtos.js`, `state.js` | Alta | Empresarial |
| 23 | API REST pública | Backend separado (Node/Python) | Alta | Empresarial |
| 24 | App mobile | React Native / Flutter | Alta | Empresarial |
| 25 | Conciliação bancária | `caixa.js`, `contas.js` | Alta | Empresarial |
| 26 | Notificações de vencimento (email/push) | Firebase Functions | Média | Todos |
| 27 | Integração TEF (maquininha) | PDV | Alta | Empresarial |

---

## 5. Acesso do Contador (Visualizador Externo)

- Role: `contador` — acesso somente leitura
- Módulos visíveis: Relatórios, Notas, Caixa, Contas
- Não aparece na contagem de usuários do plano
- Convite por email — acesso via link com autenticação Firebase
- Sem custo adicional em nenhum plano

---

## 6. Decisões Tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| NF-e nos planos | Todos os planos | Pré-requisito operacional, não diferencial |
| Diferenciação principal | Usuários + módulos | Transparente, cresce com o negócio |
| Trial | 30 dias sem cartão | Produto complexo — cliente precisa de tempo para sentir valor |
| Onboarding | Entra no lançamento | Sem ele, conversão de trial cai drasticamente |
| Migração de dados | CSV dos principais concorrentes | Nenhuma empresa re-cadastra produto por produto |
| Contador externo | Visualizador gratuito | Padrão do mercado (Omie, Conta Azul) |
| Preço Básico | R$ 79 | Abaixo do Conta Azul (~R$99), competitivo com Bling |
| Preço Empresarial | R$ 299 | PDV + API embutidos — concorrente cobra R$400–750 separado |

---

## 7. Próximo Passo

Invocar skill `writing-plans` para criar o plano de implementação detalhado das features do lançamento (itens 1–6 da seção 4.1).

# ERP Distribuidora — Contexto do Projeto

## Visão Geral
Sistema de gestão empresarial multi-tenant voltado inicialmente para distribuidoras, evoluindo para múltiplos ramos de negócio. SaaS com planos de assinatura, programa de afiliados e roadmap para PDV e app mobile.

## Stack Atual
- **Frontend:** HTML + JS puro (sem framework), CSS com variáveis customizadas
- **Backend:** Firebase (Firestore + Auth)
- **Hospedagem:** Servidor HTTP (não file://)
- **Arquivo principal:** `index.html` — shell de navegação (refatoração concluída)

## Firebase
- **Projeto:** `erp-distribuidora-905ca`
- **Auth:** Email/senha
- **Firestore:** Single-document por tenant (`/empresas/{companyId}`)
- **Regras:** `firestore.rules` — publicar no Firebase Console antes de ir para produção
- **Projeto antigo (descontinuado):** `distribuidora-martins-6711e` — não há mais referências no código

## Estrutura de Dados (state)
```js
state = {
  company: { name, cnpj, address, city, uf, phone, email, categories[], units[] },
  products: [], clients: [], suppliers: [],
  invoices: [], purchases: [],
  receivables: [], payables: [], transactions: [],
  stockMovements: [], orders: [], returns: [],
  currentView, contasTab, cashFilter,
  nfItems: [], compraItems: [], pedidoItems: [], nfCosts: []
}
```

## Módulos Existentes (todos funcionais)
| Módulo | Função |
|---|---|
| `dashboard` | KPIs, alertas, últimas transações e NFs |
| `produtos` | Catálogo, estoque, histórico de preços, movimentações, scanner de código de barras |
| `clientes` | Cadastro, limite de crédito, situação de pagamento |
| `fornecedores` | Cadastro, prazo de pagamento, volume de compras |
| `pedidos` | Pedidos de venda, rascunho → confirmado → faturado |
| `notas` | Emissão de NF, baixa, cancelamento, impressão PDF, custos operacionais |
| `devolucoes` | Devolução parcial/total, estorno de estoque e caixa |
| `compras` | Ordens de compra, parcelas, pagamento |
| `contas` | Contas a receber e a pagar, filtro por vencidas |
| `caixa` | Fluxo de caixa, lançamento manual, filtros |
| `relatorios` | Visão geral, Curva ABC (produtos e clientes), relatório por NF |
| `config` | Dados da empresa, categorias e unidades configuráveis, segmentos de negócio |
| `usuarios` | Gestão de usuários, roles (admin/vendedor/visualizador) |
| `minha-conta` | Planos, trial, uso da conta, programa de afiliados |

## Funcionalidades Implementadas (não óbvias)
- **Categorias e unidades configuráveis:** `getCatProd()` e `getUnits()` leem de `state.company` com fallback para defaults
- **Segmentos de negócio:** seleção no Config pré-configura categorias automaticamente
- **Scanner de código de barras:** integrado ao módulo de produtos
- **Curva ABC por clientes:** além da curva ABC por produtos
- **Multi-tenant:** isolamento por `companyId` no Firestore e nas regras de segurança
- **Roles:** admin vê tudo; vendedor sem config/usuários; visualizador só dashboard/relatórios
- **Programa de afiliados:** link personalizado, comissão de 20% recorrente
- **Planos:** trial (14 dias), Básico R$97, Profissional R$197, Empresarial R$397
- **Assinatura via WhatsApp** (backend de pagamento ainda não implementado)

## Resquícios do Projeto Antigo (cosmético — sem impacto funcional)
- Linha 421: `STORAGE_KEY = "distribuidorms_v2"` → renomear para `erp_distribuidora_v1`
- Linha 2975: nome do arquivo de backup `distribuidorms_backup_...` → renomear

## Arquitetura Alvo (refatoração pendente)
```
erp-distribuidor/
├── index.html                  ← shell: nav, HTML, CSS, imports
├── js/
│   ├── core/
│   │   ├── firebase.js         ← config, auth, sync
│   │   ├── state.js            ← estado global, helpers, constantes
│   │   ├── nav.js              ← navigate, render, modal, roles
│   │   └── print.js            ← printNF
│   ├── services/               ← LÓGICA DE NEGÓCIO PURA (reutilizável por PDV e mobile)
│   │   ├── invoiceService.js   ← emitir, cancelar, dar baixa NF
│   │   ├── stockService.js     ← movimentações de estoque
│   │   ├── paymentService.js   ← recebíveis e pagáveis
│   │   ├── orderService.js     ← pedidos
│   │   └── planService.js      ← planos e assinatura
│   ├── modules/                ← INTERFACE WEB (renderização HTML)
│   │   ├── dashboard.js
│   │   ├── produtos.js
│   │   ├── clientes.js
│   │   ├── fornecedores.js
│   │   ├── notas.js
│   │   ├── compras.js
│   │   ├── contas.js
│   │   ├── caixa.js
│   │   ├── relatorios.js
│   │   ├── config.js
│   │   ├── usuarios.js
│   │   ├── pedidos.js
│   │   ├── devolucoes.js
│   │   └── minha-conta.js
│   └── app.js                  ← entry point: importa tudo, chama init()
├── firestore.rules             ← publicar no Firebase Console
└── CLAUDE.md                   ← este arquivo
```

## Gaps Identificados (por prioridade)
### Crítico
- [ ] Numeração de NF com controle atômico no Firestore (hoje usa `invoices.length + 1` — quebra com usuários simultâneos)
- [x] Refatoração da estrutura monolítica (concluída)

### Alto
- [ ] DRE (Demonstrativo de Resultado) — só há visão de caixa, não de lucro líquido real
- [ ] Conciliação bancária
- [ ] Múltiplos estoques/depósitos (filiais)
- [ ] Tabela de preços por cliente
- [ ] Comissão de vendedores
- [ ] Despesas fixas/recorrentes automáticas
- [ ] Saldo inicial de caixa (migração de sistemas)
- [ ] Backend de pagamento (Stripe, Mercado Pago ou PagSeguro)

### Médio
- [ ] Histórico de compras por cliente
- [ ] Ficha completa do cliente (endereços de entrega, múltiplos contatos)
- [ ] Exportação de relatórios para CSV/Excel
- [ ] Prazo médio de recebimento/pagamento
- [ ] Foto de produto

### Baixo
- [ ] Notificações de vencimento (email/push)
- [ ] Atalhos de teclado
- [ ] Favoritos/fixar módulos por ramo

## Roadmap Futuro
- **PDV:** consumirá `services/` diretamente
- **App Mobile:** React Native ou Flutter, mesma camada de serviços
- **API:** quando PDV/mobile demandarem backend próprio

## Decisões Técnicas Tomadas
- ES Modules nativos (projeto roda via HTTP, não file://)
- Firebase como único backend por ora — sem API intermediária
- Single-document por tenant no Firestore (migração para subcoleções já comentada nas rules)
- Assinatura via WhatsApp até backend de pagamento ser implementado
- Sem framework de UI — JS puro mantém bundle zero e carregamento rápido

## Estado Atual da Sessão
- ✅ Refatoração estrutural concluída — `index.html` é só shell; lógica em `js/core/` e `js/modules/`
- ✅ `CLAUDE.md` criado para preservar contexto entre sessões
- ✅ `firestore.rules` corrigido e no repositório — aguardando publicação no Firebase Console
- ⚠️ `renderMinhaConta` ainda está dentro de `config.js` — extrair para `minha-conta.js` quando evoluir o módulo
- ⚠️ Camada `services/` pendente — priorizar quando PDV/mobile entrar em pauta
- ⚠️ Strings do projeto antigo ainda presentes (cosmético):
  - `state.js` linha ~1: `STORAGE_KEY = "distribuidorms_v2"` → renomear para `erp_distribuidora_v1`
  - `config.js`: nome do arquivo de backup `distribuidorms_backup_...` → renomear

## Como Iniciar Nova Sessão
1. Leia este arquivo primeiro (`CLAUDE.md`)
2. Carregue apenas os arquivos do módulo em que vai trabalhar — nunca tudo de uma vez
3. Use `/compact` quando o contexto atingir ~60%
4. Faça commit ao finalizar cada módulo
5. Nunca deixe uma sessão longa sem commitar — se o contexto estourar, o código não commitado se perde

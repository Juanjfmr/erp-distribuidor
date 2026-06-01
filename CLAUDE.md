# ERP Distribuidora — Contexto do Projeto

## Visão Geral
Sistema de gestão empresarial multi-tenant voltado inicialmente para distribuidoras, evoluindo para múltiplos ramos de negócio. SaaS com planos de assinatura, programa de afiliados e roadmap para PDV e app mobile.

## Stack Atual
- **Frontend:** HTML + JS puro (sem framework), CSS com variáveis customizadas
- **Backend:** Firebase (Firestore + Auth)
- **Hospedagem:** Servidor HTTP (não file://)
- **Arquivo principal:** `index.html` — shell de navegação (refatoração concluída)
- **Estrutura:** modular — 18 arquivos JS separados em `js/core/` e `js/modules/`

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
- **Planos:** trial (30 dias), Básico R$79, Profissional R$149, Empresarial R$299
- **Assinatura via Mercado Pago** (integração planejada — Planos E1/E2/E3)

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


## Requisitos de Produto Registrados (implementar após lançamento)

### Migração de dados (CRÍTICO para adoção)
- Nenhuma empresa vai cadastrar produto por produto ao migrar de outro sistema
- Importação via CSV/Excel dos concorrentes: Bling, Conta Azul, Omie, Tiny
- Mapeamento automático de colunas + validação antes de importar
- Entidades prioritárias: produtos (NCM, unidade, preço), clientes (CNPJ, endereço, limite de crédito), fornecedores
- Entidades secundárias: contas a receber/pagar em aberto, saldo inicial de caixa
- Interface: upload → preview → confirmação → importação com relatório de erros

### Trial
- Ampliar de 14 para 30 dias — cliente precisa de tempo para cadastrar dados e sentir valor antes de pagar

## Roadmap Futuro
- **PDV:** consumirá `services/` diretamente
- **App Mobile:** React Native ou Flutter, mesma camada de serviços
- **API:** quando PDV/mobile demandarem backend próprio

## Roadmap v2 (pós 30 clientes)
- **Open Finance / Conciliação bancária automática**
  - Integração via intermediário: Pluggy ou TecnoSpeed (sandbox gratuito para dev)
  - Feature exclusiva do plano Empresarial ou add-on R$29/mês
  - Custo estimado: R$0–200/mês até 30 tenants, escala por volume
  - Contatar Pluggy e TecnoSpeed para cotação quando atingir 30 clientes ativos
  - Consentimento por tenant — cada empresa autoriza explicitamente quais bancos conectar
- **Inteligência operacional proativa (agente IA Fase C)**
  - Alertas de estoque mínimo com sugestão de ordem de compra
  - Cobranças automáticas de inadimplentes via WhatsApp
  - Feature opcional ativada pelo tenant nas configurações
- **WhatsApp Business API** — agente de IA fora do sistema
- **Gerador de conteúdo automatizado** — integração com GitHub Actions pós deploy

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
- ⚠️ NF-e via Focus NFe: pré-requisito de lançamento — campos fiscais (NCM, CFOP, IE, regime tributário), numeração atômica, emissão/cancelamento/CCe, DANFE PDF
- ⚠️ Strings do projeto antigo ainda presentes (cosmético):
  - `state.js` linha ~1: `STORAGE_KEY = "distribuidorms_v2"` → renomear para `erp_distribuidora_v1`
  - `config.js`: nome do arquivo de backup `distribuidorms_backup_...` → renomear


## Regras de Skills (seguir sempre)

> Estas regras são obrigatórias em todas as sessões. Não pular etapas.

### Ao iniciar qualquer sessão
- SEMPRE ler este `CLAUDE.md` completo antes de qualquer ação
- SEMPRE invocar `smart-effort` para calibrar modelo e esforço antes de responder
- SE a tarefa for nova ou complexa → invocar `brainstorming` antes de qualquer código

### Ao receber uma tarefa de implementação
| Situação | Skill obrigatória |
|---|---|
| Tarefa nova sem spec | `brainstorming` → `writing-plans` |
| Spec aprovado, sem plano | `writing-plans` |
| Plano escrito, tasks independentes | `subagent-driven-development` |
| Plano escrito, tasks sequenciais | `executing-plans` |
| Bug ou comportamento inesperado | `systematic-debugging` |

### Durante implementação
- A cada task concluída → invocar `verification-before-completion` antes de commitar
- Nunca declarar "feito" sem rodar e confirmar a saída real
- Commitar ao final de cada task — nunca acumular mais de 1 task sem commit
- Ao atingir ~60% do contexto → rodar `/compact`

### Ao finalizar trabalho
- Antes de mergear → `requesting-code-review`
- Ao receber feedback de review → `receiving-code-review`
- Ao concluir branch → `finishing-a-development-branch`

### Ao trabalhar com textos da interface
- Qualquer texto voltado ao usuário final → `humanizer-ptbr`

### Regras de carregamento de arquivos
- Nunca carregar todos os arquivos de uma vez
- Carregar apenas os arquivos da task atual
- Máximo por sessão: 3-4 arquivos de módulo + core necessário
- Arquivos grandes (>300 linhas): carregar por seção quando possível

### Combinações mais usadas neste projeto
| Objetivo | Sequência de skills |
|---|---|
| Nova feature | `smart-effort` → `brainstorming` → `writing-plans` → `subagent-driven-development` |
| Executar plano existente | `smart-effort` → `executing-plans` → `verification-before-completion` |
| Corrigir bug | `systematic-debugging` → `verification-before-completion` |
| Revisar e mergear | `requesting-code-review` → `finishing-a-development-branch` |
| Criar documentação | `writing-plans` (para specs) ou direto (para docs simples) |

## Como Iniciar Nova Sessão
1. Leia este `CLAUDE.md` completo
2. Invoque `smart-effort` para calibrar o esforço
3. Consulte a seção **Regras de Skills** acima para a skill correta para a tarefa
4. Carregue apenas os arquivos do módulo em que vai trabalhar — nunca tudo de uma vez
5. Use `/compact` quando o contexto atingir ~60%
6. Faça commit ao finalizar cada task — não ao finalizar o dia
7. Nunca declare "feito" sem rodar `verification-before-completion`

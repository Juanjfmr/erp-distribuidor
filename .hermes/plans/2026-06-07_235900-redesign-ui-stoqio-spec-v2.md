# Stoqio — Especificação Definitiva de Redesign de UI

> **Versão:** 2.0 (aprovada)
> **Data:** 2026-06-07
> **Status:** ✅ Aprovada para implementação

---

## Decisões do Dono

| Decisão | Escolha | Justificativa |
|---|---|---|
| Cor primária | **Azul cobalto #2563eb** | Roxo não vende para distribuidor. Azul transmite confiança e solidez. |
| Tema padrão | **Light (#f8f9fa)** com dark opcional (#121212) | Público de distribuidora usa Windows claro. Dark mode ofusca em uso diário. |
| KPI #1 do dashboard | **Pedidos pendentes** | Distribuidor médio vive de processar 20-50 pedidos/dia. |
| Onboarding novo usuário | **Card amigável e suave**, some quando completar | Sem onboarding = tela morta para novo usuário. |
| Nome da identidade | **Apenas "Stoqio"** | Simples, limpo, sem firula. |
| Landing page | **Incluir no escopo** | Lead não chega no sistema se o site for feio. |

---

## 1. Diagnóstico Visual

### Problemas por ordem de impacto

| # | Problema | Gravidade |
|---|---|---|
| 1 | Paleta sem harmonia (roxo + verde neon) | 🔴 Alto |
| 2 | Emojis como ícones de ação (📋 📈 ✕) | 🔴 Alto |
| 3 | Cards sem profundidade (tudo plano) | 🟡 Médio |
| 4 | Tabelas densas (padding 10px/14px) | 🟡 Médio |
| 5 | Notificação NF-e fixa no dashboard | 🔴 Alto |
| 6 | Onboarding ocupando espaço do dashboard | 🟡 Médio |
| 7 | "v2.0" visível no rodapé | 🟢 Baixo |
| 8 | Sidebar ativa com border-left feia | 🟡 Médio |
| 9 | Variáveis CSS orgânicas sem sistema | 🟡 Médio |
| 10 | "undefined" visível em colunas | 🔴 Alto |

---

## 2. Paleta de Cores — Definitiva

### Light Mode (PADRÃO)

```css
/* ─── Fundo ───────────────────────────────── */
--bg:            #f8f9fa      /* fundo principal — quase branco */
--bg-elevated:   #ffffff      /* cards, sidebars */
--bg-hover:      #f1f5f9      /* hover states */
--bg-raised:     #ffffff      /* modais, dropdowns */

/* ─── Bordas ──────────────────────────────── */
--border:        #e2e8f0      /* bordas sutis */
--border-strong: #cbd5e1      /* bordas que precisam ser vistas */
--border-focus:  #2563eb      /* borda de foco — azul */

/* ─── Texto ───────────────────────────────── */
--text:          #1e293b      /* texto principal — slate-800 */
--text-secondary:#64748b      /* texto secundário */
--text-muted:    #94a3b8      /* placeholders, desabilitados */

/* ─── Primary ─────────────────────────────── */
--primary:         #2563eb    /* azul cobalto */
--primary-hover:   #1d4ed8   /* hover */
--primary-subtle:  rgba(37,99,235,0.08)
--primary-border:  rgba(37,99,235,0.2)

/* ─── Semântica ───────────────────────────── */
--success:     #10b981       /* esmeralda */
--success-bg:  rgba(16,185,129,0.08)
--warning:     #f59e0b       /* âmbar */
--warning-bg:  rgba(245,158,11,0.08)
--danger:      #ef4444
--danger-bg:   rgba(239,68,68,0.08)
--info:        #3b82f6
--info-bg:     rgba(59,130,246,0.08)
```

### Dark Mode (OPCIONAL)

```css
/* ─── Fundo ───────────────────────────────── */
--bg:            #121212      /* fundo principal — ajustado do UX */
--bg-elevated:   #1c1c1c      /* cards */
--bg-hover:      #262626      /* hover */
--bg-raised:     #262626      /* modais */

/* ─── Texto ───────────────────────────────── */
--text:          #d4d4d4      /* menos ofuscante que branco puro */
--text-secondary:#a3a3a3
--text-muted:    #737373

/* ─── Bordas ──────────────────────────────── */
--border:        #2a2a2a
--border-strong: #333333
```

---

## 3. Dashboard Definitivo

### Lógica de prioridades (público PME — 1-2 pessoas acumulam funções)

Um dashboard único. A mesma pessoa que emite NF de manhã separa pedido à tarde e confere fluxo de caixa à noite.

```
┌── ATALHOS (sempre visíveis no topo) ──────────────────┐
│  [➕ Nova NF]  [📦 Novo Pedido]  [➕ Novo Cliente]     │
├── MÉTRICAS PRINCIPAIS ────────────────────────────────┤
│                                                        │
│  ┌─── PEDIDOS PENDENTES (KPI #1, DESTAQUE) ─────────┐ │
│  │  📋 23 pedidos para faturar       R$ 47.890,00    │ │
│  │  ┌────────────────────────────────────────────┐   │ │
│  │  │ Pedido #145 — Dist. ABC    R$ 3.200  ⏰ 48h│   │ │
│  │  │ Pedido #146 — Comercial X  R$ 1.890  🔴 urg│   │ │
│  │  │ Pedido #147 — Farmácia Y   R$ 5.400  ✅ ok │   │ │
│  │  └────────────────────────────────────────────┘   │ │
│  ├─── LINHA DE APOIO (compacta) ─────────────────────┤ │
│  │  R$ 189K           │  15 clientes    │ R$ 3.200   │ │
│  │  Faturamento mês   │  sem pedido     │ vencidos   │ │
│  │  ▲ 12% vs mês ant  │  este mês       │            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                        │
│  ┌── FEED: Últimas Atividades ───────────────────────┐ │
│  │  Tab: [📄 NFs] [📋 Pedidos] [💰 Financeiro]      │ │
│  │  ──────────────────────────────────────────────── │ │
│  │  │ NF 0047  │ João Silva      │ R$ 1.230  │ ✅  │ │
│  │  │ NF 0046  │ Maria Santos    │ R$ 3.450  │ ⏳  │ │
│  │  │ NF 0045  │ Tech Solutions  │ R$ 5.100  │ ❌  │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Onboarding (primeiro acesso)

```
┌─────────────────────────────────────────────────────────┐
│  👋 Bem-vindo à Stoqio!                                 │
│  Complete os passos abaixo e comece a vender em minutos  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  ████░░░░░░░░  2/5                              │ │
│  │  ✅ Dados da empresa                              │ │
│  │  ⬜ Importar produtos e clientes  → [Iniciar]     │ │
│  │  ⬜ Criar primeiro pedido                         │ │
│  │  ⬜ Emitir primeira NF-e                          │ │
│  │  ⬜ Primeiro recebimento                          │ │
│  │  [Continuar configuração →]                       │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌── Preview do que virá ──────────────────────────────┐ │
│  │  Assim que tiver dados, você verá aqui seus         │ │
│  │  pedidos pendentes, faturamento e atividades.       │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Regra:** Card some silenciosamente quando onboarding = 100%. Sem badge, sem notificação, sem lembrete.

---

## 4. Identidade Visual

### Nome
**Apenas "Stoqio"** — sem subtítulo, sem apelido. Limpo como Linear, Stripe, Vercel.

### Logo
Manter o SVG gradiente atual (roxo → roxo escuro). Funciona bem. O azul será a cor de ação (botões, links), não a cor do logo.

### Tipografia
- **Display:** Plus Jakarta Sans (800, 700, 600)
- **Corpo:** Plus Jakarta Sans (400, 500)
- **Mono:** JetBrains Mono (números, códigos)
- **Escala:** 11px → 30px

### Elevação (sombras)
```css
--shadow-sm:   0px 1px 2px rgba(0,0,0,0.08)   /* light */
--shadow-md:   0px 4px 12px rgba(0,0,0,0.1)
--shadow-lg:   0px 8px 24px rgba(0,0,0,0.12)
--shadow-xl:   0px 12px 40px rgba(0,0,0,0.15)
```

---

## 5. Design System (Variáveis CSS)

### Estrutura do :root no app.html

Unificar os 2 blocos <style> em 1 único (linhas 216-404 + 405-470 → único bloco). Remover !important.

### Classes utilitárias

| Classe | Proposta |
|---|---|
| .card | bg-elevated, border, shadow-sm, radius-md, padding-lg |
| .card-header | flex justify-between, margin-bottom-md |
| .card-title | font-display, bold, text-lg |
| .table th | padding 12px 16px, text-xs, uppercase, muted |
| .table td | padding 12px 16px, text-sm |
| .btn-primary | bg primary, white, semibold |
| .btn-secondary | transparent, border-strong |
| .btn-ghost | transparent, muted text |
| .btn-sm | padding 4px 10px, text-xs |
| .form-input | bg, border-strong, radius-sm, focus: primary shadow |
| .modal-overlay | rgba 0.7 + backdrop-filter blur(4px) |
| .modal-box | bg-raised, border-strong, shadow-lg, radius-lg |

### Variáveis que faltam (adicionar)
```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--transition-fast:  0.15s var(--ease-out)
--transition-normal: 0.25s var(--ease-out)

--layer-overlay:   100
--layer-sidebar:   200
--layer-modal:     1000
--layer-toast:     2000

--leading-tight:   1.25
--leading-normal:  1.5
--leading-relaxed: 1.7
```

---

## 6. Sidebar

### Mudanças
- **Estado ativo:** bg sutil (primary-subtle) + ícone colorido (primary). SEM border-left.
- **Rodapé:** Substituir "v2.0" por mini-perfil (iniciais + email)
- **Agrupamento:** Separar em seções com labels:
  ```
  VENDAS     → Produtos, Clientes, Pedidos, NFs, Devoluções
  FINANCEIRO → Contas, Caixa, Compras
  GESTÃO     → Fornecedores, Relatórios
  SISTEMA    → Config (collapsible: Usuários, Minha Conta)
  ```

---

## 7. Ícones

### Estratégia
**Sprite sheet inline com `<use>`** (mesma técnica dos nav items atuais).

```html
<svg style="display:none">
  <symbol id="icon-plus" viewBox="0 0 24 24">...</symbol>
  <symbol id="icon-x" viewBox="0 0 24 24">...</symbol>
  <symbol id="icon-bar-chart" viewBox="0 0 24 24">...</symbol>
  <symbol id="icon-trending-up" viewBox="0 0 24 24">...</symbol>
</svg>

<!-- Uso: -->
<svg width="16" height="16"><use href="#icon-plus"/></svg>
```

### Substituições obrigatórias
| Emoji | Feather SVG |
|---|---|
| 📋 | bar-chart-2 |
| 📈 | trending-up |
| ✕ | x |
| 📦 | package |
| ➕ | plus |
| ✅ | check |

---

## 8. Priorização de Implementação

### Fase 1 — Design System + Sidebar + Cores (1-2 dias)

| # | Tarefa | Esforço |
|---|---|---|
| 1 | Aplicar nova paleta (light mode) no :root + media query dark mode | 30min |
| 2 | Unificar 2 blocos <style> em 1, remover !important | 30min |
| 3 | Adicionar variáveis faltantes (--ease, --layer, --leading) | 15min |
| 4 | Substituir sidebar: estado ativo sem border-left + mini-perfil | 30min |
| 5 | Agrupar sidebar em seções (VENDAS, FINANCEIRO, GESTÃO, SISTEMA) | 30min |
| 6 | Remover "v2.0" do footer | 5min |
| 7 | Criar sprite sheet SVG com <symbol> para todos os ícones | 1h |
| 8 | Substituir emojis por SVGs nos módulos existentes | 1h |
| 9 | Adicionar sombras nos cards (--shadow-sm) | 10min |
| 10 | Remover notificação NF-e do dashboard | 15min |

### Fase 2 — Dashboard + Onboarding (2-3 dias)

| # | Tarefa | Esforço |
|---|---|---|
| 11 | Redesenhar dashboard: pedidos pendentes como KPI #1 | 4h |
| 12 | Implementar feed de atividades com abas (NFs/Pedidos/Financeiro) | 3h |
| 13 | Redesenhar onboarding como card amigável | 2h |
| 14 | Criar sistema de toast notifications | 1h |
| 15 | Adicionar skeleton loaders para carregamento | 1h |
| 16 | Adicionar empty states por módulo | 2h |

### Fase 3 — Refinamento (2-3 dias)

| # | Tarefa | Esforço |
|---|---|---|
| 17 | Padronizar tabelas (padding 12px 16px, hover bg) | 1h |
| 18 | Padronizar formulários (focus states) | 1h |
| 19 | Padronizar modais (backdrop-filter, sombra) | 30min |
| 20 | Ajustar todos os border-radius para o sistema | 30min |
| 21 | Avatar dropdown na topbar | 1h |
| 22 | Revisar contraste WCAG AA para todos os textos | 1h |

### Fase 4 — Landing Page + Polimento (1-2 dias)

| # | Tarefa | Esforço |
|---|---|---|
| 23 | Alinhar paleta da landing page com o app (azul primary) | 1h |
| 24 | Revisar copy da landing (CTAs, seções) | 1h |
| 25 | Responsividade mobile (testar todas as telas) | 2h |
| 26 | Limpar dados de teste (undefined, QA CRUD, etc.) | 1h |

---

## 9. Anti-requisitos (imutáveis)

1. 🚫 NÃO trocar de framework — Vanilla JS continua
2. 🚫 NÃO quebrar funcionalidade existente — só CSS + reposicionamento
3. 🚫 NÃO aumentar tempo de carregamento — zero libs externas novas
4. 🚫 NÃO remover funcionalidade — só reposicionar ou redesenhar
5. 🚫 NÃO mudar estrutura de dados — state, render(), navigate() intactos
6. 🚫 NÃO adicionar build step — CSS inline, JS em módulos ES6 puros
7. 🚫 NÃO quebrar layout responsivo existente

---

## Apêndice — Personas Validadas por Pesquisa

### Persona 1: Dono/Admin (José, 42)
- Acumula funções, abre o sistema pra ver números
- Quer ver: pedidos pendentes, faturamento, clientes sem pedido
- NÃO quer: onboarding, configuração, formulários

### Persona 2: Operador (Roberto, 35)
- 1-2 pessoas na empresa que operam o sistema
- Quer ver: pedidos pra faturar, NFs pra emitir, contas a pagar
- A mesma pessoa faz TUDO no sistema

### Persona 3: Contador terceirizado (Marta, 38)
- Acesso somente leitura
- Quer ver: NFs emitidas, contas a pagar/receber, movimentação de caixa
- Já implementado no código (ROLE_NAV.contador)

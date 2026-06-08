# Stoqio — Especificação de Redesign de UI

> **Documento:** Design & Especificação Visual  
> **Produto:** Stoqio ERP (SaaS multi-tenant)  
> **Data:** 2026-06-07  
> **Status:** Proposta para aprovação  
> **Tag:** `/stoqio/design/redesign-ui-v1`

---

## Índice

1. [Diagnóstico Visual — Por que mudar?](#1-diagnóstico-visual--por-que-mudar)
2. [Identidade Visual Proposta — "Stoqio Pulse"](#2-identidade-visual-proposta--stoqio-pulse)
3. [Design System — Variáveis CSS Completas](#3-design-system--variáveis-css-completas)
4. [Redesign do Dashboard — Primeira Vista](#4-redesign-do-dashboard--primeira-vista)
5. [Redesign dos Módulos Internos](#5-redesign-dos-módulos-internos)
6. [Dashboard Ideal — Wireframe Textual](#6-dashboard-ideal--wireframe-textual)
7. [Sidebar e Topbar — Refinamento](#7-sidebar-e-topbar--refinamento)
8. [Login Screen — Manter e Polir](#8-login-screen--manter-e-polir)
9. [Ícones — Substituição de Emojis](#9-ícones--substituição-de-emojis)
10. [Priorização de Implementação](#10-priorização-de-implementação)
11. [Anti-requisitos](#11-anti-requisitos)
12. [Referências de Inspiração](#12-referências-de-inspiração)

---

## 1. Diagnóstico Visual — Por que mudar?

### O problema em uma frase

> Stoqio hoje parece um sistema feito por um desenvolvedor para si mesmo — funcional, mas sem polimento. Para vender, precisa parecer um produto que custa R$500/mês antes mesmo de o cliente olhar o preço.

### Diagnóstico rápido do que fere a percepção de qualidade

| Problema | Impacto | Gravidade |
|---|---|---|
| Paleta sem harmonia: roxo + verde neon + âmbar + vermelho | Parece paleta de ferramenta dev, não de produto profissional | 🔴 Alto |
| Emojis como ícones de ação (📋 📈 ✕) na tabela de produtos | Amador; quebra imersão | 🔴 Alto |
| Cards sem sombra (tudo plano) | Sem profundidade visual; parece protótipo | 🟡 Médio |
| Tabelas densas (padding 10px/14px, fonte 13px) | Cansa visualmente; estilo spreadsheet | 🟡 Médio |
| "v2.0" visível no rodapé da sidebar | Informação irrelevante para o usuário | 🟢 Baixo |
| Sidebar ativa com border-left roxo + fundo rgba | Funcional mas sem elegância | 🟡 Médio |
| Variáveis CSS orgânicas sem sistema coerente | Dificulta manutenção e escalonamento visual | 🟡 Médio |
| "undefined" visível em coluna de categoria | Dado sujo visível ao usuário | 🔴 Alto |
| Notificação de NF-e fixa no dashboard | Fora de contexto; polui o espaço principal | 🔴 Alto |

### O alvo visual

Stoqio deve transmitir, na primeira tela:

> **"Isto é uma ferramenta profissional, confiável e moderna."**

Não precisa ser chamativo. Precisa parecer **intencional**. Cada pixel deve parecer que foi colocado ali de propósito. Cada cor, espaçamento e borda deve fazer sentido dentro de um sistema.

---

## 2. Identidade Visual Proposta — "Stoqio Pulse"

### Conceito

**Stoqio Pulse** — um design system focado em clareza, confiança e ritmo.

- **Clareza:** hierarquia visual nítida; o que importa aparece grande; o secundário aparece pequeno.
- **Confiança:** cores estáveis, bordas definidas, sombras suaves — nada grita.
- **Ritmo (Pulse):** o roxo não é a cor da interface inteira — é o batimento cardíaco, usado com moderação em ações, destaques e estados ativos.

O Stoqio não precisa ser "divertido" (não é TikTok). Precisa ser **sério sem ser sombrio**, moderno sem ser modista.

### Paleta de Cores — Proposta Completa

Harmonia cromática baseada em **violeta profundo + tons neutros frios + verde sutil para sucesso**.
O verde neon (#22c55e) existente é substituído por um verde mais sofisticado e menos agressivo.

```
─── Cores Base ─────────────────────────────────────────────
--bg:          #0a0a0a     (fundo principal — mais escuro que o atual #0f0f0f)
--bg-elevated: #111111     (cards, sidebars — um tom acima do fundo)
--bg-hover:    #1a1a1a     (hover states)
--bg-raised:   #1c1c1c     (modais, dropdowns — superfície elevada)

─── Bordas ─────────────────────────────────────────────────
--border:      #1e1e1e     (bordas padrão — sutis, quase invisíveis)
--border-strong: #2a2a2a   (bordas que precisam ser vistas)
--border-focus: #8b5cf6    (borda de foco — roxo suave)

─── Texto ──────────────────────────────────────────────────
--text:        #e8e8e8     (texto principal — 91% contraste)
--text-secondary: #9ca3af  (texto secundário — metadados, labels)
--text-muted:  #6b7280     (texto desabilitado, placeholders)

─── Cores de Acento ───────────────────────────────────────
--primary:       #8b5cf6   (roxo principal — ações primárias, links)
--primary-hover: #7c3aed   (hover do primary)
--primary-subtle: rgba(139,92,246,0.1)  (fundo de badge ativo)
--primary-border: rgba(139,92,246,0.2)  (borda sutil de destaque)

─── Cores Semânticas ──────────────────────────────────────
--success:       #10b981   (verde esmeralda — substitui #22c55e)
--success-bg:    rgba(16,185,129,0.1)
--warning:       #f59e0b   (âmbar — mantido, é universal)
--warning-bg:    rgba(245,158,11,0.1)
--danger:        #ef4444   (vermelho — mantido, mas menos agressivo)
--danger-bg:     rgba(239,68,68,0.1)
--info:          #3b82f6   (azul — informação)
--info-bg:       rgba(59,130,246,0.1)

─── Gradiente de Marca ────────────────────────────────────
--brand-gradient: linear-gradient(135deg, #8b5cf6, #6d28d9)
```

> **Por que trocar #22c55e por #10b981?**  
> Verde neon (#22c55e) é saturado demais em fundo escuro — parece "barato", tipo LED de loja. #10b981 (esmeralda) é mais sofisticado, mantém a legibilidade e tem melhor contraste com fundo escuro.

> **Por que trocar #a78bfa por #8b5cf6?**  
> #a78bfa é um roxo muito claro para dark mode — parece lavanda, falta contraste em botões. #8b5cf6 é um violeta médio com contraste suficiente sobre fundo escuro e branco, e é o purple padrão do Tailwind — referência que qualquer dev frontend reconhece.

### Tipografia — Escala e Uso

```
─── Famílias ───────────────────────────────────────────────
--font-display: 'Plus Jakarta Sans', sans-serif   (títulos)
--font-body:    'Plus Jakarta Sans', sans-serif   (corpo)
--font-mono:    'JetBrains Mono', monospace       (números, código)

─── Escala Tipográfica ────────────────────────────────────
--text-xs:   11px / 1.4   (labels, badges, metadados)
--text-sm:   13px / 1.5   (corpo pequeno, tabelas)
--text-base: 14px / 1.6   (corpo padrão)
--text-lg:   16px / 1.5   (subtítulos)
--text-xl:   20px / 1.4   (títulos de página)
--text-2xl:  24px / 1.3   (títulos de seção)
--text-3xl:  30px / 1.25  (títulos grandes)

─── Pesos ──────────────────────────────────────────────────
--weight-normal:  400     (corpo)
--weight-medium:  500     (ênfase leve)
--weight-semibold:600     (botões, labels)
--weight-bold:    700     (títulos de página)
--weight-extrabold:800    (logo, hero)

─── Usos por elemento ──────────────────────────────────────
- Logo:     font-display extrabold, text-xl ou text-2xl
- Título de página: font-display bold, text-xl
- KPI value: font-mono medium, text-2xl ou text-3xl
- Célula de tabela: font-body normal, text-sm
- Badge: font-body semibold, text-xs
- Botão: font-body semibold, text-sm ou text-base
```

### Elevação e Sombras

Sistema de 4 camadas — cria profundidade sem depender de backdrop-filter pesado.

```
─── Elevação ───────────────────────────────────────────────
--elevation-1:   0px 1px 2px rgba(0,0,0,0.3)             (cards, KPIs)
--elevation-2:   0px 4px 12px rgba(0,0,0,0.4)           (dropdowns, modais)
--elevation-3:   0px 8px 24px rgba(0,0,0,0.5)           (modais grandes, sidebars em mobile)
--elevation-4:   0px 12px 40px rgba(0,0,0,0.6)          (toasts, notificações flutuantes)
```

> **Por que sombras em dark mode?**  
> Em dark mode, sombras são sutis mas ESSENCIAIS para criar hierarquia de profundidade. Sem sombras, cards, modais e sidebars parecem tudo "na mesma camada". A sombra em dark mode deve ser preta com opacidade — não cinza — porque cinza em fundo escuro cria brilho indesejado.

### Border Radius

Sistema de 4 raios — consistência total.

```
--radius-sm:  6px     (botões, inputs, badges)
--radius-md:  8px     (cards, KPIs, dropdowns)
--radius-lg:  12px    (modais, sidebar em mobile)
--radius-xl:  16px    (login card, trial cards)
```

> Cards hoje estão em 10px — um número "solto". Ajustar para 8px (md) alinha com o sistema.

---

## 3. Design System — Variáveis CSS Completas

### Organização

As variáveis CSS devem ser reorganizadas em **blocos semânticos claros** no `:root`, substituindo a estrutura atual (tudo na mesma linha, sem comentários).

```css
:root {
  /* ─── Fundo e superfície ──────────────────────────── */
  --bg:           #0a0a0a;
  --bg-elevated:  #111111;
  --bg-hover:     #1a1a1a;
  --bg-raised:    #1c1c1c;

  /* ─── Bordas ────────────────────────────────────────── */
  --border:         #1e1e1e;
  --border-strong:  #2a2a2a;
  --border-focus:   #8b5cf6;

  /* ─── Texto ─────────────────────────────────────────── */
  --text:            #e8e8e8;
  --text-secondary:  #9ca3af;
  --text-muted:      #6b7280;

  /* ─── Primary ───────────────────────────────────────── */
  --primary:         #8b5cf6;
  --primary-hover:   #7c3aed;
  --primary-subtle:  rgba(139,92,246,0.1);
  --primary-border:  rgba(139,92,246,0.2);

  /* ─── Semântica ─────────────────────────────────────── */
  --success:     #10b981;
  --success-bg:  rgba(16,185,129,0.1);
  --warning:     #f59e0b;
  --warning-bg:  rgba(245,158,11,0.1);
  --danger:      #ef4444;
  --danger-bg:   rgba(239,68,68,0.1);
  --info:        #3b82f6;
  --info-bg:     rgba(59,130,246,0.1);

  /* ─── Tipografia ────────────────────────────────────── */
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-body:    'Plus Jakarta Sans', sans-serif;
  --font-mono:    'JetBrains Mono', monospace;

  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 14px;
  --text-lg:   16px;
  --text-xl:   20px;
  --text-2xl:  24px;
  --text-3xl:  30px;

  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;
  --weight-extrabold:800;

  /* ─── Elevação ───────────────────────────────────────── */
  --shadow-sm:   0px 1px 2px rgba(0,0,0,0.3);
  --shadow-md:   0px 4px 12px rgba(0,0,0,0.4);
  --shadow-lg:   0px 8px 24px rgba(0,0,0,0.5);
  --shadow-xl:   0px 12px 40px rgba(0,0,0,0.6);

  /* ─── Border Radius ──────────────────────────────────── */
  --radius-sm:  6px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  16px;

  /* ─── Espaçamento (opcional, mas útil) ───────────────── */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
}
```

### Classes utilitárias propostas (substituem as atuais)

```
─── Cards ──────────────────────────────────────────────────
.card               → bg: var(--bg-elevated), border: 1px solid var(--border), 
                       border-radius: var(--radius-md), padding: var(--space-lg),
                       box-shadow: var(--shadow-sm)
.card-header        → display: flex, justify-between, margin-bottom: var(--space-md)
.card-title         → font: var(--font-display), weight: var(--weight-bold), 
                       size: var(--text-lg), color: var(--text)
.card-body          → gap padrão entre elementos

─── Tabelas ────────────────────────────────────────────────
.table              → width: 100%, border-collapse
.table th           → text-align: left, padding: 12px 16px, font-size: var(--text-xs),
                       color: var(--text-muted), text-transform: uppercase,
                       letter-spacing: 0.06em, border-bottom: 1px solid var(--border),
                       background: var(--bg)
.table td           → padding: 12px 16px, border-bottom: 1px solid var(--border),
                       color: var(--text-secondary), font-size: var(--text-sm)
.table tr:hover td  → background: var(--bg-hover)
.table tr:last-child td → border-bottom: none

─── Botões ─────────────────────────────────────────────────
.btn                → padding: 8px 16px, border-radius: var(--radius-sm), 
                       font-weight: var(--weight-semibold), font-size: var(--text-sm),
                       border: none, cursor: pointer, transition: all 0.15s
.btn-primary        → bg: var(--primary), color: white
.btn-primary:hover  → bg: var(--primary-hover)
.btn-secondary      → bg: transparent, border: 1px solid var(--border-strong), color: var(--text)
.btn-secondary:hover→ bg: var(--bg-hover)
.btn-ghost          → bg: transparent, color: var(--text-muted)
.btn-ghost:hover    → bg: var(--bg-hover), color: var(--text)
.btn-danger         → bg: var(--danger-bg), color: var(--danger), border: 1px solid rgba(239,68,68,0.2)
.btn-sm             → padding: 4px 10px, font-size: var(--text-xs)
.btn-icon           → padding: 6px, border-radius: var(--radius-sm), line-height: 1

─── Inputs ─────────────────────────────────────────────────
.form-group         → margin-bottom: var(--space-md)
.form-label         → font-size: var(--text-xs), color: var(--text-muted), 
                       font-weight: var(--weight-medium), margin-bottom: 6px
.form-input         → width: 100%, bg: var(--bg), border: 1px solid var(--border-strong),
                       border-radius: var(--radius-sm), padding: 10px 14px,
                       color: var(--text), font-size: var(--text-sm)
.form-input:focus   → border-color: var(--primary), box-shadow: 0 0 0 3px var(--primary-subtle)

─── Modais ─────────────────────────────────────────────────
.modal-overlay      → bg: rgba(0,0,0,0.7), backdrop-filter: blur(4px)
.modal-box          → bg: var(--bg-raised), border: 1px solid var(--border-strong),
                       border-radius: var(--radius-lg), box-shadow: var(--shadow-lg),
                       padding: 28px
.modal-title        → font: var(--font-display), weight: var(--weight-bold), 
                       size: var(--text-lg)

─── Sidebar ────────────────────────────────────────────────
#sidebar            → width: 224px, bg: var(--bg), border-right: 1px solid var(--border)
.nav-item           → padding: 10px 20px, font-size: var(--text-sm), color: var(--text-muted),
                       border-left: 2px solid transparent, display: flex, gap: 10px, 
                       align-items: center, transition: all 0.15s
.nav-item:hover     → bg: var(--bg-hover), color: var(--text-secondary)
.nav-item.active    → bg: var(--primary-subtle), color: var(--primary), 
                       border-left-color: var(--primary), font-weight: var(--weight-semibold)

─── Badges ─────────────────────────────────────────────────
.badge              → display: inline-flex, padding: 2px 8px, border-radius: 999px,
                       font-size: var(--text-xs), font-weight: var(--weight-semibold),
                       line-height: 1.4
.badge-success      → bg: var(--success-bg), color: var(--success)
.badge-warning      → bg: var(--warning-bg), color: var(--warning)
.badge-danger       → bg: var(--danger-bg), color: var(--danger)
.badge-info         → bg: var(--info-bg), color: var(--info)
.badge-neutral      → bg: var(--bg-hover), color: var(--text-muted)

─── Tabs ───────────────────────────────────────────────────
.tabs               → display: flex, border-bottom: 1px solid var(--border)
.tab                → padding: 10px 20px, font-size: var(--text-sm), color: var(--text-muted),
                       border-bottom: 2px solid transparent, cursor: pointer
.tab:hover          → color: var(--text-secondary)
.tab.active         → color: var(--primary), border-bottom-color: var(--primary)

─── Alerts / Notificações ─────────────────────────────────
.alert              → padding: 12px 16px, border-radius: var(--radius-sm), 
                       font-size: var(--text-sm), margin-bottom: var(--space-md)
.alert-warning      → bg: var(--warning-bg), border: 1px solid rgba(245,158,11,0.2),
                       color: var(--warning)
.alert-danger       → bg: var(--danger-bg), border: 1px solid rgba(239,68,68,0.2),
                       color: var(--danger)
.alert-info         → bg: var(--info-bg), border: 1px solid rgba(59,130,246,0.2),
                       color: var(--info)
```

---

## 4. Redesign do Dashboard — Primeira Vista

### O que o usuário DEVE ver primeiro (hierarquia visual)

1. **Métrica principal do negócio** — Faturamento do mês (grande, central)
2. **KPIs compactos** — 3 indicadores de suporte ao lado
3. **Atividades recentes** — Últimas 5 transações (vendas, NFs emitidas)
4. **Atalhos contextuais** — "Nova NF", "Novo Pedido", "Importar CSV"
5. **Tudo mais** — só se precisar rolar

### O que DEVE SUMIR da primeira vista

| Elemento atual | Destino | Motivo |
|---|---|---|
| Notificação "Configure a NF-e" | Aba Nota Fiscal + notificações no sino | Não é informação de dashboard |
| "Complete seu cadastro — 0%" | Wizard de onboarding + notificações | Não é informação de dashboard |
| Lista gigante de NFs recentes | Reduzir para 3-5 itens | Sobrecarrega a primeira tela |
| KPIs demais (estoque, fornecedores, etc.) | Deixar apenas 3-4 KPIs principais | Menos é mais |
| Curva ABC no dashboard | Mover para módulo Relatórios | Dashboard não é relatório |

### Hierarquia visual do novo dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                          jan 2026            │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │ Faturamento   │ │  Pedidos  │ │  Clientes │ │  Estoque ││
│ │ R$ 47.890,00  │ │    142    │ │     89    │ │  1.234   ││
│ │ ▲ 12% vs. mês │ │ ▲ 8%     │ │ ▲ 3%     │ │ ▼ -2%    ││
│ └──────────────┘ └──────────┘ └──────────┘ └──────────┘│
│                                                         │
│ ┌──────────────────────────────────────────────────────┐│
│ │  Atividades Recentes                    [Ver Todas]  ││
│ ├──────────────────────────────────────────────────────┤│
│ │ ● NF 00047 — João Silva      R$ 1.230,00    hoje    ││
│ │ ● NF 00046 — Maria Santos    R$ 3.450,00    ontem   ││
│ │ ● Pedido #12 — Distrib. ABC  R$ 890,00      ontem   ││
│ │ ● NF 00045 — Tech Solutions  R$ 5.100,00    2 dias  ││
│ │ ● Entrada de mercadoria      —              3 dias  ││
│ └──────────────────────────────────────────────────────┘│
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │  Nova NF-e   │ │  Novo Pedido │ │  Novo Cliente│     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Lógica por trás da hierarquia

1. **Faturamento em destaque** — É a métrica que TODO dono de negócio olha primeiro. Deve ser o maior número na tela, em fonte monoespaçada grande e com delta (▲/▼) colorido.
2. **4 KPIs compactos** — Cada um com um número limpo e uma variação percentual. Contraste com labels em muted. Nada de ícones dentro dos KPIs — texto puro, limpo.
3. **Feed de atividades** — Substitui a tabela de NFs recentes. É mais escaneável e útil no dia a dia: o usuário vê O QUE aconteceu, QUANDO e QUANTO.
4. **Atalhos rápidos** — 3 cards horizontais no final. Leve, discreto, mas presente.

### O que acontece com a notificação NF-e?

**Regra definitiva:**

> Nenhuma notificação de configuração pendente aparece no dashboard. Period.

- A notificação de "Configure sua NF-e" vai para o **sino de notificações** (ícone no topbar).
- Dentro do módulo **Nota Fiscal**, se a NF-e não está configurada, aparece um banner no topo: "Configure sua NF-e para emitir notas fiscais → Configurar".
- No dashboard, se o usuário não configurou NF-e: **silêncio total**. Zero banners, zero alerts.

**Por quê?**
O dashboard não é para configuração. É para operação. O usuário que não emite NF todo dia não deve ser assustado com um alerta fiscal. Quando ele for emitir NF, o sistema mostra o alerta no contexto certo.

---

## 5. Redesign dos Módulos Internos

### 5.1 Padronização de Tabelas

Tabelas são o elemento mais frequente no Stoqio — produtos, clientes, fornecedores, NFs, contas. É onde o redesign mais impacta.

**Regras:**

| Propriedade | Atual | Proposto | Motivo |
|---|---|---|---|
| Padding células | 10px 14px | 12px 16px | Mais espaço para respirar |
| Fonte | 13px | 13px (mantido) | Equilíbrio entre densidade e legibilidade |
| Linhas alternadas | Não | Sim (opcional, via `.table-striped`) | Facilita escaneabilidade |
| Hover | rgba(255,255,255,.015) | var(--bg-hover) = #1a1a1a | Mais visível |
| Header bg | var(--bg) | var(--bg) | Mantido (já funciona) |
| Header text | uppercase 11px | uppercase 11px (mantido) | Funciona bem |
| Sombra interna | Não | Não (evitar complexidade) | — |
| Borda inferior | 1px solid var(--border) | 1px solid var(--border) | Mantido |

**Checklist de implementação para todas as tabelas:**
- [ ] Substituir `padding: 10px 14px` por `padding: 12px 16px`
- [ ] Substituir `tr:hover td` background por `var(--bg-hover)`
- [ ] Adicionar classe `.table-striped` para linhas alternadas (opcional)
- [ ] Garantir que colunas numéricas tenham `font-family: var(--font-mono)`
- [ ] Remover qualquer emoji de ação dentro de tabelas

### 5.2 Padronização de Formulários

**Regras:**

- Todos os inputs usam `var(--bg)` como fundo (não `var(--bg2)`)
- Focus state: `border-color: var(--primary)` + `box-shadow: 0 0 0 3px var(--primary-subtle)`
- Labels: `font-size: var(--text-xs)`, cor `var(--text-muted)`, margin-bottom 6px
- Input height: padding 10px 14px (vertical generoso)
- Selects e textareas seguem a mesma regra de inputs
- Placeholder: `color: var(--text-muted)`

**Por quê?**
Inputs com fundo escuro demais (bg2) parecem "desabilitados". Usar `var(--bg)` com borda `var(--border-strong)` deixa claro que é editável.

### 5.3 Padronização de Modais

**Regras:**

- Overlay: `background: rgba(0,0,0,0.7)` + `backdrop-filter: blur(4px)` (leve, funcional)
- Box: `var(--bg-raised)` como fundo (destaca do overlay)
- Borda: `1px solid var(--border-strong)`
- Sombra: `var(--shadow-lg)` (0px 8px 24px)
- Padding: 28px (consistente)
- Título: `var(--font-display)`, bold, `var(--text-lg)`
- Footer: flex-end, gap 10px

**Mobile:**
- Modal vem de baixo (já implementado) — manter
- Border-radius: 16px 16px 0 0 (já implementado) — manter

### 5.4 Padronização de Cards

**Regras:**

- Fundo: `var(--bg-elevated)` (#111111 — um tom acima do fundo)
- Borda: `1px solid var(--border)`
- Border-radius: `var(--radius-md)` (8px)
- Sombra: `var(--shadow-sm)` (0px 1px 2px)
- Padding: `var(--space-lg)` (24px)
- Gap entre cards: `16px` (mantido)

**Card Header:**
- Título dentro do card: `var(--font-display)`, bold, `var(--text-lg)`
- Ações no header: alinhadas à direita
- Separador header/body: `border-bottom: 1px solid var(--border)`

---

## 6. Dashboard Ideal — Wireframe Textual

### Versão "Primeira Vista" (antes de scroll)

```
┌────────────────────────────────────────────────────────────┐
│  #topbar                                                    │
│  ┌──── Dashboard ──────────────────── 🔔 🔄 12/06/2026 ─┐│
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  #content                                                   │
│                                                             │
│  ┌──── KPI GRID (4 colunas) ──────────────────────────────┐│
│  │                                                        ││
│  │  ┌──────────────┐  ┌──────────┐  ┌──────────┐  ┌───┐  ││
│  │  │ Faturamento   │  │  Vendas   │  │ Clientes  │  │ ...│  ││
│  │  │ R$ 47.890     │  │   142     │  │    89     │  │    │  ││
│  │  │ ▲ 12% mês     │  │ ▲ 8%     │  │ ▲ 3%     │  │    │  ││
│  │  └──────────────┘  └──────────┘  └──────────┘  └───┘  ││
│  │                                                        ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──── CARD: Atividades Recentes ─────────────────────────┐│
│  │  ┌── Header ─────────────────────────── [Ver Todas] ─┐ ││
│  │  ├────────────────────────────────────────────────────┤ ││
│  │  │ ● NF 00047 — João Silva      R$ 1.230,00    hoje │ ││
│  │  │ ● NF 00046 — Maria Santos    R$ 3.450,00    ontem│ ││
│  │  │ ● Pedido #12 — Distrib. ABC  R$ 890,00      ontem│ ││
│  │  │ ● NF 00045 — Tech Solutions  R$ 5.100,00    2d  │ ││
│  │  │ ● Entrada estoque            —              3d  │ ││
│  │  └────────────────────────────────────────────────────┘ ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──── CARD: Atalhos Rápidos ─────────────────────────────┐│
│  │  [➕ Nova NF-e]  [📦 Novo Pedido]  [👤 Novo Cliente]   ││
│  └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

### Versão "Scrolled" (abaixo da dobra)

```
│  ┌──── CARD: Contas a Vencer (próximos 7 dias) ──────────┐│
│  │  Conta A        R$ 2.300,00    12/01    ⬤ Pendente   ││
│  │  Conta B        R$ 890,00      14/01    ⬤ Pendente   ││
│  │  Conta C        R$ 5.100,00    15/01    ⬤ Pendente   ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──── CARD: Fluxo de Caixa (7 dias) ────────────────────┐│
│  │  [MINI GRÁFICO DE BARRAS — entradas vs saídas]        ││
│  │  Entradas: R$ 23.000 │ Saídas: R$ 18.500             ││
│  └────────────────────────────────────────────────────────┘│
```

### Regras do Dashboard Ideal

1. **Zero alertas de configuração** — zero banners, zero warnings. Se o usuário não configurou algo, o sistema avisa APENAS dentro do módulo correspondente.
2. **Feed de atividade é o bloco principal** — o que aconteceu de mais importante no negócio hoje.
3. **KPIs são apenas 4** — faturamento, vendas (ou pedidos), clientes ativos, uma métrica do módulo mais usado pelo tenant.
4. **Atalhos contextuais** — "Nova NF", "Novo Pedido", "Novo Cliente" são os 3 atalhos universais mais comuns.
5. **Informação secundária abaixo da dobra** — contas a vencer, fluxo de caixa, estoque baixo. O usuário que quiser ver, rola. Quem não quiser, não é assustado.

---

## 7. Sidebar e Topbar — Refinamento

### Sidebar — Mudanças

**O que mudar:**

1. **Estado ativo** — Trocar `border-left-color: var(--primary)` + `background: rgba(139,92,246,.1)` por:
   - Background sutil `var(--primary-subtle)` 
   - Ícone do módulo ativo com cor `var(--primary)` (stroke do SVG)
   - Texto com `color: var(--text)` (não primary-light)
   - Remover a border-left de 2px — ela é redundante se o background + ícone colorido já identificam o ativo

   _Motivo: border-left parece "quebra" visual. Ícone colorido + bg sutil é mais moderno._

2. **Rodapé "v2.0"** — Substituir por:
   - Email do usuário logado + botão "Minha Conta"
   - Ou um mini perfil: avatar (iniciais) + nome abreviado
   - "v2.0" vai para o console — informação de deploy não é para o usuário

3. **Logo** — Manter o SVG gradiente, mas aumentar ligeiramente o padding inferior.

4. **Nav separators** — Manter as linhas (`nav-sep`) atuais, funcionam bem.

**Wireframe da nova sidebar:**

```
┌──────────────────────┐
│ ┌──── LOGO ────────┐ │
│ │ ◱ Stoqio         │ │
│ │ GESTÃO EMPRESARIAL│ │
│ └──────────────────┘ │
│                       │
│ ◱  Dashboard          │ ← ativo com bg sutil
│ ─────────────────     │
│ ■  Produtos           │
│ 👥 Clientes           │
│ 🚚 Fornecedores       │
│ 📋 Pedidos            │
│ ─────────────────     │
│ 📄 Nota Fiscal        │
│ ↩  Devoluções         │
│ 🛒 Compras            │
│ 💳 Contas             │
│ ─────────────────     │
│ 📊 Fluxo de Caixa     │
│ 📈 Relatórios         │
│ ─────────────────     │
│ ⚙️ Configurações      │
│ 👤 Usuários           │
│ 🏠 Minha Conta        │
│                       │
│ ───────────────────── │
│ JC │ joao@email.com   │ ← mini perfil
└──────────────────────┘
```

> Nota: os ícones acima são representações textuais. Na implementação, usar SVGs Feather-style (já existentes).

### Topbar — Mudanças

**Atual:** título + data + sino + badge de role + sair

**Proposto:**

```
┌─── Título da Página ──────────────── 🔍 🔔 [Avatar] ──┐
│  Dashboard                                              │
└─────────────────────────────────────────────────────────┘
```

- **Título da página** à esquerda (mantido, funciona bem)
- **Ícone de busca** (opcional, futura funcionalidade — preparar espaço)
- **Sino de notificações** com badge (mantido)
- **Avatar do usuário** com iniciais (substitui o badge de role + data)
  - Ao clicar: dropdown com "Minha Conta", "Configurações", "Sair"
  - Role aparece dentro do dropdown, não fixo na topbar

---

## 8. Login Screen — Manter e Polir

O login screen redesign (ls-*) está **bom** e não precisa de overhaul. Apenas polimento:

1. **Ajustar primary** de `#a78bfa` para `#8b5cf6` das variáveis novas
2. **Aumentar subtlety do grid pattern** — opacity .4 → .3
3. **Adicionar transição entre login e signup** (já existe, é suave)
4. **Remover o `display:block` duplicado no `ls-trial-btn`** (não é necessário)

O layout 60/40, o gradiente radial, o grid pattern, as fontes — está alinhado com o nível de qualidade desejado. **Mão para não mexer no que já funciona.**

---

## 9. Ícones — Substituição de Emojis

### Diagnóstico

No módulo de produtos, os botões de ação usam emojis:
- 📋 = "Histórico de Preços" 
- 📈 = "Movimentações"
- ✕ = "Excluir"

Isso é **amador** e precisa ser substituído URGENTEMENTE.

### Proposta

1. Substituir emojis por **SVGs inline** (mesmo estilo Feather dos nav items)
2. Usar os seguintes ícones Feather:
   - 📋 → `bar-chart-2` (histórico/preços)
   - 📈 → `trending-up` (movimentações)
   - ✕ → `x` (excluir)
   - Outros emojis que aparecerem → mapear para Feather equivalente

### Impacto

- Custo: baixo (SVGs inline, mesma técnica já usada)
- Impacto visual: **alto** — remove o aspecto mais amador do sistema
- Performance: zero impacto (SVGs inline não são requisições)

---

## 10. Priorização de Implementação

### Fase 1 — Impacto Imediato (1-2 dias)

> O que dá mais resultado visual com menos esforço.

| # | Tarefa | Esforço | Impacto |
|---|---|---|---|
| 1 | Substituir emojis por SVGs nos módulos | 1h | 🔥 Alto |
| 2 | Aplicar novas variáveis CSS no `:root` | 30min | 🔥 Alto |
| 3 | Remover "v2.0" da sidebar, colocar mini-perfil | 30min | 🔥 Alto |
| 4 | Remover notificação NF-e do dashboard | 15min | 🔥 Alto |
| 5 | Adicionar `box-shadow: var(--shadow-sm)` nos cards | 15min | 🔥 Alto |
| 6 | Adicionar `backdrop-filter: blur(4px)` no overlay modal | 5min | 🟡 Médio |
| 7 | Ajustar hover de tabelas para `var(--bg-hover)` | 10min | 🟡 Médio |

### Fase 2 — Refinamento Visual (2-3 dias)

| # | Tarefa | Esforço | Impacto |
|---|---|---|---|
| 8 | Redesenhar sidebar: remover border-left, aplicar bg sutil no ativo | 30min | 🔥 Alto |
| 9 | Redesenhar o dashboard com novo layout (KPIs + feed + atalhos) | 4h | 🔥 Alto |
| 10 | Padronizar padding de tabelas (12px 16px) | 1h | 🟡 Médio |
| 11 | Ajustar focus states de inputs (borda + shadow) | 30min | 🟡 Médio |
| 12 | Adicionar avatar dropdown na topbar | 1h | 🟡 Médio |
| 13 | Revisar e ajustar todos os border-radius para o sistema | 30min | 🟢 Baixo |

### Fase 3 — Consolidação (2-3 dias)

| # | Tarefa | Esforço | Impacto |
|---|---|---|---|
| 14 | Refatorar CSS em 1 ou 2 blocos <style> organizados | 2h | 🟡 Médio |
| 15 | Criar classes utilitárias faltantes (`.card-header`, `.card-body`, etc.) | 1h | 🟡 Médio |
| 16 | Testar todas as telas em mobile | 2h | 🟡 Médio |
| 17 | Verificar contraste de cores em todas as combinações | 1h | 🟡 Médio |

### O que NÃO FAZER nesta sprint

| Não fazer | Por quê |
|---|---|
| Trocar framework (React, Vue, etc.) | Quebra total, tempo de carregamento sobe |
| Adicionar animações complexas | Pode afetar performance |
| Adicionar gráficos reais (Chart.js) | É funcionalidade, não design — fazer depois |
| Redesenhar a landing page | Já está boa, foco no app |
| Criar micro-interactions (hover com easing, etc.) | Baixo impacto, alto esforço agora |
| Mudar a estrutura de HTML (DOM hierarchy) | Risco de quebrar funcionalidade |

---

## 11. Anti-requisitos

> Regras que NÃO podem ser violadas.

1. **🚫 NÃO trocar de framework** — Vanilla JS continua. Zero dependências novas de UI.
2. **🚫 NÃO quebrar funcionalidade existente** — Toda mudança é puramente CSS + reposicionamento de elementos. Nenhuma lógica de negócio é alterada.
3. **🚫 NÃO aumentar tempo de carregamento** — Nenhuma lib externa nova. SVGs inline e CSS já estão no HTML.
4. **🚫 NÃO remover funcionalidade** — Tudo que existe hoje continua existindo. Apenas reposicionado ou redesenhado.
5. **🚫 NÃO mudar a estrutura de dados** — `state`, `render()`, `navigate()` permanecem intactos.
6. **🚫 NÃO adicionar build step** — CSS continua inline no HTML. JS continua em módulos ES6 puros.
7. **🚫 NÃO remover o layout responsivo existente** — Melhorar se necessário, mas manter compatibilidade.

---

## 12. Referências de Inspiração

Estes são produtos que Juan deve OLHAR para entender o nível de polimento visual que Stoqio deve almejar:

### Design Systems de Referência

| Produto | O que observar |
|---|---|
| **Linear** (linear.app) | Dashboard limpo, tipografia impecável, hierarquia visual clara. O melhor exemplo de "menos é mais" em SaaS. |
| **Vercel** (vercel.com) | Sidebar perfeita — ativo sutil, ícones monocromáticos que mudam de cor, espaço generoso. |
| **Stripe** (stripe.com) | O padrão-ouro de dashboards financeiros. Cards com sombra, tipografia monoespaçada para valores, cores semânticas impecáveis. |
| **Superhuman** | Design de alta densidade que NÃO cansa. Como fazer tabelas densas mas legíveis. |
| **Raycast** | Design system escuro com roxo como primary. Referência direta para Stoqio. |

### Práticas Específicas para Copiar

1. **Linear: estados vazios** — Quando uma lista está vazia, Linear mostra uma ilustração suave com texto útil. Stoqio hoje mostra "empty".
2. **Stripe: valores em destaque** — Números grandes em fonte monoespaçada com cor branca e label pequeno em muted.
3. **Vercel: sidebar** — O hover sutil + ativo com ícone colorido (sem border-left) é o que queremos.
4. **Raycast: cores** — Roxo (#8b5cf6 ou próximo) como primary com fundo escuro (#0a0a0a) é exatamente o que propomos.

### O que EVITAR copiar

- **Notion** — Design leve demais para um ERP (muito branco, pouco contraste)
- **GitHub** — Design muito denso (tabelas apertadas, muita informação)
- **Discord** — Muito "gamer", cores muito saturadas

---

## Apêndice A — Mapa de Mudanças (app.html)

Para implementação rápida, aqui está o mapa de onde cada mudança acontece no `app.html`:

| Linha (atual) | Elemento | Mudança |
|---|---|---|
| 218-225 | `:root` vars | Substituir paleta inteira |
| 233-248 | Sidebar CSS | Ajustar `.nav-item.active` |
| 243-246 | Sidebar nav-item | Remover border-left, adicionar bg sutil |
| 248 | `.sidebar-footer` | Substituir "v2.0" por mini-perfil |
| 251 | `.card` | Adicionar `box-shadow: var(--shadow-sm)` |
| 252-258 | Tabelas | Ajustar padding para 12px 16px, hover bg |
| 268-272 | Badges | Substituir `--green` por `--success`, ajustar bg |
| 289-290 | Modais | Adicionar `backdrop-filter: blur(4px)` |
| 501 | `#sb-footer` | Conteúdo "v2.0" → template mini-perfil |
| 512 | `#notif-bell` | Emoji 🔔 → SVG bell (ou manter, é padrão) |

---

## Apêndice B — Checklist de Verificação Visual

Antes de considerar o redesign "completo", verificar:

- [ ] Todos os emojis de ação foram substituídos por SVGs
- [ ] Cards têm sombra sutil (`var(--shadow-sm)`)
- [ ] Tabelas têm padding 12px 16px
- [ ] Hover de tabelas usa `var(--bg-hover)`
- [ ] Focus de inputs usa border primary + shadow
- [ ] Notificação NF-e NÃO aparece no dashboard
- [ ] "v2.0" não aparece na sidebar
- [ ] Sidebar ativo tem bg sutil + ícone colorido (sem border-left)
- [ ] Modal overlay tem blur
- [ ] Badge verde usa `var(--success)` (#10b981)
- [ ] Dashboard tem no máximo 4 KPIs + feed + atalhos
- [ ] Cores seguem a nova paleta (sem #22c55e, sem #a78bfa)
- [ ] Template está responsivo (mobile testado)
- [ ] Nada quebrou funcionalmente (todos os módulos renderizam)

---

> **Próximo passo:** Aguardar aprovação de Juan antes de iniciar a implementação.  
> Após aprovação, seguir a priorização da [Seção 10](#10-priorização-de-implementação) — Fase 1 primeiro, Fase 2 em seguida.

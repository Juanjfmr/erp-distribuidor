# Design Doc — Landing Page Stoqio
**Data:** 2026-06-06
**Status:** Aprovado — aguardando plano de implementação
**Contexto:** Primeira landing page pública do Stoqio. Objetivo: converter tráfego frio de donos de distribuidoras em trials gratuitos (primário) e planos pagos diretos (secundário).

---

## 1. Decisões Estratégicas

**Público primário:** Donos de distribuidoras brasileiras, 35–55 anos, sensíveis a preço, resistentes a mudança, hoje no Excel ou em sistemas legados caros.
**Público secundário:** Varejo em geral.

**Objetivo de conversão:**
- Primário: trial grátis 30 dias (sem cartão)
- Secundário: assinar plano pago diretamente

**Abordagem:** Problema → Solução (unanimidade dos agentes de UX, copy e produto). Sem social proof inicial — substituído por especificidade numérica, garantias e diferenciais concretos.

**Brand:** Dark mode, cor primária `#a78bfa` / `#c4b5fd` (roxo, estilo Nubank).

---

## 2. Estrutura de Seções

### 2.1 Navbar
- Logo à esquerda
- Links centrais: Funcionalidades · Preços · Afiliados
- CTA direita: `Começar grátis` (botão roxo)
- Comportamento: sticky, transparente → fundo escuro no scroll

---

### 2.2 Hero *(acima da dobra)*

**Headline:**
> "Seu sistema foi feito pra loja.
> O Stoqio foi feito pra distribuidora."

**Subheadline:**
> Pedidos, estoque, NF-e e caixa num só lugar. Comece em 30 minutos, sem migração dolorosa.

**CTAs:**
- Primário: `Testar grátis — 30 dias` (roxo, destaque)
- Secundário: `Ver planos` (ghost button)

**Trust signals abaixo dos CTAs:**
- `✓ Sem cartão de crédito`
- `✓ Cancele quando quiser`
- `✓ Importa dados do Bling/Conta Azul`

**Visual:** Screenshot real do dashboard (dark + roxo) — desktop: à direita; mobile: abaixo.

---

### 2.3 Seção de Dor — *"Reconhecimento"*

**Headline:** `Se você usa Excel ou paga caro demais, você se identifica com isso:`

**3 cards de dor:**
1. 📋 *"Planilha travou no meio do fechamento e você perdeu dados."*
2. 🧾 *"NF emitida errada. Sistema separado. Retrabalho toda semana."*
3. 📦 *"Vendedor fechou pedido sem saber que o estoque tinha zerado."*

**Transição:** `O Stoqio resolve os três. Hoje.`

---

### 2.4 Como Funciona — *3 passos*

**Headline:** `Comece a operar em menos de 1 hora`

| Passo | Título | Detalhe |
|---|---|---|
| 01 | Crie sua conta | 2 minutos. Sem cartão. |
| 02 | Importe seus dados | CSV do Bling, Conta Azul ou cadastro manual. |
| 03 | Opere | Pedidos, estoque e NF-e funcionando no mesmo dia. |

---

### 2.5 Funcionalidades — *6 módulos*

**Headline:** `Tudo que uma distribuidora precisa. Nada que ela não usa.`

| Módulo | Copy |
|---|---|
| 📦 Estoque | Controle em tempo real. Alerta de ruptura antes de acontecer. |
| 🧾 NF-e Nativa | Emita nota fiscal em 3 cliques. Integrado Focus NFe, sem add-on. |
| 📋 Pedidos | Do rascunho à NF em um fluxo só. Sem retrabalho. |
| 💰 Contas | Recebíveis e pagáveis. Veja quem deve e quando vence. |
| 📊 Caixa | Fluxo de caixa do dia. Lançamento em segundos. |
| 📈 Relatórios | Curva ABC de produtos e clientes. Veja onde está o lucro. |

---

### 2.6 Diferenciais — *vs concorrência implícita*

**Headline:** `Por que trocar o que você usa hoje?`

| Diferencial | Copy |
|---|---|
| Vertical | Feito para distribuidora — não adaptado de varejo. |
| Preço transparente | R$79/mês. Sem surpresa no boleto. |
| NF-e incluída | Não é módulo extra. Está no plano. |
| Migração fácil | Importa CSV do seu sistema atual em minutos. |
| Trial real | 30 dias com tudo liberado. Sem cartão. |

---

### 2.7 Pricing

**Headline:** `Preço justo. Sem letra miúda.`

| Plano | Preço | Destaque |
|---|---|---|
| Trial | Grátis · 30 dias | Tudo liberado, sem cartão |
| Básico | R$79/mês | Ideal para começar |
| Profissional | R$149/mês | Badge: "Mais escolhido" |
| Empresarial | R$299/mês | Multi-usuário, suporte prioritário |

CTA em cada card: `Começar agora` / `Testar grátis`

**Linha de reassurance:** `Todos os planos incluem NF-e, suporte e cancelamento a qualquer momento.`

---

### 2.8 Programa de Afiliados *(seção compacta)*

**Headline:** `Indique e ganhe 20% recorrente`

**Copy:**
> Conhece outra distribuidora que sofre com o sistema atual? Compartilhe seu link e ganhe 20% de comissão em todo o período que o cliente ficar.

**CTA:** `Quero ser afiliado`

---

### 2.9 FAQ

1. Preciso de cartão para o trial? → **Não. Só email e senha.**
2. Como migro meus dados? → **Importamos CSV do Bling, Conta Azul e outros. Em minutos.**
3. Funciona para qual ramo? → **Distribuidoras e varejo. Configurável por segmento.**
4. Tem suporte? → **Sim. Chat e email. Profissional e Empresarial têm prioridade.**
5. Posso cancelar? → **Sim, quando quiser. Sem multa, sem burocracia.**
6. A NF-e já está incluída? → **Sim. Em todos os planos pagos, sem custo extra.**

---

### 2.10 CTA Final

**Headline:** `Sua distribuidora merece um sistema que entende ela.`
**Sub:** `30 dias grátis. Sem cartão. Comece agora.`
**CTA:** `Testar o Stoqio grátis` (botão grande, centralizado)

---

### 2.11 Footer

**Colunas:**
- Produto: Funcionalidades · Preços · Afiliados
- Empresa: Sobre · Contato
- Legal: Termos de Uso · Política de Privacidade
- Social: Instagram · LinkedIn

---

## 3. Princípios de Copy

- Linguagem do cliente, não do produto ("vendedor fechou pedido sem saber do estoque" > "gestão de estoque em tempo real")
- Especificidade no lugar de social proof: "3 cliques", "30 minutos", "1 hora"
- Garantias explícitas reduzem fricção no zero de confiança: sem cartão, cancele quando quiser
- Pricing visível e transparente é diferencial competitivo real vs Omie/Conta Azul
- CTA única acima da dobra — sem distrair com dois botões de peso igual

---

## 4. Notas de Implementação

- Stack: HTML + CSS puro (consistente com o restante do projeto)
- Dark mode com `#a78bfa` / `#c4b5fd` como primária
- Screenshot real do app no hero (capturar após polish do dashboard)
- Social proof: seção de depoimentos pode ser adicionada após primeiros clientes — reservar espaço no HTML mas ocultar com `display:none` inicialmente
- Afiliados: link para `/cadastro?ref=afiliado` ou modal — definir durante implementação
- Analytics: eventos de clique nos CTAs desde o dia 1 (GA4 ou similar)

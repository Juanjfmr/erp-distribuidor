# Design Doc — Landing Page Stoqio
**Data:** 2026-06-06
**Status:** Revisado — aguardando plano de implementação
**Contexto:** Primeira landing page pública do Stoqio. Objetivo: converter tráfego frio de donos de PMEs brasileiras em trials gratuitos (primário) e planos pagos diretos (secundário).

---

## 1. Decisões Estratégicas

**Público primário:** Donos de distribuidoras (caso mais forte do produto), mas não exclusivo.
**Público secundário:** Demais PMEs — construção, alimentos, pet, farmácias, agro, auto peças, varejo, etc. (16+ segmentos suportados).
**Posicionamento:** "ERP brasileiro para o seu tipo de negócio" — não limitar o headline a distribuidoras, mas usar distribuidora como exemplo âncora na seção de dor.

**Objetivo de conversão:**
- Primário: trial grátis 14 dias (sem cartão)
- Secundário: assinar plano pago diretamente

**Abordagem:** Problema → Solução. Sem social proof inicial — substituído por especificidade, garantias e diferenciais concretos (IA, NF-e nativa, importação de concorrentes, preço transparente).

**Brand:** Dark mode, cor primária `#a78bfa` / `#c4b5fd` (roxo, estilo Nubank).

**Nota:** trial no código (`PLAN_LIMITS`) é **14 dias**. Usar este valor em toda a landing — o CLAUDE.md está desatualizado neste ponto.

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
> "Gestão completa para o seu negócio.
> Sem planilha, sem complicação."

**Subheadline:**
> Pedidos, estoque, NF-e, caixa e IA assistente num só lugar. Funciona para distribuidoras, varejo, construção, alimentos e muito mais.

**CTAs:**
- Primário: `Testar grátis — 14 dias` (roxo, destaque)
- Secundário: `Ver planos` (ghost button)

**Trust signals abaixo dos CTAs:**
- `✓ Sem cartão de crédito`
- `✓ Cancele quando quiser`
- `✓ Importa dados do Bling/Conta Azul`

**Visual:** Screenshot real do dashboard (dark + roxo) com o widget de IA visível — desktop: à direita; mobile: abaixo.

---

### 2.3 Seção de Segmentos — *"Para o seu ramo"*

**Headline:** `Stoqio se adapta ao seu segmento`

**Grid de ícones/chips** (seleção visual — não links, apenas ilustrativos):
Distribuidora · Construção · Alimentos · Bebidas · Pet Shop · Farmácia · Auto Peças · Hortifrúti · Agrícola · Padaria · Informática · Varejo

**Sub:** `Configure em minutos para o seu tipo de negócio. Categorias, unidades e fluxos pré-ajustados.`

---

### 2.4 Seção de Dor — *"Reconhecimento"*

**Headline:** `Se você gerencia um negócio assim, você se identifica:`

**3 cards de dor** (linguagem universal, exemplos de distribuidora como âncora):
1. 📋 *"Planilha travou no fechamento do mês e você perdeu dados."*
2. 🧾 *"NF emitida errada. Sistema separado. Retrabalho toda semana."*
3. 📦 *"Vendedor fechou pedido sem saber que o estoque tinha zerado."*

**Transição:** `O Stoqio resolve os três — e ainda avisa antes de virar problema.`
*(A palavra "avisa" abre para a seção de IA logo abaixo)*

---

### 2.5 IA Assistente — *diferencial exclusivo*

**Headline:** `Seu negócio com IA que entende o contexto real`

**Dois destaques lado a lado:**

**Chat com IA:**
> Pergunte qualquer coisa sobre sua operação. "Quais clientes estão em atraso?", "Qual produto mais saiu esse mês?", "Tem estoque pra fechar esse pedido?" — resposta com seus dados reais, em segundos.

**Playbook de Alertas:**
> Todo dia o Stoqio analisa sua operação e te avisa: inadimplência crescendo, estoque chegando no limite, faturamento abaixo da média. Sem você precisar lembrar de olhar.

**Visual:** captura do widget de chat flutuante com uma conversa de exemplo.

**Tag:** `Incluso em todos os planos pagos`

---

### 2.6 Como Funciona — *3 passos*

**Headline:** `Comece a operar em menos de 1 hora`

| Passo | Título | Detalhe |
|---|---|---|
| 01 | Crie sua conta | 2 minutos. Sem cartão. |
| 02 | Importe seus dados | CSV do Bling, Conta Azul ou Omie. Detectamos o formato automaticamente. |
| 03 | Opere | Pedidos, estoque e NF-e funcionando no mesmo dia. |

---

### 2.7 Funcionalidades — *módulos principais*

**Headline:** `Tudo que você precisa. Nada que você não vai usar.`

| Módulo | Copy |
|---|---|
| 📦 Estoque | Controle em tempo real. Alerta de ruptura antes de acontecer. Scanner de código de barras incluso. |
| 🧾 NF-e Nativa | Emita nota fiscal em 3 cliques. Integrado Focus NFe, sem add-on. |
| 📋 Pedidos | Do rascunho à NF em um fluxo só. Sem retrabalho. |
| 💰 Contas | Recebíveis e pagáveis. Veja quem deve e quando vence. |
| 📊 Caixa | Fluxo de caixa do dia. Despesas fixas lançadas automaticamente. |
| 📈 Relatórios | Curva ABC de produtos e clientes. Veja onde está o lucro. |
| 🤖 IA Assistente | Chat e alertas com dados reais do seu negócio. |
| 👥 Multi-usuário | Admin, Vendedor, Visualizador e Contador externo. Cada um vê o que precisa. |

---

### 2.8 Diferenciais — *vs concorrência implícita*

**Headline:** `Por que trocar o que você usa hoje?`

| Diferencial | Copy |
|---|---|
| Multi-segmento | Funciona para distribuidoras, varejo, construção, alimentos e muito mais. |
| IA com seus dados | Não é chat genérico — responde com a realidade do seu negócio. |
| NF-e incluída | Não é módulo extra. Está no plano. |
| Preço transparente | Sem surpresa no boleto. Concorrentes escondem — o Stoqio não. |
| Migração fácil | Importa CSV do Bling, Conta Azul e Omie. Detecta o formato sozinho. |
| Trial real | 14 dias com tudo liberado. Sem cartão. |

---

### 2.9 Pricing

**Headline:** `Preço justo. Sem letra miúda.`

| Plano | Preço | Destaque |
|---|---|---|
| Trial | Grátis · 14 dias | Tudo liberado, sem cartão |
| Essencial | R$97/mês | Ideal para começar |
| Profissional | R$197/mês | Badge: "Mais escolhido" |
| Empresarial | R$397/mês | Multi-usuário, suporte prioritário |

CTA em cada card: `Começar agora` / `Testar grátis`

**Linha de reassurance:** `Todos os planos pagos incluem NF-e, IA assistente e cancelamento a qualquer momento.`

---

### 2.10 Programa de Afiliados *(seção compacta)*

**Headline:** `Indique e ganhe 20% recorrente`

**Copy:**
> Conhece outro negócio que sofre com o sistema atual? Compartilhe seu link e ganhe 20% de comissão em todo o período que o cliente ficar.

**CTA:** `Quero ser afiliado`

---

### 2.11 FAQ

1. Preciso de cartão para o trial? → **Não. Só email e senha.**
2. Como migro meus dados? → **Importamos CSV do Bling, Conta Azul e Omie. Detectamos o formato automaticamente.**
3. Funciona para qual ramo? → **Distribuidoras, varejo, construção, alimentos, pet, farmácias, agro e muito mais. Configurável por segmento.**
4. A IA usa meus dados reais? → **Sim. Ela lê sua operação no Stoqio e responde com base no seu estoque, clientes e NFs reais.**
5. Tem suporte? → **Sim. Chat e email. Profissional e Empresarial têm prioridade.**
6. Posso cancelar? → **Sim, quando quiser. Sem multa, sem burocracia.**

---

### 2.12 CTA Final

**Headline:** `Seu negócio merece um sistema que entende ele.`
**Sub:** `14 dias grátis. Sem cartão. Comece agora.`
**CTA:** `Testar o Stoqio grátis` (botão grande, centralizado)

---

### 2.13 Footer

**Colunas:**
- Produto: Funcionalidades · Preços · Afiliados
- Empresa: Sobre · Contato
- Legal: Termos de Uso · Política de Privacidade
- Social: Instagram · LinkedIn

---

## 3. Princípios de Copy

- Linguagem do cliente, não do produto ("vendedor fechou pedido sem saber do estoque" > "gestão de estoque em tempo real")
- Especificidade no lugar de social proof: "3 cliques", "30 minutos", "1 hora", "14 dias"
- IA posicionada como diferencial concreto — não buzzword: "responde com seus dados reais"
- Pricing visível e transparente é diferencial competitivo real vs Omie/Conta Azul
- CTA única acima da dobra — sem distrair com dois botões de peso igual
- Distribuidora como exemplo âncora de dor, mas headline e segmentos são universais

---

## 4. Integrações a Destacar

| Integração | Como aparece na landing |
|---|---|
| Focus NFe | "NF-e nativa em 3 cliques" |
| DeepSeek IA | Chat + Playbook de alertas |
| Mercado Pago | Assinatura recorrente (mencionado indiretamente no pricing) |
| Bling / Conta Azul / Omie CSV | "Migração fácil — detectamos o formato automaticamente" |

---

## 5. Notas de Implementação

- Stack: HTML + CSS puro (consistente com o restante do projeto)
- Dark mode com `#a78bfa` / `#c4b5fd` como primária
- Screenshot real do app no hero — incluir widget de IA visível
- Seção de segmentos: grid de chips clicáveis (visual only, sem filtro real na landing)
- Social proof: reservar espaço no HTML mas ocultar com `display:none` inicialmente
- Analytics: eventos de clique nos CTAs desde o dia 1 (GA4 ou similar)
- **Trial: usar 14 dias em todo o copy — o CLAUDE.md está desatualizado com "30 dias"**

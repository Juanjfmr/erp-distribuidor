# Design Doc — Estratégia de Distribuição, Afiliados e Agente de IA
**Data:** 2026-05-30
**Status:** Aprovado — aguardando plano de implementação
**Contexto:** ERP Distribuidora — go-to-market, programa de afiliados e agente comercial com IA

---

## 1. Contexto e Restrições

**Operador:** tempo comercial próximo de zero (FAB em tempo integral).
**Rede pessoal:** inexistente para ativar inicialmente.
**Budget marketing:** R$500–1.500/mês escalável por CAC — sem limite se CAC < R$150.
**Mercado:** Brasil inteiro desde o dia 1 — sem limitação geográfica.
**Conteúdo:** sim, sem aparecer com rosto (voz + tela permitidos).
**Premissa central:** o sistema precisa funcionar no piloto automático — canais passivos e semi-automatizados são o único modelo viável.

---

## 2. Estratégia de Distribuição

### 2.1 Funil em 3 camadas

```
TOPO — Awareness (conteúdo anônimo)
  └── Instagram + LinkedIn sem rosto
  └── Carrosséis, vídeos de tela, dados do setor de distribuição
  └── Custo: tempo (1x/semana) + R$200–400 em impulsionamento
  └── Objetivo: construir audiência segmentada

MEIO — Consideração (mídia paga)
  └── Google Ads — termos de busca ativos
        ("ERP distribuidora", "sistema atacadista", "software nota fiscal distribuidora")
  └── Meta Ads — remarketing de visitantes da landing page
  └── Budget inicial: R$500–800/mês → escala se CAC < R$150
  └── Objetivo: capturar quem já está buscando solução

FUNDO — Conversão (trial + afiliados + agente IA)
  └── Trial 30 dias sem cartão direto da landing page
  └── Afiliados (contadores) fecham indecisos
  └── Agente de IA converte trial em pagante automaticamente
  └── Objetivo: transformar interesse em assinante
```

### 2.2 KPI único de controle

**CAC máximo: R$150** (menos de 2 meses de payback no plano Básico).
- CAC < R$150 → escalar budget sem limite
- CAC > R$150 → otimizar antes de aumentar investimento

### 2.3 Sequência de ativação dos canais

```
Mês 1–2:   Landing page + Google Ads (valida demanda com budget mínimo)
Mês 3–4:   Conteúdo anônimo Instagram + LinkedIn (constrói audiência)
Mês 5–6:   Programa de afiliados ativo (contadores com novo modelo)
Mês 6+:    Meta Ads remarketing (quando houver volume de visitantes)
```

### 2.4 Landing pages segmentadas

Uma landing page por segmento principal:
- Distribuidoras / Atacado
- Farmácias / Drogarias
- Alimentos e Bebidas
- Pet Shop
- Construção Civil

Cada uma com headline, caso de uso e prova social específicos do segmento. Mesmo produto, contexto diferente — conversão maior que página genérica.

---

## 3. Programa de Afiliados Reformulado

### 3.1 Público-alvo de afiliados

Não qualquer pessoa — perfis qualificados:
- Contadores e escritórios de contabilidade
- Consultores de negócio
- SEBRAE e agentes de desenvolvimento
- Associações comerciais de distribuidores

### 3.2 Modelo de comissão

| Evento | Valor | Observação |
|---|---|---|
| Conversão (trial → pago) | R$100 flat | Pago no primeiro pagamento recebido |
| Recorrência meses 1–12 | 10% da mensalidade | Pago mensalmente |
| Após 12 meses | Encerra | Margem do operador melhora com tempo de vida |

**Exemplo concreto para contador com 5 clientes Profissional (R$149):**
- R$500 flat (conversões)
- R$74,50/mês × 12 = R$894
- **Total ano 1: R$1.394** — sem esforço recorrente após indicação

### 3.3 Plano contador gratuito

- Acesso somente leitura ao sistema dos clientes dele
- Visualiza: relatórios, notas, caixa, contas
- Não conta no limite de usuários do plano do cliente
- Principal incentivo não-financeiro — usa, conhece, indica com propriedade
- Convite por email via módulo Usuários (role `contador` já planejada no Plano D)

### 3.4 Dashboard do afiliado (dentro de Minha Conta)

- Link personalizado com código único (`?ref=CODIGO`)
- Métricas: cliques, trials gerados, conversões, comissão acumulada
- Histórico de pagamentos recebidos
- Pagamento automático via MP quando saldo ≥ R$100 (Modelo B — Plano E2)

### 3.5 Regras do programa

- Comissão só gerada após primeiro pagamento recebido — trial não conta
- Um afiliado por cliente (primeiro clique ganha, não último)
- Churn do cliente não estorna comissão já paga
- Afiliado precisa cadastrar conta MP para receber

---

## 4. Agente Comercial com IA

### 4.1 Posicionamento

Não é chatbot de suporte — é agente comercial autônomo com três papéis simultâneos:
- **Consultor de onboarding:** guia o cliente desde o cadastro até o primeiro valor percebido
- **Vendedor proativo:** age no momento certo para converter trial em pagante
- **Assistente operacional:** responde dúvidas e gera relatórios em linguagem natural

### 4.2 Arquitetura

```
Anthropic API (Claude Haiku)
├── Prompt de sistema fixo
│   ├── Documentação completa dos módulos do ERP
│   ├── Playbook comercial (regras de autonomia)
│   ├── Tom de voz e identidade da marca
│   ├── Limites de desconto e extensão de trial
│   └── Critérios de escalação para humano
├── Contexto dinâmico por tenant (injetado a cada mensagem)
│   ├── Plano atual e dias de trial restantes
│   ├── Módulo atual (state.currentView)
│   ├── Checklist de onboarding (etapas concluídas)
│   ├── Último acesso e frequência de uso
│   └── Segmento de negócio
└── Function calling (ferramentas do agente)
    ├── extendTrial(days)          — estende trial
    ├── applyCoupon(percent)       — aplica desconto no próximo pagamento
    ├── sendWhatsApp(phone, msg)   — dispara mensagem (fase futura)
    ├── updateOnboarding(step)     — marca etapa do checklist como concluída
    ├── importCSV(entity, data)    — aciona csvImport.js com dados enviados
    ├── generateReport(type)       — gera relatório em linguagem natural
    ├── escalateToHuman(reason)    — notifica operador via WhatsApp/email
    └── logAction(type, details)   — registra ação no Firestore para auditoria
```

### 4.3 Frentes de atuação

**Frente 1 — Onboarding conversacional (substitui wizard estático)**

A IA substitui completamente o wizard de 4 etapas do Plano C. Fluxo personalizado por segmento:

```
Agente: "Olá! Vou te ajudar a configurar tudo em menos de 15 minutos.
         Qual sistema você usa hoje para emitir suas notas?"

Usuário: "Bling"

Agente: "Perfeito — consigo importar seus produtos e clientes do Bling agora.
         Me manda o CSV exportado em Produtos e eu cuido do resto."

[Usuário envia arquivo]

Agente: "Importei 347 produtos com sucesso. 12 não tinham NCM — vou te mostrar
         como preencher. Agora vamos criar seu primeiro pedido?"
```

O `csvImport.js` ainda existe como serviço — mas quem o aciona é o agente, não o usuário navegando por telas.

**Frente 2 — Vendas proativas (playbook autônomo)**

| Gatilho | Ação autônoma | Limite |
|---|---|---|
| Trial expira em 3 dias + sem pedido criado | Oferecer extensão de 7 dias | 1x por tenant |
| Visitou "Minha Conta" 3x sem assinar | Oferecer cupom 20% primeiro mês | 1x por tenant |
| Trial expirado há 24h sem converter | Mensagem com caso de uso do segmento | 1x |
| Onboarding parado na etapa 2 há 3 dias | Chat proativo oferecendo ajuda | 1x |
| Inadimplente há 3 dias | Lembrete amigável com link MP | 1x |
| Inadimplente há 7 dias | Mensagem urgente + escalar para operador | Final |
| 3 tentativas sem resolução | Escalar para humano | Sempre |

**Frente 3 — Relatórios em linguagem natural**

Dentro do ERP, qualquer usuário pode perguntar:
- "Me dá um resumo do mês de maio"
- "Quais clientes compraram menos que o mês passado?"
- "Quem está inadimplente há mais de 15 dias?"
- "Qual produto tem maior giro de estoque?"
- "Gera um relatório de inadimplência para minha contadora"

A IA acessa `state` em tempo real e responde em linguagem natural ou gera PDF.

**Frente 4 — Inteligência operacional proativa (fase futura)**

Depende de integração com WhatsApp/email — entra após lançamento:
- Alertas de estoque mínimo com sugestão de ordem de compra
- Cobranças automáticas de inadimplentes
- Análise de margem por categoria com sugestão de ajuste

Feature opcional — ativada pelo tenant nas configurações.

### 4.4 Tom e identidade do agente

- Nome: definir antes do lançamento (ex: "Nina", "Max")
- Personalidade: consultivo, direto, conhece o setor de distribuição
- Nunca robótico: sem "Olá! Sou o assistente virtual..."
- Sempre contextualizado: sabe o nome do usuário, o segmento, o que ele fez no sistema

### 4.5 Implementação em fases

```
Fase A (lançamento):
  └── Widget de chat no ERP (canto inferior direito)
  └── Onboarding conversacional
  └── Suporte reativo a dúvidas
  └── Playbook básico (extensão de trial, cupom)

Fase B (30 clientes):
  └── Function calling ativo — agente toma ações
  └── Relatórios em linguagem natural
  └── Log de ações no admin.html

Fase C (60 clientes):
  └── WhatsApp Business API
  └── Agente atua fora do sistema
  └── Inteligência operacional proativa (opcional)
```

### 4.6 Custo estimado Anthropic API (Claude Haiku)

| Tenants ativos | Custo/mês estimado |
|---|---|
| 0–50 | R$15–40 |
| 50–200 | R$40–150 |
| 200–500 | R$150–400 |

Margem confortável em todos os cenários — absorvido no plano sem repasse ao cliente.

---

## 5. Gerador de Conteúdo de Marketing

### 5.1 Posicionamento

Ferramenta dentro do `admin.html` — operador acessa quando precisar gerar conteúdo para redes sociais.

### 5.2 Funcionamento

```
Operador acessa admin.html → aba "Conteúdo"
→ Escolhe tema: feature nova / caso de uso / dica de gestão / dado do setor
→ Escolhe formato: carrossel Instagram / post LinkedIn / legenda de vídeo
→ IA gera 3 variações no tom da marca
→ Operador aprova e copia para publicar
```

### 5.3 Migração futura para automação (50+ clientes)

Quando conteúdo estiver validado e padrões de performance conhecidos:
- Integração com GitHub Actions — detecta novo deploy
- IA gera post automaticamente
- Operador aprova com 1 clique
- Publicação agendada nas redes

---

## 6. Impacto no Posicionamento do Produto

Este design muda o posicionamento do ERP de forma relevante:

**Antes:** "ERP para distribuidoras"
**Depois:** "ERP com IA para distribuidoras — o único que trabalha por você enquanto você trabalha"

Isso justifica preço maior e cria barreira de entrada que concorrentes (Bling, Conta Azul) não têm hoje — nenhum deles tem agente comercial autônomo integrado.

---

## 7. Impacto nos Planos Existentes

| Plano | Impacto |
|---|---|
| Plano C (wizard onboarding) | **Substituído** pela IA — wizard estático descartado |
| `csvImport.js` | **Mantido** como serviço — acionado pelo agente, não pelo usuário |
| Plano E1 (admin.html) | **Expandido** — adicionar aba de Conteúdo e Log do agente |
| Plano E2 (Firebase Functions) | **Expandido** — adicionar proxy para Anthropic API |
| Programa de afiliados | **Reformulado** — R$100 flat + 10% por 12 meses |

---

## 8. Novo Plano Necessário

**Plano F — Agente de IA**
- F1: Widget de chat + onboarding conversacional (substitui Plano C)
- F2: Function calling + playbook comercial autônomo
- F3: Gerador de conteúdo no admin.html
- F4: WhatsApp API + inteligência operacional proativa (fase futura)

---

## 9. Decisões Tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Mercado | Brasil inteiro desde o dia 1 | Produto sem especificidade geográfica |
| Canal principal | Google Ads + conteúdo anônimo | Único viável com zero tempo comercial |
|  KPI de mídia | CAC < R$150 | Payback em menos de 2 meses |
| Comissão afiliado | R$100 flat + 10% por 12 meses | Mais atrativo que 20% recorrente puro |
| Plano contador | Gratuito somente leitura | Incentivo não-financeiro para indicação |
| Onboarding | IA conversacional substitui wizard | Experiência melhor, sem manter dois sistemas |
| Agente IA — autonomia | Modelo C (playbook definido pelo operador) | Escala sem intervenção manual |
| Relatórios | Linguagem natural via IA | Elimina necessidade de navegar em relatórios |
| Inteligência operacional | Feature opcional, fase futura | Depende de WhatsApp/email |
| Conteúdo de marketing | Ferramenta no admin.html (Fase A) | Validar antes de automatizar |
| Modelo Anthropic | Claude Haiku | Rápido, barato, suficiente para suporte e vendas |

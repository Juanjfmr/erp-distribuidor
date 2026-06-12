# Spec — Marketing & Posicionamento da Stoqio

**Data:** 2026-06-12
**Status:** Aprovado (ângulo decidido pelo Juan — "o mais vendável")
**Substitui:** o posicionamento genérico do design doc `2026-06-06-landing-page-design.md` (mantém estrutura, troca a cunha)
**Página canônica:** `landing-v2.html` (ver spec de implementação `2026-06-12-landing-v2-reforma.md`)

---

## 1. A decisão central

Stoqio para de se vender como "mais um ERP para PME" e passa a se vender como **o ERP que já está pronto para a Reforma Tributária de 2026** — sem abrir mão do apelo amplo (operar sem planilha, sem retrabalho).

**Por quê (o mais vendável):**
- O dono de PME não acorda querendo "cumprir IBS/CBS". Ele acorda cansado da planilha **e** com medo de errar a nota e tomar multa. A reforma é o **gatilho de urgência** com prazo — o "why now" que Bling, Conta Azul e Omie não conseguem cravar no headline sem reescrever produto.
- A Stoqio tem prova concreta, não promessa: o Focus NFe já tem os campos IBS/CBS e o cadastro de produto **já tem o campo `cClassTrib`** (`js/modules/produtos.js`). Dá pra dizer "já emite no novo modelo" sem mentir.
- Liderar 100% com reforma faria a Stoqio parecer ferramenta fiscal/contábil. Ignorar a reforma joga fora o único diferencial temporal de 2026. **Híbrido resolve os dois.**

---

## 2. ICP (cliente ideal)

| | Primário | Secundário | Canal |
|---|---|---|---|
| **Quem** | Dono de distribuidora / atacado PME (4–30 funcionários) | Demais PMEs que emitem NF-e: varejo, construção, alimentos, pet, farmácia, agro, auto peças | Contador / escritório contábil pequeno (1–5 contadores) |
| **Dor** | Planilha + emissor de nota separados, retrabalho, estoque furado, não sabe o lucro real | Mesma dor, menos volume de nota | Carteira inteira vai ser afetada pela reforma e ele está despreparado (58–60% admitem) |
| **Gatilho** | "Minha nota vai mudar em 2026 e meu sistema não acompanha" | Idem | "Meus clientes vão me perguntar e eu preciso de um sistema que já resolve" |

**Contador como canal, não só público:** a infra já existe — acesso de contador externo (role `contador`, somente leitura) + programa de afiliados 20% recorrente. A reforma é a melhor porta de entrada com contador em uma década.

---

## 3. Posicionamento (uma frase)

> **Stoqio é o sistema de gestão que já emite sua nota no novo modelo da Reforma Tributária — com estoque, pedidos, caixa e IA num lugar só.**

Categoria: ERP / gestão para PME brasileira.
Frame de urgência: Reforma Tributária 2026.
Diferencial sustentável (pós-2026, quando "estar pronto" virar commodity): **IA com dados reais + NF-e nativa + preço transparente**.

---

## 4. Mensagem central e pilares

**Headline-mãe:** *"Sua nota fiscal muda em 2026. Seu sistema já está pronto?"* → resposta: a Stoqio está.

Quatro pilares de prova (ordem de força):

1. **Pronto para a Reforma (urgência + prova)** — IBS/CBS já no emissor; campo de classificação tributária já no produto; quando a obrigatoriedade chegar, quem usa Stoqio só continua emitindo.
2. **IA que entende seu negócio (diferencial sustentável)** — chat e alertas com os dados reais da operação, não chatbot genérico. Incluso nos planos pagos.
3. **NF-e nativa, não add-on** — emite em poucos cliques, integrado ao Focus NFe, sem módulo extra na fatura.
4. **Tudo num lugar + preço transparente** — estoque, pedidos, caixa, contas, DRE, relatórios. Preço na tela, sem letra miúda (vs. concorrentes que escondem).

---

## 5. Mensagens por audiência

**PME (dono):**
> "Em 2026 a nota fiscal brasileira muda de modelo. Quem usa sistema antigo vai correr atrás. Na Stoqio sua nota já sai no formato novo — e de quebra você larga a planilha: estoque, pedidos, caixa e NF-e num lugar só, com uma IA que te avisa antes do problema."

**Contador (canal):**
> "Sua carteira inteira vai sentir a Reforma Tributária. Em vez de apagar incêndio cliente por cliente, leve a eles um sistema que já emite no novo modelo — e ganhe 20% recorrente em cada indicação. Você ainda tem acesso de leitura à operação de cada cliente, sem custo."

---

## 6. Diferenciação vs. concorrência

| Concorrente | Como a Stoqio se separa |
|---|---|
| Bling / Tiny | NF-e nativa + IA com dados reais; reforma como prova de que acompanha mudança regulatória |
| Conta Azul | Preço transparente; multi-segmento real; IA operacional, não só financeira |
| Omie | Mais leve e barato; sem venda casada de implantação cara |
| Chatbot da Receita / IA grátis | Não é tira-dúvidas — é o sistema que **executa** a emissão correta |

> Distribuidora segue como exemplo-âncora nas seções de dor (é o caso mais forte do produto), mas o headline e os segmentos são universais.

---

## 7. Planos (alinhados ao backend de pagamento)

Valores **batem com o código** (`functions/createSubscription.js` + `js/modules/config.js` + Mercado Pago). Não usar R$79/149/299 (era nota de revisão não adotada).

| Plano | Mensal | Anual (−20%) | Âncora |
|---|---|---|---|
| Trial | Grátis · 14 dias | — | Tudo liberado, sem cartão |
| Essencial | R$97 | R$931 | Ideal para começar |
| Profissional | R$197 | R$1.891 | "Mais escolhido" |
| Empresarial | R$397 | R$3.811 | Ilimitado, suporte prioritário |

Reassurance fixa: *todos os planos pagos incluem NF-e (já no modelo da reforma), IA assistente e cancelamento quando quiser.*

---

## 8. Canais de aquisição (ordem de prioridade)

1. **Contadores (parceria/afiliados)** — alavancagem máxima; reforma como pitch de abertura; material pronto de revenda. Maior ROI de canal.
2. **Conteúdo de reforma (SEO + orgânico)** — guias práticos "o que muda na sua nota em 2026 por segmento". Captura a busca de urgência. (Conecta com o gerador de conteúdo — `plano-f3`.)
3. **Tráfego pago** — campanhas com a dor do prazo ("falta X para a obrigatoriedade") → trial.
4. **Indicação de cliente** — afiliados 20% também para o dono de PME satisfeito.

---

## 9. Métricas

- **Norte:** trials iniciados → ativados (importou dados ou emitiu 1 nota) → pagos.
- Eventos de clique em todos os CTAs desde o dia 1 (GA4).
- Conversão da seção Reforma (scroll + clique no CTA da seção) como leading indicator do ângulo.
- Origem `?ref=` (afiliado/contador) marcada no cadastro para medir o canal.

---

## 10. Itens abertos / fora de escopo deste spec

- Disclaimer legal sobre reforma (posicionar como "ferramenta que emite", nunca "consultoria tributária") — incluir na landing e no rodapé.
- Material de revenda para contador (one-pager) — backlog de marketing, não bloqueia a landing.
- Implementação real do cálculo IBS/CBS no `invoiceService.js` segue no spec `2026-06-12-reforma-tributaria-ibs-cbs.md` (a landing só comunica o que já existe: campos + emissão; nunca promete cálculo que ainda não roda).

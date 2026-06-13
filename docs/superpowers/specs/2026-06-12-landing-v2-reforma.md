# Spec — Mudanças na Landing (landing-v2.html) + Promoção a Página Oficial

**Data:** 2026-06-12
**Status:** Pronto para implementar
**Deriva de:** `2026-06-12-marketing-posicionamento.md`
**Arquivo-alvo:** `landing-v2.html` (página canônica — substitui `index.html` como landing servida)
**Branch:** v2 (feature) — e `main` na promoção (correção/lançamento vai a produção)

---

## 0. Princípio

A landing já tem boa estrutura e visual (dark roxo, mockup, seções). **Não reescrever do zero.** As mudanças são cirúrgicas: injetar o frame de Reforma Tributária como urgência, criar uma seção dedicada de reforma, criar a trilha de contador, e ajustar headline/badge/CTAs. Só comunicar o que já existe no produto (campos IBS/CBS no Focus + `cClassTrib` no produto). Nada de prometer cálculo automático que ainda não roda.

---

## 1. Hero — badge, headline e CTAs

**Badge (linha ~321):**
- De: `IA nativa · NF-e inclusa · Multi-segmento`
- Para: `✓ Pronto para a Reforma Tributária 2026` (com o dot pulsante mantido)

**Headline (linha ~322):** sharper, mantendo a força do "sem planilha". Duas opções — usar a A:
- **A (recomendada):** `Sua nota muda em 2026.` / `<grad>Seu sistema já está pronto.</grad>`
- B (manter atual como fallback): `Gestão completa para o seu negócio. Sem planilha, sem complicação.`

**Subheadline (linha ~323):**
> A Reforma Tributária muda a nota fiscal a partir de 2026. Na Stoqio sua nota já sai no novo modelo — e você ainda larga a planilha: estoque, pedidos, caixa, NF-e e IA num lugar só.

**Trust signals abaixo dos CTAs:** trocar um dos itens por `✓ Emissão no modelo IBS/CBS`. Manter `✓ Sem cartão de crédito` e `✓ 14 dias grátis`.

CTA primário permanece `Testar grátis — 14 dias →`.

---

## 2. NOVA seção — Reforma Tributária (inserir logo após o Hero, antes de "Segmentos" ~448)

Âncora `#reforma`. É a seção de conversão do ângulo.

- **Tag:** `REFORMA TRIBUTÁRIA 2026`
- **Título:** `A maior mudança fiscal em 40 anos já começou.`
- **Subtítulo:** `IBS, CBS e a nova nota fiscal entram em vigor de forma escalonada a partir de 2026. Quem usa sistema desatualizado vai correr atrás. Quem usa Stoqio só continua emitindo.`
- **3 cards de prova (concreto, não promessa):**
  1. 🧾 **Nota no modelo novo** — "O emissor da Stoqio (Focus NFe) já trabalha com os campos de IBS e CBS. Sua nota acompanha a transição sem você mexer em nada."
  2. 🏷️ **Produto já preparado** — "O cadastro de produto já tem classificação tributária (cClassTrib), o campo que a nova nota exige."
  3. 🔄 **Atualização contínua** — "Conforme as regras avançam até 2033, a Stoqio acompanha. Você não precisa trocar de sistema no meio da reforma."
- **Linha de credibilidade/disclaimer (discreta):** `A Stoqio emite sua nota no formato exigido. A apuração e a estratégia tributária seguem com você e seu contador.`
- **CTA:** `Quero minha nota pronta para 2026` → /login

> Mini-timeline opcional (visual, se couber): `2026 fase teste · jul/2026 homologação · 2027 CBS plena · 2033 IBS pleno`.

---

## 3. NOVA seção — Para Contadores (inserir entre "Afiliados" ~680 e "FAQ" ~691)

Âncora `#contadores`. Compacta, como a de afiliados.

- **Título:** `Contador? A reforma é sua maior oportunidade.`
- **Copy:** `Sua carteira inteira vai sentir a Reforma Tributária. Em vez de apagar incêndio cliente por cliente, leve a eles um sistema que já emite no novo modelo. Você acompanha a operação de cada cliente com acesso de leitura, sem custo — e ganha 20% recorrente em cada indicação.`
- **3 bullets:** `Acesso de contador externo incluso` · `20% de comissão recorrente` · `Material de apresentação para seus clientes`
- **CTA:** `Quero indicar como contador` → /login (ou âncora de cadastro de afiliado)

Adicionar link `Contadores` na navbar (`.nav-links`) apontando para `#contadores`.

---

## 4. Ajustes nas seções existentes

- **Diferenciais (~599):** trocar/duplicar um card por **"Pronto para a reforma"** — `Sua nota acompanha o IBS/CBS. Não vira problema quando a obrigatoriedade chegar.` (mover este card para a 1ª posição do grid).
- **FAQ (~691):** adicionar 2 perguntas no topo:
  1. *"A Stoqio está pronta para a Reforma Tributária?"* → "Sim. O emissor já trabalha com os campos de IBS e CBS e o cadastro de produto já tem a classificação tributária exigida. Conforme as regras avançam até 2033, a Stoqio acompanha."
  2. *"A Stoqio calcula o imposto da reforma pra mim?"* → "A Stoqio emite a nota no formato exigido. A apuração e a decisão tributária (ex.: sair ou não do Simples) seguem com você e seu contador — a gente não substitui a orientação contábil."
- **Pricing (~615):** manter R$97/197/397 (batem com o backend). Reforço sob o grid: `Todos os planos pagos emitem NF-e no modelo da reforma, têm IA assistente e cancelam quando quiser.`
- **CTA final (~744):** subheadline para `14 dias grátis. Sem cartão. E sua nota já pronta para 2026.`
- **<title> e meta:** `Stoqio — Gestão e NF-e pronta para a Reforma Tributária 2026`. Adicionar `<meta name="description">` com a frase de posicionamento.

---

## 5. Promoção da v2 a página oficial ("adotar a v2")

Hoje há `index.html` (landing antiga, ~22KB) e `landing-v2.html` (~48KB). Tornar a v2 a landing servida:

1. Fazer backup da landing atual: `index.html` → `index-v1.html` (não deletar — referência).
2. Copiar `landing-v2.html` para `index.html` (a raiz `/` passa a servir a v2).
   - Alternativa, se o host tiver rewrite configurado: apontar `/` para `landing-v2.html` sem duplicar arquivo. Verificar config de hospedagem antes de escolher.
3. Conferir que os links internos (`/login`, `/app`, âncoras) continuam válidos após a cópia.
4. Conferir `404.html`, `termos.html`, `privacidade.html` referenciados no footer.

> **Ação outward-facing (vai a produção).** Executar a promoção (passo 5) só após o Juan validar o conteúdo das seções novas. As edições de conteúdo (passos 1–4) podem ir antes.

---

## 6. Verificação (antes de declarar pronto)

1. Abrir `landing-v2.html` via servidor HTTP local e checar render das 2 seções novas (Reforma, Contadores) em desktop e mobile (`preview_resize`).
2. Conferir que nenhum CTA quebrou e que os novos links de navbar rolam para as âncoras certas.
3. Validar copy com a skill `humanizer-ptbr` (texto voltado ao usuário final).
4. Confirmar ausência de promessa falsa: nenhuma frase diz "calculamos seu imposto" — só "emitimos no modelo".
5. Screenshot das seções novas para o Juan aprovar antes da promoção a produção.

---

## 7. Ordem de execução sugerida

1. Editar hero (badge, headline, sub, trust) — task 1.
2. Inserir seção Reforma `#reforma` — task 2.
3. Inserir seção Contadores `#contadores` + link navbar — task 3.
4. Ajustes em Diferenciais / FAQ / Pricing / CTA / meta — task 4.
5. Verificação + screenshots — task 5.
6. (Após aprovação) Promover v2 → `index.html` em v2 e main — task 6.

Commit ao fim de cada task. Não acumular.

# Plano de Testes Pré-Lançamento — Stoqio

**Data:** 2026-06-06  
**Versão:** 1.0  
**Status:** Para execução no DeepSeek + refinamento no Claude

---

## 0. Contexto e Princípios

O Stoqio é um ERP SaaS multi-tenant para distribuidoras. A cobertura de testes automatizados é **zero** — todo teste listado aqui é manual, exceto onde indicado "automatizar". A prioridade é encontrar bloqueadores de lançamento, não perfeccionismo.

**Critério de lançamento:** Todos os itens `[CRÍTICO]` aprovados. Itens `[ALTO]` sem risco de perda de dados. Itens `[MÉDIO]` com comportamento degradado aceitável.

---

## 1. Testes de Criação de Conta e Onboarding

### 1.1 Fluxo de Cadastro

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| C01 | Criar conta com email válido + senha forte | Conta criada, redirecionado para onboarding | CRÍTICO |
| C02 | Criar conta com email já cadastrado | Mensagem de erro clara, sem travamento | ALTO |
| C03 | Criar conta com senha fraca (<6 chars) | Validação Firebase exibida em PT-BR | MÉDIO |
| C04 | Tentar login com credenciais erradas | Mensagem de erro sem revelar se email existe | ALTO |
| C05 | "Esqueci minha senha" → receber email | Email de reset chega em <2 min | CRÍTICO |
| C06 | Login após reset de senha | Funciona normalmente | CRÍTICO |
| C07 | Logout e re-login | Estado limpo, sem dados do usuário anterior | CRÍTICO |

### 1.2 Wizard de Onboarding (4 etapas)

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| O01 | Etapa 1 — Dados da empresa (CNPJ, razão social) | Salva em `state.company`, persiste no Firestore | CRÍTICO |
| O02 | CNPJ inválido no onboarding | Validação com dígito verificador | ALTO |
| O03 | Etapa 2 — Segmento de negócio | Pré-configura categorias automaticamente | ALTO |
| O04 | Etapa 3 — Primeiro produto/cliente | Item aparece nos módulos correspondentes | ALTO |
| O05 | Etapa 4 — Conclusão | `shouldShowOnboarding()` retorna false, onboarding não reaparece | CRÍTICO |
| O06 | Recarregar página em qualquer etapa | Retoma da etapa atual, não do início | MÉDIO |
| O07 | Onboarding com dados já existentes (relogin) | Não exibe onboarding novamente | CRÍTICO |
| O08 | Checklist do dashboard após onboarding | Itens marcados conforme etapas concluídas | MÉDIO |

### 1.3 Trial de 30 Dias

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| T01 | Conta nova — verificar `trialEndsAt` no Firestore | Campo existe, data = hoje + 30 dias | CRÍTICO |
| T02 | Módulos disponíveis durante trial | Todos os módulos acessíveis (plano Profissional) | CRÍTICO |
| T03 | Banner de trial exibido no dashboard | Mostra dias restantes | ALTO |
| T04 | Simular trial expirado (editar data no Firestore) | `MODULE_GUARD` bloqueia módulos premium | CRÍTICO |
| T05 | Link para upgrade durante trial | Leva para Minha Conta → seção de planos | ALTO |

---

## 2. Testes de Funcionalidades por Módulo

### 2.1 Dashboard

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| D01 | Dashboard com dados zerados (conta nova) | Exibe KPIs zerados sem erros JS | CRÍTICO |
| D02 | Dashboard após inserir produtos, clientes, pedidos | KPIs refletem dados corretos | ALTO |
| D03 | Alerta de estoque baixo | Aparece quando produto < estoque mínimo | ALTO |
| D04 | Alerta de contas vencidas | Aparece quando há recebíveis/pagáveis vencidos | ALTO |
| D05 | Clique em KPI leva ao módulo correto | Navega sem erros | MÉDIO |
| D06 | Banner fiscal (status NF-e) | Exibe corretamente conforme `fiscalStatus.js` | MÉDIO |
| D07 | Notificações — adicionar e limpar | `addNotification`, `clearNotifications`, bell icon | BAIXO |

### 2.2 Produtos

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| P01 | Cadastrar produto com todos os campos | Salvo, aparece na lista | CRÍTICO |
| P02 | Cadastrar produto com código de barras | Scanner lê e preenche campo | ALTO |
| P03 | Editar produto existente | Alterações salvas, histórico de preços atualizado | ALTO |
| P04 | Excluir produto sem movimentações | Removido da lista | ALTO |
| P05 | Excluir produto com pedidos/NF associados | Bloqueado com mensagem explicativa | CRÍTICO |
| P06 | Buscar produto por nome/código | Filtro funciona com debounce | ALTO |
| P07 | Ordenar por coluna (nome, estoque, preço) | Ordenação correta, bidirecional | MÉDIO |
| P08 | Estoque negativo ao vender sem estoque | Sistema alerta ou bloqueia (definir comportamento) | ALTO |
| P09 | Movimentação de estoque manual (entrada/saída) | Registrado em `stockMovements`, saldo atualizado | ALTO |
| P10 | Produto com categoria e unidade customizadas | Usa configurações de `state.company` | MÉDIO |

### 2.3 Clientes

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| CL01 | Cadastrar cliente PF (CPF) | Validação de CPF, salvo corretamente | ALTO |
| CL02 | Cadastrar cliente PJ (CNPJ) | Validação de CNPJ com dígito verificador | ALTO |
| CL03 | CNPJ duplicado | Alerta ou permite com aviso | MÉDIO |
| CL04 | Definir limite de crédito | Campo salvo, exibido em pedidos | ALTO |
| CL05 | Cliente com situação "inadimplente" | Exibido com destaque visual | ALTO |
| CL06 | Editar e excluir cliente sem pedidos | Funciona sem erros | ALTO |
| CL07 | Excluir cliente com pedidos ativos | Bloqueado | CRÍTICO |
| CL08 | Filtrar clientes por nome/CNPJ | Resultado instantâneo | MÉDIO |

### 2.4 Fornecedores

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| F01 | Cadastrar fornecedor com CNPJ | Salvo, aparece na lista de compras | ALTO |
| F02 | Editar prazo de pagamento | Reflete em novas ordens de compra | MÉDIO |
| F03 | Excluir fornecedor sem compras | Funciona | MÉDIO |
| F04 | Filtrar fornecedores | Resultado correto | BAIXO |

### 2.5 Pedidos (fluxo crítico)

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| PE01 | Criar pedido novo → status "rascunho" | Salvo com status correto, itens na lista | CRÍTICO |
| PE02 | Adicionar múltiplos itens ao pedido | Totais calculados corretamente (subtotal, desconto, total) | CRÍTICO |
| PE03 | Confirmar pedido (rascunho → confirmado) | Estoque reservado ou debitado, status atualizado | CRÍTICO |
| PE04 | Faturar pedido (confirmado → faturado) | Gera NF associada, contas a receber criadas | CRÍTICO |
| PE05 | Pedido com cliente sem limite de crédito suficiente | Alerta exibido | ALTO |
| PE06 | Pedido com produto sem estoque | Alerta exibido, possível bloqueio | ALTO |
| PE07 | Cancelar pedido rascunho | Removido, estoque restaurado | ALTO |
| PE08 | Cancelar pedido confirmado | Fluxo de cancelamento com justificativa | ALTO |
| PE09 | Filtrar pedidos por status, cliente, data | Filtros funcionam corretamente | MÉDIO |
| PE10 | Validação de feriados na data de entrega | Data inválida é rejeitada com mensagem | ALTO |
| PE11 | Impressão/PDF do pedido | Gera PDF formatado sem erros | ALTO |

### 2.6 Notas Fiscais (NF-e) — ÁREA MAIS CRÍTICA

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| NF01 | Configurar token Focus NFe em Configurações | Token salvo, ambiente (homologação/produção) selecionado | CRÍTICO |
| NF02 | Emitir NF em **homologação** para pedido faturado | Status "autorizada", número atômico gerado | CRÍTICO |
| NF03 | Numeração sequencial com 2 usuários simultâneos | Sem números duplicados (`runTransaction` em `firebase.js`) | CRÍTICO |
| NF04 | Download do XML da NF emitida | Arquivo válido, CHAVE correta | CRÍTICO |
| NF05 | Impressão do DANFE (PDF) | PDF gerado sem erros | ALTO |
| NF06 | Cancelar NF emitida (< 24h) | Status "cancelada", estoque restaurado, caixa estornado | CRÍTICO |
| NF07 | Cancelar NF > 24h | Mensagem informativa — prazo expirado | ALTO |
| NF08 | Consultar status de NF pendente | `invoiceService.js` consulta Focus NFe | ALTO |
| NF09 | NF com rejeição (dados incorretos) | Exibe código de rejeição SEFAZ com descrição | ALTO |
| NF10 | Emitir NF sem token configurado | Mensagem clara pedindo configuração | CRÍTICO |
| NF11 | Custos operacionais da NF | Campos salvos, refletem no caixa | MÉDIO |
| NF12 | Filtrar notas por data, status, cliente | Filtros funcionam corretamente | MÉDIO |

### 2.7 Devoluções

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| DV01 | Devolução parcial de NF | Estoque aumenta proporcionalmente, caixa estornado parcialmente | CRÍTICO |
| DV02 | Devolução total de NF | NF cancelada ou marcada devolvida, estoque e caixa restaurados | CRÍTICO |
| DV03 | Cancelar devolução | `cancelarDevolucao()` reverte todos os efeitos | CRÍTICO |
| DV04 | Devolução de produto já sem estoque | Não gera saldo negativo | ALTO |

### 2.8 Compras

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| CP01 | Criar ordem de compra | Salva com itens, valor total correto | ALTO |
| CP02 | Parcelar pagamento de compra | Parcelas geradas em contas a pagar | ALTO |
| CP03 | Receber compra — estoque aumenta | Movimentação registrada em `stockMovements` | CRÍTICO |
| CP04 | Importar NF-e XML do fornecedor | `importarNFeXML()` preenche itens automaticamente | ALTO |
| CP05 | Pagar parcela de compra | Baixa em contas a pagar, sai do caixa | ALTO |

### 2.9 Contas a Receber / Pagar

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| CN01 | Conta a receber gerada ao faturar pedido | Aparece na lista com data de vencimento | CRÍTICO |
| CN02 | Baixar recebível (receber pagamento) | Marcado como pago, valor entra no caixa | CRÍTICO |
| CN03 | Recebível vencido → destaque visual | Linha em vermelho ou badge "Vencido" | ALTO |
| CN04 | Conta a pagar gerada ao criar compra | Aparece na lista | CRÍTICO |
| CN05 | Baixar pagável | Marcado como pago, valor sai do caixa | CRÍTICO |
| CN06 | Filtrar por vencidas / a vencer | Filtro correto | ALTO |
| CN07 | Validação de feriados em vencimentos | Data inválida rejeitada | ALTO |
| CN08 | Ordenar por valor, data, status | Ordenação correta | MÉDIO |

### 2.10 Fluxo de Caixa

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| CX01 | Lançamento manual de entrada | Aparece no fluxo, saldo atualizado | ALTO |
| CX02 | Lançamento manual de saída | Saldo decrementado | ALTO |
| CX03 | Saldo reflete recebíveis e pagáveis baixados | Consistência entre módulos | CRÍTICO |
| CX04 | Filtro por período | Exibe somente transações do período | ALTO |
| CX05 | Saldo inicial zerado em conta nova | Não exibe valores negativos indevidos | MÉDIO |
| CX06 | Ordenar por data/valor | Ordenação correta | BAIXO |

### 2.11 Relatórios

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| R01 | Visão geral — receita, despesa, margem | Cálculos corretos comparados aos dados manuais | ALTO |
| R02 | Curva ABC de produtos | Top 20% dos produtos = ~80% da receita | ALTO |
| R03 | Curva ABC de clientes | Ranking correto por volume de compras | ALTO |
| R04 | Relatório por NF | Todas as NFs do período listadas | MÉDIO |
| R05 | Exportar relatório como CSV | `exportRelatorioCSV()` — arquivo baixado, dados corretos | ALTO |
| R06 | Período selecionado reflete nos dados | Filtro de data funciona em todos os sub-relatórios | ALTO |

### 2.12 Configurações

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| CF01 | Editar dados da empresa | Salvo no Firestore, reflete em NFs emitidas | CRÍTICO |
| CF02 | Adicionar categoria customizada | Disponível em produtos | ALTO |
| CF03 | Adicionar unidade customizada | Disponível em produtos | ALTO |
| CF04 | Mudar segmento de negócio | Atualiza categorias padrão | MÉDIO |
| CF05 | Configurar dados fiscais (token Focus, regime) | Dados salvos, NF-e funciona | CRÍTICO |

### 2.13 Usuários e Roles

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| U01 | Admin convida novo usuário por email | Email enviado, usuário recebe convite | ALTO |
| U02 | Usuário aceita convite e cria conta | Vinculado à empresa, role atribuída | CRÍTICO |
| U03 | Role "vendedor" — sem acesso a config/usuários | `MODULE_GUARD` bloqueia nav-config, nav-usuarios | CRÍTICO |
| U04 | Role "visualizador" — só dashboard/relatórios | Demais módulos bloqueados | CRÍTICO |
| U05 | Role "contador" — somente leitura | Não consegue criar/editar nada | CRÍTICO |
| U06 | Admin revoga acesso de usuário | Usuário deslogado na próxima ação | ALTO |
| U07 | Convidar contador externo | `isExternal: true`, acesso restrito | ALTO |
| U08 | Dois admins simultâneos editando dados | Sem conflito — último a salvar prevalece (ou merge) | MÉDIO |

### 2.14 Minha Conta / Planos

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| MC01 | Exibir plano atual e dias de trial restantes | Dados corretos do Firestore | ALTO |
| MC02 | Botão "Fazer upgrade" — plano Básico R$79 | Inicia checkout Asaas/MP | CRÍTICO |
| MC03 | Botão "Fazer upgrade" — plano Profissional R$149 | Inicia checkout | CRÍTICO |
| MC04 | Botão "Fazer upgrade" — plano Empresarial R$299 | Inicia checkout | CRÍTICO |
| MC05 | Toggle mensal/anual (desconto 20%) | Preços atualizam, checkout reflete desconto | ALTO |
| MC06 | Checkout anual — calcular economia em R$ | Valor correto exibido | MÉDIO |
| MC07 | Assinatura ativa — exibir próximo vencimento | Data correta | ALTO |
| MC08 | Cancelar assinatura | Fluxo de cancelamento com confirmação | ALTO |
| MC09 | Programa de afiliados — gerar link | Link único, comissão 20% configurada | MÉDIO |
| MC10 | PLAN_LIMITS por plano | Básico bloqueia módulos corretos, Profissional libera | CRÍTICO |

---

## 3. Testes de UX/UI

### 3.1 Navegação e Layout

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| UX01 | Sidebar em desktop (≥1280px) | Todos os 14 itens visíveis, ícones e labels | ALTO |
| UX02 | Sidebar em tablet (768-1279px) | Sidebar recolhida com ícones, expande ao clicar | ALTO |
| UX03 | Sidebar em mobile (< 768px) | Overlay funcional, fecha ao selecionar item | ALTO |
| UX04 | Navegação entre todos os 14 módulos | Sem refresh de página, transição suave | CRÍTICO |
| UX05 | Item ativo no menu destacado visualmente | CSS `active` aplicado corretamente | MÉDIO |
| UX06 | Módulo bloqueado por plano — ícone de lock | Lock visível, clique abre modal de upgrade | ALTO |
| UX07 | Scroll em listas longas | Sem conteúdo cortado ou overflow oculto | MÉDIO |

### 3.2 Formulários e Modais

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| UX08 | Modal abre e fecha sem reload | Estado do módulo preservado | ALTO |
| UX09 | Fechar modal com Esc | Modal fecha | MÉDIO |
| UX10 | Fechar modal clicando no backdrop | Modal fecha (confirmar comportamento intencional) | BAIXO |
| UX11 | Submeter formulário com campos obrigatórios vazios | Validação inline, foco no primeiro campo inválido | ALTO |
| UX12 | Mensagem de sucesso após salvar | Toast/snackbar visível e some automaticamente | MÉDIO |
| UX13 | Mensagem de erro em falha de rede | Mensagem amigável, sem "undefined" ou stack trace | CRÍTICO |
| UX14 | Campos numéricos — apenas números aceitos | Input mascarado | MÉDIO |
| UX15 | CNPJ/CPF com máscara | Formatação automática ao digitar | MÉDIO |

### 3.3 Tabelas e Listas

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| UX16 | Lista vazia — estado zero | Mensagem "Nenhum item cadastrado" com CTA | ALTO |
| UX17 | Lista com 1 item | Layout não quebra | MÉDIO |
| UX18 | Lista com 100+ itens | Performance aceitável (<1s render) | ALTO |
| UX19 | Busca com 0 resultados | "Nenhum resultado encontrado" | MÉDIO |
| UX20 | Ordenação por coluna — seta visual | Indica direção (asc/desc) | BAIXO |
| UX21 | Linha selecionada — feedback visual | Highlight ou borda | BAIXO |

### 3.4 Performance e Confiabilidade

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| UX22 | Carregamento inicial (First Contentful Paint) | < 3s em conexão 4G | ALTO |
| UX23 | Carregar app com 500+ produtos | < 2s para renderizar lista | ALTO |
| UX24 | Salvar dados com latência alta (Firestore) | Loading state visível, sem duplo-clique | CRÍTICO |
| UX25 | App offline — perda de conexão | Mensagem de "sem conexão", dados em cache | MÉDIO |
| UX26 | Recarregar página mid-session | Estado restaurado, usuário logado | CRÍTICO |
| UX27 | Múltiplas abas abertas | Sem conflito de estado entre abas | MÉDIO |

### 3.5 Acessibilidade Mínima (para lançamento)

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| UX28 | Contraste de texto em fundo branco/escuro | Ratio ≥ 4.5:1 (WCAG AA) | MÉDIO |
| UX29 | Botões com label descritivo (não só ícone) | `aria-label` ou texto visível | MÉDIO |
| UX30 | Navegação por Tab nos formulários | Foco visível e ordem lógica | BAIXO |

---

## 4. Testes de Código — Áreas Críticas (sem framework, verificação manual)

> Como não há testes automatizados, estes são verificações de lógica no console/DevTools.

### 4.1 `firebase.js` — Numeração Atômica de NF

```
VERIFICAR: getNextNFNumber() usa runTransaction
TESTE: Abrir 2 abas e emitir NF simultaneamente
RESULTADO ESPERADO: Números consecutivos sem pulo ou duplicata
COMO TESTAR: No Firestore Console, verificar campo nfCounter
```

### 4.2 `state.js` — Consistência de Estado

```
VERIFICAR: Estado não vaza entre usuários após logout/login
TESTE: Login A → criar produto → logout → login B → verificar produtos
RESULTADO ESPERADO: B vê somente seus dados
COMO TESTAR: Duas contas em janelas anônimas diferentes
```

### 4.3 `fiscalStatus.js` — Lógica de Permissão NF-e

```
VERIFICAR: canEmitNFe() retorna false quando token ausente
VERIFICAR: getBannerConfig() retorna estado correto para cada status
TESTE: Remover token, tentar emitir NF
RESULTADO ESPERADO: Bloqueado com mensagem clara
```

### 4.4 `asaasService.js` — Integração de Pagamento

```
VERIFICAR: Endpoints apontam para sandbox em dev, produção em prod
VERIFICAR: Token de API nunca exposto no frontend (deve vir do Firestore)
VERIFICAR: Webhook de confirmação de pagamento atualiza plano
ALERTA SEGURANÇA: Token Asaas/MP não deve estar hardcoded no JS
```

### 4.5 Regras Firestore (`firestore.rules`)

```
VERIFICAR: Usuário A não lê /empresas/{idB}
VERIFICAR: Usuário não-autenticado não acessa nenhum documento
TESTE: No Firebase Console → Rules Playground
  - request.auth = null → deve rejeitar
  - request.auth.uid = "outro-tenant" → deve rejeitar
  - request.auth.uid = "dono" → deve permitir
```

### 4.6 `MODULE_GUARD` — Controle de Acesso por Plano

```
VERIFICAR: PLAN_LIMITS define corretamente quais módulos cada plano acessa
VERIFICAR: Manipular localStorage/sessionStorage não bypassa o guard
TESTE: Plano Básico → tentar acessar módulo bloqueado via navigate() no console
RESULTADO ESPERADO: Redirecionado para upgrade
```

### 4.7 Cálculos Financeiros

```
VERIFICAR: Total do pedido = soma(itens) - desconto + frete
VERIFICAR: Parcelas de compra = valor / n (sem centavos perdidos — arredondar último)
VERIFICAR: Curva ABC = ordenar por receita desc, calcular % acumulado
VERIFICAR: KPIs do dashboard = soma das transações do período, não total histórico
TESTE: Criar pedido R$100 com desconto 10% = R$90 esperado
```

---

## 5. Testes de Segurança Mínimos

| # | Cenário | Resultado Esperado | Severidade |
|---|---|---|---|
| S01 | Inspecionar JS em produção — buscar tokens hardcoded | Nenhum secret no bundle | CRÍTICO |
| S02 | Tentar acessar `/empresas/{outroId}` via Firestore REST API | 403 Forbidden | CRÍTICO |
| S03 | XSS — inserir `<script>alert(1)</script>` em campo nome | Escapado, não executa | ALTO |
| S04 | Usuário com role "vendedor" via URL direta para config | Bloqueado pelo guard | CRÍTICO |
| S05 | Token Focus NFe visível no código-fonte | Deve estar no Firestore, não no JS | CRÍTICO |
| S06 | Sessão expira após inatividade | Firebase Auth handle automático | MÉDIO |
| S07 | Email de convite — link de uso único | Link expirado não permite segundo uso | ALTO |

---

## 6. Testes de Integração Críticos

### 6.1 Ciclo Completo de Venda

```
CENÁRIO: Venda do início ao fim
1. Cadastrar produto (P01)
2. Cadastrar cliente (CL01)
3. Criar pedido com o produto para o cliente (PE01)
4. Confirmar pedido (PE03) → verificar estoque reduzido
5. Faturar pedido (PE04) → verificar conta a receber criada
6. Emitir NF-e em homologação (NF02) → verificar número gerado
7. Baixar conta a receber (CN02) → verificar entrada no caixa (CX03)
8. Conferir dashboard — KPIs atualizados
RESULTADO: Ciclo sem erros, dados consistentes entre todos os módulos
```

### 6.2 Ciclo Completo de Compra

```
CENÁRIO: Compra do início ao fim
1. Cadastrar fornecedor (F01)
2. Criar ordem de compra (CP01) com 3 itens
3. Parcelar em 3x (CP02) → verificar 3 contas a pagar
4. Receber compra (CP03) → verificar estoque aumentado
5. Pagar parcela 1 (CP05) → verificar saída do caixa
RESULTADO: Estoque e caixa consistentes
```

### 6.3 Devolução com Estorno

```
CENÁRIO: Venda + NF emitida + devolução
1. Executar Ciclo Completo de Venda (6.1)
2. Abrir devolução total da NF (DV02)
3. Verificar: estoque restaurado
4. Verificar: conta a receber cancelada ou estornada
5. Verificar: saída do caixa revertida
RESULTADO: Saldo final idêntico ao estado antes da venda
```

### 6.4 Multi-Usuário na Mesma Empresa

```
CENÁRIO: Admin + vendedor trabalhando simultaneamente
1. Admin cria pedido na aba 1
2. Vendedor confirma outro pedido na aba 2 (janela anônima, mesma empresa)
3. Verificar: sem conflito de dados, ambos os pedidos salvos
4. Verificar: estoque consistente (sem race condition)
```

---

## 7. Testes de Usuário (User Testing)

### 7.1 Perfil de Usuário Alvo

- Dono de distribuidora de pequeno porte
- Experiência básica com computadores
- Migra de planilha Excel ou sistema legado
- Sem treinamento técnico

### 7.2 Roteiro de Teste com Usuário Real (60 minutos)

**Sessão 1 — Onboarding (15 min)**
1. "Crie uma conta no Stoqio" — observe onde trava
2. "Configure sua empresa" — CNPJ, nome, endereço
3. "Cadastre 3 produtos que você vende"
4. "Cadastre 2 clientes seus"

**Sessão 2 — Operação diária (25 min)**
5. "Faça um pedido para o cliente X com 2 produtos"
6. "Confirme o pedido e emita uma nota fiscal" (homologação)
7. "O cliente pagou. Registre o recebimento"
8. "Veja quanto entrou no caixa hoje"

**Sessão 3 — Relatórios e Configurações (10 min)**
9. "Veja os relatórios do mês"
10. "Adicione um novo usuário vendedor para sua equipe"

**Sessão 4 — Cenário de Erro (10 min)**
11. "Tente emitir uma nota sem configurar o token fiscal" — observe a mensagem
12. "Tente excluir um produto que tem pedidos" — observe o comportamento

### 7.3 Métricas de Sucesso

| Métrica | Alvo mínimo para lançamento |
|---|---|
| Completar onboarding sem ajuda | ≥ 80% dos usuários |
| Criar primeiro pedido sem ajuda | ≥ 70% |
| Taxa de erro crítico (perda de dados) | 0% |
| NPS pós-sessão | ≥ 7 |
| Tempo para primeira NF emitida | < 10 min com configuração |

---

## 8. MVP — Funcionalidades Exigidas para um Produto Assinável

> Esta é a avaliação honesta: o que um cliente pagaria R$79/mês para ter.

### 8.1 Gate de Assinatura — O que DEVE funcionar no Dia 1

Estas funcionalidades são o **mínimo não-negociável**. Se qualquer uma falhar, o produto não é assinável:

| # | Funcionalidade | Módulo | Status Estimado |
|---|---|---|---|
| MVP-01 | Emissão de NF-e em produção | notas + invoiceService | ✅ implementado — testar em prod |
| MVP-02 | Fluxo completo: pedido → NF → recebimento | pedidos + notas + contas | ✅ implementado |
| MVP-03 | Controle de estoque (entrada/saída) | produtos | ✅ implementado |
| MVP-04 | Contas a receber com baixa | contas | ✅ implementado |
| MVP-05 | Fluxo de caixa (entradas e saídas) | caixa | ✅ implementado |
| MVP-06 | Onboarding funcional sem suporte humano | onboarding | ✅ implementado |
| MVP-07 | Trial de 30 dias automático | checkPlan | ✅ implementado |
| MVP-08 | Cobrança automática pós-trial | asaasService | ⚠️ requer validação end-to-end |
| MVP-09 | Controle de roles (admin/vendedor) | usuarios + MODULE_GUARD | ✅ implementado |
| MVP-10 | Dados isolados por empresa (multi-tenant) | firestore.rules | ⚠️ regras publicadas? |

### 8.2 Diferencial Competitivo — O que Justifica Migrar do Bling/Omie

| # | Funcionalidade | Por que importa |
|---|---|---|
| DIF-01 | NF-e integrada sem plugin externo | Bling cobra extra pela NF |
| DIF-02 | Programa de afiliados nativo | Crescimento orgânico gratuito |
| DIF-03 | UX moderno, sem tela travada | Omie/Bling são pesados |
| DIF-04 | Onboarding guiado em 4 etapas | Concorrentes não têm wizard |
| DIF-05 | Preço (R$79 Básico vs R$149+ Bling) | 47% mais barato |

### 8.3 O que NÃO precisa estar no MVP (mas usuários pedirão)

| Funcionalidade | Por que pode esperar |
|---|---|
| DRE completo | Caixa já resolve 90% dos casos de pequenas distribuidoras |
| Conciliação bancária | Open Finance é complexidade de V2 |
| App mobile | Web responsivo resolve para vendedores em campo |
| Múltiplos estoques/filiais | <5% dos primeiros 30 clientes têm filiais |
| Importação de histórico (Bling/Omie) | CSV de produtos já está implementado — suficiente |
| Comissão de vendedores | Importante mas não bloqueia assinatura |
| Foto de produto | Conforto, não necessidade |

### 8.4 Gaps que PODEM Bloquear Assinatura (resolução recomendada pré-lançamento)

| # | Gap | Risco | Recomendação |
|---|---|---|---|
| G01 | Saldo inicial de caixa | Migrante vê saldo negativo falso | Adicionar campo "Saldo inicial" na configuração |
| G02 | Firestore rules não publicadas | Dados de todos os clientes expostos | **PUBLICAR ANTES DE QUALQUER CLIENTE REAL** |
| G03 | Token Focus NFe em produção testado | NF em homologação ≠ produção | Testar com 1 NF real antes do lançamento |
| G04 | Cobrança Asaas end-to-end | Cliente não consegue assinar | Testar fluxo completo com cartão real (sandbox→prod) |
| G05 | Email de boas-vindas pós-cadastro | Percepção de abandono | Configurar no Firebase Auth ou Asaas |
| G06 | Página de erro 404 / crash | Tela em branco em rota inexistente | Adicionar fallback de navegação |

---

## 9. Checklist de Pré-Lançamento (Go/No-Go)

### Técnico
- [ ] `firestore.rules` publicado no Firebase Console
- [ ] Token Focus NFe em produção testado com NF real
- [ ] Integração Asaas end-to-end validada (cobrança + webhook)
- [ ] Nenhum secret hardcoded no bundle JS
- [ ] Build de produção sem erros de console
- [ ] Todas as variáveis de ambiente configuradas no servidor

### Produto
- [ ] Todos os itens `[CRÍTICO]` desta lista aprovados
- [ ] Ciclo completo de venda executado sem erros (seção 6.1)
- [ ] Ao menos 2 usuários reais testaram o onboarding
- [ ] NF-e emitida e cancelada em produção (1 teste com CNPJ real)

### Legal/Compliance
- [ ] Termos de Uso publicados e linkados no cadastro
- [ ] Política de Privacidade (LGPD) publicada
- [ ] Dados fiscais da empresa emitente configurados corretamente

### Operacional
- [ ] Canal de suporte configurado (email/WhatsApp)
- [ ] Processo para cancelamento de assinatura definido
- [ ] Backup dos dados do Firestore configurado
- [ ] Monitoramento de erros (ex: Sentry) opcional mas recomendado

---

## 10. Ordem de Execução dos Testes

```
Dia 1 — Infraestrutura e Segurança
  → S01-S07 (segurança)
  → 4.5 (Firestore rules — CRÍTICO antes de tudo)
  → C01-C07 (criação de conta)

Dia 2 — Fluxo Principal
  → O01-O08 (onboarding)
  → T01-T05 (trial)
  → Ciclo completo 6.1 (venda end-to-end)

Dia 3 — Módulos Críticos
  → NF01-NF12 (notas fiscais)
  → PE01-PE11 (pedidos)
  → CN01-CN08 (contas)
  → CX01-CX06 (caixa)
  → DV01-DV04 (devoluções)

Dia 4 — Módulos de Suporte
  → P01-P10 (produtos)
  → CL01-CL08 (clientes)
  → CP01-CP05 (compras)
  → U01-U08 (usuários e roles)
  → MC01-MC10 (minha conta / planos)

Dia 5 — UX e Usuário Real
  → UX01-UX30 (toda a seção UX/UI)
  → Roteiro de teste com usuário real (seção 7.2)
  → R01-R06 (relatórios)

Dia 6 — Go/No-Go
  → Revisar todos os itens CRÍTICO com falha
  → Executar Checklist seção 9
  → Decisão de lançamento
```

---

*Gerado em 2026-06-06 para refinamento com DeepSeek + Claude.*
*Próxima ação: executar testes em ordem, marcar status (✅ / ❌ / ⚠️) em cada item.*

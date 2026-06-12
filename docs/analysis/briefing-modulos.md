## js/app.js (25)
- Propósito: Inicializa data, força conclusão de onboarding se empresa tem dados, dispara render.
- Exports: — (IIFE)
- Importa de: js/core/state.js (loadState, saveState, state), js/modules/onboarding.js (shouldShowOnboarding), js/core/nav.js (render)
- Campos de state que LÊ: state.onboarding, state.products, state.clients, state.invoices, state.receivables, state.transactions, state.currentView
- Campos de state que ESCREVE: state.onboarding.complete, state.currentView
- Firestore: —
- DOM: topbar-date
- Funções >80 linhas: —
- Duplicação: —
- Riscos: —

## js/core/firebase.js (423)
- Propósito: Sincronização Firestore (save/load), autenticação, cadastro, funções de login/logout.
- Exports: getNextNFNumber(), saveToFirebase(), loadFromFirebase(), showSyncStatus(msg,warn), updateTopbar(), doLogin(), doLogout(), doSignup(), doGoogleLogin(), doResetPassword(), selectSegment(card), showSignup(), showLogin(), SEGMENT_PRESETS
- Importa de: js/core/state.js (state, STORAGE_KEY, loadState, defaultState, saveState), js/core/nav.js (render, applyRoleUI, processRecurring)
- Campos de state que LÊ: state.company, state.products, state.clients, state.suppliers, state.invoices, state.purchases, state.receivables, state.payables, state.transactions, state.stockMovements, state.orders, state.returns, state.onboarding
- Campos de state que ESCREVE: state (todos os arrays/objetos durante loadFromFirebase), window._lastSaved
- Firestore: doc(‘empresas’,uid) setDoc, getDoc; writeBatch subcoleções; doc(‘config’,‘focusNfe’) getDoc; doc(‘users’,uid) setDoc no signup
- DOM: sync-status, topbar-date, sb-footer, login-email, login-pass, login-err, signup-box, signup-company…, seg-card, ls-login-panel
- Funções >80 linhas: loadFromFirebase (firebase.js:89)
- Duplicação: updateTopbar duplica app.js:7 (formatação de data)
- Riscos: —
  - localStorage descartado condicionalmente (linha 99) pode causar perda de dados se mal sincronizado

## js/core/state.js (441)
- Propósito: Gerenciamento do estado global, helpers, planos, máscaras, datas, classificações, utilidades.
- Exports: STORAGE_KEY, CACHE_VERSION, PLAN_LIMITS, checkPlan(module), getPlanLimit(key), showPlanBlockModal(module), defaultState, loadState(), saveState(), processRecurringExpenses(), completeOnboardingStep(step), scanBeep(ok), scanAddItem(modalType,code), scanKeyHandler(e,modalType), escapeHtml(str), fmt(v), fmtNum(v), fmtDate(d), today(), addDays(ds,n), uid(), getProd(id), getClient(id), getSupplier(id), el(id), totalIn(txs), totalOut(txs), isOverdue(dueDate), getClientOpenBalance(clientId), getClientOverdueBalance(clientId), isClientDelinquent(clientId), checkClientCredit(clientId,newTotal), norm(s), normWords(s), prodSimilarity(a,b), initSort(defaultCol,defaultDir), sortIcon(sortState,col), sortData(data,sortState,getters), thSortable(label,col,sortState,onClickFn), buscarCep(prefix), getFeriados(ano), proximoDiaUtil(dateStr), maskCNPJ(v), maskCEP(v), maskPhone(v), unmask(v), applyMask(el,type), emptyState(icon,title,subtitle,actionLabel,actionFn)
- Importa de: —
- Campos de state que LÊ: state (todos os campos)
- Campos de state que ESCREVE: state (todos os campos), state.onboarding, state.recurringExpenses, state.company, state.nfItems (zerado)
- Firestore: — (saveToFirebase chamado por saveState)
- DOM: usa el() genericamente
- Funções >80 linhas: —
- Duplicação: generateReceivables e generatePayables compartilham lógica de termos/parcelas (linhas 308-338)
- Riscos: —
  - State global mutável propagado (linha 104)

## js/core/nav.js (204)
- Propósito: Modal, navegação entre views, render delegado, controle de permissões e roles.
- Exports: showModal(html,large), closeModal(), navigate(v), render(), copyFromDataAttr(btn), emptyState(iconId,title,subtitle,actionLabel,actionOnclick), ROLE_NAV, ROLE_LABELS, ROLE_COLORS, applyRoleUI(), toggleSidebar(), toggleTheme(), closeSidebar(), showToast(msg,type,duration), removeToast(el)
- Importa de: js/core/state.js (state, checkPlan, showPlanBlockModal, showSyncStatus), js/core/fiscalStatus.js (needsBanner, getBannerConfig)
- Campos de state que LÊ: state.currentView, state.onboarding, state.company, window._userRole, window._plan, window._trialEndsAt, window._tenantStatus
- Campos de state que ESCREVE: state.currentView
- Firestore: —
- DOM: modal, modal-box, page-title, sync-status, sidebar, sidebar-overlay, role-badge, sb-email, sb-avatar, theme-toggle, notif-bell, notif-dropdown, toast-container
- Funções >80 linhas: —
- Duplicação: emptyState duplica função de state.js (linhas 95-106 vs state.js:431-438)
- Riscos:
  - showModal define innerHTML sem sanitização (linha 4) — todos os chamadores podem injetar HTML via dados de usuário

## js/core/print.js (68)
- Propósito: Abre janela de impressão para NF.
- Exports: printNF(id)
- Importa de: js/core/state.js (state, getClient, getProd, fmtDate, fmt, fmtNum, today)
- Campos de state que LÊ: state.invoices, state.company, state.receivables
- Campos de state que ESCREVE: —
- Firestore: —
- DOM: window.open, document.write
- Funções >80 linhas: —
- Duplicação: —
- Riscos: —

## js/core/fiscalStatus.js (85)
- Propósito: Enum de status fiscal e helpers para emissão/aviso.
- Exports: FISCAL_STATUS, canEmitNFe(company), canEmitFatura(company), needsBanner(company), getBannerConfig(company)
- Importa de: —
- Campos de state que LÊ: (parâmetro company)
- Campos de state que ESCREVE: —
- Firestore: —
- DOM: —
- Funções >80 linhas: —
- Duplicação: —
- Riscos: —

## js/modules/dashboard.js (259)
- Propósito: Renderiza dashboard com KPIs, feed de atividades e sistema de notificações.
- Exports: renderDashboard(), addNotification(type,title,msg,actionLabel,actionFn), clearNotifications(), updateNotifBell(), toggleNotifications(e), renderNotifDropdown()
- Importa de: js/core/state.js (state, fmt, fmtDate, escapeHtml, emptyState, isOverdue, totalIn, totalOut), js/core/nav.js (navigate), js/core/fiscalStatus.js (needsBanner, getBannerConfig)
- Campos de state que LÊ: state.invoices, state.clients, state.receivables, state.transactions, state.products, state.orders, state.onboarding, state.company
- Campos de state que ESCREVE: window._notifications, window._dashPeriod, window._feedTab
- Firestore: —
- DOM: content, notif-bell, notif-badge, notif-dropdown
- Funções >80 linhas: renderDashboard (dashboard.js:17)
- Duplicação: —
- Riscos: —

## js/modules/produtos.js (297)
- Propósito: CRUD de produtos, ordenação, busca NCM, detecção ICMS-ST.
- Exports: renderProdutos(), filterProdutos(), prodSortBy(col), openProdModal(id), saveProd(id), deleteProd(id), reativarProd(id), viewPriceHistory(id), viewMovements(id), updateSTTip(), abrirBuscaNCM(), selecionarNCM(codigo), fecharPainelNCM()
- Importa de: js/core/state.js (state, fmt, fmtDate, escapeHtml, emptyState, initSort, sortIcon, sortData, getProd, uid, today, CAT_PROD, UNITS, showModal, showSyncStatus, norm, prodSimilarity, saveState, el, getPlanLimit, navigate, closeModal)
- Campos de state que LÊ: state.products, state.company, state.stockMovements
- Campos de state que ESCREVE: state.products, state.stockMovements (via saveProd), state.compraDraft
- Firestore: —
- DOM: content, prod-tbody, prod-search, prod-filter-cat, prod-filter-stock, prod-show-inactive
- Funções >80 linhas: —
- Duplicação: filterProdutos e filterClientes compartilham estrutura (busca, filtro, sort)
- Riscos:
  - Injeção HTML via CAT_PROD/UNITS no modal (openProdModal:79-84) — categorias não escapadas; admin pode inserir script (contexto <option> mas potencial XSS)

## js/modules/clientes.js (116)
- Propósito: CRUD de clientes, busca, consulta CNPJ.
- Exports: renderClientes(), filterClientes(), cliSortBy(col), openClientModal(id), saveClient(id), deleteClient(id), buscarCnpjCliente()
- Importa de: js/core/state.js (state, escapeHtml, fmt, fmtDate, emptyState, initSort, sortIcon, sortData, getClient, uid, showModal, showSyncStatus, navigate, applyMask, buscarCep)
- Campos de state que LÊ: state.clients, state.receivables
- Campos de state que ESCREVE: state.clients
- Firestore: —
- DOM: content, cli-tbody, cli-search
- Funções >80 linhas: —
- Duplicação: openClientModal/saveClient semelhante a fornecedores
- Riscos:
  - Atributos value com dados do cliente sem escape (linha 57) — pode quebrar atributo HTML com aspas e injetar atributos (ex: onfocus)

## js/modules/fornecedores.js (101)
- Propósito: CRUD de fornecedores, consulta CNPJ.
- Exports: renderFornecedores(), filterFornecedores(), fornSortBy(col), openSupplierModal(id), saveSupplier(id), deleteSupplier(id), buscarCnpjForn()
- Importa de: js/core/state.js (state, escapeHtml, fmt, fmtDate, emptyState, initSort, sortIcon, sortData, getSupplier, uid, showModal, showSyncStatus, navigate, applyMask)
- Campos de state que LÊ: state.suppliers, state.purchases
- Campos de state que ESCREVE: state.suppliers
- Firestore: —
- DOM: content, forn-tbody, forn-search
- Funções >80 linhas: —
- Duplicação: idêntico a clientes em estrutura
- Riscos:
  - Atributos value com dados não escapados (linha 52) — mesmo risco que clientes

## js/modules/pedidos.js (605)
- Propósito: Gestão de pedidos (CRUD, scanner, faturar), processos de confirmação e faturamento.
- Exports: renderPedidos(), filterPedidos(), pedSortBy(col), openPedidoModal(prefill), pedidoRenderProdList(search), pedidoAddItemFromList(prodId), pedidoAddItem(), pedidoRemItem(i), pedidoGetSubtotal(), pedidoRenderItems(), pedidoPreencheCliente(clientId), salvarPedido(num,confirmar), confirmarPedido(id), cancelarPedido(id), editarPedidoModal(id), salvarEditPedido(id,confirmar), faturarPedido(id), emitirNFdePedido(nfNum,pedidoId), viewPedido(id)
- Importa de: js/core/state.js e helpers; js/modules/notas.js (nfRenderItems, nfRenderProdList, nfAddItemFromList, nfGetSubtotal, nfFreightWho, etc.), js/core/firebase.js (getNextNFNumber, saveToFirebase), js/core/fiscalStatus.js (canEmitNFe)
- Campos de state que LÊ: state.orders, state.clients, state.products, state.nfItems, state.nfCosts, state.invoices, state.receivables, state.transactions
- Campos de state que ESCREVE: state.orders, state.nfItems, state.nfCosts, state.invoices, state.stockMovements, state.receivables, state.transactions
- Firestore: saveToFirebase via salvarPedido/salvarEditPedido/emitirNFdePedido
- DOM: content, ped-status-pills, ped-tbody, ped-search, diversos em modals
- Funções >80 linhas: faturarPedido (pedidos.js:417)
- Duplicação:
  - openPedidoModal e editarPedidoModal (HTML idêntico, linhas 85-146 vs 299-359)
  - emitirNFdePedido duplica grande parte de emitirNF de notas.js (linhas 503-576 vs notas.js:316-412)
- Riscos:
  - Cliente não escapado em `<option>` (linha 98) — XSS se nome contém `</option><script>`
  - faturarPedido monta HTML com dados do pedido sem escape (linha 424 obsVal parcialmente escape?) mas nomes de itens podem ter XSS

## js/modules/notas.js (911)
- Propósito: Emissão, visualização, cancelamento de NF-e; comunicação Focus NFe; recebimento de pagamentos; importação/exportação.
- Exports: renderNotas(), nfSortBy(col), filterNotas(), openNFModal(), nfFreightWho(who), nfFreightUpdate(), toggleNfCosts(), nfAddCost(), nfRemCost(i), nfCostChange(i,field,val), nfRenderCosts(), nfRenderProdList(search), nfAddItemFromList(prodId), nfAddItem(), nfRemItem(i), nfEditItemQty(i,val), nfGetSubtotal(), nfUpdateTotals(), nfRenderItems(), emitirNF(num), viewNF(id), cancelNF(id), nfClientSearch(q), nfClientSelect(id,name), nfClientClear(), nfClientAvulso(), nfClientNovo(), nfSalvarClienteRapido(), getNFClientName(nf), checkClienteNF(clientId), darBaixaNF(nfId), confirmarBaixa(nfId), cartaCorrecaoModal, executarCartaCorrecao, enviarEmailNFModal, executarEnviarEmail, previewDANFeModal, inutilizarNumeracaoModal, executarInutilizar, importarNFeModal, executarImportarNFe, renderNFeRecebidas, verNFeRecebidaDetalhe, manifestarNFeModal, executarManifestar, nfFilterProds(search)
- Importa de: js/core/state.js (state, fmt, fmtDate, escapeHtml, emptyState, _nfSort, sortIcon, sortData, getProd, getClient, uid, today, PAY_TERMS, PAY_METHODS, generateReceivables, checkClientCredit, isOverdue, _guardSave, _doneSave, proximoDiaUtil, scanKeyHandler), js/core/firebase.js (getNextNFNumber, saveToFirebase, showSyncStatus), js/services/invoiceService.js (todas as funções Focus NFe)
- Campos de state que LÊ: state.invoices, state.clients, state.products, state.nfItems, state.nfCosts, state.receivables, state.transactions, state.stockMovements
- Campos de state que ESCREVE: state.invoices, state.receivables, state.nfItems, state.nfCosts, state.transactions, state.stockMovements, state.products stock
- Firestore: saveToFirebase via emitirNF, cancelNF, darBaixaNF
- DOM: content, nf-tbody, nf-f-search, nf-f-status, nf-f-period, modal IDs diversos
- Funções >80 linhas: openNFModal (notas.js:71), emitirNF (notas.js:316)
- Duplicação:
  - openNFModal e faturarPedido (pedidos.js:417) compartem estrutura de modal NF
  - lógica de pagamento parcial (confirmarBaixa) duplicada em contas.js e compras.js
- Riscos:
  - viewNF (linha 430) insere nome do item sem escape — XSS
  - nfClientSearch insere innerHTML com escapeHtml parcial, mas nfClientSelect usa textContent; seguro
  - Js legado: nfAddItem (linha 271) corpo vazio por compatibilidade

## js/modules/devolucoes.js (150)
- Propósito: Registro e cancelamento de devoluções vinculadas a NF.
- Exports: renderDevolucoes(), filterDevolucoes(), cancelarDevolucao(id), openDevolucaoModal(nfId), salvarDevolucao(nfId)
- Importa de: js/core/state.js (state, fmt, fmtDate, escapeHtml, emptyState, getProd, uid, today, showModal, showSyncStatus, _guardSave, _doneSave, navigate, viewNF)
- Campos de state que LÊ: state.returns, state.invoices, state.products, state.receivables, state.transactions, state.stockMovements
- Campos de state que ESCREVE: state.returns, state.products.stock, state.stockMovements, state.transactions, state.invoices[].returnedTotal/status, state.receivables status
- Firestore: saveToFirebase via salvarDevolucao
- DOM: content, dev-tbody, dev-search
- Funções >80 linhas: —
- Duplicação: —
- Riscos:
  - openDevolucaoModal utiliza escapeHtml nos nomes de produto (linha 79); seguro

## js/modules/compras.js (561)
- Propósito: Ordens de compra, importação XML NF-e, pagamentos, edição.
- Exports: renderCompras(), filterCompras(), compSortBy(col), importarNFeXML(), openCompraModal(draft), cpRenderInstallments(savedDates), compraAddItem(), compraRemItem(i), compraVincularItem(i,prodId), compraUpdateTotals(), compraRenderItems(), salvarCompra(num), viewCompra(id), pagarCompra(compraId), confirmarPagamentoCompra(compraId), editCompraModal(id), salvarEditCompra(id)
- Importa de: js/core/state.js (várias helpers), js/core/firebase.js (saveToFirebase), js/modules/produtos.js (saveProd via openProdFromCompra)
- Campos de state que LÊ: state.purchases, state.suppliers, state.payables, state.products, state.transactions, state.stockMovements
- Campos de state que ESCREVE: state.purchases, state.payables, state.products (stock, costPrice, priceHistory), state.stockMovements, state.transactions, state.compraItems
- Firestore: saveToFirebase
- DOM: content, comp-tbody, comp-search, modal diversos
- Funções >80 linhas: —
- Duplicação:
  - editCompraModal vs openCompraModal (grande bloco HTML repetido)
  - confirmarPagamentoCompra e confirmarBaixa (notas/contas) compartilham lógica de pagamento parcial
- Riscos:
  - viewCompra (linha 364) nome do fornecedor sem escape — XSS
  - compraRenderItems (linha 273) nome do produto sem escape — XSS

## js/modules/contas.js (248)
- Propósito: Contas a receber e a pagar, pagamento individual, cobrança via Asaas.
- Exports: renderContas(), contasRecSortBy(col), contasPagSortBy(col), payReceivable(id), confirmarPayReceivable(id), payPayable(id), confirmarPayPayable(id), cobrar(id,tipo)
- Importa de: js/core/state.js (state, escapeHtml, fmt, fmtDate, emptyState, initSort, sortIcon, sortData, isOverdue, getClient, getSupplier, today, _guardSave, _doneSave, showSyncStatus, navigate, asaasGerarCobranca (global))
- Campos de state que LÊ: state.receivables, state.payables, state.transactions, state.invoices, state.purchases, state.clients, state.suppliers
- Campos de state que ESCREVE: state.receivables/ payables status/amount, state.transactions, state.invoices.status, state.purchases.status
- Firestore: saveToFirebase
- DOM: content, contas-f-overdue
- Funções >80 linhas: renderContas (contas.js:16)
- Duplicação:
  - confirmarPayReceivable e confirmarPayPayable idênticos na estrutura
  - lógica de pagamento parcial espalhada entre este, notas, compras
- Riscos:
  - renderContas insere nomes de clientes/fornecedores sem escape (linhas 43,56 etc.) — XSS

## js/modules/caixa.js (238)
- Propósito: Fluxo de caixa, lançamentos manuais, despesas recorrentes.
- Exports: renderCaixa(), caixaSortBy(col), clearCxFilters(), openTxModal(), saveTx(), deleteTx(id), openRecurringModal(index), saveRecurring(index), toggleRecurring(index), deleteRecurring(index), processSingleRecurring(index)
- Importa de: js/core/state.js (state, fmt, fmtDate, escapeHtml, emptyState, initSort, sortIcon, sortData, totalIn, totalOut, today, showModal, showSyncStatus, navigate, CAT_FIN, uid)
- Campos de state que LÊ: state.transactions, state.recurringExpenses, state.company.openingBalance, state.receivables, state.payables
- Campos de state que ESCREVE: state.transactions, state.recurringExpenses, state.cashFilter
- Firestore: saveToFirebase indireto (saveState)
- DOM: content, cx-from, cx-to, cx-cat
- Funções >80 linhas: renderCaixa (caixa.js:10)
- Duplicação: —
- Riscos:
  - escapeHtml usado em descrições das recorrentes (linha 88) — seguro

## js/modules/relatorios.js (634)
- Propósito: Relatórios financeiros (visão geral, curva ABC, ABC clientes, por NF, DRE), exportação CSV.
- Exports: exportRelatorioCSV(), getRelPeriod(), renderRelatorios(), renderRelatorioNF(), filterRelNF(), renderRelNFDetail(nf), renderCurvaABC(), renderCurvaABCClientes(), renderDRE(), exportABCClientesCSV()
- Importa de: js/core/state.js (estado e helpers de formatação)
- Campos de state que LÊ: state.invoices, state.transactions, state.products, state.purchases, state.receivables, state.returns, state.relPeriod, state.relTab, state.relNfId
- Campos de state que ESCREVE: state.relPeriod, state.relTab, state.relNfId, state.dreRegime, state.dreEstimarImpostos
- Firestore: —
- DOM: content, rel-nf-search, rel-nf-list, rel-nf-detail
- Funções >80 linhas: renderRelatorios (relatorios.js:28), renderDRE (relatorios.js:469)
- Duplicação:
  - Trechos de montagem de tabela de ABC repetidos entre Curva ABC Produtos e Clientes
- Riscos:
  - escapeHtml aplicado nos nomes de produtos/clientes; seguro

## js/modules/config.js (462)
- Propósito: Tela “Minha Conta” (planos/assinatura), configurações gerais e financeiras (Asaas), export/import/reset dados.
- Exports: renderMinhaConta(), assinarPlano(plan), cancelarPlano(), fazerUpgrade(plan), renderConfig(activeTab), saveConfig(), saveCatUnits(), uploadCompanyLogo(event), removeCompanyLogo(), exportData(), importData(), resetData(), salvarAsaas(), testarAsaas(), _renderAsaasInstrucoes()
- Importa de: js/core/state.js, js/core/nav.js (render, navigate), js/core/firebase.js (saveToFirebase), js/modules/fiscal.js (renderFiscalTab)
- Campos de state que LÊ: state.company, window._plan, window._billingCycle, state.products, state.clients, state.suppliers, state.invoices, state.purchases, state.transactions
- Campos de state que ESCREVE: state.company, state.categories/units
- Firestore: saveToFirebase, resetData apaga localStorage e Firestore
- DOM: content, cfg-name, cfg-cnpj, cfg-…, config-tab-geral, config-tab-fiscal, config-tab-financeiro, asaas-instrucoes, cfg-asaas-key, cfg-asaas-env
- Funções >80 linhas: renderMinhaConta (config.js:2), renderConfig (config.js:207)
- Duplicação: —
- Riscos:
  - Inputs value com dados da empresa sem escape (linha 219) — possível injeção de atributos HTML (ex: `" onfocus=alert(1)`)
  - Textarea de categorias/unidades (linhas 268,273) sem escape para conteúdo da tag

## js/modules/usuarios.js (222)
- Propósito: Gestão de usuários e convite de contador.
- Exports: loadUsers(), renderUsuarios(), openNewUserModal(), createNewUser(), openEditUserModal(uid,…), saveUserEdit(uid), toggleUserActive(uid,currentlyActive), showConvidarContador(), salvarContador()
- Importa de: firebase (window._db, _fbFns, _companyId, _userRole)
- Campos de state que LÊ: —
- Campos de state que ESCREVE: —
- Firestore: users (collection) — getDocs, setDoc, updateDoc
- DOM: content, nu-err, eu-name, cc-err
- Funções >80 linhas: —
- Duplicação: —
- Riscos:
  - escapeHtml aplicado no nome dos usuários (linha 32); seguro

## js/modules/fiscal.js (457)
- Propósito: Wizard de configuração fiscal e painel de status.
- Exports: saveFiscalStep(fields), renderFiscalTab(), openFiscalTab(), wizardGoTo(step), renderFiscalDashboardHTML(), renderWizardStep1-6, wizardSelectDocType(type), wizardSaveStep2(), wizardUploadCert(), wizardReplaceCert(), wizardSetEnv(env), wizardConfirmProducao(), wizardRegisterFocusNFe(), wizardRunTest()
- Importa de: js/core/state.js, js/services/invoiceService.js (emitirNFe), firebase functions (callable), viacep
- Campos de state que LÊ: state.company (fiscalData, fiscalStatus, focusNfeEnv, certExpiresAt, certAlert)
- Campos de state que ESCREVE: state.company (via saveFiscalStep)
- Firestore: setDoc em empresas doc
- DOM: fiscal-tab-content, vários IDs do wizard
- Funções >80 linhas: —
- Duplicação: —
- Riscos:
  - Inputs do wizard usam value com dados não escapados (linhas 152,154 etc.) — risco de quebra de atributo

## js/modules/onboarding.js (336)
- Propósito: Wizard de onboarding pós-cadastro (4 etapas).
- Exports: shouldShowOnboarding(), renderOnboarding(), _onboardingSave0(), _onboardingNextFromDados(), _onboardingFinish(), e helpers de importação
- Importa de: js/core/state.js, js/services/csvImport.js (parseCSV, importToState)
- Campos de state que LÊ: state.onboarding, state.company, state.products, state.clients
- Campos de state que ESCREVE: state.onboarding.step/checklist, state.company, state.products, state.clients
- Firestore: —
- DOM: content, ob-import-area, ob-manual-area, ob-name, etc.
- Funções >80 linhas: —
- Duplicação: —
- Riscos: seguro (dados de segmentos fixos, escape minimo)

## js/modules/aiChat.js (329)
- Propósito: Widget de chat com IA e playbook de análise.
- Exports: aiChatInit(), aiChatToggle(), aiChatAddMsg(role,text), aiChatSend(), aiPlaybookRun()
- Importa de: nenhum do projeto (exceto funções globais do Firebase)
- Campos de state que LÊ: —
- Campos de state que ESCREVE: —
- Firestore: —
- DOM: ai-chat-widget, ai-chat-panel, ai-chat-msgs, ai-chat-input, ai-chat-send
- Funções >80 linhas: —
- Duplicação: escapeHtml (linha 236) duplicado de state.js
- Riscos: mensagens do usuário escapadas, seguro

## js/services/invoiceService.js (276)
- Propósito: Comunicação com Focus NFe via Cloud Function proxy.
- Exports: emitirNFe(invoice,company,products,clients), cancelarNFe, consultarNFe, cartaCorrecaoNFe, enviarNFeEmail, previsualizarDANFe, inutilizarNumeracao, importarNFe, consultarCEP, consultarNCM, consultarCNPJ, listarNFeRecebidas, consultarNFeRecebida, manifestarNFe, emitirNFCe, cancelarNFCe, emitirNFSe, cancelarNFSe, emitirCTe, cancelarCTe, emitirMDFe, cancelarMDFe
- Importa de: —
- Campos de state que LÊ: (passados como parâmetro ou via window._companyId)
- Campos de state que ESCREVE: —
- Firestore: —
- DOM: —
- Funções >80 linhas: —
- Duplicação: emitirNFe e previsualizarDANFe compartilham montagem de payload (linhas 37-71 vs 131-158)
- Riscos: token nunca exposto ao frontend

## js/services/csvImport.js (273)
- Propósito: Parser de arquivos CSV/XLSX e mapeamento para entidades do sistema.
- Exports: COLUMN_MAPS, detectSystem(headers), findCol(row,headers,candidates), parseXLSX(file), parseCSV(file,entity), importToState(data,entity)
- Importa de: js/core/state.js (uid, norm, saveState)
- Campos de state que LÊ: state.products, state.clients, state.suppliers
- Campos de state que ESCREVE: state.products, state.clients, state.suppliers (via importToState)
- Firestore: —
- DOM: —
- Funções >80 linhas: parseCSV (csvImport.js:145)
- Duplicação: —
- Riscos: —

## js/services/asaasService.js (79)
- Propósito: Cobrança via Asaas (Pix/Boleto) usando proxy ou direto.
- Exports: asaasGerarCobranca(receivable,client,tipo)
- Importa de: — (usa window._companyId e state.company.asaasKey)
- Campos de state que LÊ: state.company.asaasKey, asaasEnv
- Campos de state que ESCREVE: —
- Firestore: —
- DOM: —
- Funções >80 linhas: —
- Duplicação: —
- Riscos: — (chave pode ser acessada pelo frontend no fallback direto, mas esperado)

## functions/index.js (18)
- Propósito: Exporta todas as Cloud Functions.
- Exports: mpWebhook, checkOverdue, payAffiliate, createSubscription, cancelSubscription, registerTenant, uploadCertificate, checkCertExpiry, aiChat, aiPlaybook, focusWebhook, focusProxy, asaasProxy, asaasWebhook, manageCompany
- Importa de: arquivos irmãos
- Campos de state: —
- Firestore: —
- DOM: —
- Funções >80 linhas: —
- Duplicação: —
- Riscos: —

## functions/manageCompany.js (49)
- Propósito: Função callable para admin gerenciar empresas (buscar, atualizar plano/status).
- Exports: manageCompany
- Importa de: firebase-admin
- Campos de state: —
- Firestore: empresas collection — get, update
- DOM: —
- Funções >80 linhas: —
- Duplicação: —
- Riscos: —

## app.html (IDs e scripts)
- Propósito: Estrutura base e carregamento de todos os scripts.
- Scripts carregados (ordem): state.js, firebase.js, fiscalStatus.js, nav.js, print.js, dashboard.js, aiChat.js, produtos.js, clientes.js, fornecedores.js, invoiceService.js, fiscal.js, notas.js, compras.js, contas.js, caixa.js, relatorios.js, config.js, usuarios.js, pedidos.js, devolucoes.js, csvImport.js, asaasService.js, onboarding.js, app.js
- Principais IDs de container: content, modal, modal-box, topbar, page-title, sync-status, theme-toggle, sidebar, sidebar-overlay, sb-footer, sb-email, sb-avatar, role-badge, topbar-date, notif-bell, notif-badge, notif-dropdown, toast-container, login-screen e campos, signup-box e campos, trial-block-screen

---

## Mapa de dependências
| Módulo | Importa de | Usado por |
|--------|------------|-----------|
| state.js | — | todos |
| firebase.js | state, nav | app, pedidos, notas, compras, contas, caixa, onboarding, config |
| nav.js | state, fiscalStatus | app, firebase, todos os módulos |
| print.js | state | notas |
| fiscalStatus.js | — | nav, dashboard, notas, pedidos, fiscal |
| dashboard.js | state, nav, fiscalStatus | — |
| produtos.js | state | compras, pedidos |
| clientes.js | state | vários |
| fornecedores.js | state | compras |
| pedidos.js | state, notas, firebase, fiscalStatus | — |
| notas.js | state, firebase, invoiceService | pedidos |
| devolucoes.js | state | — |
| compras.js | state, firebase, produtos | — |
| contas.js | state, asaasService | — |
| caixa.js | state | — |
| relatorios.js | state | — |
| config.js | state, nav, firebase, fiscal | — |
| usuarios.js | firebase | — |
| fiscal.js | state, invoiceService, firebase functions | config |
| onboarding.js | state, csvImport | app |
| aiChat.js | (firebase callable) | — |
| invoiceService.js | (fetch focusProxy) | notas, fiscal |
| csvImport.js | state | onboarding, compras |
| asaasService.js | (fetch Asaas) | contas |
| functions/* | firebase-admin | — |

Órfãos: nenhum (todos módulos são carregados e utilizados).

---

## Achados transversais

### Top 10 maiores funções (linhas)
| Função | Arquivo:linha | Linhas |
|--------|---------------|--------|
| renderDashboard | js/modules/dashboard.js:17 | 191 |
| renderRelatorios | js/modules/relatorios.js:28 | 159 |
| renderDRE | js/modules/relatorios.js:469 | 142 |
| renderConfig | js/modules/config.js:207 | 126 |
| renderContas | js/modules/contas.js:16 | 95 |
| emitirNF | js/modules/notas.js:316 | 97 |
| parseCSV | js/services/csvImport.js:145 | 95 |
| renderCaixa | js/modules/caixa.js:10 | 92 |
| loadFromFirebase | js/core/firebase.js:89 | 91 |
| openNFModal | js/modules/notas.js:71 | 94 |

### Padrões repetidos em 3+ módulos
- Modal via showModal(html) com string gigante e innerHTML — presentes em todos os módulos de CRUD
- Ordenação: initSort, sortIcon, sortData, thSortable replicados em produtos, clientes, fornecedores, pedidos, compras, contas, caixa, relatorios
- Lógica de pagamento parcial/parcelamento com geração de saldo: repetida em confirmarBaixa (notas), confirmarPayReceivable (contas), confirmarPayPayable (contas), confirmarPagamentoCompra (compras), salvarDevolucao (devolucoes)
- Validação de crédito de cliente: checkClientCredit chamado em notas, pedidos, compras
- Exportação CSV: exportRelatorioCSV e exportABCClientesCSV
- Escape HTML: escapeHtml definido em state.js e duplicado em aiChat.js (linha 236)

### TODO/FIXME/HACK
- js/modules/notas.js:271 — `nfAddItem()` (corpo vazio, comentado “legacy — kept for compatibility”)
- js/modules/notas.js:693 — `nfFilterProds(search)` apenas redireciona (wrapper legado)
- js/modules/pedidos.js:183 — `pedidoFilterProds(search)` wrapper legado similar

### Arquivos > 500 linhas
- js/modules/notas.js (911)
- js/modules/relatorios.js (634)
- js/modules/pedidos.js (605)
- js/modules/compras.js (561)
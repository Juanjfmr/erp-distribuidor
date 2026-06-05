# Spec — Onboarding Fiscal Self-Service (Wizard + Banner)

**Data:** 2026-06-05
**Status:** Aprovado — pronto para implementação
**Projeto:** Stoqio ERP — módulo fiscal multi-tenant

---

## Contexto

Hoje o Stoqio usa um token Focus NFe global (`window._focusToken`) configurado manualmente pelo operador. Isso funciona para um único tenant mas quebra o modelo SaaS: cada tenant precisa emitir NF-e com seu próprio CNPJ, o que exige um token exclusivo por tenant obtido via registro na Focus NFe.

Este spec cobre:
- Wizard de configuração fiscal self-service (operado pelo próprio assinante)
- Enum central de estados fiscais
- Banner informativo no Dashboard
- Firebase Functions para registro seguro na Focus NFe e upload de certificado A1
- Migração do token global para modelo por tenant

---

## Decisões de produto

- **Fatura sempre disponível:** tenants sem configuração fiscal emitem fatura PDF (sem valor fiscal). O sistema nunca bloqueia operações por falta de configuração fiscal.
- **CPF não bloqueia o sistema:** tenant com CPF opera normalmente com faturas. NF-e requer CNPJ.
- **Banner informativo, não bloqueante:** faixa discreta (~40px) no topo do Dashboard. Não tem botão de fechar permanente. Não bloqueia navegação nem funcionalidades. Some quando status muda para `PRODUCAO_ATIVA`.
- **Token master nunca no frontend:** o registro na Focus NFe usa token master do Stoqio, que fica exclusivamente em variável de ambiente da Firebase Function.

---

## Arquitetura

### Novos arquivos

**`js/core/fiscalStatus.js`**
Enum de estados + funções puras. Sem UI, sem Firebase. Importado por `notas.js`, `dashboard.js` e `fiscal.js`.

```js
const FISCAL_STATUS = {
  NAO_CONFIGURADO:       'NAO_CONFIGURADO',
  BLOQUEADO_CPF:         'BLOQUEADO_CPF',
  SEM_CERTIFICADO:       'SEM_CERTIFICADO',
  ERRO_REGISTRO:         'ERRO_REGISTRO',
  CONFIGURADO:           'CONFIGURADO',
  CONFIGURADO_NAO_TESTADO: 'CONFIGURADO_NAO_TESTADO',
  CONFIGURADO_TESTADO:   'CONFIGURADO_TESTADO',
  PRODUCAO_ATIVA:        'PRODUCAO_ATIVA',
};

getFiscalStatus(company)   // lê company.fiscalStatus
canEmitNFe(company)        // true se CONFIGURADO* ou PRODUCAO_ATIVA
canEmitFatura(company)     // true SEMPRE
needsBanner(company)       // true se status !== PRODUCAO_ATIVA
getBannerMessage(company)  // objeto { icone, texto, cta, ctaLabel }
```

**`js/modules/fiscal.js`**
Wizard de configuração fiscal + aba "Fiscal" em Config + dashboard fiscal (para tenants já configurados).

```
renderFiscalTab()           → HTML da aba no Config
renderFiscalWizard()        → wizard passo a passo
renderFiscalDashboard()     → tela de status para tenants já configurados
uploadCertificate(pfx, pw)  → chama Function uploadCertificate
registerOnFocusNFe(dados)   → chama Function registerTenantOnFocusNFe
saveFiscalStep(data)        → persiste progresso no Firestore a cada etapa
runTestEmission()           → emite NF-e fictícia em homologação
```

**`functions/registerTenant.js`**
Firebase Function HTTPS callable. Usa token master (env var) para `POST /v2/empresas` na Focus NFe. Salva token do tenant no Firestore.

**`functions/uploadCertificate.js`**
Firebase Function HTTPS callable. Recebe .pfx em base64 + senha. Valida com `node-forge` (senha + CNPJ). Encripta com AES-256 (chave em env var). Salva no Firestore. Retorna `certExpiresAt`.

**`functions/checkCertExpiry.js`**
Firebase Function agendada (cron diário). Varre tenants com `certExpiresAt` nos próximos 30 dias. Envia notificação in-app. Certificado expirado → reverte status para `SEM_CERTIFICADO`.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `js/core/state.js` | Adicionar campos fiscais em `state.company` |
| `js/modules/config.js` | Substituir campo manual de token pela aba "Fiscal" (chama `fiscal.js`) |
| `js/modules/dashboard.js` | Adicionar banner de status fiscal |
| `js/modules/notas.js` | Substituir `if(window._focusToken)` por `canEmitNFe(state.company)` |
| `js/services/invoiceService.js` | Remover `window._focusToken`; receber token como parâmetro |
| `admin.html` | Campo para salvar token master Focus NFe em `/globalConfig` |
| `index.html` | Adicionar scripts de `fiscalStatus.js` e `fiscal.js` |
| `functions/index.js` | Exportar as 3 novas Functions |

---

## Modelo de dados (Firestore)

Campos novos em `state.company` (dentro de `/empresas/{companyId}`):

```js
fiscalStatus:   'NAO_CONFIGURADO',   // enum FISCAL_STATUS
focusNfeToken:  null,                 // string — token exclusivo do tenant
focusNfeEnv:    'homologacao',        // 'homologacao' | 'producao'
certExpiresAt:  null,                 // ISO date string
fiscalData: {
  cnpj:         '',
  razaoSocial:  '',
  nomeFantasia: '',
  regime:       '',   // '1' Simples | '2' Simples excesso | '3' Normal
  ie:           '',   // ou 'ISENTO'
  cep:          '',
  logradouro:   '',
  cidade:       '',
  uf:           '',
  lastError: {        // preenchido em caso de ERRO_REGISTRO
    codigo:   '',
    mensagem: '',
  }
}
```

---

## Wizard — 6 etapas

### Etapa 1 — Tipo de documento fiscal
- Pergunta: "Qual documento fiscal você emite?"
- Opções: **Fatura (CPF)** | **NF-e (CNPJ)**
- CPF → salva `BLOQUEADO_CPF`, encerra wizard com mensagem: *"Faturas disponíveis. Para emitir NF-e, obtenha um CNPJ (MEI ou LTDA)."*
- CNPJ → valida formato → avança

### Etapa 2 — Dados cadastrais
Campos: Razão Social, Nome Fantasia, Regime Tributário (select), IE ou "ISENTO", CEP (autocomplete via ViaCEP), Logradouro, Cidade, UF.
Ao avançar: salva `fiscalData` no Firestore via `saveFiscalStep()`.

### Etapa 3 — Certificado A1
- Upload de arquivo `.pfx` ou `.p12`
- Campo senha (mascarado)
- Ao submeter: chama Function `uploadCertificate`
  - Sucesso → exibe data de expiração, avança
  - Senha errada → "Senha incorreta para este certificado"
  - CNPJ diferente → "O certificado pertence ao CNPJ XX.XXX.XXX/XXXX-XX. Verifique."
  - Certificado expirado → "Certificado expirado em DD/MM/AAAA. Obtenha um novo."

### Etapa 4 — Ambiente de emissão
- **Homologação** (padrão, recomendado): NFs sem valor fiscal, ideal para testes
- **Produção**: confirmação extra — *"As NFs emitidas terão validade fiscal real."*
- Salva `focusNfeEnv`

### Etapa 5 — Registro na Focus NFe
- Chama Function `registerTenantOnFocusNFe` com dados da etapa 2
- Loading: "Registrando sua empresa na Focus NFe…"
- Sucesso → salva `focusNfeToken`, status → `CONFIGURADO`, avança
- Erro → status → `ERRO_REGISTRO`, exibe mensagem real da Focus NFe (`fiscalData.lastError.mensagem`), botão "Tentar novamente" (sem refazer wizard)

### Etapa 6 — Teste de emissão (homologação, opcional)
- Disponível apenas se `focusNfeEnv === 'homologacao'`
- Emite NF-e fictícia com dados do tenant (`runTestEmission()`)
- Autorizada → status → `CONFIGURADO_TESTADO` ✅
- Rejeitada → status → `CONFIGURADO_NAO_TESTADO`, exibe código de rejeição SEFAZ
- Botão "Pular" → status permanece `CONFIGURADO`

### Retomada do wizard
O wizard salva progresso a cada etapa via `saveFiscalStep()`. Se o tenant fechar o browser e retornar, o wizard retoma da última etapa concluída.

### Dashboard fiscal (tenant já configurado)
Quando `fiscalStatus` não é `NAO_CONFIGURADO` e o tenant acessa a aba Fiscal, exibe:
- Badge de status com cor
- Data de expiração do certificado
- Botão "Trocar certificado"
- Botão "Mudar para produção" (com confirmação) — se em homologação
- Botão "Re-testar emissão" — se em homologação

---

## Banner no Dashboard

Faixa informativa (~40px) no topo do Dashboard. **Não bloqueia navegação nem funcionalidades.** Não tem opção de fechar permanente. Some quando `fiscalStatus === 'PRODUCAO_ATIVA'`.

| Status | Ícone | Mensagem | CTA |
|---|---|---|---|
| `NAO_CONFIGURADO` | ⚙️ | "Configure o módulo fiscal para emitir NF-e." | "Configurar agora" |
| `BLOQUEADO_CPF` | ℹ️ | "Você usa CPF — faturas disponíveis. NF-e requer CNPJ." | "Saiba mais" |
| `SEM_CERTIFICADO` | ⚠️ | "Dados salvos. Faça upload do certificado A1 para emitir NF-e." | "Completar" |
| `ERRO_REGISTRO` | 🔴 | "Erro ao registrar na Focus NFe: [mensagem real]" | "Tentar novamente" |
| `CONFIGURADO` | ✅ | "Módulo fiscal configurado. Recomendamos testar em homologação." | "Testar agora" |
| `CONFIGURADO_NAO_TESTADO` | ⚠️ | "Teste de emissão falhou. Verifique os dados fiscais." | "Ver detalhes" |
| `CONFIGURADO_TESTADO` | ✅ | "Homologação testada. Pronto para produção quando quiser." | "Ativar produção" |

Todos os CTAs levam para Config > aba Fiscal.
Roles `visualizador` e `contador` veem o banner mas sem botão de ação.

---

## Fluxo de segurança

### Token master
- Nunca vai ao frontend
- Armazenado como env var da Firebase Function (`FOCUS_NFE_MASTER_TOKEN`)
- Editável pelo operador Stoqio em `admin.html` (salva em `/globalConfig`)
- A Function lê de `process.env.FOCUS_NFE_MASTER_TOKEN`

### Certificado A1
- O frontend envia o arquivo como base64 para a Function via HTTPS callable (conexão encriptada)
- A Function usa `node-forge` para validar (senha + CNPJ) e `AES-256` para encriptar
- A chave de encriptação fica em env var da Function — nunca no Firestore
- O certificado encriptado é salvo no Firestore do tenant
- O frontend nunca recebe o certificado de volta

### Migração do token global
- `window._focusToken` e `window._focusEnv` removidos do boot
- `invoiceService.js` recebe token como parâmetro (não lê de `window`)
- `notas.js` passa `state.company.focusNfeToken`
- Tenants com token manual em `/globalConfig`: ao abrir Config pela primeira vez, o sistema detecta e oferece migração guiada

---

## Tratamento de erros

| Situação | Comportamento |
|---|---|
| CNPJ inválido no wizard | Validação inline antes de avançar |
| Senha errada no certificado | Erro na etapa 3, sem sair do wizard |
| CNPJ do certificado ≠ cadastrado | Mensagem específica com o CNPJ do certificado |
| Certificado já expirado | Mensagem com data de expiração |
| Falha de rede no registro Focus NFe | Retry automático 1x → se falhar, salva `ERRO_REGISTRO` |
| Tenant muda CNPJ após configurado | Status volta para `NAO_CONFIGURADO`, wizard reinicia |
| Certificado expira no futuro | Cron diário notifica 30 dias antes; expirado → `SEM_CERTIFICADO` |

---

## Fora do escopo deste sprint

- Webhook da Focus NFe para status assíncrono de NF-e
- DANFE por email ao cliente final
- Carta de correção (CC-e)
- Relatórios fiscais / SPED

---

## Dependências técnicas

- Firebase Blaze ativo ✅ (confirmado)
- `node-forge` no package.json das Functions
- Env var `FOCUS_NFE_MASTER_TOKEN` configurada no Firebase
- ViaCEP API para autocomplete de CEP (pública, sem autenticação)

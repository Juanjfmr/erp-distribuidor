# Instruções para próxima sessão — Stoqio

**Data:** 2026-06-05
**Estado:** Módulo fiscal self-service implementado e em produção

---

## O que foi feito nesta sessão

### Infraestrutura fiscal (completo)
- `js/core/fiscalStatus.js` — enum central de estados fiscais + funções `canEmitNFe`, `canEmitFatura`, `needsBanner`, `getBannerConfig`
- `js/core/state.js` — campos fiscais adicionados ao `state.company` (`fiscalStatus`, `focusNfeToken`, `fiscalData`, etc.)
- `js/services/invoiceService.js` — lê token de `company.focusNfeToken` (fallback para `window._focusToken`)
- `js/modules/notas.js` — usa `canEmitNFe()` em vez de `window._focusToken`

### Firebase Functions (deployadas em Node 20)
- `functions/registerTenant.js` — registra tenant na Focus NFe, salva token por tenant
- `functions/uploadCertificate.js` — valida e armazena certificado A1 (AES-256, chave em `.env`)
- `functions/checkCertExpiry.js` — cron diário de validade de certificados
- Chave de encriptação: `25e6554cd1ba8c1ae5f191f6bcbb0708c0945a5bc5a0652af311806c1e171192` (salva em `functions/.env`, não commitado)

### UI (completo)
- `js/modules/fiscal.js` — wizard 6 etapas + dashboard fiscal (453 linhas)
- Aba "Fiscal" em Config → wizard completo
- Banner informativo no Dashboard
- `admin.html` — campo para salvar token master da Focus NFe

---

## Pendências imediatas (alta prioridade)

### 1. Token master Focus NFe — verificar conta
A etapa 5 do wizard (registro do tenant na Focus NFe) usa `POST /v2/empresas`. Nos testes desta sessão, esse endpoint retornou `empresa_nao_habilitada` para ambos os tokens testados.

**Ação:** verificar no [painel Focus NFe](https://app.focusnfe.com.br) se a conta tem permissão de integrador (cadastrar empresas). Se não, contatar suporte Focus NFe para ativar o plano de integrador.

Tokens testados:
- `QZoEAmad1J1MdrknitGC82bn0X3o9lND` — autentica GET, falha POST
- `dxhovAFG52uaocwrEwjlxq84aYQeBdg4` — token homologação da empresa principal

Quando o token master estiver correto: salvar em `https://erp-distribuidora-905ca.web.app/admin` na seção "Focus NFe — Token Master".

### 2. Resolver mpWebhook (Functions)
A function `mpWebhook` falhou no deploy com erro de permissão de Storage:
```
Access to bucket gcf-sources-... denied.
Must grant Storage Object Viewer to 1081428850259-compute@developer.gserviceaccount.com
```
Corrigir no IAM do Google Cloud Console.

### 3. Testar wizard completo no browser
- Acessar https://erp-distribuidora-905ca.web.app
- Config → aba Fiscal → percorrer as 6 etapas
- Verificar se banner aparece no Dashboard

---

## Próximos sprints (roadmap)

### Sprint seguinte — Ciclo financeiro B2B (Bloco 5)
Conforme identificado no gap analysis desta sessão:

1. **Integração Asaas** — gerar boleto/PIX ao faturar um pedido
2. **Webhook de confirmação** — baixa automática do título + baixa de estoque
3. **Bloqueio de cliente inadimplente** — hoje é só aviso, sem enforcement

### Sprint posterior — Polimento fiscal
1. Carta de correção (CC-e)
2. DANFE por email ao cliente final
3. Webhook da Focus NFe para atualização automática de status de NF-e

---

## Arquivos de referência
- **Spec fiscal:** `docs/superpowers/specs/2026-06-05-onboarding-fiscal-design.md`
- **Plano executado:** `docs/superpowers/plans/2026-06-05-onboarding-fiscal.md`
- **Roadmap geral:** `docs/superpowers/plans/PRIORIZACAO.md`
- **Gap analysis:** resultado está documentado nos commits desta sessão

## URLs de produção
- App: https://erp-distribuidora-905ca.web.app
- Admin: https://erp-distribuidora-905ca.web.app/admin
- Firebase Console: https://console.firebase.google.com/project/erp-distribuidora-905ca

# Design Doc — Painel Administrativo do SaaS
**Data:** 2026-05-30
**Status:** Aprovado — aguardando plano de implementação
**Contexto:** ERP Distribuidora — painel de gestão interno do operador do SaaS

---

## 1. Visão Geral

Painel administrativo exclusivo do operador do SaaS (Juan) para gerenciar tenants, acompanhar MRR, controlar afiliados e aprovar pagamentos de comissão. Acessa apenas metadados operacionais — nunca dados de negócio dos tenants (produtos, clientes, pedidos, financeiro).

**Arquivo:** `admin.html` — mesmo repositório, rota `/admin` no Firebase Hosting.
**Acesso:** Restrito ao email do operador (hardcoded no carregamento). Firebase Auth bloqueia qualquer outro email.

---

## 2. Arquitetura

```
admin.html
├── Firebase Auth (verificação de email do operador)
├── Firestore — leitura de:
│   ├── empresas/{companyId}     → metadados do tenant
│   └── users/{userId}           → dados de usuários/afiliados
├── Mercado Pago API
│   ├── Consulta status de assinaturas
│   ├── Histórico de pagamentos
│   └── Transferência de comissão para afiliados (via aprovação manual)
└── Firebase Functions (proxy MP para não expor credenciais no frontend)
```

**Regra de privacidade:** O painel NUNCA acessa:
- `empresas/{id}/products`
- `empresas/{id}/clients`
- `empresas/{id}/invoices`
- `empresas/{id}/transactions`
- Qualquer dado de negócio do tenant

Isso deve ser documentado na Política de Privacidade antes do lançamento.

---

## 3. Telas e Funcionalidades

### 3.1 Dashboard

**KPIs:**
- MRR total (soma dos planos ativos)
- Tenants ativos
- Tenants em trial + quantos expiram em 7 dias
- Inadimplentes + valor em risco
- Comissões devidas + número de afiliados pendentes

**Gráfico MRR:** Barras dos últimos 6 meses — calculado a partir dos pagamentos aprovados no MP.

**Alertas:**
- Trials expirando hoje e em 7 dias
- Inadimplentes (pagamento vencido há 5+ dias)
- Novos cadastros da semana

### 3.2 Tenants

**Tabela:** nome, email, plano, status (trial/ativo/inadimplente/bloqueado), MRR, data de cadastro, afiliado que indicou.

**Ações por tenant:**
- Detalhes → modal com dados completos + alterar plano
- Bloquear acesso → atualiza `status: 'bloqueado'` no Firestore
- Reativar → atualiza `status: 'ativo'`
- Ativar manualmente → define plano e ativa sem aguardar webhook MP

**Status automáticos via webhook MP:**
- Pagamento aprovado → `status: 'ativo'`
- Pagamento vencido 5 dias → `status: 'inadimplente'`
- Pagamento vencido 10 dias → `status: 'bloqueado'`

### 3.3 Afiliados

**KPIs:** comissões devidas, MRR via afiliados, afiliados ativos, pago este mês.

**Tabela:** nome, email, clientes indicados, MRR gerado, comissão devida (20%), total pago, status.

**Regras de comissão:**
- Só gerada após primeiro pagamento recebido do tenant indicado — trial não conta
- Calculada automaticamente: 20% do MRR mensal gerado pelos tenants do afiliado
- Acumula mensalmente enquanto o tenant permanecer ativo

**Fluxo de pagamento (Modelo B — semi-automático):**
1. Painel calcula comissão devida por afiliado
2. Operador clica "Aprovar" → modal de confirmação com valor e conta MP do afiliado
3. Sistema chama MP API → executa transferência Pix para conta do afiliado
4. Registro do pagamento no Firestore com data e valor

**Migração futura para Modelo C (automático):**
- Flag `autoPayAffiliates: true` nas configurações do admin
- Firebase Function executa todo dia 5 do mês sem aprovação manual

**Cadastro do afiliado:**
- Nome, email, conta Mercado Pago (email MP ou chave Pix)
- Geração automática de link personalizado: `erpdistribuidor.com.br/?ref=CODIGO`
- `CODIGO` salvo em `users/{id}.affiliateCode`

### 3.4 Pagamentos

**Tabela:** empresa, plano, valor, data, método (Pix/cartão/boleto), status MP.

**Fonte:** webhook Mercado Pago → Firebase Function → Firestore (`pagamentos/{id}`).

---

## 4. Integração Mercado Pago

### 4.1 Fluxo de assinatura

```
Cliente escolhe plano em "Minha Conta"
→ Frontend cria preferência de assinatura via Firebase Function (proxy)
→ Redirect para checkout MP
→ Cliente paga
→ MP dispara webhook POST /mp-webhook
→ Firebase Function valida assinatura do webhook
→ Atualiza empresas/{id}: { plan, status, lastPayment, nextDue }
→ Salva em pagamentos/{id}: { companyId, valor, data, metodo, statusMP }
→ Calcula comissão do afiliado se houver
```

### 4.2 Webhook de inadimplência

```
MP notifica pagamento vencido
→ Firebase Function verifica dias de atraso
→ 5 dias: status = 'inadimplente' (acesso mantido, banner de aviso no sistema)
→ 10 dias: status = 'bloqueado' (tela de bloqueio no ERP)
→ Pagamento recebido a qualquer momento: status = 'ativo', acesso restaurado
```

### 4.3 Transferência de comissão

```
Operador aprova comissão no painel
→ Frontend chama Firebase Function /pay-affiliate
→ Function autentica (só email do operador)
→ Chama MP API: POST /v1/payments (transferência para conta do afiliado)
→ Registra em afiliados/{id}.pagamentos: { valor, data, mpTransactionId }
→ Zera saldo devida do afiliado
```

---

## 5. Dados Acessados (apenas metadados)

| Coleção Firestore | Campos acessados |
|---|---|
| `empresas/{id}` | name, cnpj, plan, status, trialEndsAt, createdAt, lastAccess, affiliateCode |
| `users/{id}` | name, email, role, companyId, isExternal, affiliateCode, affiliateOf |
| `pagamentos/{id}` | companyId, valor, data, metodo, statusMP (nova coleção) |
| `afiliados/{id}` | name, email, mpAccount, code, comissaoDevida, pagamentos[] (nova coleção) |

**Nunca acessado:** products, clients, suppliers, invoices, orders, purchases, transactions, receivables, payables.

---

## 6. Termos de Uso e Privacidade

Antes do lançamento, documentar explicitamente:
- O operador acessa apenas metadados operacionais para fins de suporte e cobrança
- Dados de negócio do tenant são inacessíveis pelo operador
- Dados não são compartilhados com terceiros exceto MP (para processamento de pagamento)

---

## 7. Decisões Tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Arquivo | `admin.html` mesmo repositório | Zero infraestrutura extra, mesmo Firebase |
| Gateway | Mercado Pago | Melhor adoção no perfil do cliente (PME brasileira), Pix gratuito |
| Comissão | Modelo B semi-automático | Controle financeiro no início, migração para C no futuro |
| Comissão trial | Não gera comissão | Só após primeiro pagamento recebido |
| Dados acessados | Apenas metadados | Ética e privacidade — dados de negócio são do tenant |
| Credenciais MP | Via Firebase Function (proxy) | Não expor token MP no frontend |

---

## 8. Próximo Passo

Invocar skill `writing-plans` para criar o plano de implementação do painel admin.

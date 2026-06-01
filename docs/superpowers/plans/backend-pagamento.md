# Backend de Pagamento — Assinatura SaaS

**Prioridade:** 🟠 Alto  
**Status:** [ ] Pendente

## Problema

Hoje a assinatura é confirmada via WhatsApp manualmente. Não há automação de cobrança, renovação ou bloqueio por inadimplência.

## Solução

Integrar Mercado Pago (mais comum no Brasil) com webhook para atualizar o status do plano no Firestore automaticamente.

## Arquitetura

```
Cliente → Checkout Mercado Pago → Webhook → Cloud Function → Firestore /empresas/{id}/plano
```

Requer uma Cloud Function (Firebase Functions) para receber o webhook — primeiro backend do projeto.

## Tasks

- [ ] Criar projeto no Mercado Pago (sandbox)
- [ ] Criar `functions/index.js` com endpoint de webhook
- [ ] Webhook atualiza `plano.status`, `plano.vencimento`, `plano.tipo` no Firestore
- [ ] `minha-conta.js` lê `plano` do Firestore (hoje lê do `state`)
- [ ] Bloquear acesso por role quando `plano.status === 'inadimplente'`
- [ ] Testar fluxo completo em sandbox
- [ ] Deploy das Functions
- [ ] Commitar

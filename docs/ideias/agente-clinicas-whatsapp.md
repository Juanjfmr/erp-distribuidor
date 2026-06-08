# Agente de Atendimento para Clínicas via WhatsApp

**Data:** 2026-06-08
**Status:** Exploração de ideia

---

## Conceito

Chatbot/agente de atendimento completo para clínicas médicas, operando 24h no WhatsApp com IA (Claude API), cobrindo todo o ciclo do paciente.

---

## Arquitetura

```
WhatsApp ──► Evolution API / Z-API
                    │
                    ▼
              n8n (orquestrador)
             /        |         \
       Postgres    Claude API   Google Calendar
      (histórico)  (agente)    (agenda real)
```

Tudo self-hosted na VPS Oracle — custo fixo praticamente zero, só paga Claude por uso.

---

## Stack

| Componente | Ferramenta | Custo |
|---|---|---|
| Mensageria WhatsApp | Evolution API | Grátis (self-hosted) |
| Orquestrador | n8n | Grátis (self-hosted) |
| IA | Claude API | ~$0,003/mensagem |
| Banco de histórico | PostgreSQL | Grátis |
| Agenda | Google Calendar API | Grátis |

---

## Funcionalidades por etapa

### Agendamento
- Pergunta especialidade → médico → horários disponíveis
- Integra com Google Calendar (ou Clinicorp/iClinic via API)
- Confirma agendamento e envia lembrete 24h antes

### Triagem
- Antes da consulta, coleta: queixa principal, duração, medicamentos
- Gera resumo estruturado para o médico (email ou prontuário)

### FAQ
- Convênios, valores, endereço, estacionamento, horários
- Base de conhecimento: JSON ou Notion consultado pelo n8n

### Pós-consulta
- 24h depois: pergunta como foi, oferece retorno
- NPS simples (👍 / 👎)
- Lembrete de exames e retornos agendados

---

## Modelo de Negócio (para vender)

- **Setup:** R$ 1.500–3.000 por clínica
- **Mensalidade:** R$ 297–597/mês (manutenção + tokens Claude inclusos)
- **Diferencial:** atende fora do horário comercial, nunca perde lead

---

## Próximos passos para validar

- [ ] Montar fluxo n8n completo do agendamento (JSON exportável)
- [ ] Testar Evolution API na VPS Oracle
- [ ] Encontrar uma clínica para piloto gratuito
- [ ] Definir se vira SaaS ou projeto por cliente

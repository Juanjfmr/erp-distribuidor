# Stoqio Lab — isolamento obrigatório

Este ramo é para prototipação e correções exploratórias. NÃO publicar no ambiente de produção.

## Alvos e proibições
- Repositório: Juanjfmr/erp-distribuidor.
- Branch de trabalho: prototype/stoqio-lab-20261119.
- Produção (não tocar): main, hospedagem e projeto Firebase \`erp-distribuidora-905ca\`.
- Staging mencionado em .firebaserc: \`stoqio-v2-staging\` (existência, credenciais e regras não verificadas).
- Não executar \`firebase deploy\`, nem deploy de Firestore Rules, Auth, Functions ou Hosting.
- Não importar dados reais nem utilizar chaves de pagamento/NF-e no Lab.
- Antes de rodar app.html, fornecer uma configuração de Firebase independente e validada.
- As Functions HTTP do Lab só aceitam integrações externas com \`STOQIO_LAB_ALLOW_EXTERNAL=true\` E projeto distinto de produção; default é bloqueado.
- Webhook Asaas sem segredo configurado deve falhar fechado.

## Critério para publicação de preview
1. Projeto Firebase *separado* com regras testadas, ou modo completamente mockado/offline.
2. Nenhuma referência operacional a serviços financeiros, fiscais ou Firestore de produção.
3. Dados sintéticos, sem contas reais.
4. Smoke tests de perfis e isolamento entre empresas.
5. Deploy somente de preview sob comando explícito do usuário.

## Regras de dados
- \`companyId\` enviado pelo navegador não constitui autorização.
- \`role\` na interface não constitui autorização.
- Controles de escrita e escopo de tenant devem residir em regras do Firestore e Cloud Functions.
- Operações de pagamento, NF-e, webhooks e alteração de plano nunca podem depender apenas de validação no cliente.

## Plano incremental
- [x] Criar branch isolada
- [x] Atualizar CLAUDE.md para bloquear deploy
- [ ] Impedir conexão do cliente experimental ao Firebase de produção
- [ ] Autenticar e autorizar os proxies de pagamento/fiscal
- [ ] Endurecer regras do Firestore
- [ ] Eliminar concorrência/erros de persistência do estado
- [ ] Testes com emuladores e dados de demonstração
- [ ] Auditar outras Cloud Functions e regras antes de qualquer uso real

Qualquer regra antiga que recomende "publicar imediatamente" está substituída por este arquivo somente no contexto do Lab.

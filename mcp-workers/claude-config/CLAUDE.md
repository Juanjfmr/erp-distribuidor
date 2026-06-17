# Regras de Delegação — Workers MiniMax M3

## Quando delegar para os workers (sempre aplicar)

### summarize_file
Usar quando:
- Arquivo tem mais de 200 linhas e precisa ser lido para entender o contexto
- Preciso de um overview rápido antes de editar
- Quero entender dependências ou estrutura sem ler linha a linha

### execute_task
Usar quando:
- Geração de código repetitivo ou boilerplate
- Refatoração de um arquivo específico seguindo um padrão
- Geração de testes unitários
- Transformação de dados ou conversão de formato
- Documentação de funções ou módulos
- Qualquer tarefa que seguiria um template claro

### swarm_execute
Usar quando:
- A mesma operação precisa ser aplicada em múltiplos arquivos
- Preciso analisar ou transformar um lote de itens (ex: revisar 20 funções, documentar 15 endpoints)
- Qualquer tarefa que pode ser paralelizada sem dependência entre os itens

## Quando NÃO delegar
- Raciocínio arquitetural ou decisões de design
- Análise de trade-offs
- Revisão de segurança crítica
- Qualquer tarefa que exige julgamento sobre o projeto como um todo
- Tarefas com menos de 50 linhas de contexto simples

## Fluxo padrão para tarefas grandes
1. Usar `summarize_file` nos arquivos relevantes
2. Receber os resumos e gerar o spec/instruções
3. Quebrar a execução em subtarefas independentes
4. Usar `swarm_execute` para as subtarefas paralelas
5. Analisar os resultados e consolidar

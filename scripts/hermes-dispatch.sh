#!/usr/bin/env bash
# hermes-dispatch.sh — entrega uma tarefa de IMPLEMENTAÇÃO ao Hermes (DeepSeek V4 Pro),
# injetando contexto da memória GBrain. Opus planeja; Hermes implementa.
#
# Uso:  bash scripts/hermes-dispatch.sh "descrição da tarefa de implementação"
#
# Pré-requisitos (já configurados nesta máquina):
#   - Hermes rodando DeepSeek V4 Pro (config.yaml model.default=deepseek-v4-pro)
#   - GBrain instalado com brain local (gbrain search)
#   - hermes -z = one-shot, aprovações auto-bypassed (edita arquivos sem prompt)

set -uo pipefail

TASK="$*"
if [ -z "$TASK" ]; then
  echo "uso: bash scripts/hermes-dispatch.sh \"<descrição da tarefa>\"" >&2
  exit 1
fi

export PATH="/c/Users/juana/.bun/bin:/c/Users/juana/AppData/Roaming/npm/node_modules/bun/bin:$PATH"
HERMES="/c/Users/juana/AppData/Local/hermes/hermes-agent/venv/Scripts/hermes.exe"
STOQIO="/c/Users/juana/Claudecode/stoqio"

# 1) Contexto relevante da memória GBrain (busca semântica)
CTX=$(gbrain search "$TASK" 2>/dev/null | head -50)
[ -z "$CTX" ] && CTX="(sem contexto do GBrain — brain vazio ou indisponível)"

# 2) Monta o prompt do implementador
read -r -d '' PROMPT <<EOF || true
Você é o implementador DeepSeek do projeto Stoqio. Trabalhe no diretório atual ($STOQIO).

== TAREFA ==
$TASK

== CONTEXTO DA MEMÓRIA (GBrain) ==
$CTX

== REGRAS ==
- Leia os arquivos relevantes ANTES de editar.
- Faça a MENOR mudança que resolve a tarefa (cirúrgico, sem refatorar o que não foi pedido).
- Siga o estilo existente do código (JS puro, sem framework; pt-BR nas strings de UI).
- Rode os testes se existirem (npm test) e reporte o resultado.
- Ao terminar, RESUMA: arquivos alterados + por quê, em até 8 linhas.
EOF

# 3) Dispara o Hermes na pasta do projeto (one-shot, edita sem prompt)
cd "$STOQIO" || exit 1
echo "=== HERMES (DeepSeek V4 Pro) implementando ===" >&2
"$HERMES" -z "$PROMPT"

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

# 1) Contexto relevante: busca direta no vault Obsidian (fonte de verdade).
#    Substitui o GBrain (busca semântica que travava) por grep determinístico.
VAULT="/c/Users/juana/OneDrive/Documentos/Obsidian Vault"
TERMS=$(echo "$TASK" | tr 'A-Z' 'a-z' | grep -oE '[a-zà-ú]{5,}' | sort -u | head -8 | paste -sd'|' -)
CTX=""
if [ -n "$TERMS" ] && [ -d "$VAULT" ]; then
  CTX=$(grep -rilE "$TERMS" "$VAULT" --include='*.md' 2>/dev/null | grep -v '/\.obsidian/' | head -5 | while read -r f; do
    echo "### ${f#$VAULT/}"
    grep -iE "$TERMS" "$f" 2>/dev/null | head -8
    echo
  done)
fi
[ -z "$CTX" ] && CTX="(sem contexto relevante no vault)"

# 2) Monta o prompt do implementador
read -r -d '' PROMPT <<EOF || true
Você é o implementador DeepSeek do projeto Stoqio. Trabalhe no diretório atual ($STOQIO).

== TAREFA ==
$TASK

== CONTEXTO DO VAULT (Obsidian — fonte de verdade) ==
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

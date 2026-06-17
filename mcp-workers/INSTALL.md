# Instalação — MCP Workers MiniMax M3

Este guia configura um servidor MCP local no Windows que conecta o Claude Code
ao MiniMax M3 como camada de workers. O Claude Opus orquestra; o M3 executa.

---

## Pré-requisitos

### 1. Node.js (v20 ou superior)

1. Acesse https://nodejs.org e baixe a versão **LTS**
2. Execute o instalador com as opções padrão
3. Abra o **Prompt de Comando** e confirme:
   ```
   node --version
   npm --version
   ```

### 2. Chave da API MiniMax

1. Acesse https://platform.minimax.io
2. Crie uma conta ou faça login
3. Navegue até **API Keys** e gere uma nova chave
4. Guarde a chave — você vai precisar dela no passo 3

> **Opcional:** Se quiser fallback para DeepSeek, gere também uma chave em https://platform.deepseek.com

---

## Instalação

### Passo 1 — Baixar os arquivos

Abra o **PowerShell** e execute:

```powershell
# Criar pasta de destino
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\mcp-workers"

# Clonar apenas a pasta mcp-workers do repositório
cd "$env:USERPROFILE"
git clone --no-checkout https://github.com/juanjfmr/erp-distribuidor.git _tmp_mcp
cd _tmp_mcp
git checkout claude/deepseek-minimax-api-wasyq0 -- mcp-workers
Copy-Item -Recurse -Force mcp-workers\* "$env:USERPROFILE\mcp-workers\"
cd ..
Remove-Item -Recurse -Force _tmp_mcp
```

### Passo 2 — Instalar dependências

```powershell
cd "$env:USERPROFILE\mcp-workers"
npm install
```

### Passo 3 — Configurar variáveis de ambiente

```powershell
# Copiar o arquivo de exemplo
Copy-Item .env.example .env

# Abrir no Bloco de Notas para editar
notepad .env
```

No arquivo `.env`, preencha:

```env
MINIMAX_API_KEY=sua_chave_minimax_aqui
MINIMAX_MODEL=MiniMax-M3
MINIMAX_BASE_URL=https://api.minimax.io/v1
MAX_RPM=190
MAX_CONCURRENT=40
```

> **Importante:** Verifique o nome exato do modelo no seu dashboard MiniMax.
> Nomes comuns: `MiniMax-M3`, `minimax-m3`. Se a API retornar erro de modelo
> não encontrado, ajuste esta variável.

Salve e feche o Bloco de Notas.

### Passo 4 — Testar o servidor

```powershell
cd "$env:USERPROFILE\mcp-workers"
node index.js
```

Se aparecer a mensagem `minimax-workers MCP server running`, está funcionando.
Pressione `Ctrl+C` para parar — o Claude Code vai iniciar o servidor automaticamente.

---

## Configurar o Claude Code

### Passo 5 — Registrar o MCP server (global)

Abra o arquivo de configuração global do Claude Code:

```powershell
notepad "$env:USERPROFILE\.claude\settings.json"
```

Se o arquivo não existir, crie-o. Adicione (ou mescle) o bloco `mcpServers`:

```json
{
  "mcpServers": {
    "minimax-workers": {
      "command": "node",
      "args": ["C:\\Users\\SEU_USUARIO\\mcp-workers\\index.js"],
      "env": {
        "MINIMAX_API_KEY": "sua_chave_minimax_aqui",
        "MINIMAX_MODEL": "MiniMax-M3",
        "MINIMAX_BASE_URL": "https://api.minimax.io/v1",
        "MAX_RPM": "190",
        "MAX_CONCURRENT": "40"
      }
    }
  }
}
```

> **Atenção:** Substitua `SEU_USUARIO` pelo seu nome de usuário Windows
> (ex: `C:\\Users\\Juan\\mcp-workers\\index.js`)

Se o arquivo `settings.json` já tiver conteúdo, adicione apenas o bloco
`"minimax-workers"` dentro de `"mcpServers"` sem sobrescrever o restante.

### Passo 6 — Adicionar instruções de comportamento (global)

Abra (ou crie) o arquivo de instruções globais:

```powershell
notepad "$env:USERPROFILE\.claude\CLAUDE.md"
```

Copie e cole o conteúdo do arquivo `claude-config/CLAUDE.md` deste repositório.

Se o arquivo já existir com conteúdo, adicione as regras de delegação
no final sem remover o que já está lá.

---

## Verificação final

1. Feche e reabra o Claude Code
2. Em qualquer sessão, execute:
   ```
   /mcp
   ```
   Você deve ver `minimax-workers` listado com as tools:
   - `summarize_file`
   - `execute_task`
   - `swarm_execute`

3. Teste rápido — peça ao Claude:
   ```
   Use execute_task para gerar uma função JavaScript que soma dois arrays
   ```
   O Claude deve chamar a tool e retornar o resultado do worker M3.

---

## Estrutura instalada

```
%USERPROFILE%\
├── .claude/
│   ├── settings.json    ← MCP server registrado aqui
│   └── CLAUDE.md        ← Regras de delegação globais
└── mcp-workers/
    ├── index.js         ← Servidor MCP principal
    ├── package.json
    ├── .env             ← Suas chaves de API (não commitar)
    └── src/
        ├── workers.js   ← Pool de workers + rate limiter
        ├── cache.js     ← Cache de resultados (TTL 1h)
        └── router.js    ← Classificador de complexidade de tarefas
```

---

## Resolução de problemas

**`minimax-workers` não aparece no `/mcp`**
- Confirme que o caminho no `settings.json` usa barras duplas (`\\`)
- Confirme que o Node.js está no PATH: `node --version` no PowerShell
- Reinicie o Claude Code completamente

**Erro `model not found` ou `invalid model`**
- Acesse seu dashboard MiniMax e verifique o nome exato do modelo disponível
- Atualize `MINIMAX_MODEL` no `.env` e no `settings.json`

**Rate limit atingido**
- Reduza `MAX_CONCURRENT` para 20 ou `MAX_RPM` para 100 no `.env` e no `settings.json`

**Fallback para DeepSeek**
- Adicione `DEEPSEEK_API_KEY=sua_chave` no `.env` e no bloco `env` do `settings.json`
- O servidor usa DeepSeek automaticamente quando MiniMax falha

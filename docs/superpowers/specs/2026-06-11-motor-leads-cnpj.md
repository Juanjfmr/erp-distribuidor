# Spec — Motor de Leads CNPJ (distribuidoras)

> **Para o executor (DeepSeek):** este documento é autossuficiente. Implemente exatamente o que está aqui — nada além. Em caso de ambiguidade, siga a decisão escrita na seção correspondente; não invente features.
>
> **PASSO OBRIGATÓRIO ANTES DO INGEST:** o layout de colunas documentado na seção 3 é o padrão da base da Receita, mas pode mudar entre publicações mensais. Implemente e rode `validate.py` (seção 4.0) ANTES de rodar o ingest. Se a validação falhar, PARE e reporte a divergência — não tente adivinhar índices.

## 1. Objetivo

Pipeline local (Windows, Python) que baixa a base de dados abertos do CNPJ da Receita Federal, filtra **distribuidoras pequenas e ativas** (CNAE divisão 46), atribui um score de prioridade e exporta uma fila de leads em CSV para prospecção comercial do ERP Stoqio.

Saída final: arquivo `leads.csv` ordenado por score (maior primeiro) + banco `leads.db` (SQLite) para consultas.

## 2. Stack e estrutura de arquivos

- **Python 3.11+**, dependência externa única: `requests`. Todo o resto é stdlib (`sqlite3`, `csv`, `zipfile`, `argparse`, `logging`).
- Sem framework, sem ORM, sem pandas (os arquivos não cabem em memória).
- Estrutura a criar (raiz do projeto = pasta onde os scripts rodam, **não** é o repositório do Stoqio):

```
motor-leads/
├── config.py          # constantes configuráveis (UFs alvo, CNAEs, pesos do score)
├── download.py        # etapa 1 — baixa os ZIPs da Receita
├── validate.py        # etapa 1.5 — valida o layout das colunas (OBRIGATÓRIO antes do ingest)
├── ingest.py          # etapa 2 — lê os ZIPs em streaming, filtra e grava no SQLite
├── score.py           # etapa 3 — calcula score e grava na tabela
├── export.py          # etapa 4 — gera leads.csv
├── data/              # ZIPs baixados (criar se não existir)
└── output/            # leads.db e leads.csv (criar se não existir)
```

Cada script roda independente via CLI: `python download.py`, `python ingest.py`, etc. Sem orquestrador.

## 3. Fonte de dados

Base oficial de dados abertos do CNPJ:

```
https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/
```

A base é organizada em pastas mensais (ex.: `2026-05/`). O script de download deve:

1. Listar o índice HTML da URL base e identificar a pasta mensal mais recente (padrão `AAAA-MM/`).
2. Baixar os arquivos:
   - `Estabelecimentos0.zip` … `Estabelecimentos9.zip` (10 partes, várias centenas de MB cada)
   - `Empresas0.zip` … `Empresas9.zip`
   - `Simples.zip`
   - `Municipios.zip`
   - `Cnaes.zip`
3. **Não baixar** `Socios*.zip` nem demais tabelas — fora de escopo.
4. Download com retomada: se o arquivo já existe em `data/` com o tamanho esperado (header `Content-Length`), pular. Usar streaming (`requests.get(stream=True)`, chunks de 1 MB) e gravar em `.part` renomeando ao concluir.
5. Logar progresso a cada arquivo (nome, tamanho, tempo).

> Aviso operacional (colocar no README do script): download total ~6–8 GB; reservar ~25 GB de disco livre.

### 3.1 Formato dos CSVs internos

Todos os ZIPs contêm um único CSV com estas características — **respeitar rigorosamente**:

- Separador: `;`
- Encoding: **ISO-8859-1** (latin-1), nunca UTF-8
- **Sem linha de cabeçalho**
- Campos entre aspas duplas
- Datas no formato `AAAAMMDD` (campo vazio ou `0` = sem data)

### 3.2 Layout — Estabelecimentos (colunas por índice, 0-based)

| Índice | Campo |
|---|---|
| 0 | cnpj_basico (8 dígitos) |
| 1 | cnpj_ordem (4 dígitos) |
| 2 | cnpj_dv (2 dígitos) |
| 3 | identificador matriz/filial (`1`=matriz, `2`=filial) |
| 4 | nome_fantasia |
| 5 | situacao_cadastral (`02`=ativa) |
| 6 | data_situacao_cadastral |
| 10 | data_inicio_atividade |
| 11 | cnae_fiscal_principal (7 dígitos, sem máscara) |
| 12 | cnae_fiscal_secundaria (lista separada por vírgula, pode ser vazia) |
| 13–17 | tipo_logradouro, logradouro, numero, complemento, bairro |
| 18 | cep |
| 19 | uf |
| 20 | municipio (código TOM — resolver nome via tabela Municipios) |
| 21 | ddd_1 |
| 22 | telefone_1 |
| 23 | ddd_2 |
| 24 | telefone_2 |
| 27 | correio_eletronico |

(Colunas não listadas existem mas devem ser ignoradas.)

### 3.3 Layout — Empresas

| Índice | Campo |
|---|---|
| 0 | cnpj_basico |
| 1 | razao_social |
| 4 | capital_social (decimal com vírgula, ex.: `100000,00`) |
| 5 | porte (`01`=não informado, `03`=ME, `05`=EPP) |

### 3.4 Layout — Simples

| Índice | Campo |
|---|---|
| 0 | cnpj_basico |
| 1 | opcao_pelo_simples (`S`/`N`/vazio) |

### 3.5 Layouts — Municipios e Cnaes

Ambos: índice 0 = código, índice 1 = descrição.

## 4.0 Validação de layout (validate.py) — rodar ANTES do ingest

O layout da seção 3 pode mudar entre publicações mensais da Receita. `validate.py` confere se os índices documentados ainda valem. **O ingest não deve ser executado se a validação falhar.**

Comportamento:

1. Abrir o primeiro ZIP de cada tipo (`Estabelecimentos0.zip`, `Empresas0.zip`, `Simples.zip`, `Municipios.zip`, `Cnaes.zip`) e imprimir no console as **3 primeiras linhas** de cada um, com os campos numerados por índice (`[0]=... [1]=... [2]=...`), para inspeção visual.
2. Rodar checagens automáticas sobre as 1.000 primeiras linhas de cada arquivo:

| Arquivo | Checagem |
|---|---|
| Estabelecimentos | índice 0 tem 8 dígitos numéricos; índice 1 tem 4 dígitos; índice 2 tem 2 dígitos; índice 3 é `1` ou `2`; índice 5 tem 2 dígitos; índice 11 tem 7 dígitos numéricos; índice 19 é UF válida (2 letras maiúsculas) ou vazio; índice 27 contém `@` ou é vazio (aceitar se ≥95% das linhas não-vazias passam) |
| Empresas | índice 0 tem 8 dígitos; índice 4 casa com padrão decimal `^\d+,\d{2}$` ou vazio; índice 5 é `01`, `03` ou `05` ou vazio |
| Simples | índice 0 tem 8 dígitos; índice 1 é `S`, `N` ou vazio |
| Municipios | índice 0 é numérico; índice 1 é texto não-vazio |
| Cnaes | índice 0 tem 7 dígitos; índice 1 é texto não-vazio |

3. Tolerância: cada checagem passa se ≥ 95% das linhas amostradas conferem (a base tem sujeira pontual).
4. Saída: relatório no console e em `output/validate_report.txt` com `PASS`/`FAIL` por checagem. Qualquer `FAIL` → encerrar com exit code 1 e mensagem clara apontando qual índice divergiu e exemplos das linhas que falharam.
5. `ingest.py` deve verificar na inicialização se `output/validate_report.txt` existe e contém `RESULTADO: PASS`; caso contrário, abortar com a mensagem: `Execute validate.py antes do ingest.`

## 4. Regras de filtro (ingest.py)

Um estabelecimento entra no banco **somente se todas** as condições valem:

1. `situacao_cadastral == "02"` (ativa)
2. CNAE principal começa com `46` **ou** (se `config.INCLUIR_CNAE_SECUNDARIO = True`, default `False`) algum CNAE secundário começa com `46`
3. `uf` pertence a `config.UFS_ALVO` (default: `["GO", "DF", "MT", "MS", "MG", "SP", "TO"]` — lista configurável; lista vazia = Brasil inteiro)
4. É matriz (`identificador == "1"`) — filiais ficam fora

Exclusões adicionais por CNAE principal (não são alvo do Stoqio — atacado de matéria-prima agrícola a granel e afins): prefixos em `config.CNAES_EXCLUIDOS`, default `["4611", "4612", "4621", "4622", "4623"]`.

### 4.1 Processamento

- Ler os ZIPs **sem extrair** (`zipfile.ZipFile` + `io.TextIOWrapper(..., encoding="latin-1")`), linha a linha via `csv.reader`.
- **Passo 1:** processar os 10 `Estabelecimentos*.zip` aplicando o filtro acima; inserir em lotes de 5.000 (`executemany`) na tabela `leads`.
- **Passo 2:** processar `Empresas*.zip` e atualizar (`UPDATE ... WHERE cnpj_basico = ?`) apenas os cnpj_basico já presentes em `leads`. Para eficiência, carregar antes o conjunto de `cnpj_basico` existentes em um `set` em memória (esperado < 500 mil itens — cabe).
- **Passo 3:** mesmo padrão para `Simples.zip`.
- **Passo 4:** resolver nomes de município e descrição de CNAE pelas tabelas auxiliares (carregar ambas em dict — são pequenas).
- Idempotência: `ingest.py` começa com `DROP TABLE IF EXISTS leads` e recria. Rodar duas vezes não duplica.
- Logar a cada 1 milhão de linhas lidas: total lido, total aceito.

## 5. Esquema SQLite (output/leads.db)

```sql
CREATE TABLE leads (
  cnpj            TEXT PRIMARY KEY,   -- 14 dígitos concatenados
  cnpj_basico     TEXT NOT NULL,
  razao_social    TEXT,
  nome_fantasia   TEXT,
  cnae_principal  TEXT,
  cnae_descricao  TEXT,
  data_abertura   TEXT,               -- AAAA-MM-DD
  uf              TEXT,
  municipio       TEXT,               -- nome resolvido
  bairro          TEXT,
  cep             TEXT,
  telefone1       TEXT,               -- DDD+numero, só dígitos
  telefone2       TEXT,
  email           TEXT,               -- lowercase, trim
  porte           TEXT,               -- 'ME' | 'EPP' | 'OUTRO'
  capital_social  REAL,
  optante_simples INTEGER,            -- 0/1
  score           INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_leads_score ON leads(score DESC);
CREATE INDEX idx_leads_uf ON leads(uf);
```

## 6. Score (score.py)

Score = soma dos pontos abaixo (0–100, truncar em 100). Pesos em `config.PESOS` (dict), defaults:

| Critério | Pontos |
|---|---|
| Tem e-mail preenchido | +20 |
| E-mail de domínio próprio (não gmail/hotmail/outlook/yahoo/bol/uol/terra) | +10 |
| Tem ao menos um telefone | +10 |
| Porte ME ou EPP | +20 |
| Optante do Simples | +10 |
| Idade da empresa entre 2 e 15 anos (calcular a partir de data_abertura vs data atual) | +15 |
| Capital social entre R$ 30.000 e R$ 5.000.000 | +10 |
| Tem nome_fantasia preenchido | +5 |

`score.py` roda um `UPDATE` em massa (pode ser em Python, lote a lote) e imprime ao final a distribuição: contagem por faixa (0–24, 25–49, 50–74, 75–100).

## 7. Export (export.py)

Gera `output/leads.csv`:

- Encoding **UTF-8 com BOM** (abre certo no Excel BR), separador `;`
- Colunas, nesta ordem: `score, razao_social, nome_fantasia, cnae_descricao, municipio, uf, telefone1, email, porte, optante_simples, data_abertura, cnpj`
- Ordenado por `score DESC, uf, municipio`
- Flags CLI: `--min-score N` (default 40), `--uf XX` (opcional, repetível), `--limit N` (default sem limite)

## 8. config.py — conteúdo completo

```python
UFS_ALVO = ["GO", "DF", "MT", "MS", "MG", "SP", "TO"]  # vazio = Brasil inteiro
INCLUIR_CNAE_SECUNDARIO = False
CNAES_EXCLUIDOS = ["4611", "4612", "4621", "4622", "4623"]
EMAIL_GENERICO = ["gmail.", "hotmail.", "outlook.", "yahoo.", "bol.", "uol.", "terra."]
PESOS = {
    "tem_email": 20, "email_dominio_proprio": 10, "tem_telefone": 10,
    "porte_me_epp": 20, "simples": 10, "idade_2_15": 15,
    "capital_30k_5m": 10, "tem_fantasia": 5,
}
DATA_DIR = "data"
OUTPUT_DIR = "output"
URL_BASE = "https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/"
```

## 9. Requisitos não-funcionais

- **Memória:** nunca carregar um CSV inteiro; streaming sempre. Pico aceitável: ~1 GB (set de cnpj_basico + dicts auxiliares).
- **Robustez:** linha malformada (menos colunas que o esperado, encoding quebrado) → logar em `output/erros.log` com o nome do arquivo e número da linha, e continuar. Jamais abortar o ingest por linha ruim.
- **Windows:** caminhos via `pathlib`; nada de comandos shell.
- **Logs:** módulo `logging`, nível INFO, formato `%(asctime)s %(levelname)s %(message)s`, simultâneo em console e `output/pipeline.log`.

## 10. Critérios de aceitação

1. `python download.py` baixa todos os arquivos da pasta mensal mais recente em `data/`; rodar de novo não rebaixa nada (mensagem "já existe, pulando").
2. `python validate.py` imprime as 3 primeiras linhas de cada arquivo com campos numerados, gera `output/validate_report.txt` com PASS/FAIL por checagem e retorna exit code 0 só se tudo passou. `python ingest.py` sem validação prévia aborta com a mensagem `Execute validate.py antes do ingest.`
3. `python ingest.py` termina sem exceção e imprime: total de linhas lidas, total de leads aceitos, leads com e-mail, leads com telefone.
4. Sanidade do resultado: `SELECT COUNT(*) FROM leads` retorna entre 10.000 e 500.000 (fora dessa faixa = filtro provavelmente errado — investigar antes de entregar); todos os registros têm `cnae_principal` iniciando com `46`; nenhum tem `situacao != ativa` (campo não é gravado, mas o filtro garante).
5. `python score.py` preenche score em 100% das linhas e imprime a distribuição por faixa.
6. `python export.py --min-score 50 --uf GO` gera CSV que abre corretamente no Excel (acentos íntegros) contendo só leads de GO com score ≥ 50.
7. Rodar a sequência completa do zero (apagando `output/`) reproduz o mesmo resultado.

## 11. Fora de escopo (NÃO implementar)

- Envio de e-mail, WhatsApp ou qualquer outreach
- Enriquecimento via web (verificar site, redes sociais) — fase 2, spec futuro
- Interface gráfica ou web
- Agendamento/cron
- Qualquer integração com o código do Stoqio

## 12. Nota de conformidade (para o operador, não para o código)

Dados são públicos (Lei de Acesso à Informação / dados abertos da RFB). O uso para prospecção B2B com contato corporativo se apoia em legítimo interesse (LGPD art. 7º, IX) — toda comunicação enviada deve ter identificação do remetente e opt-out. Não usar os telefones para disparo frio em massa via WhatsApp.

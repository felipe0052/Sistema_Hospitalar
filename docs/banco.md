# Documentação do Banco de Dados — Intranet Hospitalar Decós (MVP)

Banco de dados relacional em **Oracle Database 23ai Free** (`FREEPDB1`, schema `DECOS`).

---

## 1. Diagrama Entidade-Relacionamento (ER)

```mermaid
erDiagram
  SETORES ||--o{ RAMAIS : possui
  SETORES ||--o{ USUARIOS : lota
  SETORES ||--o{ EVENTOS : organiza
  USUARIOS ||--o{ AVISOS : publica
  USUARIOS ||--o{ EVENTOS : cadastra
  USUARIOS ||--o{ DOCUMENTOS : envia
  USUARIOS ||--o{ FAQS : cadastra
  USUARIOS ||--o{ HISTORICO_ACESSO : "alvo/admin"

  SETORES {
    NUMBER ID_SETOR PK
    VARCHAR2 NOME UK
    VARCHAR2 ANDAR
    TIMESTAMP DATA_CRIACAO
  }

  RAMAIS {
    NUMBER ID_RAMAL PK
    VARCHAR2 NUMERO UK
    VARCHAR2 DESCRICAO
    NUMBER ID_SETOR FK
  }

  USUARIOS {
    NUMBER ID_USUARIO PK
    VARCHAR2 NOME
    VARCHAR2 EMAIL UK
    VARCHAR2 SENHA_HASH
    NUMBER ID_SETOR FK
    VARCHAR2 CARGO
    DATE DATA_NASCIMENTO
    VARCHAR2 PERFIL
    VARCHAR2 STATUS
    NUMBER VERSAO_TOKEN
    TIMESTAMP DATA_CRIACAO
    TIMESTAMP DATA_ATUALIZACAO
  }

  HISTORICO_ACESSO {
    NUMBER ID_HISTORICO PK
    NUMBER ID_USUARIO FK
    NUMBER ID_ADMIN FK
    VARCHAR2 CAMPO
    VARCHAR2 VALOR_ANTERIOR
    VARCHAR2 VALOR_NOVO
    TIMESTAMP DATA_HORA
  }

  AVISOS {
    NUMBER ID_AVISO PK
    VARCHAR2 TITULO
    CLOB CONTEUDO
    VARCHAR2 CATEGORIA
    CHAR DESTAQUE
    TIMESTAMP DATA_PUBLICACAO
    DATE DATA_EXPIRACAO
    TIMESTAMP DATA_ATUALIZACAO
    NUMBER ID_AUTOR FK
  }

  EVENTOS {
    NUMBER ID_EVENTO PK
    VARCHAR2 TITULO
    CLOB DESCRICAO
    VARCHAR2 CATEGORIA
    TIMESTAMP DATA_INICIO
    TIMESTAMP DATA_FIM
    VARCHAR2 LOCAL
    NUMBER ID_SETOR FK
    NUMBER ID_AUTOR FK
    TIMESTAMP DATA_CRIACAO
  }

  DOCUMENTOS {
    NUMBER ID_DOC PK
    VARCHAR2 TITULO
    VARCHAR2 TIPO
    VARCHAR2 CATEGORIA
    VARCHAR2 DESCRICAO
    VARCHAR2 PALAVRAS_CHAVE
    VARCHAR2 URL_ARQUIVO
    VARCHAR2 NOME_ARQUIVO
    VARCHAR2 MIME_TYPE
    NUMBER TAMANHO_BYTES
    NUMBER ID_AUTOR FK
    TIMESTAMP DATA_UPLOAD
    TIMESTAMP DATA_ATUALIZACAO
  }

  FAQS {
    NUMBER ID_FAQ PK
    VARCHAR2 PERGUNTA
    CLOB RESPOSTA
    VARCHAR2 CATEGORIA
    NUMBER ORDEM
    NUMBER ID_AUTOR FK
    TIMESTAMP DATA_CRIACAO
    TIMESTAMP DATA_ATUALIZACAO
  }
```

---

## 2. Resumo das Tabelas e Views

| Objeto | Tipo | Descrição |
|---|---|---|
| `SETORES` | Tabela | Armazena os setores hospitalares (ex.: UTI, Pronto-Socorro, Farmácia) e o respectivo andar de localização. |
| `RAMAIS` | Tabela | Armazena um ou mais ramais telefônicos vinculados a cada setor, garantindo unicidade numérica entre setores (UC08). |
| `USUARIOS` | Tabela | Cadastro de colaboradores e credenciais com controle de perfil (`ADMIN`, `COLABORADOR`, `RH`, `MARKETING`), status (`ATIVO`/`INATIVO`) e versão de token para invalidação imediata de sessão (UC01, UC02, UC03). |
| `HISTORICO_ACESSO` | Tabela | Trilha de auditoria que registra toda alteração de `PERFIL` ou `STATUS` de um usuário, com data/hora e administrador responsável (UC03). |
| `AVISOS` | Tabela | Mural de comunicados, notícias, promoções e mudanças de setor, com suporte a destaque no topo e data de expiração (UC04, UC05). |
| `EVENTOS` | Tabela | Agenda de treinamentos, ações internas e eventos institucionais com data/hora de início e fim, local e setor organizador (UC12). |
| `DOCUMENTOS` | Tabela | Metadados e referência de armazenamento dos Procedimentos Operacionais Padrão (`POP`) e documentos institucionais (`DOCUMENTO`) em PDF/DOCX (UC06, UC07). |
| `FAQS` | Tabela | Perguntas e respostas frequentes organizadas por categoria e ordem de exibição (UC09). |
| `VW_DIRETORIO` | View | Visão consolidada de colaboradores ativos com setor, andar e ramais concatenados via `LISTAGG` para consulta rápida no diretório (UC10). |

---

## 3. Consultas de Verificação

Após subir o banco com `docker compose up -d`:

```sql
-- 1. Consultar o diretório de colaboradores ativos com setor e ramais
SELECT * FROM VW_DIRETORIO;

-- 2. Consultar apenas avisos vigentes (sem data de expiração ou não expirados)
SELECT * FROM AVISOS WHERE DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= TRUNC(SYSDATE);
```

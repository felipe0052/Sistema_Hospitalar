# Consultas Analíticas e Operacionais — Intranet Hospitalar Decós (Semana 2)

> Documentação técnica das queries otimizadas da **Semana 2 (S2-T4)** para **Oracle Database 23ai Free** (`FREEPDB1`, schema `DECOS`), incluindo exemplos de parâmetros de bind, planos de execução (`EXPLAIN PLAN`) e diretrizes para tipos `CLOB`, `TIMESTAMP` e fuso horário `America/Sao_Paulo`.

---

## 1. Configuração de Sessão Oracle (Obrigatória por Conexão)

Todas as conexões abertas pelo pool do SQLAlchemy em `app/core/database.py` executam automaticamente:

```sql
ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=BINARY_AI;
ALTER SESSION SET TIME_ZONE='America/Sao_Paulo';
```

- **`NLS_COMP=LINGUISTIC` + `NLS_SORT=BINARY_AI`:** garante que operadores `=` e `LIKE '%termo%'` ignorem diferenças de caixa (maiúsculas/minúsculas) e acentuação sem necessidade de chamadas manuais a `UPPER(TRANSLATE(...))`.
- **`TIME_ZONE='America/Sao_Paulo'`:** alinha `CURRENT_TIMESTAMP`, `SYSTIMESTAMP` e operações de data/hora ao horário oficial de Brasília.

---

## 2. Mural de Avisos e Notícias (UC04, UC05 — S2-T1)

### 2.1 Listagem Pública de Avisos Vigentes Paginada (`GET /api/v1/avisos`)

Retorna apenas comunicados dentro do período de vigência (`DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= TRUNC(SYSDATE)`), ordenados pelos mais recentes primeiro, com filtros opcionais de categoria, destaque e busca textual.

```sql
-- Parâmetros de exemplo:
-- :p_categoria = 'NOTICIA' (ou NULL para todas)
-- :p_destaque  = 'S'       (ou NULL para todos)
-- :p_busca     = '%certificacao%' (ou NULL)
-- :p_offset    = 0
-- :p_limit     = 20

SELECT a.ID_AVISO,
       a.TITULO,
       DBMS_LOB.SUBSTR(a.CONTEUDO, 400, 1) AS TRECHO_CONTEUDO,
       a.CATEGORIA,
       a.DESTAQUE,
       a.DATA_PUBLICACAO,
       a.DATA_EXPIRACAO,
       u.ID_USUARIO AS AUTOR_ID,
       u.NOME       AS AUTOR_NOME
  FROM AVISOS a
  LEFT JOIN USUARIOS u ON u.ID_USUARIO = a.ID_AUTOR
 WHERE (a.DATA_EXPIRACAO IS NULL OR a.DATA_EXPIRACAO >= TRUNC(SYSDATE))
   AND (:p_categoria IS NULL OR a.CATEGORIA = :p_categoria)
   AND (:p_destaque  IS NULL OR a.DESTAQUE  = :p_destaque)
   AND (:p_busca     IS NULL OR (a.TITULO LIKE :p_busca OR a.CONTEUDO LIKE :p_busca))
 ORDER BY a.DATA_PUBLICACAO DESC, a.ID_AVISO DESC
OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY;
```

#### Plano de Execução (`EXPLAIN PLAN`)

```sql
EXPLAIN PLAN FOR
SELECT a.ID_AVISO, a.TITULO, a.CATEGORIA, a.DESTAQUE, a.DATA_PUBLICACAO,
       u.ID_USUARIO, u.NOME
  FROM AVISOS a
  LEFT JOIN USUARIOS u ON u.ID_USUARIO = a.ID_AUTOR
 WHERE (a.DATA_EXPIRACAO IS NULL OR a.DATA_EXPIRACAO >= TRUNC(SYSDATE))
 ORDER BY a.DATA_PUBLICACAO DESC
 FETCH FIRST 20 ROWS ONLY;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY());
```

```text
------------------------------------------------------------------------------------------------------
| Id  | Operation                      | Name                 | Rows  | Bytes | Cost (%CPU)| Time     |
------------------------------------------------------------------------------------------------------
|   0 | SELECT STATEMENT               |                      |    20 |  3480 |     3   (0)| 00:00:01 |
|*  1 |  VIEW                          |                      |    20 |  3480 |     3   (0)| 00:00:01 |
|*  2 |   WINDOW NOSORT STOPKEY        |                      |    20 |  2960 |     3   (0)| 00:00:01 |
|   3 |    NESTED LOOPS OUTER          |                      |    20 |  2960 |     3   (0)| 00:00:01 |
|*  4 |     TABLE ACCESS BY INDEX ROWID| AVISOS               |    20 |  2120 |     2   (0)| 00:00:01 |
|   5 |      INDEX FULL SCAN           | IX_AVISOS_PUBLICACAO |    20 |       |     1   (0)| 00:00:01 |
|   6 |     TABLE ACCESS BY INDEX ROWID| USUARIOS             |     1 |    42 |     1   (0)| 00:00:01 |
|*  7 |      INDEX UNIQUE SCAN         | SYS_C008312          |     1 |       |     0   (0)| 00:00:01 |
------------------------------------------------------------------------------------------------------
Predicate Information (identified by operation id):
   1 - filter("from$_subquery$_003"."rowlimit_$$_rownumber"<=20)
   2 - filter(ROW_NUMBER() OVER ( ORDER BY INTERNAL_FUNCTION("A"."DATA_PUBLICACAO") DESC )<=20)
   4 - filter("A"."DATA_EXPIRACAO" IS NULL OR "A"."DATA_EXPIRACAO">=TRUNC(SYSDATE@!))
   7 - access("U"."ID_USUARIO"(+)="A"."ID_AUTOR")
```

> **Análise de performance:** O índice descendente `IX_AVISOS_PUBLICACAO ON AVISOS (DATA_PUBLICACAO DESC)` evita `SORT ORDER BY` em memória (`WINDOW NOSORT STOPKEY`) e realiza parada antecipada ao atingir o limite da página.

---

### 2.2 Avisos Vigentes em Destaque para o Topo e Dashboard (`DESTAQUE = 'S'`)

```sql
SELECT a.ID_AVISO,
       a.TITULO,
       a.CONTEUDO,
       a.CATEGORIA,
       a.DESTAQUE,
       a.DATA_PUBLICACAO,
       u.ID_USUARIO AS AUTOR_ID,
       u.NOME       AS AUTOR_NOME
  FROM AVISOS a
  LEFT JOIN USUARIOS u ON u.ID_USUARIO = a.ID_AUTOR
 WHERE a.DESTAQUE = 'S'
   AND (a.DATA_EXPIRACAO IS NULL OR a.DATA_EXPIRACAO >= TRUNC(SYSDATE))
 ORDER BY a.DATA_PUBLICACAO DESC, a.ID_AVISO DESC
 FETCH FIRST 5 ROWS ONLY;
```

---

### 2.3 Listagem de Gestão de Avisos com Flag Calculada `EXPIRADO` (`GET /api/v1/avisos/gestao`)

```sql
SELECT a.ID_AVISO,
       a.TITULO,
       a.CONTEUDO,
       a.CATEGORIA,
       a.DESTAQUE,
       a.DATA_PUBLICACAO,
       a.DATA_EXPIRACAO,
       a.DATA_ATUALIZACAO,
       CASE
           WHEN a.DATA_EXPIRACAO IS NOT NULL AND a.DATA_EXPIRACAO < TRUNC(SYSDATE) THEN 'S'
           ELSE 'N'
       END AS EXPIRADO,
       u.ID_USUARIO AS AUTOR_ID,
       u.NOME       AS AUTOR_NOME
  FROM AVISOS a
  LEFT JOIN USUARIOS u ON u.ID_USUARIO = a.ID_AUTOR
 WHERE (:p_incluir_expirados = 'S' OR a.DATA_EXPIRACAO IS NULL OR a.DATA_EXPIRACAO >= TRUNC(SYSDATE))
 ORDER BY a.DATA_PUBLICACAO DESC, a.ID_AVISO DESC;
```

---

## 3. Agenda e Mural de Eventos (UC12 — S2-T2)

### 3.1 Próximos Eventos Futuros — Listagem Padrão (`GET /api/v1/eventos`)

Na ausência de filtros de data, oculta eventos passados (`DATA_INICIO >= TRUNC(SYSDATE)`) e ordena cronologicamente do mais próximo para o mais distante, utilizando o índice `IX_EVENTOS_INICIO`.

```sql
-- Parâmetros opcionais:
-- :p_categoria = 'TREINAMENTO' (ou NULL)
-- :p_id_setor  = 1             (ou NULL)
-- :p_busca     = '%suporte%'   (ou NULL)

SELECT e.ID_EVENTO,
       e.TITULO,
       e.DESCRICAO,
       e.CATEGORIA,
       e.DATA_INICIO,
       e.DATA_FIM,
       e.LOCAL,
       s.ID_SETOR,
       s.NOME AS SETOR_NOME
  FROM EVENTOS e
  LEFT JOIN SETORES s ON s.ID_SETOR = e.ID_SETOR
 WHERE e.DATA_INICIO >= CAST(TRUNC(SYSDATE) AS TIMESTAMP)
   AND (:p_categoria IS NULL OR e.CATEGORIA = :p_categoria)
   AND (:p_id_setor  IS NULL OR e.ID_SETOR  = :p_id_setor)
   AND (:p_busca     IS NULL OR (e.TITULO LIKE :p_busca OR e.LOCAL LIKE :p_busca OR e.DESCRICAO LIKE :p_busca))
 ORDER BY e.DATA_INICIO ASC, e.ID_EVENTO ASC;
```

#### Plano de Execução (`EXPLAIN PLAN`)

```sql
EXPLAIN PLAN FOR
SELECT e.ID_EVENTO, e.TITULO, e.CATEGORIA, e.DATA_INICIO, e.DATA_FIM, e.LOCAL,
       s.ID_SETOR, s.NOME
  FROM EVENTOS e
  LEFT JOIN SETORES s ON s.ID_SETOR = e.ID_SETOR
 WHERE e.DATA_INICIO >= CAST(TRUNC(SYSDATE) AS TIMESTAMP)
 ORDER BY e.DATA_INICIO ASC;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY());
```

```text
---------------------------------------------------------------------------------------------------
| Id  | Operation                    | Name              | Rows  | Bytes | Cost (%CPU)| Time     |
---------------------------------------------------------------------------------------------------
|   0 | SELECT STATEMENT             |                   |    12 |  1980 |     3   (0)| 00:00:01 |
|   1 |  NESTED LOOPS OUTER          |                   |    12 |  1980 |     3   (0)| 00:00:01 |
|   2 |   TABLE ACCESS BY INDEX ROWID| EVENTOS           |    12 |  1560 |     2   (0)| 00:00:01 |
|*  3 |    INDEX RANGE SCAN          | IX_EVENTOS_INICIO |    12 |       |     1   (0)| 00:00:01 |
|   4 |   TABLE ACCESS BY INDEX ROWID| SETORES           |     1 |    35 |     1   (0)| 00:00:01 |
|*  5 |    INDEX UNIQUE SCAN         | SYS_C008305       |     1 |       |     0   (0)| 00:00:01 |
---------------------------------------------------------------------------------------------------
Predicate Information (identified by operation id):
   3 - access("E"."DATA_INICIO">=CAST(TRUNC(SYSDATE@!) AS TIMESTAMP))
   5 - access("S"."ID_SETOR"(+)="E"."ID_SETOR")
```

> **Análise de performance:** A cláusula `e.DATA_INICIO >= CAST(TRUNC(SYSDATE) AS TIMESTAMP)` preserva a coluna `DATA_INICIO` sem funções envolventes, habilitando **`INDEX RANGE SCAN`** direto sobre `IX_EVENTOS_INICIO` já na ordem ascendente exigida pelo UC12.

---

### 3.2 Eventos por Faixa de Mês e Ano — Visualização em Calendário (`?mes=11&ano=2026`)

Evita `EXTRACT(MONTH FROM DATA_INICIO)` no `WHERE` para não invalidar o índice `IX_EVENTOS_INICIO`, convertendo o mês/ano em um intervalo fechado `[início_do_mês, fim_do_mês)`.

```sql
-- Exemplo: :p_ano = 2026, :p_mes = 11
SELECT e.ID_EVENTO,
       e.TITULO,
       e.DESCRICAO,
       e.CATEGORIA,
       e.DATA_INICIO,
       e.DATA_FIM,
       e.LOCAL,
       s.ID_SETOR,
       s.NOME AS SETOR_NOME
  FROM EVENTOS e
  LEFT JOIN SETORES s ON s.ID_SETOR = e.ID_SETOR
 WHERE e.DATA_INICIO >= TO_TIMESTAMP(:p_ano || '-' || LPAD(:p_mes, 2, '0') || '-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS')
   AND e.DATA_INICIO <  ADD_MONTHS(TO_TIMESTAMP(:p_ano || '-' || LPAD(:p_mes, 2, '0') || '-01 00:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1)
 ORDER BY e.DATA_INICIO ASC, e.ID_EVENTO ASC;
```

---

## 4. Agrupamento de Aniversariantes para o Dashboard (UC11 — S2-T3)

### 4.1 Aniversariantes do Dia e Total do Mês (Privacidade UC11: sem ano de nascimento)

Aproveita o índice baseado em função criado em `02_indices_views.sql`:
`CREATE INDEX IX_USUARIOS_ANIV ON USUARIOS (EXTRACT(MONTH FROM DATA_NASCIMENTO), EXTRACT(DAY FROM DATA_NASCIMENTO));`

```sql
-- 1. Lista de colaboradores ativos que aniversariam no mês/dia (Dashboard e UC11)
SELECT u.ID_USUARIO,
       u.NOME,
       u.CARGO,
       s.ID_SETOR,
       s.NOME AS SETOR_NOME,
       EXTRACT(DAY   FROM u.DATA_NASCIMENTO) AS DIA,
       EXTRACT(MONTH FROM u.DATA_NASCIMENTO) AS MES,
       CASE
           WHEN EXTRACT(MONTH FROM u.DATA_NASCIMENTO) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(DAY   FROM u.DATA_NASCIMENTO) = EXTRACT(DAY   FROM SYSDATE)
           THEN 'S'
           ELSE 'N'
       END AS ANIVERSARIO_HOJE
  FROM USUARIOS u
  LEFT JOIN SETORES s ON s.ID_SETOR = u.ID_SETOR
 WHERE u.STATUS = 'ATIVO'
   AND u.DATA_NASCIMENTO IS NOT NULL
   AND EXTRACT(MONTH FROM u.DATA_NASCIMENTO) = EXTRACT(MONTH FROM SYSDATE)
 ORDER BY EXTRACT(DAY FROM u.DATA_NASCIMENTO) ASC, UPPER(u.NOME) ASC;

-- 2. Resumo analítico de aniversariantes ativos no mês atual vs. dia atual
SELECT COUNT(*) AS TOTAL_ANIVERSARIANTES_MES,
       COUNT(CASE WHEN EXTRACT(DAY FROM u.DATA_NASCIMENTO) = EXTRACT(DAY FROM SYSDATE) THEN 1 END) AS TOTAL_HOJE
  FROM USUARIOS u
 WHERE u.STATUS = 'ATIVO'
   AND u.DATA_NASCIMENTO IS NOT NULL
   AND EXTRACT(MONTH FROM u.DATA_NASCIMENTO) = EXTRACT(MONTH FROM SYSDATE);
```

#### Plano de Execução (`EXPLAIN PLAN`)

```text
-------------------------------------------------------------------------------------------------
| Id  | Operation                    | Name             | Rows  | Bytes | Cost (%CPU)| Time     |
-------------------------------------------------------------------------------------------------
|   0 | SELECT STATEMENT             |                  |     8 |   544 |     2   (0)| 00:00:01 |
|   1 |  SORT ORDER BY               |                  |     8 |   544 |     2   (0)| 00:00:01 |
|   2 |   NESTED LOOPS OUTER         |                  |     8 |   544 |     2   (0)| 00:00:01 |
|*  3 |    TABLE ACCESS BY INDEX ROWID| USUARIOS        |     8 |   368 |     1   (0)| 00:00:01 |
|*  4 |     INDEX RANGE SCAN         | IX_USUARIOS_ANIV |     8 |       |     1   (0)| 00:00:01 |
|   5 |    TABLE ACCESS BY INDEX ROWID| SETORES         |     1 |    22 |     1   (0)| 00:00:01 |
|*  6 |     INDEX UNIQUE SCAN        | SYS_C008305      |     1 |       |     0   (0)| 00:00:01 |
-------------------------------------------------------------------------------------------------
Predicate Information (identified by operation id):
   3 - filter("U"."STATUS"='ATIVO' AND "U"."DATA_NASCIMENTO" IS NOT NULL)
   4 - access(EXTRACT(MONTH FROM INTERNAL_FUNCTION("U"."DATA_NASCIMENTO"))=EXTRACT(MONTH FROM SYSDATE@!))
   6 - access("S"."ID_SETOR"(+)="U"."ID_SETOR")
```

---

## 5. Guia de Apoio ao Back-end: `CLOB`, `TIMESTAMP` e Fuso Horário no Oracle

| Tópico | Comportamento no Oracle 23ai + `python-oracledb` | Recomendação Aplicada no Back-end |
|---|---|---|
| **`CLOB` (`AVISOS.CONTEUDO`, `EVENTOS.DESCRICAO`)** | No modo *thin* do `python-oracledb` com SQLAlchemy 2.x (`Mapped[str] = mapped_column(Text)`), valores até 1 MB são lidos diretamente como `str`. Em SQL puro, não use `DISTINCT` nem `GROUP BY` sobre colunas `CLOB`. | Manter `Text` no modelo SQLAlchemy; para geração de `resumo` de 200 caracteres sem tags, extrair em Python via `extrair_resumo_sem_html`. |
| **`DATE` vs `TIMESTAMP`** | `AVISOS.DATA_EXPIRACAO` e `USUARIOS.DATA_NASCIMENTO` são `DATE` (comparados com `TRUNC(SYSDATE)` / `date.today()`). `AVISOS.DATA_PUBLICACAO` e `EVENTOS.DATA_INICIO` são `TIMESTAMP`. | Em filtros de intervalo de eventos (`DATA_INICIO`), passar `datetime` completo (`00:00:00` a `23:59:59`) para evitar conversão implícita de tipo que desabilitaria `IX_EVENTOS_INICIO`. |
| **Strings vazias `''`** | No Oracle, `''` é tratado como `NULL`. | Todos os schemas Pydantic (`AvisoIn`, `EventoIn`, `UsuarioCreate`) normalizam `""` para `None` em campos opcionais antes da persistência. |
| **Booleanos (`CHAR(1)`)** | `AVISOS.DESTAQUE` armazena `'S'` ou `'N'` com `CHECK (DESTAQUE IN ('S','N'))`. | O service converte `bool` (`True`/`False`) da API para `'S'`/`'N'` no banco e vice-versa no schema `AvisoResumo`/`AvisoOut`. |

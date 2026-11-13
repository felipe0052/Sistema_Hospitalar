-- ===========================================================================
-- Imagem de capa das noticias/avisos (colunas em AVISOS).
-- Idempotente: pode rodar em banco novo (init) ou em banco ja existente.
-- Bancos ja criados (init so roda na 1a subida do container):
--   docker exec -i intranet-decos-oracle sqlplus -s decos/decos123@FREEPDB1 < database/init/05_ddl_avisos_imagem.sql
-- ===========================================================================
SET SERVEROUTPUT ON

BEGIN
    IF SYS_CONTEXT('USERENV', 'CON_NAME') = 'CDB$ROOT' THEN
        EXECUTE IMMEDIATE 'ALTER SESSION SET CONTAINER=FREEPDB1';
    END IF;
END;
/
ALTER SESSION SET CURRENT_SCHEMA=DECOS;

DECLARE
    PROCEDURE adicionar_coluna(p_coluna VARCHAR2, p_definicao VARCHAR2) IS
        v_existe NUMBER;
    BEGIN
        SELECT COUNT(*) INTO v_existe FROM all_tab_columns
         WHERE owner = 'DECOS' AND table_name = 'AVISOS' AND column_name = p_coluna;
        IF v_existe = 0 THEN
            EXECUTE IMMEDIATE 'ALTER TABLE DECOS.AVISOS ADD (' || p_coluna || ' ' || p_definicao || ')';
            DBMS_OUTPUT.PUT_LINE('Coluna ' || p_coluna || ' criada.');
        ELSE
            DBMS_OUTPUT.PUT_LINE('Coluna ' || p_coluna || ' ja existe - nada a fazer.');
        END IF;
    END;
BEGIN
    -- Chave BASE no storage (ex.: avisos/12/3f9a...); as variantes capa/miniatura sao derivadas dela.
    adicionar_coluna('IMAGEM_CHAVE', 'VARCHAR2(300)');
    -- Texto alternativo da imagem (acessibilidade).
    adicionar_coluna('IMAGEM_ALT', 'VARCHAR2(200)');
END;
/
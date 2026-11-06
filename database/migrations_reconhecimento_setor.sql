-- ===========================================================================
-- Migração: Suporte a Reconhecimento por Setor e Indicação por Setor
-- Mantém 100% de compatibilidade com reconhecimento por indivíduo/colaborador.
-- Script idempotente para Oracle DB.
-- ===========================================================================

-- 1. RECONHECIMENTOS
DECLARE
    v_col_exists NUMBER;
BEGIN
    -- ALVO_TIPO
    SELECT COUNT(*) INTO v_col_exists FROM user_tab_cols WHERE table_name = 'RECONHECIMENTOS' AND column_name = 'ALVO_TIPO';
    IF v_col_exists = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE RECONHECIMENTOS ADD ALVO_TIPO VARCHAR2(15) DEFAULT ''COLABORADOR'' NOT NULL';
    END IF;

    -- ID_SETOR
    SELECT COUNT(*) INTO v_col_exists FROM user_tab_cols WHERE table_name = 'RECONHECIMENTOS' AND column_name = 'ID_SETOR';
    IF v_col_exists = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE RECONHECIMENTOS ADD ID_SETOR NUMBER REFERENCES SETORES(ID_SETOR)';
        EXECUTE IMMEDIATE 'CREATE INDEX IX_RECON_SETOR ON RECONHECIMENTOS (ID_SETOR)';
    END IF;

    -- Permitir ID_COLABORADOR nulo quando for reconhecimento de setor
    EXECUTE IMMEDIATE 'ALTER TABLE RECONHECIMENTOS MODIFY ID_COLABORADOR NULL';
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
/

-- 2. INDICACOES_RECONHECIMENTO
DECLARE
    v_col_exists NUMBER;
BEGIN
    -- ALVO_TIPO
    SELECT COUNT(*) INTO v_col_exists FROM user_tab_cols WHERE table_name = 'INDICACOES_RECONHECIMENTO' AND column_name = 'ALVO_TIPO';
    IF v_col_exists = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE INDICACOES_RECONHECIMENTO ADD ALVO_TIPO VARCHAR2(15) DEFAULT ''COLABORADOR'' NOT NULL';
    END IF;

    -- ID_SETOR
    SELECT COUNT(*) INTO v_col_exists FROM user_tab_cols WHERE table_name = 'INDICACOES_RECONHECIMENTO' AND column_name = 'ID_SETOR';
    IF v_col_exists = 0 THEN
        EXECUTE IMMEDIATE 'ALTER TABLE INDICACOES_RECONHECIMENTO ADD ID_SETOR NUMBER REFERENCES SETORES(ID_SETOR)';
        EXECUTE IMMEDIATE 'CREATE INDEX IX_INDIC_SETOR ON INDICACOES_RECONHECIMENTO (ID_SETOR)';
    END IF;

    -- Permitir ID_INDICADO nulo quando for indicação de setor
    EXECUTE IMMEDIATE 'ALTER TABLE INDICACOES_RECONHECIMENTO MODIFY ID_INDICADO NULL';
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
/

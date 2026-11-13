DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'ONBOARDING_CONTATOS';
    IF v_count = 1 THEN
        SELECT COUNT(*) INTO v_count FROM user_tab_columns WHERE table_name = 'ONBOARDING_CONTATOS' AND column_name = 'CARGO';
        IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'ALTER TABLE ONBOARDING_CONTATOS ADD (CARGO VARCHAR2(100))';
        END IF;
    END IF;
END;
/

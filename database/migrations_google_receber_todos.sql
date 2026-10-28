-- Para bancos que já aplicaram migrations_google_agenda.sql: opção "receber todos os eventos".
ALTER TABLE INTEGRACOES_GOOGLE ADD (RECEBER_TODOS CHAR(1) DEFAULT 'N' NOT NULL);

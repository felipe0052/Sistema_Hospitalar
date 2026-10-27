-- Migração para bancos já criados (database/init só roda na 1a subida do container).
-- docker exec -i intranet-decos-oracle sqlplus decos/decos123@FREEPDB1 < database/migrations_documentos_versionamento.sql
ALTER TABLE DOCUMENTOS ADD (VERSAO NUMBER DEFAULT 1 NOT NULL);
ALTER TABLE DOCUMENTOS ADD (ATIVO CHAR(1) DEFAULT 'S' NOT NULL);
ALTER TABLE DOCUMENTOS ADD CONSTRAINT CK_DOCUMENTOS_ATIVO CHECK (ATIVO IN ('S','N'));

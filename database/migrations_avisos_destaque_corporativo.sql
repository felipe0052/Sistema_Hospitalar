-- Migração para bancos já criados: permite a categoria DESTAQUE_CORPORATIVO em AVISOS.
-- docker exec -i intranet-decos-oracle sqlplus -s decos/decos123@FREEPDB1 < database/migrations_avisos_destaque_corporativo.sql
ALTER TABLE AVISOS DROP CONSTRAINT CK_AVISOS_CATEGORIA;
ALTER TABLE AVISOS ADD CONSTRAINT CK_AVISOS_CATEGORIA CHECK (CATEGORIA IN ('NOTICIA','COMUNICADO','PROMOCAO','MUDANCA_SETOR','DESTAQUE_CORPORATIVO'));

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class Documento(Base):
    __tablename__ = "DOCUMENTOS"

    id_doc: Mapped[int] = mapped_column("ID_DOC", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    tipo: Mapped[str] = mapped_column("TIPO", String(20), nullable=False)
    categoria: Mapped[str | None] = mapped_column("CATEGORIA", String(100), nullable=True)
    descricao: Mapped[str | None] = mapped_column("DESCRICAO", String(1000), nullable=True)
    palavras_chave: Mapped[str | None] = mapped_column("PALAVRAS_CHAVE", String(500), nullable=True)
    url_arquivo: Mapped[str] = mapped_column("URL_ARQUIVO", String(500), nullable=False)
    nome_arquivo: Mapped[str] = mapped_column("NOME_ARQUIVO", String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column("MIME_TYPE", String(100), nullable=False)
    tamanho_bytes: Mapped[int] = mapped_column("TAMANHO_BYTES", Integer, nullable=False)
    versao: Mapped[int] = mapped_column("VERSAO", Integer, nullable=False, default=1, server_default="1")
    ativo: Mapped[str] = mapped_column("ATIVO", String(1), nullable=False, default="S", server_default="S")
    codigo: Mapped[str | None] = mapped_column("CODIGO", String(30), nullable=True)
    justificativa: Mapped[str | None] = mapped_column("JUSTIFICATIVA", String(500), nullable=True)
    resumo: Mapped[str | None] = mapped_column("RESUMO", Text, nullable=True)
    status_indexacao: Mapped[str] = mapped_column(
        "STATUS_INDEXACAO", String(15), nullable=False, default="PENDENTE", server_default="PENDENTE"
    )
    id_autor: Mapped[int | None] = mapped_column("ID_AUTOR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True)
    data_upload: Mapped[datetime] = mapped_column("DATA_UPLOAD", DateTime, server_default=func.now())
    data_atualizacao: Mapped[datetime | None] = mapped_column("DATA_ATUALIZACAO", DateTime, nullable=True)

    autor: Mapped["Usuario | None"] = relationship("Usuario")

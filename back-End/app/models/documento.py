from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.enums import TipoDocumento


class DocumentoModel(Base):
    __tablename__ = "DOCUMENTOS"

    id_doc: Mapped[int] = mapped_column("ID_DOC", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    categoria: Mapped[str | None] = mapped_column("CATEGORIA", String(100), index=True)
    descricao: Mapped[str | None] = mapped_column("DESCRICAO", Text)
    palavras_chave: Mapped[str | None] = mapped_column("PALAVRAS_CHAVE", String(300), index=True)
    # RN06 — único tipos aceitos no upload: PDF ou DOCX.
    tipo: Mapped[TipoDocumento] = mapped_column("TIPO", SAEnum(TipoDocumento, native_enum=False, length=10), nullable=False)
    url_arquivo: Mapped[str] = mapped_column("URL_ARQUIVO", String(500), nullable=False)
    versao: Mapped[str] = mapped_column("VERSAO", String(20), nullable=False, default="1.0")
    data_upload: Mapped[datetime] = mapped_column(
        "DATA_UPLOAD", DateTime(timezone=True), server_default=func.now()
    )

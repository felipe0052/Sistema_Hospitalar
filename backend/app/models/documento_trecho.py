import array
from typing import Any

from sqlalchemy import ForeignKey, Integer, LargeBinary, Text
from sqlalchemy.dialects import oracle
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import TypeDecorator

from app.core.database import Base

DIMENSAO_EMBEDDING = 384


class VetorEmbedding(TypeDecorator):
    """Oracle 23ai: coluna VECTOR(384, FLOAT32). Demais bancos (SQLite de testes): bytes float32."""

    impl = LargeBinary
    cache_ok = True

    def load_dialect_impl(self, dialect: Any):
        if dialect.name == "oracle":
            return dialect.type_descriptor(oracle.VECTOR(DIMENSAO_EMBEDDING, oracle.VectorStorageFormat.FLOAT32))
        return dialect.type_descriptor(LargeBinary())

    def process_bind_param(self, value: Any, dialect: Any):
        if value is None:
            return None
        vetor = array.array("f", value)
        return vetor if dialect.name == "oracle" else vetor.tobytes()

    def process_result_value(self, value: Any, dialect: Any):
        if value is None:
            return None
        if dialect.name == "oracle":
            return list(value)
        vetor = array.array("f")
        vetor.frombytes(value)
        return list(vetor)


class DocumentoTrecho(Base):
    """Trecho de um documento com seu embedding, usado na recuperação do RAG."""

    __tablename__ = "DOCUMENTO_TRECHOS"

    id_trecho: Mapped[int] = mapped_column("ID_TRECHO", Integer, primary_key=True, autoincrement=True)
    id_doc: Mapped[int] = mapped_column(
        "ID_DOC", Integer, ForeignKey("DOCUMENTOS.ID_DOC", ondelete="CASCADE"), nullable=False
    )
    ordem: Mapped[int] = mapped_column("ORDEM", Integer, nullable=False)
    pagina: Mapped[int | None] = mapped_column("PAGINA", Integer, nullable=True)
    texto: Mapped[str] = mapped_column("TEXTO", Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column("EMBEDDING", VetorEmbedding, nullable=False)

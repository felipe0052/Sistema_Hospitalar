from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class Faq(Base):
    __tablename__ = "FAQS"

    id_faq: Mapped[int] = mapped_column("ID_FAQ", Integer, primary_key=True, autoincrement=True)
    pergunta: Mapped[str] = mapped_column("PERGUNTA", String(500), nullable=False)
    resposta: Mapped[str] = mapped_column("RESPOSTA", Text, nullable=False)
    categoria: Mapped[str] = mapped_column("CATEGORIA", String(100), nullable=False)
    ordem: Mapped[int] = mapped_column("ORDEM", Integer, nullable=False, default=0)
    id_autor: Mapped[int | None] = mapped_column("ID_AUTOR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True)
    data_criacao: Mapped[datetime] = mapped_column("DATA_CRIACAO", DateTime, server_default=func.now())
    data_atualizacao: Mapped[datetime | None] = mapped_column("DATA_ATUALIZACAO", DateTime, nullable=True)

    autor: Mapped["Usuario | None"] = relationship("Usuario")

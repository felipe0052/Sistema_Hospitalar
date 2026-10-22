from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class Aviso(Base):
    __tablename__ = "AVISOS"

    id_aviso: Mapped[int] = mapped_column("ID_AVISO", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    conteudo: Mapped[str] = mapped_column("CONTEUDO", Text, nullable=False)
    categoria: Mapped[str] = mapped_column("CATEGORIA", String(50), nullable=False, default="COMUNICADO")
    destaque: Mapped[str] = mapped_column("DESTAQUE", String(1), nullable=False, default="N")
    data_publicacao: Mapped[datetime] = mapped_column("DATA_PUBLICACAO", DateTime, server_default=func.now())
    data_expiracao: Mapped[date | None] = mapped_column("DATA_EXPIRACAO", Date, nullable=True)
    data_atualizacao: Mapped[datetime | None] = mapped_column("DATA_ATUALIZACAO", DateTime, nullable=True)
    id_autor: Mapped[int | None] = mapped_column("ID_AUTOR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True)

    autor: Mapped["Usuario | None"] = relationship("Usuario")

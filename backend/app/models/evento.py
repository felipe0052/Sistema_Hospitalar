from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.setor import Setor
    from app.models.usuario import Usuario


class Evento(Base):
    __tablename__ = "EVENTOS"

    id_evento: Mapped[int] = mapped_column("ID_EVENTO", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    descricao: Mapped[str | None] = mapped_column("DESCRICAO", Text, nullable=True)
    categoria: Mapped[str] = mapped_column("CATEGORIA", String(30), nullable=False, default="OUTRO")
    data_inicio: Mapped[datetime] = mapped_column("DATA_INICIO", DateTime, nullable=False)
    data_fim: Mapped[datetime | None] = mapped_column("DATA_FIM", DateTime, nullable=True)
    local: Mapped[str | None] = mapped_column("LOCAL", String(150), nullable=True)
    id_setor: Mapped[int | None] = mapped_column("ID_SETOR", Integer, ForeignKey("SETORES.ID_SETOR"), nullable=True)
    id_autor: Mapped[int | None] = mapped_column("ID_AUTOR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True)
    data_criacao: Mapped[datetime] = mapped_column("DATA_CRIACAO", DateTime, server_default=func.now())

    setor: Mapped["Setor | None"] = relationship("Setor")
    autor: Mapped["Usuario | None"] = relationship("Usuario")

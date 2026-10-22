from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.ramal import Ramal
    from app.models.usuario import Usuario


class Setor(Base):
    __tablename__ = "SETORES"

    id_setor: Mapped[int] = mapped_column("ID_SETOR", Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column("NOME", String(100), nullable=False, unique=True)
    andar: Mapped[str | None] = mapped_column("ANDAR", String(30), nullable=True)
    data_criacao: Mapped[datetime] = mapped_column("DATA_CRIACAO", DateTime, server_default=func.now())

    ramais: Mapped[list["Ramal"]] = relationship("Ramal", back_populates="setor", cascade="all, delete-orphan")
    usuarios: Mapped[list["Usuario"]] = relationship("Usuario", back_populates="setor")

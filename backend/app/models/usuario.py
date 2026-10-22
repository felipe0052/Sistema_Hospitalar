from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.setor import Setor


class Usuario(Base):
    __tablename__ = "USUARIOS"

    id_usuario: Mapped[int] = mapped_column("ID_USUARIO", Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column("NOME", String(150), nullable=False)
    email: Mapped[str] = mapped_column("EMAIL", String(150), nullable=False, unique=True)
    senha_hash: Mapped[str] = mapped_column("SENHA_HASH", String(255), nullable=False)
    id_setor: Mapped[int | None] = mapped_column("ID_SETOR", Integer, ForeignKey("SETORES.ID_SETOR"), nullable=True)
    cargo: Mapped[str | None] = mapped_column("CARGO", String(100), nullable=True)
    data_nascimento: Mapped[date | None] = mapped_column("DATA_NASCIMENTO", Date, nullable=True)
    perfil: Mapped[str] = mapped_column("PERFIL", String(20), nullable=False, default="COLABORADOR")
    status: Mapped[str] = mapped_column("STATUS", String(10), nullable=False, default="ATIVO")
    versao_token: Mapped[int] = mapped_column("VERSAO_TOKEN", Integer, nullable=False, default=0)
    data_criacao: Mapped[datetime] = mapped_column("DATA_CRIACAO", DateTime, server_default=func.now())
    data_atualizacao: Mapped[datetime | None] = mapped_column("DATA_ATUALIZACAO", DateTime, nullable=True)

    setor: Mapped["Setor | None"] = relationship("Setor", back_populates="usuarios")

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class AcessoRapido(Base):
    __tablename__ = "ACESSOS_RAPIDOS"

    id: Mapped[int] = mapped_column("ID", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(80), nullable=False)
    url: Mapped[str] = mapped_column("URL", String(500), nullable=False)
    descricao: Mapped[str | None] = mapped_column("DESCRICAO", String(200), nullable=True)
    icone: Mapped[str] = mapped_column("ICONE", String(30), nullable=False, default="compass")
    ordem: Mapped[int] = mapped_column("ORDEM", Integer, nullable=False, default=0)
    ativo: Mapped[int] = mapped_column("ATIVO", Integer, nullable=False, default=1)
    criado_por: Mapped[int | None] = mapped_column(
        "CRIADO_POR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True
    )
    criado_em: Mapped[datetime] = mapped_column("CRIADO_EM", DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column("ATUALIZADO_EM", DateTime, nullable=True)

    autor: Mapped["Usuario | None"] = relationship("Usuario")

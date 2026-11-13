from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LinkAniversario(Base):
    __tablename__ = "LINKS_ANIVERSARIO"

    id: Mapped[int] = mapped_column("ID", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(80), nullable=False)
    url: Mapped[str] = mapped_column("URL", String(500), nullable=False)
    ativo: Mapped[int] = mapped_column("ATIVO", Integer, nullable=False, default=1)
    criado_por: Mapped[int | None] = mapped_column(
        "CRIADO_POR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True
    )
    criado_em: Mapped[datetime] = mapped_column("CRIADO_EM", DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column("ATUALIZADO_EM", DateTime, nullable=True)

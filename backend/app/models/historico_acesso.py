from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class HistoricoAcesso(Base):
    __tablename__ = "HISTORICO_ACESSO"

    id_historico: Mapped[int] = mapped_column("ID_HISTORICO", Integer, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column("ID_USUARIO", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=False)
    id_admin: Mapped[int] = mapped_column("ID_ADMIN", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=False)
    campo: Mapped[str] = mapped_column("CAMPO", String(20), nullable=False)
    valor_anterior: Mapped[str | None] = mapped_column("VALOR_ANTERIOR", String(20), nullable=True)
    valor_novo: Mapped[str] = mapped_column("VALOR_NOVO", String(20), nullable=False)
    data_hora: Mapped[datetime] = mapped_column("DATA_HORA", DateTime, server_default=func.now())

    usuario: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[id_usuario])
    admin: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[id_admin])

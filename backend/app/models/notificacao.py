from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notificacao(Base):
    """Notificação interna: uma linha por publicação (não por usuário)."""

    __tablename__ = "NOTIFICACOES"
    __table_args__ = (UniqueConstraint("TIPO", "ID_REFERENCIA", "DATA_REFERENCIA", name="UQ_NOTIF_REFERENCIA"),)

    id_notificacao: Mapped[int] = mapped_column("ID_NOTIFICACAO", Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column("TIPO", String(20), nullable=False)
    id_referencia: Mapped[int] = mapped_column("ID_REFERENCIA", Integer, nullable=False)
    data_referencia: Mapped[date] = mapped_column("DATA_REFERENCIA", Date, nullable=False, default=date.today)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    data_criacao: Mapped[datetime] = mapped_column("DATA_CRIACAO", DateTime, server_default=func.now())


class NotificacaoLida(Base):
    """Estado de leitura individual de uma notificação."""

    __tablename__ = "NOTIFICACOES_LIDAS"

    id_usuario: Mapped[int] = mapped_column(
        "ID_USUARIO", Integer, ForeignKey("USUARIOS.ID_USUARIO", ondelete="CASCADE"), primary_key=True
    )
    id_notificacao: Mapped[int] = mapped_column(
        "ID_NOTIFICACAO", Integer, ForeignKey("NOTIFICACOES.ID_NOTIFICACAO", ondelete="CASCADE"), primary_key=True
    )
    data_leitura: Mapped[datetime] = mapped_column("DATA_LEITURA", DateTime, server_default=func.now())

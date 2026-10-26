from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IntegracaoGoogle(Base):
    """Conexão opcional de um colaborador com o Google Agenda (refresh token criptografado)."""

    __tablename__ = "INTEGRACOES_GOOGLE"

    id_usuario: Mapped[int] = mapped_column(
        "ID_USUARIO", Integer, ForeignKey("USUARIOS.ID_USUARIO", ondelete="CASCADE"), primary_key=True
    )
    refresh_token: Mapped[str] = mapped_column("REFRESH_TOKEN", String(1000), nullable=False)
    # "S": todo evento futuro (existente ou novo) é enviado automaticamente à agenda do usuário
    receber_todos: Mapped[str] = mapped_column("RECEBER_TODOS", String(1), nullable=False, default="N", server_default="N")
    data_ativacao: Mapped[datetime] = mapped_column("DATA_ATIVACAO", DateTime, server_default=func.now())


class EventoGoogle(Base):
    """Vínculo entre um evento da Intranet e a cópia criada na agenda Google do usuário."""

    __tablename__ = "EVENTOS_GOOGLE"
    __table_args__ = (UniqueConstraint("ID_USUARIO", "ID_EVENTO", name="UK_EVENTOS_GOOGLE"),)

    id: Mapped[int] = mapped_column("ID", Integer, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(
        "ID_USUARIO", Integer, ForeignKey("USUARIOS.ID_USUARIO", ondelete="CASCADE"), nullable=False
    )
    id_evento: Mapped[int] = mapped_column(
        "ID_EVENTO", Integer, ForeignKey("EVENTOS.ID_EVENTO", ondelete="CASCADE"), nullable=False
    )
    google_event_id: Mapped[str] = mapped_column("GOOGLE_EVENT_ID", String(200), nullable=False)

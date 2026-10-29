from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LogIA(Base):
    """Registro de uso da IA (assistente e análise de POP). Usado a partir da Semana 6."""

    __tablename__ = "LOG_IA"

    id_log: Mapped[int] = mapped_column("ID_LOG", Integer, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int | None] = mapped_column("ID_USUARIO", Integer, ForeignKey("USUARIOS.ID_USUARIO"))
    operacao: Mapped[str] = mapped_column("OPERACAO", String(20), nullable=False, default="PERGUNTA")
    pergunta: Mapped[str] = mapped_column("PERGUNTA", String(1000), nullable=False)
    resposta: Mapped[str | None] = mapped_column("RESPOSTA", Text, nullable=True)
    docs_citados: Mapped[str | None] = mapped_column("DOCS_CITADOS", String(500), nullable=True)
    status: Mapped[str] = mapped_column("STATUS", String(20), nullable=False)
    latencia_ms: Mapped[int | None] = mapped_column("LATENCIA_MS", Integer, nullable=True)
    util: Mapped[str | None] = mapped_column("UTIL", String(1), nullable=True)
    data_hora: Mapped[datetime] = mapped_column("DATA_HORA", DateTime, server_default=func.now())

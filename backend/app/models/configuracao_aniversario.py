from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

MENSAGEM_ANIVERSARIO_PADRAO = (
    "O Hospital Decós parabeniza você pelo seu aniversário! "
    "Agradecemos por sua dedicação diária no cuidado aos pacientes e no fortalecimento da nossa equipe. "
    "Desejamos um novo ciclo repleto de saúde, conquistas e alegrias!"
)
TITULO_ANIVERSARIO_PADRAO = "🎉 Feliz aniversário, {nome}!"
ASSINATURA_ANIVERSARIO_PADRAO = "— Equipe de Gestão de Pessoas • Hospital Decós"


class ConfiguracaoAniversario(Base):
    __tablename__ = "CONFIGURACOES_ANIVERSARIO"

    id: Mapped[int] = mapped_column("ID", Integer, primary_key=True, autoincrement=True)
    mensagem: Mapped[str] = mapped_column("MENSAGEM", Text, nullable=False, default=MENSAGEM_ANIVERSARIO_PADRAO)
    titulo: Mapped[str | None] = mapped_column("TITULO", String(120), nullable=True, default=TITULO_ANIVERSARIO_PADRAO)
    assinatura: Mapped[str | None] = mapped_column(
        "ASSINATURA", String(150), nullable=True, default=ASSINATURA_ANIVERSARIO_PADRAO
    )
    atualizado_por: Mapped[int | None] = mapped_column(
        "ATUALIZADO_POR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True
    )
    atualizado_em: Mapped[datetime | None] = mapped_column("ATUALIZADO_EM", DateTime, nullable=True)

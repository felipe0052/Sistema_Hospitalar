"""`FaqModel` (tabela FAQS) é uma extensão ao schema oficial: o documento de
especificação não define uma tabela própria para FAQ, mas o módulo "Central
de Dúvidas" do escopo exige persistência de perguntas e respostas.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FaqModel(Base):
    __tablename__ = "FAQS"

    id_faq: Mapped[int] = mapped_column("ID_FAQ", Integer, primary_key=True, autoincrement=True)
    pergunta: Mapped[str] = mapped_column("PERGUNTA", String(300), nullable=False)
    resposta: Mapped[str] = mapped_column("RESPOSTA", Text, nullable=False)
    categoria: Mapped[str | None] = mapped_column("CATEGORIA", String(100), index=True)
    data_criacao: Mapped[datetime] = mapped_column(
        "DATA_CRIACAO", DateTime(timezone=True), server_default=func.now()
    )

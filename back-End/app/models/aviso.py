from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import Prioridade


class AvisoModel(Base):
    __tablename__ = "AVISOS"

    id_aviso: Mapped[int] = mapped_column("ID_AVISO", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    conteudo: Mapped[str] = mapped_column("CONTEUDO", Text, nullable=False)
    # Ex.: 'Promocao', 'Comunicado', 'Evento'
    categoria: Mapped[str | None] = mapped_column("CATEGORIA", String(50), index=True)
    prioridade: Mapped[Prioridade] = mapped_column(
        "PRIORIDADE", SAEnum(Prioridade, native_enum=False, length=10), nullable=False, default=Prioridade.MEDIA
    )
    data_publicacao: Mapped[datetime] = mapped_column(
        "DATA_PUBLICACAO", DateTime(timezone=True), server_default=func.now()
    )
    data_expiracao: Mapped[date | None] = mapped_column("DATA_EXPIRACAO", Date)
    id_autor: Mapped[int | None] = mapped_column("ID_AUTOR", ForeignKey("USUARIOS.ID_USUARIO"))

    autor: Mapped["UsuarioModel"] = relationship()

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.usuario import Usuario


class Reconhecimento(Base):
    """Reconhecimento publicado pelo RH (ou Admin) para um colaborador."""

    __tablename__ = "RECONHECIMENTOS"

    id_reconhecimento: Mapped[int] = mapped_column("ID_RECONHECIMENTO", Integer, primary_key=True, autoincrement=True)
    id_colaborador: Mapped[int] = mapped_column(
        "ID_COLABORADOR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=False
    )
    tipo: Mapped[str] = mapped_column("TIPO", String(20), nullable=False)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    mensagem: Mapped[str] = mapped_column("MENSAGEM", String(2000), nullable=False)
    id_autor: Mapped[int | None] = mapped_column("ID_AUTOR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True)
    data_criacao: Mapped[datetime] = mapped_column("DATA_CRIACAO", DateTime, server_default=func.now())

    colaborador: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[id_colaborador])
    autor: Mapped["Usuario | None"] = relationship("Usuario", foreign_keys=[id_autor])


class IndicacaoReconhecimento(Base):
    """Indicação de um colega feita por qualquer usuário e analisada pelo RH."""

    __tablename__ = "INDICACOES_RECONHECIMENTO"
    __table_args__ = (CheckConstraint("ID_INDICADO <> ID_INDICANTE", name="CK_INDIC_PROPRIA"),)

    id_indicacao: Mapped[int] = mapped_column("ID_INDICACAO", Integer, primary_key=True, autoincrement=True)
    id_indicado: Mapped[int] = mapped_column("ID_INDICADO", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=False)
    id_indicante: Mapped[int] = mapped_column(
        "ID_INDICANTE", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=False
    )
    motivo: Mapped[str] = mapped_column("MOTIVO", String(2000), nullable=False)
    status: Mapped[str] = mapped_column("STATUS", String(10), nullable=False, default="PENDENTE")
    id_avaliador: Mapped[int | None] = mapped_column(
        "ID_AVALIADOR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True
    )
    id_reconhecimento: Mapped[int | None] = mapped_column(
        "ID_RECONHECIMENTO",
        Integer,
        ForeignKey("RECONHECIMENTOS.ID_RECONHECIMENTO", ondelete="SET NULL"),
        nullable=True,
    )
    data_indicacao: Mapped[datetime] = mapped_column("DATA_INDICACAO", DateTime, server_default=func.now())
    data_avaliacao: Mapped[datetime | None] = mapped_column("DATA_AVALIACAO", DateTime, nullable=True)

    indicado: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[id_indicado])
    indicante: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[id_indicante])

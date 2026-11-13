from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.setor import Setor


class OnboardingItem(Base):
    """Item do onboarding digital: tarefa do checklist ou orientação de primeiros atendimentos."""

    __tablename__ = "ONBOARDING_ITENS"

    id_item: Mapped[int] = mapped_column("ID_ITEM", Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column("TIPO", String(20), nullable=False, default="CHECKLIST")
    titulo: Mapped[str] = mapped_column("TITULO", String(150), nullable=False)
    descricao: Mapped[str | None] = mapped_column("DESCRICAO", Text, nullable=True)
    ordem: Mapped[int] = mapped_column("ORDEM", Integer, nullable=False, default=0)
    criado_por: Mapped[int | None] = mapped_column(
        "CRIADO_POR", Integer, ForeignKey("USUARIOS.ID_USUARIO"), nullable=True
    )
    criado_em: Mapped[datetime] = mapped_column("CRIADO_EM", DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column("ATUALIZADO_EM", DateTime, nullable=True)


class OnboardingProgresso(Base):
    """Marca que um colaborador concluiu um item do onboarding."""

    __tablename__ = "ONBOARDING_PROGRESSO"

    id_usuario: Mapped[int] = mapped_column(
        "ID_USUARIO", Integer, ForeignKey("USUARIOS.ID_USUARIO", ondelete="CASCADE"), primary_key=True
    )
    id_item: Mapped[int] = mapped_column(
        "ID_ITEM", Integer, ForeignKey("ONBOARDING_ITENS.ID_ITEM", ondelete="CASCADE"), primary_key=True
    )
    concluido_em: Mapped[datetime] = mapped_column("CONCLUIDO_EM", DateTime, server_default=func.now())


class OnboardingContato(Base):
    """'Quem procurar': para cada situação, o responsável, o setor e o ramal."""

    __tablename__ = "ONBOARDING_CONTATOS"

    id_contato: Mapped[int] = mapped_column("ID_CONTATO", Integer, primary_key=True, autoincrement=True)
    situacao: Mapped[str] = mapped_column("SITUACAO", String(200), nullable=False)
    responsavel: Mapped[str] = mapped_column("RESPONSAVEL", String(150), nullable=False)
    cargo: Mapped[str | None] = mapped_column("CARGO", String(100), nullable=True)
    id_setor: Mapped[int | None] = mapped_column(
        "ID_SETOR", Integer, ForeignKey("SETORES.ID_SETOR", ondelete="SET NULL"), nullable=True
    )
    ramal: Mapped[str | None] = mapped_column("RAMAL", String(20), nullable=True)
    observacao: Mapped[str | None] = mapped_column("OBSERVACAO", String(300), nullable=True)
    ordem: Mapped[int] = mapped_column("ORDEM", Integer, nullable=False, default=0)
    criado_em: Mapped[datetime] = mapped_column("CRIADO_EM", DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column("ATUALIZADO_EM", DateTime, nullable=True)

    setor: Mapped["Setor | None"] = relationship("Setor")

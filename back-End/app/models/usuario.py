from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import Perfil, StatusUsuario


class UsuarioModel(Base):
    __tablename__ = "USUARIOS"

    id_usuario: Mapped[int] = mapped_column("ID_USUARIO", Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column("NOME", String(150), nullable=False)
    email: Mapped[str] = mapped_column("EMAIL", String(150), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column("SENHA_HASH", String(255), nullable=False)
    id_setor: Mapped[int | None] = mapped_column("ID_SETOR", ForeignKey("SETORES.ID_SETOR"))
    cargo: Mapped[str | None] = mapped_column("CARGO", String(100))
    perfil: Mapped[Perfil] = mapped_column(
        "PERFIL", SAEnum(Perfil, native_enum=False, length=20), nullable=False, default=Perfil.COLABORADOR
    )
    status: Mapped[StatusUsuario] = mapped_column(
        "STATUS", SAEnum(StatusUsuario, native_enum=False, length=10), nullable=False, default=StatusUsuario.ATIVO
    )
    # RN07 — força a troca de senha no primeiro acesso antes de liberar as demais rotas.
    senha_provisoria: Mapped[bool] = mapped_column("SENHA_PROVISORIA", Boolean, nullable=False, default=True)
    data_nascimento: Mapped[date | None] = mapped_column("DATA_NASCIMENTO", Date)
    data_criacao: Mapped[datetime] = mapped_column(
        "DATA_CRIACAO", DateTime(timezone=True), server_default=func.now()
    )

    setor: Mapped["SetorModel"] = relationship(back_populates="usuarios")

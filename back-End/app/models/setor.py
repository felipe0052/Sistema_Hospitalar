from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SetorModel(Base):
    __tablename__ = "SETORES"

    id_setor: Mapped[int] = mapped_column("ID_SETOR", Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column("NOME", String(100), nullable=False)
    ramal: Mapped[str | None] = mapped_column("RAMAL", String(10))
    # Extensão ao schema oficial: necessária para o diretório "por setor e andar".
    andar: Mapped[str | None] = mapped_column("ANDAR", String(20))

    usuarios: Mapped[list["UsuarioModel"]] = relationship(back_populates="setor")

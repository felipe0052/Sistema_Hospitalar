from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.setor import Setor


class Ramal(Base):
    __tablename__ = "RAMAIS"

    id_ramal: Mapped[int] = mapped_column("ID_RAMAL", Integer, primary_key=True, autoincrement=True)
    numero: Mapped[str] = mapped_column("NUMERO", String(10), nullable=False, unique=True)
    descricao: Mapped[str | None] = mapped_column("DESCRICAO", String(100), nullable=True)
    id_setor: Mapped[int] = mapped_column(
        "ID_SETOR", Integer, ForeignKey("SETORES.ID_SETOR", ondelete="CASCADE"), nullable=False
    )

    setor: Mapped["Setor"] = relationship("Setor", back_populates="ramais")

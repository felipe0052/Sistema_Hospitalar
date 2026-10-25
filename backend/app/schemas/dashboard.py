from pydantic import BaseModel, ConfigDict

from app.schemas.aviso import AvisoResumo
from app.schemas.evento import EventoOut


class SetorAniversarianteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str


class AniversarianteResumoOut(BaseModel):
    """Representação pública de aniversariante sem expor ano de nascimento ou idade (UC11 / S2-T3)."""

    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str
    cargo: str | None = None
    setor: SetorAniversarianteOut | None = None
    dia: int
    mes: int
    aniversario_hoje: bool = True


class DashboardOut(BaseModel):
    avisos_destaque: list[AvisoResumo]
    ultimos_avisos: list[AvisoResumo]
    proximos_eventos: list[EventoOut]
    aniversariantes_hoje: list[AniversarianteResumoOut]
    total_aniversariantes_mes: int

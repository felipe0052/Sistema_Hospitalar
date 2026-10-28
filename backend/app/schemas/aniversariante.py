"""Schemas Pydantic de Aniversariantes do Mês (UC11 — §7.6 e S4-T1)."""

from pydantic import BaseModel, ConfigDict


class SetorAniversarianteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str


class AniversarianteOut(BaseModel):
    """Representação pública de aniversariante sem expor ano de nascimento ou idade (UC11)."""

    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str
    cargo: str | None = None
    setor: SetorAniversarianteOut | None = None
    dia: int
    mes: int
    aniversario_hoje: bool = False

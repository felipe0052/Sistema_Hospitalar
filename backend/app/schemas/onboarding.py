"""Schemas Pydantic do Onboarding Digital do novo colaborador."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TipoItemOnboarding = Literal["CHECKLIST", "ATENDIMENTO"]


def _limpar(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class OnboardingItemIn(BaseModel):
    tipo: TipoItemOnboarding = "CHECKLIST"
    titulo: str = Field(min_length=3, max_length=150)
    descricao: str | None = Field(default=None, max_length=4000)
    ordem: int = Field(default=0, ge=0)

    @field_validator("titulo", "descricao", mode="before")
    @classmethod
    def _limpar_texto(cls, v):
        return _limpar(v)

    @field_validator("ordem", mode="before")
    @classmethod
    def _normalizar_ordem(cls, v):
        if v is None or v == "":
            return 0
        return v


class OnboardingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_item: int
    tipo: str
    titulo: str
    descricao: str | None = None
    ordem: int
    concluido: bool = False


class OnboardingContatoIn(BaseModel):
    situacao: str = Field(min_length=3, max_length=200)
    responsavel: str = Field(min_length=2, max_length=150)
    id_setor: int | None = None
    ramal: str | None = Field(default=None, max_length=20)
    observacao: str | None = Field(default=None, max_length=300)
    ordem: int = Field(default=0, ge=0)

    @field_validator("situacao", "responsavel", "ramal", "observacao", mode="before")
    @classmethod
    def _limpar_texto(cls, v):
        return _limpar(v)

    @field_validator("id_setor", "ordem", mode="before")
    @classmethod
    def _vazio_para_padrao(cls, v, info):
        if v is None or v == "":
            return 0 if info.field_name == "ordem" else None
        return v


class SetorResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str
    andar: str | None = None


class OnboardingContatoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_contato: int
    situacao: str
    responsavel: str
    ramal: str | None = None
    observacao: str | None = None
    ordem: int
    setor: SetorResumoOut | None = None


class ColaboradorOnboardingOut(BaseModel):
    nome: str
    cargo: str | None = None
    setor: SetorResumoOut | None = None


class ProgressoOnboardingOut(BaseModel):
    total: int
    concluidos: int
    percentual: int


class OnboardingOut(BaseModel):
    colaborador: ColaboradorOnboardingOut
    progresso: ProgressoOnboardingOut
    checklist: list[OnboardingItemOut]
    atendimentos: list[OnboardingItemOut]
    contatos: list[OnboardingContatoOut]


class ConclusaoIn(BaseModel):
    concluido: bool = True

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

CategoriaEventoLiteral = Literal["TREINAMENTO", "ACAO_INTERNA", "INSTITUCIONAL", "OUTRO"]


class SetorEventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str


class EventoIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    descricao: str | None = None
    categoria: CategoriaEventoLiteral = "OUTRO"
    data_inicio: datetime
    data_fim: datetime | None = None
    local: str | None = Field(default=None, max_length=150)
    id_setor: int | None = None

    @field_validator("titulo", mode="before")
    @classmethod
    def _limpar_titulo(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("descricao", "local", mode="before")
    @classmethod
    def _limpar_texto_opcional(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            limpo = v.strip()
            return limpo if limpo else None
        return v

    @field_validator("data_fim", "id_setor", mode="before")
    @classmethod
    def _limpar_vazio(cls, v):
        if v == "":
            return None
        return v

    @field_validator("data_inicio", "data_fim")
    @classmethod
    def _normalizar_naive(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is not None:
            return v.replace(tzinfo=None)
        return v

    @field_validator("data_fim")
    @classmethod
    def _validar_data_fim_posterior(cls, v: datetime | None, info: ValidationInfo) -> datetime | None:
        data_inicio = info.data.get("data_inicio")
        if v is not None and isinstance(data_inicio, datetime) and v < data_inicio:
            raise ValueError("A data e hora de término não pode ser anterior ao início do evento.")
        return v


class EventoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_evento: int
    titulo: str
    descricao: str | None = None
    categoria: CategoriaEventoLiteral
    data_inicio: datetime
    data_fim: datetime | None = None
    local: str | None = None
    setor: SetorEventoOut | None = None

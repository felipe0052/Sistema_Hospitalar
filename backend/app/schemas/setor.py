import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

_REGEX_RAMAL_DIGITOS = re.compile(r"^[0-9]{3,10}$")


class RamalIn(BaseModel):
    numero: str = Field(min_length=3, max_length=10)
    descricao: str | None = Field(default=None, max_length=100)

    @field_validator("numero", mode="before")
    @classmethod
    def _validar_numero_ramal(cls, v: str) -> str:
        if not isinstance(v, str):
            v = str(v) if v is not None else ""
        limpo = v.strip()
        if not _REGEX_RAMAL_DIGITOS.match(limpo):
            raise ValueError("O número do ramal deve conter apenas dígitos (entre 3 e 10 números).")
        return limpo

    @field_validator("descricao", mode="before")
    @classmethod
    def _limpar_descricao(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            limpo = v.strip()
            return limpo if limpo else None
        return v


class RamalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_ramal: int
    numero: str
    descricao: str | None = None


class SetorIn(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    andar: str | None = Field(default=None, max_length=30)
    ramais: list[RamalIn] = Field(min_length=1)

    @field_validator("nome", mode="before")
    @classmethod
    def _limpar_nome(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("andar", mode="before")
    @classmethod
    def _limpar_andar(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            limpo = v.strip()
            return limpo if limpo else None
        return v

    @field_validator("ramais")
    @classmethod
    def _garantir_ao_menos_um_ramal(cls, v: list[RamalIn]) -> list[RamalIn]:
        if not v or len(v) < 1:
            raise ValueError("Informe pelo menos um ramal para o setor.")
        return v


class SetorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str
    andar: str | None = None
    ramais: list[RamalOut] = Field(default_factory=list)
    total_usuarios: int = 0

import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

PerfilLiteral = Literal["ADMIN", "COLABORADOR", "RH", "MARKETING"]
StatusLiteral = Literal["ATIVO", "INATIVO"]

_TEM_LETRA = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]")
_TEM_NUMERO = re.compile(r"\d")


def validar_regra_senha(senha: str) -> str:
    """Regra de senha (§9 e S1-T4): mínimo 8 caracteres, pelo menos 1 letra e 1 número."""
    if len(senha) < 8:
        raise ValueError("A senha deve ter no mínimo 8 caracteres.")
    if not _TEM_LETRA.search(senha) or not _TEM_NUMERO.search(senha):
        raise ValueError("A senha deve conter pelo menos 1 letra e 1 número.")
    return senha


class SetorResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str
    andar: str | None = None


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str
    email: str
    cargo: str | None = None
    data_nascimento: date | None = None
    perfil: PerfilLiteral
    status: StatusLiteral
    setor: SetorResumoOut | None = None


class UsuarioCreate(BaseModel):
    nome: str = Field(min_length=3, max_length=150)
    email: EmailStr = Field(max_length=150)
    senha: str = Field(min_length=8, max_length=128)
    data_nascimento: date | None = None
    cargo: str | None = Field(default=None, max_length=100)
    id_setor: int | None = None
    perfil: PerfilLiteral | None = "COLABORADOR"

    @field_validator("nome", mode="before")
    @classmethod
    def _limpar_nome(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", mode="before")
    @classmethod
    def _normalizar_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("cargo", mode="before")
    @classmethod
    def _limpar_cargo(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            limpo = v.strip()
            return limpo if limpo else None
        return v

    @field_validator("data_nascimento", mode="before")
    @classmethod
    def _limpar_data(cls, v):
        if v == "":
            return None
        return v

    @field_validator("data_nascimento")
    @classmethod
    def _validar_data_nascimento(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("A data de nascimento não pode ser no futuro.")
        return v

    @field_validator("senha")
    @classmethod
    def _validar_senha(cls, v: str) -> str:
        return validar_regra_senha(v)


class UsuarioUpdate(BaseModel):
    nome: str = Field(min_length=3, max_length=150)
    email: EmailStr = Field(max_length=150)
    data_nascimento: date | None = None
    cargo: str | None = Field(default=None, max_length=100)
    id_setor: int | None = None

    @field_validator("nome", mode="before")
    @classmethod
    def _limpar_nome(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", mode="before")
    @classmethod
    def _normalizar_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("cargo", mode="before")
    @classmethod
    def _limpar_cargo(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            limpo = v.strip()
            return limpo if limpo else None
        return v

    @field_validator("data_nascimento", mode="before")
    @classmethod
    def _limpar_data(cls, v):
        if v == "":
            return None
        return v

    @field_validator("data_nascimento")
    @classmethod
    def _validar_data_nascimento(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            raise ValueError("A data de nascimento não pode ser no futuro.")
        return v


class SenhaUpdate(BaseModel):
    nova_senha: str = Field(min_length=8, max_length=128)

    @field_validator("nova_senha")
    @classmethod
    def _validar_nova_senha(cls, v: str) -> str:
        return validar_regra_senha(v)


class AcessoUpdate(BaseModel):
    perfil: PerfilLiteral | None = None
    status: StatusLiteral | None = None

    @model_validator(mode="after")
    def _ao_menos_um(self):
        if self.perfil is None and self.status is None:
            raise ValueError("Informe ao menos 'perfil' ou 'status' para alterar o acesso.")
        return self


class AdminResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str


class HistoricoAcessoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    campo: str
    valor_anterior: str | None = None
    valor_novo: str
    data_hora: datetime
    admin: AdminResumoOut


class PaginadoUsuariosOut(BaseModel):
    itens: list[UsuarioOut]
    total: int
    pagina: int
    tamanho: int

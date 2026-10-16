import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.enums import Perfil, StatusUsuario

_TEM_LETRA = re.compile(r"[A-Za-z]")
_TEM_NUMERO = re.compile(r"\d")


def validar_forca_senha(senha: str) -> str:
    """RN07 — senha com no mínimo 8 caracteres, contendo letras e números."""
    if len(senha) < 8:
        raise ValueError("A senha deve ter no mínimo 8 caracteres")
    if not _TEM_LETRA.search(senha) or not _TEM_NUMERO.search(senha):
        raise ValueError("A senha deve conter letras e números")
    return senha


class SetorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str
    ramal: str | None = None
    andar: str | None = None


class UsuarioBase(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    email: EmailStr
    id_setor: int | None = None
    cargo: str | None = None
    # RN09 — perfil de acesso (RBAC); padrão é o menos privilegiado.
    perfil: Perfil = Perfil.COLABORADOR
    data_nascimento: date | None = None


class UsuarioCreate(UsuarioBase):
    senha: str = Field(min_length=8, max_length=100)

    @field_validator("senha")
    @classmethod
    def _valida_senha(cls, v: str) -> str:
        return validar_forca_senha(v)


class UsuarioUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=150)
    id_setor: int | None = None
    cargo: str | None = None
    perfil: Perfil | None = None
    status: StatusUsuario | None = None
    data_nascimento: date | None = None


class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    status: StatusUsuario
    senha_provisoria: bool
    data_criacao: datetime
    setor: SetorOut | None = None


class AniversarianteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str
    cargo: str | None = None
    data_nascimento: date | None = None
    setor: SetorOut | None = None


class AlterarSenhaRequest(BaseModel):
    """RN07 — usada tanto na troca voluntária quanto na troca obrigatória
    de primeiro acesso (quando `senha_provisoria` está `true`)."""

    senha_atual: str
    nova_senha: str = Field(min_length=8, max_length=100)

    @field_validator("nova_senha")
    @classmethod
    def _valida_senha(cls, v: str) -> str:
        return validar_forca_senha(v)

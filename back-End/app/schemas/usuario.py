from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    data_nascimento: date | None = None


class UsuarioCreate(UsuarioBase):
    senha: str = Field(min_length=6, max_length=100)


class UsuarioOut(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    data_criacao: datetime
    setor: SetorOut | None = None


class AniversarianteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str
    cargo: str | None = None
    data_nascimento: date | None = None
    setor: SetorOut | None = None

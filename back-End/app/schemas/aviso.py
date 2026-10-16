from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Prioridade


class AvisoBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    conteudo: str = Field(min_length=1)
    # Ex.: 'Promocao', 'Comunicado', 'Evento'
    categoria: str | None = Field(default=None, max_length=50)
    prioridade: Prioridade = Prioridade.MEDIA
    data_expiracao: date | None = None


class AvisoCreate(AvisoBase):
    pass


class AvisoUpdate(BaseModel):
    """RN08 — edição parcial; só o autor (RH/Marketing) ou um Administrador
    podem efetivamente chamar esta rota."""

    titulo: str | None = Field(default=None, min_length=1, max_length=200)
    conteudo: str | None = Field(default=None, min_length=1)
    categoria: str | None = Field(default=None, max_length=50)
    prioridade: Prioridade | None = None
    data_expiracao: date | None = None


class AvisoOut(AvisoBase):
    model_config = ConfigDict(from_attributes=True)

    id_aviso: int
    data_publicacao: datetime
    id_autor: int | None = None

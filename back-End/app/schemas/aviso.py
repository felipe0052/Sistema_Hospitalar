from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AvisoBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    conteudo: str = Field(min_length=1)
    # Ex.: 'Promocao', 'Comunicado', 'Evento'
    categoria: str | None = Field(default=None, max_length=50)


class AvisoCreate(AvisoBase):
    pass


class AvisoOut(AvisoBase):
    model_config = ConfigDict(from_attributes=True)

    id_aviso: int
    data_publicacao: datetime
    id_autor: int | None = None

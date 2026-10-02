from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentoBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    categoria: str | None = Field(default=None, max_length=100)
    url_arquivo: str = Field(min_length=1, max_length=500)


class DocumentoCreate(DocumentoBase):
    pass


class DocumentoOut(DocumentoBase):
    model_config = ConfigDict(from_attributes=True)

    id_doc: int
    data_upload: datetime


class FaqBase(BaseModel):
    pergunta: str = Field(min_length=1, max_length=300)
    resposta: str = Field(min_length=1)
    categoria: str | None = Field(default=None, max_length=100)


class FaqCreate(FaqBase):
    pass


class FaqOut(FaqBase):
    model_config = ConfigDict(from_attributes=True)

    id_faq: int
    data_criacao: datetime

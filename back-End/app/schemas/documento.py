from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TipoDocumento


class DocumentoBase(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    categoria: str | None = Field(default=None, max_length=100)
    descricao: str | None = None
    palavras_chave: str | None = Field(default=None, max_length=300)


class DocumentoCreate(DocumentoBase):
    """DTO interno dos campos de formulário do upload — o arquivo em si
    chega como `UploadFile` e é validado/salvo pelo service (RN06)."""

    versao: str = Field(default="1.0", max_length=20)


class DocumentoOut(DocumentoBase):
    model_config = ConfigDict(from_attributes=True)

    id_doc: int
    tipo: TipoDocumento
    url_arquivo: str
    versao: str
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

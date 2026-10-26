from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

TipoDocumentoLiteral = Literal["POP", "DOCUMENTO"]


class AutorDocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str


class DocumentoOut(BaseModel):
    id_doc: int
    titulo: str
    tipo: TipoDocumentoLiteral
    categoria: str | None = None
    descricao: str | None = None
    palavras_chave: list[str] = []
    nome_arquivo: str
    mime_type: str
    tamanho_bytes: int
    versao: int
    ativo: bool
    autor: AutorDocumentoOut | None = None
    data_upload: datetime
    data_atualizacao: datetime | None = None


class PaginadoDocumentosOut(BaseModel):
    itens: list[DocumentoOut]
    total: int
    pagina: int
    tamanho: int

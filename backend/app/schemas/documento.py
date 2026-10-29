from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TipoDocumentoLiteral = Literal["POP", "DOCUMENTO"]


def normalizar_palavras_chave_lista(valor: str | list[str] | None) -> list[str]:
    """Converte string separada por vírgulas ou lista em lista limpa de palavras-chave sem duplicatas."""
    if not valor:
        return []
    if isinstance(valor, list):
        brutos = [str(item).strip() for item in valor]
    else:
        brutos = [parte.strip() for parte in str(valor).replace(";", ",").split(",")]

    resultado: list[str] = []
    vistos: set[str] = set()
    for item in brutos:
        if not item:
            continue
        chave_lower = item.lower()
        if chave_lower not in vistos:
            vistos.add(chave_lower)
            resultado.append(item)
    return resultado


def normalizar_palavras_chave_banco(valor: str | list[str] | None) -> str | None:
    """Converte palavras-chave para string separada por vírgula para persistência no banco."""
    lista = normalizar_palavras_chave_lista(valor)
    if not lista:
        return None
    texto = ", ".join(lista)
    if len(texto) > 500:
        raise ValueError("As palavras-chave devem ter no máximo 500 caracteres no total.")
    return texto


class AutorDocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str


class DocumentoMetadadosIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    tipo: TipoDocumentoLiteral
    categoria: str | None = Field(default=None, max_length=100)
    descricao: str | None = Field(default=None, max_length=1000)
    palavras_chave: str | None = Field(default=None, max_length=500)

    @field_validator("titulo", mode="before")
    @classmethod
    def _limpar_titulo(cls, v: str) -> str:
        if isinstance(v, str):
            return " ".join(v.split())
        return v

    @field_validator("tipo", mode="before")
    @classmethod
    def _normalizar_tipo(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().upper()
        return v

    @field_validator("categoria", "descricao", mode="before")
    @classmethod
    def _limpar_opcionais(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            limpo = v.strip()
            return limpo if limpo else None
        return v

    @field_validator("palavras_chave", mode="before")
    @classmethod
    def _normalizar_palavras_chave(cls, v: str | list[str] | None) -> str | None:
        return normalizar_palavras_chave_banco(v)


class DocumentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_doc: int
    titulo: str
    tipo: TipoDocumentoLiteral
    categoria: str | None = None
    descricao: str | None = None
    palavras_chave: list[str] = Field(default_factory=list)
    nome_arquivo: str
    mime_type: str
    tamanho_bytes: int
    codigo: str | None = None
    versao: int = 1
    ativo: bool = True
    status_versao: Literal["VIGENTE", "ARQUIVADO"] = "VIGENTE"
    justificativa: str | None = None
    resumo: str | None = None
    status_indexacao: str = "PENDENTE"
    autor: AutorDocumentoOut | None = None
    data_upload: datetime
    data_atualizacao: datetime | None = None
    url_visualizar: str | None = None
    url_download: str | None = None


class PaginadoDocumentosOut(BaseModel):
    itens: list[DocumentoOut]
    total: int
    pagina: int
    tamanho: int

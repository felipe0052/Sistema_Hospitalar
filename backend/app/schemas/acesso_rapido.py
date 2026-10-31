from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, TypeAdapter, field_validator

_HTTP_URL_ADAPTER = TypeAdapter(HttpUrl)


def validar_url_http(valor: str) -> str:
    if not isinstance(valor, str):
        raise ValueError("Informe uma URL válida iniciada por http:// ou https://.")
    limpo = valor.strip()
    if not limpo:
        raise ValueError("A URL é obrigatória.")
    if len(limpo) > 500:
        raise ValueError("A URL deve ter no máximo 500 caracteres.")
    validada = _HTTP_URL_ADAPTER.validate_python(limpo)
    if validada.scheme not in ("http", "https") or not validada.host:
        raise ValueError("A URL deve utilizar apenas os protocolos http ou https.")
    return limpo


class AcessoRapidoBase(BaseModel):
    titulo: str = Field(min_length=2, max_length=80)
    url: str = Field(min_length=4, max_length=500)
    descricao: str | None = Field(default=None, max_length=200)
    icone: str = Field(default="compass", max_length=30)
    ordem: int = Field(default=0, ge=0, le=9999)
    ativo: bool = True

    @field_validator("titulo", mode="before")
    @classmethod
    def _limpar_titulo(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("descricao", mode="before")
    @classmethod
    def _limpar_descricao(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            limpo = v.strip()
            return limpo if limpo else None
        return v

    @field_validator("icone", mode="before")
    @classmethod
    def _limpar_icone(cls, v: str | None) -> str:
        if not v or not isinstance(v, str) or not v.strip():
            return "compass"
        return v.strip()

    @field_validator("url", mode="before")
    @classmethod
    def _validar_url(cls, v: str) -> str:
        return validar_url_http(v)


class AcessoRapidoCreate(AcessoRapidoBase):
    pass


class AcessoRapidoUpdate(AcessoRapidoBase):
    pass


class AcessoRapidoAtivoIn(BaseModel):
    ativo: bool | None = None


class AcessoRapidoOrdemIn(BaseModel):
    ids: list[int] = Field(min_length=1)


class AcessoRapidoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    url: str
    descricao: str | None = None
    icone: str = "compass"
    ordem: int = 0
    ativo: bool
    criado_por: int | None = None
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None

    @field_validator("ativo", mode="before")
    @classmethod
    def _converter_ativo(cls, v: int | bool) -> bool:
        return bool(v)

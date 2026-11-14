from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.acesso_rapido import validar_url_http


class LinkAniversarioIn(BaseModel):
    titulo: str = Field(min_length=2, max_length=80)
    url: str = Field(min_length=4, max_length=500)
    ativo: bool = True

    @field_validator("titulo", mode="before")
    @classmethod
    def _limpar_titulo(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("url", mode="before")
    @classmethod
    def _validar_url(cls, v: str) -> str:
        return validar_url_http(v)


class LinkAniversarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    url: str
    ativo: bool
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None

    @field_validator("ativo", mode="before")
    @classmethod
    def _converter_ativo(cls, v: int | bool) -> bool:
        return bool(v)


class ConfiguracaoAniversarioIn(BaseModel):
    mensagem: str = Field(min_length=5, max_length=2000)
    titulo: str | None = Field(default=None, max_length=120)
    assinatura: str | None = Field(default=None, max_length=150)

    @field_validator("mensagem", mode="before")
    @classmethod
    def _limpar_mensagem(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class ConfiguracaoAniversarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mensagem: str
    titulo: str
    assinatura: str
    atualizado_em: datetime | None = None


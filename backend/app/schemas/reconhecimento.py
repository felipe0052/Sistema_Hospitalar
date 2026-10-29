from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TipoReconhecimentoLiteral = Literal["PROMOCAO", "DESTAQUE", "TEMPO_DE_CASA", "AGRADECIMENTO"]
StatusIndicacaoLiteral = Literal["PENDENTE", "APROVADA", "RECUSADA"]


def _limpar(v):
    return " ".join(v.split()) if isinstance(v, str) else v


class SetorResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str


class PessoaResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str


class ColaboradorReconhecidoOut(PessoaResumoOut):
    cargo: str | None = None
    setor: SetorResumoOut | None = None


class ReconhecimentoIn(BaseModel):
    id_colaborador: int
    tipo: TipoReconhecimentoLiteral
    titulo: str = Field(min_length=3, max_length=200)
    mensagem: str = Field(min_length=3, max_length=2000)
    id_indicacao: int | None = None

    @field_validator("titulo", mode="before")
    @classmethod
    def _limpar_titulo(cls, v):
        return _limpar(v)

    @field_validator("mensagem", mode="before")
    @classmethod
    def _limpar_mensagem(cls, v):
        return v.strip() if isinstance(v, str) else v


class ReconhecimentoUpdate(BaseModel):
    tipo: TipoReconhecimentoLiteral
    titulo: str = Field(min_length=3, max_length=200)
    mensagem: str = Field(min_length=3, max_length=2000)

    @field_validator("titulo", mode="before")
    @classmethod
    def _limpar_titulo(cls, v):
        return _limpar(v)

    @field_validator("mensagem", mode="before")
    @classmethod
    def _limpar_mensagem(cls, v):
        return v.strip() if isinstance(v, str) else v


class ReconhecimentoOut(BaseModel):
    id_reconhecimento: int
    tipo: TipoReconhecimentoLiteral
    titulo: str
    mensagem: str
    data_criacao: datetime
    colaborador: ColaboradorReconhecidoOut
    autor: PessoaResumoOut | None = None


class PaginadoReconhecimentosOut(BaseModel):
    itens: list[ReconhecimentoOut]
    total: int
    pagina: int
    tamanho: int


class IndicacaoIn(BaseModel):
    id_indicado: int
    motivo: str = Field(min_length=3, max_length=2000)

    @field_validator("motivo", mode="before")
    @classmethod
    def _limpar_motivo(cls, v):
        return v.strip() if isinstance(v, str) else v


class IndicacaoOut(BaseModel):
    id_indicacao: int
    indicado: ColaboradorReconhecidoOut
    indicante: PessoaResumoOut
    motivo: str
    status: StatusIndicacaoLiteral
    id_reconhecimento: int | None = None
    data_indicacao: datetime
    data_avaliacao: datetime | None = None


class PaginadoIndicacoesOut(BaseModel):
    itens: list[IndicacaoOut]
    total: int
    pagina: int
    tamanho: int

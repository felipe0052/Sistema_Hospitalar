from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TipoReconhecimentoLiteral = Literal["PROMOCAO", "DESTAQUE", "TEMPO_DE_CASA", "AGRADECIMENTO"]
StatusIndicacaoLiteral = Literal["PENDENTE", "APROVADA", "RECUSADA"]
AlvoReconhecimentoLiteral = Literal["COLABORADOR", "SETOR"]


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
    alvo_tipo: AlvoReconhecimentoLiteral = "COLABORADOR"
    id_colaborador: int | None = None
    id_setor: int | None = None
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

    @model_validator(mode="after")
    def _validar_alvo(self):
        # Inferência automática caso alvo_tipo não tenha sido explicitamente ajustado
        if self.id_setor is not None and self.id_colaborador is None:
            object.__setattr__(self, "alvo_tipo", "SETOR")
        elif self.id_colaborador is not None and self.id_setor is None:
            object.__setattr__(self, "alvo_tipo", "COLABORADOR")

        if self.alvo_tipo == "SETOR":
            if self.id_setor is None:
                raise ValueError("Informe o setor a ser reconhecido.")
            if self.id_colaborador is not None:
                raise ValueError("Reconhecimento por setor não deve conter colaborador individual.")
        elif self.alvo_tipo == "COLABORADOR":
            if self.id_colaborador is None:
                raise ValueError("Informe o colaborador a ser reconhecido.")
            if self.id_setor is not None:
                raise ValueError("Reconhecimento individual não deve conter id_setor direto.")
        return self


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
    alvo_tipo: AlvoReconhecimentoLiteral = "COLABORADOR"
    tipo: TipoReconhecimentoLiteral
    titulo: str
    mensagem: str
    data_criacao: datetime
    colaborador: ColaboradorReconhecidoOut | None = None
    setor: SetorResumoOut | None = None
    autor: PessoaResumoOut | None = None


class PaginadoReconhecimentosOut(BaseModel):
    itens: list[ReconhecimentoOut]
    total: int
    pagina: int
    tamanho: int


class IndicacaoIn(BaseModel):
    alvo_tipo: AlvoReconhecimentoLiteral = "COLABORADOR"
    id_indicado: int | None = None
    id_setor: int | None = None
    motivo: str = Field(min_length=3, max_length=2000)

    @field_validator("motivo", mode="before")
    @classmethod
    def _limpar_motivo(cls, v):
        return v.strip() if isinstance(v, str) else v

    @model_validator(mode="after")
    def _validar_alvo(self):
        if self.id_setor is not None and self.id_indicado is None:
            object.__setattr__(self, "alvo_tipo", "SETOR")
        elif self.id_indicado is not None and self.id_setor is None:
            object.__setattr__(self, "alvo_tipo", "COLABORADOR")

        if self.alvo_tipo == "SETOR":
            if self.id_setor is None:
                raise ValueError("Informe o setor a ser indicado.")
            if self.id_indicado is not None:
                raise ValueError("Indicação por setor não deve conter id_indicado.")
        elif self.alvo_tipo == "COLABORADOR":
            if self.id_indicado is None:
                raise ValueError("Informe o colega a ser indicado.")
            if self.id_setor is not None:
                raise ValueError("Indicação individual não deve conter id_setor direto.")
        return self


class IndicacaoOut(BaseModel):
    id_indicacao: int
    alvo_tipo: AlvoReconhecimentoLiteral = "COLABORADOR"
    indicado: ColaboradorReconhecidoOut | None = None
    setor: SetorResumoOut | None = None
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

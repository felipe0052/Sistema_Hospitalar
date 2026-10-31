"""Schemas Pydantic do Diretório de Colaboradores e Guia de Ramais (UC10 — §7.9 e S4-T1)."""

from pydantic import BaseModel, ConfigDict, Field


class SetorDiretorioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str
    andar: str | None = None


class DiretorioColaboradorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nome: str
    cargo: str | None = None
    email: str | None = None
    setor: SetorDiretorioOut | None = None
    ramais: list[str] = Field(default_factory=list)


class PaginadoDiretorioOut(BaseModel):
    itens: list[DiretorioColaboradorOut]
    total: int
    pagina: int
    tamanho: int


class RamalGuiaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    numero: str
    descricao: str | None = None


class SetorGuiaRamaisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_setor: int
    nome: str
    ramais: list[RamalGuiaOut] = Field(default_factory=list)


class AndarRamaisGrupoOut(BaseModel):
    andar: str
    setores: list[SetorGuiaRamaisOut] = Field(default_factory=list)

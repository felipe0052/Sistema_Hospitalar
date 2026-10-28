from pydantic import BaseModel, ConfigDict, Field, field_validator


class FaqIn(BaseModel):
    pergunta: str = Field(min_length=5, max_length=500)
    resposta: str = Field(min_length=1)
    categoria: str = Field(min_length=1, max_length=100)
    ordem: int = Field(default=0, ge=0)

    @field_validator("pergunta", "resposta", "categoria", mode="before")
    @classmethod
    def _limpar_texto(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("ordem", mode="before")
    @classmethod
    def _normalizar_ordem(cls, v):
        if v is None or v == "":
            return 0
        return v


class FaqOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_faq: int
    pergunta: str
    resposta: str
    categoria: str
    ordem: int


class FaqCategoriaGrupoOut(BaseModel):
    categoria: str
    perguntas: list[FaqOut]

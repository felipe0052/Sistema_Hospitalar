from datetime import datetime
from typing import Literal

from pydantic import BaseModel

TipoNotificacaoLiteral = Literal["NOTICIA", "EVENTO", "EVENTO_DO_DIA", "RECONHECIMENTO"]


class NotificacaoOut(BaseModel):
    id_notificacao: int
    tipo: TipoNotificacaoLiteral
    id_referencia: int
    titulo: str
    link: str
    lida: bool
    data_criacao: datetime


class PaginadoNotificacoesOut(BaseModel):
    itens: list[NotificacaoOut]
    total: int
    pagina: int
    tamanho: int


class ContagemNaoLidasOut(BaseModel):
    total: int

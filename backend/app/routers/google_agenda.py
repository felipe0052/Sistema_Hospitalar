from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.exceptions import AppError
from app.models.usuario import Usuario
from app.services import google_agenda_service as service

router = APIRouter(prefix="/google-agenda", tags=["Integração Google Agenda"])


def _retorno_front(resultado: str) -> RedirectResponse:
    return RedirectResponse(f"{settings.FRONTEND_URL.rstrip('/')}/eventos?google={resultado}")


@router.get("/status")
def obter_status(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)) -> dict:
    return service.status(db, usuario)


@router.get("/conectar")
def conectar(usuario: Usuario = Depends(get_current_user)) -> dict[str, str]:
    """Devolve a URL de autorização do Google; o front redireciona o navegador para ela (opt-in)."""
    return {"url": service.gerar_url_conexao(usuario)}


@router.get("/callback", include_in_schema=False)
def callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Retorno do Google (redirecionamento do navegador, sem header Authorization)."""
    if error or not code or not state:
        return _retorno_front("negado")
    try:
        service.concluir_conexao(db, code, state)
    except AppError:
        return _retorno_front("erro")
    return _retorno_front("conectado")


class PreferenciasIn(BaseModel):
    receber_todos: bool


@router.put("/preferencias")
def definir_preferencias(
    payload: PreferenciasIn, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)
) -> dict[str, int | bool]:
    """Liga/desliga "receber todos os eventos". Ao ligar, devolve quantos eventos foram enviados agora."""
    novos = service.definir_receber_todos(db, usuario, payload.receber_todos)
    return {"receber_todos": payload.receber_todos, "adicionados": novos}


@router.post("/sincronizar")
def sincronizar(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)) -> dict:
    """Envia os eventos futuros à agenda Google do usuário e devolve o resumo (criados, erros...)."""
    return service.sincronizar(db, usuario)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def desconectar(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)) -> Response:
    service.desconectar(db, usuario)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/eventos/{id_evento}", status_code=status.HTTP_204_NO_CONTENT)
def adicionar_evento(
    id_evento: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)
) -> Response:
    service.adicionar_evento(db, usuario, id_evento)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/eventos/{id_evento}", status_code=status.HTTP_204_NO_CONTENT)
def remover_evento(
    id_evento: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)
) -> Response:
    service.remover_evento(db, usuario, id_evento)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

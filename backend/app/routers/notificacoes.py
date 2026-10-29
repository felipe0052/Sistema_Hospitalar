"""Notificações internas do site (S5-T4)."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.schemas.notificacao import ContagemNaoLidasOut, PaginadoNotificacoesOut
from app.services import notificacao_service

router = APIRouter(prefix="/notificacoes", tags=["Notificações"])


@router.get("", response_model=PaginadoNotificacoesOut)
def listar_notificacoes(
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    apenas_nao_lidas: bool = Query(default=False),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> PaginadoNotificacoesOut:
    """Lista as notificações do usuário, mais recentes primeiro."""
    return notificacao_service.listar(db, usuario_atual, pagina, tamanho, apenas_nao_lidas)


@router.get("/nao-lidas/contagem", response_model=ContagemNaoLidasOut)
def contar_nao_lidas(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> ContagemNaoLidasOut:
    """Total de notificações não lidas (consultado por polling pelo Header)."""
    return ContagemNaoLidasOut(total=notificacao_service.contar_nao_lidas(db, usuario_atual))


@router.post("/marcar-todas-lidas", status_code=status.HTTP_204_NO_CONTENT)
def marcar_todas_lidas(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Response:
    notificacao_service.marcar_todas_lidas(db, usuario_atual)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{id_notificacao}/lida", status_code=status.HTTP_204_NO_CONTENT)
def marcar_lida(
    id_notificacao: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> Response:
    notificacao_service.marcar_lida(db, usuario_atual, id_notificacao)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

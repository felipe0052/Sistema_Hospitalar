from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.usuario import Usuario
from app.schemas.acesso_rapido import (
    AcessoRapidoAtivoIn,
    AcessoRapidoCreate,
    AcessoRapidoOrdemIn,
    AcessoRapidoOut,
    AcessoRapidoUpdate,
)
from app.services.acesso_rapido_service import (
    alterar_ativo_acesso_rapido,
    atualizar_acesso_rapido,
    criar_acesso_rapido,
    excluir_acesso_rapido,
    listar_ativos,
    listar_todos_admin,
    reordenar_acessos_rapidos,
)

router = APIRouter(prefix="/acessos-rapidos", tags=["Acessos Rápidos"])


@router.get("", response_model=list[AcessoRapidoOut])
def rota_listar_acessos_rapidos(
    db: Session = Depends(get_db),
    _usuario: Usuario = Depends(get_current_user),
):
    return listar_ativos(db)


@router.get("/admin", response_model=list[AcessoRapidoOut])
def rota_listar_acessos_rapidos_admin(
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    return listar_todos_admin(db)


@router.post("", response_model=AcessoRapidoOut, status_code=status.HTTP_201_CREATED)
def rota_criar_acesso_rapido(
    dados: AcessoRapidoCreate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_roles("ADMIN")),
):
    return criar_acesso_rapido(db, dados, admin)


@router.put("/ordem", response_model=list[AcessoRapidoOut])
def rota_reordenar_acessos_rapidos(
    payload: AcessoRapidoOrdemIn | list[int],
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    ids = payload.ids if isinstance(payload, AcessoRapidoOrdemIn) else payload
    return reordenar_acessos_rapidos(db, ids)


@router.put("/{id_acesso}", response_model=AcessoRapidoOut)
def rota_atualizar_acesso_rapido(
    id_acesso: int,
    dados: AcessoRapidoUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    return atualizar_acesso_rapido(db, id_acesso, dados)


@router.patch("/{id_acesso}/ativo", response_model=AcessoRapidoOut)
def rota_alterar_ativo_acesso_rapido(
    id_acesso: int,
    payload: AcessoRapidoAtivoIn | None = Body(default=None),
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    ativo = payload.ativo if payload is not None else None
    return alterar_ativo_acesso_rapido(db, id_acesso, ativo)


@router.delete("/{id_acesso}", status_code=status.HTTP_204_NO_CONTENT)
def rota_excluir_acesso_rapido(
    id_acesso: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    excluir_acesso_rapido(db, id_acesso)
    return None

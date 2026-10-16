from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_perfil
from app.models.enums import Perfil
from app.models.usuario import UsuarioModel
from app.schemas.aviso import AvisoCreate, AvisoOut, AvisoUpdate
from app.services import aviso_service

router = APIRouter(prefix="/avisos", tags=["Comunicação Interna"])

# RN08 — somente estes perfis publicam/gerenciam avisos e eventos.
_PERFIS_GESTAO_AVISOS = (Perfil.ADMINISTRADOR, Perfil.RH, Perfil.MARKETING)


@router.get("", response_model=list[AvisoOut])
def listar_avisos(categoria: str | None = None, db: Session = Depends(get_db)) -> list[AvisoOut]:
    """Mural de avisos & destaques, filtrável por categoria."""
    return aviso_service.listar(db, categoria)


@router.get("/eventos", response_model=list[AvisoOut])
def listar_eventos(db: Session = Depends(get_db)) -> list[AvisoOut]:
    """Mural de eventos: avisos cuja categoria seja 'Evento'."""
    return aviso_service.listar_eventos(db)


@router.get("/{id_aviso}", response_model=AvisoOut)
def obter_aviso(id_aviso: int, db: Session = Depends(get_db)) -> AvisoOut:
    return aviso_service.obter(db, id_aviso)


@router.post("", response_model=AvisoOut, status_code=status.HTTP_201_CREATED)
def criar_aviso(
    payload: AvisoCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(require_perfil(*_PERFIS_GESTAO_AVISOS)),
) -> AvisoOut:
    """Criação de avisos — restrita a Administrador, RH e Marketing (RN08/RN09)."""
    return aviso_service.criar(db, payload, usuario_atual)


@router.put("/{id_aviso}", response_model=AvisoOut)
def atualizar_aviso(
    id_aviso: int,
    payload: AvisoUpdate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(require_perfil(*_PERFIS_GESTAO_AVISOS)),
) -> AvisoOut:
    """Edição — Administrador edita qualquer aviso; RH/Marketing só os próprios (RN08)."""
    return aviso_service.atualizar(db, id_aviso, payload, usuario_atual)


@router.delete("/{id_aviso}", status_code=status.HTTP_204_NO_CONTENT)
def remover_aviso(
    id_aviso: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(require_perfil(*_PERFIS_GESTAO_AVISOS)),
) -> None:
    """Exclusão — Administrador exclui qualquer aviso; RH/Marketing só os próprios (RN08)."""
    aviso_service.remover(db, id_aviso, usuario_atual)

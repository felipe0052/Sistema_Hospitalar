from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import UsuarioModel
from app.db.session import get_db
from app.schemas.aviso import AvisoCreate, AvisoOut
from app.services import aviso_service

router = APIRouter(prefix="/avisos", tags=["Comunicação Interna"])


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
    usuario_atual: UsuarioModel = Depends(get_current_user),
) -> AvisoOut:
    """Criação de avisos — restrito a usuários autenticados."""
    return aviso_service.criar(db, payload, usuario_atual)

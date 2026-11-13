from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.usuario import Usuario
from app.schemas.link_aniversario import LinkAniversarioIn, LinkAniversarioOut
from app.services import link_aniversario_service

router = APIRouter(prefix="/links-aniversario", tags=["Links de Aniversário"])


@router.get("", response_model=list[LinkAniversarioOut])
def listar_links_aniversario(
    db: Session = Depends(get_db),
    _usuario: Usuario = Depends(get_current_user),
):
    return link_aniversario_service.listar_ativos(db)


@router.get("/admin", response_model=list[LinkAniversarioOut])
def listar_links_aniversario_admin(
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    return link_aniversario_service.listar_todos(db)


@router.post("", response_model=LinkAniversarioOut, status_code=status.HTTP_201_CREATED)
def criar_link_aniversario(
    dados: LinkAniversarioIn,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_roles("ADMIN")),
):
    return link_aniversario_service.criar_link(db, dados, admin)


@router.put("/{id_link}", response_model=LinkAniversarioOut)
def atualizar_link_aniversario(
    id_link: int,
    dados: LinkAniversarioIn,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    return link_aniversario_service.atualizar_link(db, id_link, dados)


@router.delete("/{id_link}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_link_aniversario(
    id_link: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
):
    link_aniversario_service.excluir_link(db, id_link)
    return None

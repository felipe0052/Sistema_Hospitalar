"""Endpoints de Gestão de Setores e Ramais Telefônicos (UC08 — §7.3 e S3-T2)."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, require_roles
from app.models.usuario import Usuario
from app.schemas.setor import SetorIn, SetorOut
from app.services import setor_service

router = APIRouter(prefix="/setores", tags=["Setores e Ramais"])


@router.get("", response_model=list[SetorOut])
def listar_setores(
    busca: str | None = Query(default=None, description="Busca por nome do setor ou número/descrição de ramal"),
    andar: str | None = Query(default=None, description="Filtro por andar (ex.: Térreo, 2º andar)"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[SetorOut]:
    """Lista todos os setores ordenados por nome, com ramais vinculados e contagem de colaboradores (§7.3)."""
    return setor_service.listar_setores(db=db, busca=busca, andar=andar)


@router.get("/{id_setor}", response_model=SetorOut)
def obter_setor(
    id_setor: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> SetorOut:
    """Obtém os detalhes de um setor e seus ramais pelo ID (§7.3)."""
    return setor_service.obter_setor(db, id_setor)


@router.post("", response_model=SetorOut, status_code=status.HTTP_201_CREATED)
def criar_setor(
    payload: SetorIn,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN")),
) -> SetorOut:
    """Cadastra um novo setor hospitalar e seus ramais telefônicos (UC08 — apenas ADMIN)."""
    return setor_service.criar_setor(db, payload)


@router.put("/{id_setor}", response_model=SetorOut)
def atualizar_setor(
    id_setor: int,
    payload: SetorIn,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN")),
) -> SetorOut:
    """Atualiza o setor e substitui atomicamente sua lista de ramais (UC08 — apenas ADMIN)."""
    return setor_service.atualizar_setor(db, id_setor, payload)


@router.delete("/{id_setor}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_setor(
    id_setor: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN")),
) -> Response:
    """Exclui um setor caso não possua colaboradores vinculados (UC08 — apenas ADMIN)."""
    setor_service.excluir_setor(db, id_setor)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.usuario import AniversarianteOut, SetorOut, UsuarioOut
from app.services import usuario_service

router = APIRouter(prefix="/usuarios", tags=["Diretório & Ramais"])


@router.get("/contatos", response_model=list[UsuarioOut])
def listar_contatos(
    id_setor: int | None = None,
    busca: str | None = None,
    db: Session = Depends(get_db),
) -> list[UsuarioOut]:
    """Guia de colaboradores, cargos, setores e ramais, com busca por nome e setor."""
    return usuario_service.listar_contatos(db, id_setor, busca)


@router.get("/aniversariantes", response_model=list[AniversarianteOut])
def listar_aniversariantes(
    mes: int | None = None,
    dia: int | None = None,
    id_setor: int | None = None,
    db: Session = Depends(get_db),
) -> list[AniversarianteOut]:
    """Aniversariantes do mês vigente (padrão) ou do mês/dia/setor informados."""
    return usuario_service.listar_aniversariantes(db, mes, dia, id_setor)


@router.get("/setores", response_model=list[SetorOut])
def listar_setores(db: Session = Depends(get_db)) -> list[SetorOut]:
    """Lista de setores — apoio para filtros do front-end (diretório, cadastro)."""
    return usuario_service.listar_setores(db)

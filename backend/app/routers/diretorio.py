"""Endpoints de Diretório de Colaboradores e Guia de Ramais por Andar (UC10 — §7.9 e S4-T1)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.usuario import Usuario
from app.schemas.diretorio import AndarRamaisGrupoOut, PaginadoDiretorioOut
from app.services import diretorio_service

router = APIRouter(prefix="/diretorio", tags=["Diretório e Ramais"])


@router.get("", response_model=PaginadoDiretorioOut)
def listar_diretorio(
    busca: str | None = Query(
        default=None,
        description="Busca por nome ou cargo (sem diferenciar maiúsculas/acentos)",
    ),
    id_setor: int | None = Query(default=None, description="Filtro por ID do setor"),
    andar: str | None = Query(default=None, description="Filtro por andar (ex.: Térreo, 2º andar)"),
    pagina: int = Query(default=1, ge=1, description="Número da página"),
    tamanho: int = Query(default=20, ge=1, le=100, description="Itens por página (máx. 100)"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> PaginadoDiretorioOut:
    """Lista colaboradores ativos no diretório institucional com setor, andar e ramais (UC10)."""
    return diretorio_service.listar_diretorio(
        db=db,
        busca=busca,
        id_setor=id_setor,
        andar=andar,
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/ramais", response_model=list[AndarRamaisGrupoOut])
def listar_ramais_por_andar(
    busca: str | None = Query(
        default=None,
        description="Busca por nome do setor, descrição ou número de ramal",
    ),
    andar: str | None = Query(default=None, description="Filtro por andar"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[AndarRamaisGrupoOut]:
    """Retorna o guia telefônico estruturado agrupando setores e ramais por andar (§7.9 e S4-T1)."""
    return diretorio_service.listar_ramais_por_andar(
        db=db,
        busca=busca,
        andar=andar,
    )

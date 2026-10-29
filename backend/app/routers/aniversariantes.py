"""Endpoints de Aniversariantes do Mês (UC11 — §7.6 e S4-T1)."""


from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.usuario import Usuario
from app.schemas.aniversariante import AniversarianteOut
from app.services import aniversariante_service

router = APIRouter(prefix="/aniversariantes", tags=["Aniversariantes"])


@router.get("", response_model=list[AniversarianteOut])
def listar_aniversariantes(
    mes: int | None = Query(
        default=None,
        ge=1,
        le=12,
        description="Mês (1–12; padrão: mês atual da requisição)",
    ),
    dia: int | None = Query(
        default=None,
        ge=1,
        le=31,
        description="Filtro opcional por dia do mês (1–31)",
    ),
    id_setor: int | None = Query(default=None, description="Filtro opcional por ID do setor"),
    busca: str | None = Query(
        default=None,
        description="Busca textual por nome do colaborador (sem diferenciar maiúsculas/acentos)",
    ),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[AniversarianteOut]:
    """
    Lista colaboradores ativos que fazem aniversário no mês informado (UC11).
    Por privacidade obrigatória, nunca retorna ano de nascimento nem idade.
    """
    return aniversariante_service.listar_aniversariantes(
        db=db,
        mes=mes or aniversariante_service.obter_hoje_brasil().month,
        dia=dia,
        id_setor=id_setor,
        busca=busca,
    )

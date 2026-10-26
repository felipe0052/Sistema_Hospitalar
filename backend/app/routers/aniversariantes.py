from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.usuario import Usuario
from app.schemas.dashboard import AniversarianteResumoOut
from app.services import dashboard_service

router = APIRouter(prefix="/aniversariantes", tags=["Aniversariantes"])


@router.get("", response_model=list[AniversarianteResumoOut])
def listar_aniversariantes(
    mes: int | None = Query(default=None, ge=1, le=12, description="Mês (1-12); padrão: mês atual"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[AniversarianteResumoOut]:
    """Aniversariantes ativos do mês, ordenados por dia (sem expor ano de nascimento)."""
    return dashboard_service.listar_aniversariantes_mes(db, mes or date.today().month)

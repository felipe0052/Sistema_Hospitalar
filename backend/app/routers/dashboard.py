from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user
from app.models.usuario import Usuario
from app.schemas.dashboard import DashboardOut
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard (Início)"])


@router.get("", response_model=DashboardOut)
def obter_dashboard(
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> DashboardOut:
    """Retorna os blocos consolidados da tela inicial (destaques, últimos avisos, próximos eventos e aniversariantes — §7.10)."""
    return dashboard_service.obter_dashboard(db)

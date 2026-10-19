from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.db.models import UsuarioModel
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import UsuarioCreate, UsuarioOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Autenticação e emissão de token JWT."""
    return auth_service.autenticar(db, payload)


@router.post("/registrar", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def registrar(payload: UsuarioCreate, db: Session = Depends(get_db)) -> UsuarioOut:
    usuario = auth_service.registrar(db, payload)
    return UsuarioOut.model_validate(usuario)


@router.get("/me", response_model=UsuarioOut)
def me(usuario: UsuarioModel = Depends(get_current_user)) -> UsuarioOut:
    """Valida o token e retorna o colaborador autenticado sem expor a senha."""
    return UsuarioOut.model_validate(usuario)

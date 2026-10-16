from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_perfil
from app.models.enums import Perfil
from app.models.usuario import UsuarioModel
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import AlterarSenhaRequest, UsuarioCreate, UsuarioOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Autenticação e emissão de token JWT (RN02 bloqueia usuários inativos)."""
    return auth_service.autenticar(db, payload)


@router.post("/registrar", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def registrar(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(require_perfil(Perfil.ADMINISTRADOR, Perfil.RH)),
) -> UsuarioOut:
    """Cadastro de colaborador — restrito a Administrador/RH (RN09). A conta
    nasce com `senha_provisoria=true`; o próprio usuário troca a senha no
    primeiro acesso via `PATCH /auth/senha` (RN07)."""
    usuario = auth_service.registrar(db, payload)
    return UsuarioOut.model_validate(usuario)


@router.patch("/senha", response_model=UsuarioOut)
def alterar_senha(
    payload: AlterarSenhaRequest,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_current_user),
) -> UsuarioOut:
    """RN07 — troca de senha. Usa `get_current_user` (sem o guard de senha
    definitiva) para que o próprio usuário em primeiro acesso consiga chegar
    até aqui e só então ter `senha_provisoria` liberada."""
    usuario = auth_service.alterar_senha(db, usuario_atual, payload)
    return UsuarioOut.model_validate(usuario)

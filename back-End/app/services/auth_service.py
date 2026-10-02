from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import UsuarioModel
from app.repositories import usuario_repository
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import UsuarioCreate, UsuarioOut


def autenticar(db: Session, dados: LoginRequest) -> TokenResponse:
    usuario = usuario_repository.obter_por_email(db, dados.email)
    if usuario is None or not verify_password(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )

    token = create_access_token(subject=usuario.email)
    return TokenResponse(access_token=token, usuario=UsuarioOut.model_validate(usuario))


def registrar(db: Session, dados: UsuarioCreate) -> UsuarioModel:
    """Cadastro de colaborador. Em produção, restringir a RH/administradores."""
    if usuario_repository.obter_por_email(db, dados.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

    return usuario_repository.criar(db, dados, senha_hash=hash_password(dados.senha))

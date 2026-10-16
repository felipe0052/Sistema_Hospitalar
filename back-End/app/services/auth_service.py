from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import StatusUsuario
from app.models.usuario import UsuarioModel
from app.repositories import usuario_repository
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import AlterarSenhaRequest, UsuarioCreate, UsuarioOut


def autenticar(db: Session, dados: LoginRequest) -> TokenResponse:
    usuario = usuario_repository.obter_por_email(db, dados.email)
    if usuario is None or not verify_password(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )

    # RN02 — usuários com status "Inativo" não podem autenticar.
    if usuario.status != StatusUsuario.ATIVO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    token = create_access_token(
        id_usuario=usuario.id_usuario,
        email=usuario.email,
        perfil=usuario.perfil.value,
    )
    return TokenResponse(access_token=token, usuario=UsuarioOut.model_validate(usuario))


def registrar(db: Session, dados: UsuarioCreate) -> UsuarioModel:
    """Cadastro de colaborador — a rota já restringe a chamada a
    Administrador/RH (ver `routers/auth.py`). A força da senha (RN07) já é
    validada no schema `UsuarioCreate`."""
    if usuario_repository.obter_por_email(db, dados.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email já cadastrado")

    return usuario_repository.criar(db, dados, senha_hash=hash_password(dados.senha))


def alterar_senha(db: Session, usuario_atual: UsuarioModel, dados: AlterarSenhaRequest) -> UsuarioModel:
    """RN07 — troca de senha, obrigatória enquanto `senha_provisoria` for `true`."""
    if not verify_password(dados.senha_atual, usuario_atual.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha atual incorreta")

    return usuario_repository.atualizar_senha(db, usuario_atual, hash_password(dados.nova_senha))

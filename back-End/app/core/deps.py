from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.enums import Perfil, StatusUsuario
from app.models.usuario import UsuarioModel
from app.repositories import usuario_repository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

_CREDENCIAIS_INVALIDAS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Não foi possível validar as credenciais",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UsuarioModel:
    if token is None:
        raise _CREDENCIAIS_INVALIDAS

    payload = decode_access_token(token)
    if payload is None or payload.get("sub") is None:
        raise _CREDENCIAIS_INVALIDAS

    usuario = usuario_repository.obter_por_email(db, payload["sub"])
    if usuario is None:
        raise _CREDENCIAIS_INVALIDAS

    # RN02 — usuários com status "Inativo" não podem manter sessão autenticada,
    # mesmo que já possuam um token válido emitido anteriormente.
    if usuario.status != StatusUsuario.ATIVO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    return usuario


def get_current_user_senha_definitiva(
    usuario_atual: UsuarioModel = Depends(get_current_user),
) -> UsuarioModel:
    """RN07 — bloqueia o acesso às demais rotas enquanto a senha for
    provisória (primeiro acesso). A própria rota de troca de senha usa
    `get_current_user` diretamente para não cair nesse bloqueio."""
    if usuario_atual.senha_provisoria:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Troca de senha obrigatória no primeiro acesso",
        )
    return usuario_atual


def require_perfil(*perfis_permitidos: Perfil):
    """RN09 — RBAC: fábrica de dependência que restringe uma rota aos
    perfis informados. Uso: `Depends(require_perfil(Perfil.ADMINISTRADOR))`.
    """

    def verificar_permissao(
        usuario_atual: UsuarioModel = Depends(get_current_user_senha_definitiva),
    ) -> UsuarioModel:
        if usuario_atual.perfil not in perfis_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil sem permissão para executar esta ação",
            )
        return usuario_atual

    return verificar_permissao

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.exceptions import NaoAutorizado, Proibido
from app.core.security import decodificar_token
from app.models.usuario import Usuario

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    if credentials is None or not credentials.credentials:
        raise NaoAutorizado("Sessão expirada. Faça login novamente.")

    payload = decodificar_token(credentials.credentials)
    sub = payload.get("sub")
    if sub is None:
        raise NaoAutorizado("Sessão expirada. Faça login novamente.")

    try:
        id_usuario = int(sub)
    except (TypeError, ValueError) as exc:
        raise NaoAutorizado("Sessão expirada. Faça login novamente.") from exc

    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor))
        .filter(Usuario.id_usuario == id_usuario)
        .first()
    )
    if usuario is None:
        raise NaoAutorizado("Sessão expirada. Faça login novamente.")

    if usuario.status == "INATIVO":
        raise Proibido("Usuário inativo. Procure o administrador.")

    if payload.get("ver") != usuario.versao_token:
        raise NaoAutorizado("Sessão expirada. Faça login novamente.")

    return usuario


def require_roles(*perfis: str):
    """Dependência que devolve 403 'Permissão insuficiente.' se o perfil não estiver na lista (§5)."""

    def _verificar(usuario_atual: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario_atual.perfil not in perfis:
            raise Proibido("Permissão insuficiente.")
        return usuario_atual

    return _verificar

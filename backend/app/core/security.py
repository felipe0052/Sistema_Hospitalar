from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt

try:
    import jwt as _pyjwt

    _USE_PYJWT = True
except ImportError:  # pragma: no cover
    from jose import JWTError, jwt as _jose_jwt

    _USE_PYJWT = False

from app.core.config import settings
from app.core.exceptions import NaoAutorizado

ALGORITHM = "HS256"


def gerar_hash_senha(senha: str) -> str:
    """Gera hash seguro da senha usando bcrypt (§2 e S1-T3)."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha.encode("utf-8"), salt).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """Verifica senha em texto contra hash bcrypt salvo no banco."""
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except ValueError:
        return False


def criar_token(usuario: Any) -> str:
    """Cria token JWT HS256 com payload {sub, perfil, ver, exp} (§5 do Contexto Global)."""
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRES_MINUTES)
    payload = {
        "sub": str(usuario.id_usuario),
        "perfil": str(usuario.perfil),
        "ver": int(usuario.versao_token),
        "exp": exp,
    }
    if _USE_PYJWT:
        token = _pyjwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)
        return token if isinstance(token, str) else token.decode("utf-8")
    return _jose_jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decodificar_token(token: str) -> dict[str, Any]:
    """Decodifica e valida token JWT; lança NaoAutorizado (401) se inválido ou expirado."""
    try:
        if _USE_PYJWT:
            return _pyjwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return _jose_jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except Exception as exc:
        raise NaoAutorizado("Sessão expirada. Faça login novamente.") from exc

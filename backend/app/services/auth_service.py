from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NaoAutorizado, Proibido
from app.core.security import criar_token, verificar_senha
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import UsuarioOut


def login(db: Session, dados: LoginRequest) -> TokenResponse:
    email_normalizado = dados.email.strip().lower()
    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor))
        .filter(func.lower(Usuario.email) == email_normalizado)
        .first()
    )

    if usuario is None or not verificar_senha(dados.senha, usuario.senha_hash):
        raise NaoAutorizado("E-mail ou senha inválidos")

    if usuario.status == "INATIVO":
        raise Proibido("Usuário inativo. Procure o administrador.")

    token = criar_token(usuario)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        usuario=UsuarioOut.model_validate(usuario),
    )

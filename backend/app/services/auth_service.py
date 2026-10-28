from datetime import datetime, timedelta, timezone
import threading

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import MuitasTentativas, NaoAutorizado, Proibido
from app.core.security import criar_token, verificar_senha
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.usuario import UsuarioOut

MAX_TENTATIVAS_LOGIN = 5
JANELA_BLOQUEIO_MINUTOS = 15

_lock_tentativas = threading.Lock()
_tentativas_falhas: dict[str, list[datetime]] = {}


def limpar_tentativas_login() -> None:
    """Limpa o registro em memória de tentativas de login (útil para testes e manutenção)."""
    with _lock_tentativas:
        _tentativas_falhas.clear()


def _chave_tentativa(email_norm: str, client_ip: str | None) -> str:
    ip_norm = (client_ip or "local").strip() or "local"
    return f"{ip_norm}:{email_norm}"


def _verificar_bloqueio_forca_bruta(chave: str, agora: datetime) -> None:
    limite = agora - timedelta(minutes=JANELA_BLOQUEIO_MINUTOS)
    with _lock_tentativas:
        historico = [dt for dt in _tentativas_falhas.get(chave, []) if dt >= limite]
        if historico:
            _tentativas_falhas[chave] = historico
        else:
            _tentativas_falhas.pop(chave, None)

        if len(historico) >= MAX_TENTATIVAS_LOGIN:
            raise MuitasTentativas(
                "Muitas tentativas de autenticação inválidas. Aguarde 15 minutos e tente novamente."
            )


def _registrar_falha_login(chave: str, agora: datetime) -> None:
    limite = agora - timedelta(minutes=JANELA_BLOQUEIO_MINUTOS)
    with _lock_tentativas:
        historico = [dt for dt in _tentativas_falhas.get(chave, []) if dt >= limite]
        historico.append(agora)
        _tentativas_falhas[chave] = historico


def _limpar_falhas_chave(chave: str) -> None:
    with _lock_tentativas:
        _tentativas_falhas.pop(chave, None)


def login(
    db: Session,
    dados: LoginRequest,
    client_ip: str | None = None,
    agora: datetime | None = None,
) -> TokenResponse:
    email_normalizado = dados.email.strip().lower()
    instante = agora or datetime.now(timezone.utc)
    chave = _chave_tentativa(email_normalizado, client_ip)

    _verificar_bloqueio_forca_bruta(chave, instante)

    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor))
        .filter(func.lower(Usuario.email) == email_normalizado)
        .first()
    )

    if usuario is None or not verificar_senha(dados.senha, usuario.senha_hash):
        _registrar_falha_login(chave, instante)
        raise NaoAutorizado("E-mail ou senha inválidos")

    _limpar_falhas_chave(chave)

    if usuario.status == "INATIVO":
        raise Proibido("Usuário inativo. Procure o administrador.")

    token = criar_token(usuario)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        usuario=UsuarioOut.model_validate(usuario),
    )

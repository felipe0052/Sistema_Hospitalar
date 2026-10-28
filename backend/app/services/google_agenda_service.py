"""Integração opcional com o Google Agenda (OAuth 2.0 + Calendar API v3, via REST/httpx)."""

import base64
from datetime import datetime, timedelta, timezone
import hashlib
from urllib.parse import urlencode

from cryptography.fernet import Fernet, InvalidToken
import httpx
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import NaoEncontrado, RegraNegocio
from app.models.evento import Evento
from app.models.google_agenda import EventoGoogle, IntegracaoGoogle
from app.models.usuario import Usuario

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
REVOKE_URL = "https://oauth2.googleapis.com/revoke"
CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
ESCOPO = "https://www.googleapis.com/auth/calendar.events"
FUSO = "America/Sao_Paulo"
TIMEOUT = 15


def configurado() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


def _exigir_configuracao() -> None:
    if not configurado():
        raise RegraNegocio("A integração com o Google Agenda não está configurada no servidor.")


# ---------- Criptografia do refresh token ----------
def _fernet() -> Fernet:
    chave = hashlib.sha256(f"google-agenda:{settings.JWT_SECRET}".encode()).digest()
    return Fernet(base64.urlsafe_b64encode(chave))


def _cifrar(texto: str) -> str:
    return _fernet().encrypt(texto.encode()).decode()


def _decifrar(texto: str) -> str:
    try:
        return _fernet().decrypt(texto.encode()).decode()
    except InvalidToken as exc:
        raise RegraNegocio("Conexão com o Google inválida. Conecte novamente.") from exc


# ---------- Chamadas HTTP (isoladas para facilitar testes) ----------
def _post_form(url: str, data: dict) -> httpx.Response:
    return httpx.post(url, data=data, timeout=TIMEOUT)


def _calendar(metodo: str, token: str, caminho: str = "", corpo: dict | None = None) -> httpx.Response:
    return httpx.request(
        metodo,
        f"{CALENDAR_URL}{caminho}",
        headers={"Authorization": f"Bearer {token}"},
        json=corpo,
        timeout=TIMEOUT,
    )


# ---------- Fluxo OAuth ----------
def gerar_url_conexao(usuario: Usuario) -> str:
    _exigir_configuracao()
    # "state" assinado: liga o retorno do Google ao usuário logado e expira em 10 minutos
    state = jwt.encode(
        {"sub": str(usuario.id_usuario), "exp": datetime.now(timezone.utc) + timedelta(minutes=10)},
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": ESCOPO,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def concluir_conexao(db: Session, code: str, state: str) -> None:
    _exigir_configuracao()
    try:
        id_usuario = int(jwt.decode(state, settings.JWT_SECRET, algorithms=["HS256"])["sub"])
    except Exception as exc:
        raise RegraNegocio("Solicitação de conexão inválida ou expirada. Tente novamente.") from exc

    resp = _post_form(
        TOKEN_URL,
        {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
    )
    dados = resp.json() if resp.content else {}
    refresh = dados.get("refresh_token")
    if resp.status_code != 200 or not refresh:
        raise RegraNegocio("O Google não autorizou a conexão. Tente novamente.")

    integracao = db.get(IntegracaoGoogle, id_usuario)
    if integracao is None:
        db.add(IntegracaoGoogle(id_usuario=id_usuario, refresh_token=_cifrar(refresh)))
    else:
        integracao.refresh_token = _cifrar(refresh)
    db.commit()


def _integracao(db: Session, usuario: Usuario) -> IntegracaoGoogle:
    integracao = db.get(IntegracaoGoogle, usuario.id_usuario)
    if integracao is None:
        raise RegraNegocio("Conecte sua conta do Google Agenda primeiro.")
    return integracao


def _access_token(db: Session, integracao: IntegracaoGoogle) -> str:
    resp = _post_form(
        TOKEN_URL,
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": _decifrar(integracao.refresh_token),
            "grant_type": "refresh_token",
        },
    )
    token = (resp.json() if resp.content else {}).get("access_token")
    if resp.status_code != 200 or not token:
        # Acesso revogado/expirado no Google: remove a conexão para o usuário reconectar
        if resp.status_code in (400, 401):
            _apagar_vinculos(db, integracao.id_usuario)
            db.commit()
        raise RegraNegocio("Sua conexão com o Google expirou. Conecte novamente.")
    return token


def _apagar_vinculos(db: Session, id_usuario: int) -> None:
    db.query(EventoGoogle).filter(EventoGoogle.id_usuario == id_usuario).delete()
    db.query(IntegracaoGoogle).filter(IntegracaoGoogle.id_usuario == id_usuario).delete()


def status(db: Session, usuario: Usuario) -> dict:
    conectado = db.get(IntegracaoGoogle, usuario.id_usuario) is not None
    ids = (
        [v.id_evento for v in db.query(EventoGoogle).filter(EventoGoogle.id_usuario == usuario.id_usuario)]
        if conectado
        else []
    )
    integracao = db.get(IntegracaoGoogle, usuario.id_usuario)
    return {
        "configurado": configurado(),
        "conectado": conectado,
        "receber_todos": bool(integracao and integracao.receber_todos == "S"),
        "eventos_adicionados": ids,
    }


def desconectar(db: Session, usuario: Usuario) -> None:
    integracao = db.get(IntegracaoGoogle, usuario.id_usuario)
    if integracao is None:
        return
    try:
        _post_form(REVOKE_URL, {"token": _decifrar(integracao.refresh_token)})
    except Exception:  # noqa: BLE001 - revogar é best-effort; a conexão local é removida de qualquer forma
        pass
    _apagar_vinculos(db, usuario.id_usuario)
    db.commit()


# ---------- Eventos ----------
def _corpo_evento(evento: Evento) -> dict:
    inicio = evento.data_inicio
    fim = evento.data_fim or (inicio + timedelta(hours=1))
    corpo = {
        "summary": evento.titulo,
        "start": {"dateTime": inicio.isoformat(), "timeZone": FUSO},
        "end": {"dateTime": fim.isoformat(), "timeZone": FUSO},
        "source": {"title": "Intranet Decós", "url": settings.FRONTEND_URL},
    }
    if evento.descricao:
        corpo["description"] = evento.descricao
    if evento.local:
        corpo["location"] = evento.local
    return corpo


def adicionar_evento(db: Session, usuario: Usuario, id_evento: int) -> None:
    _exigir_configuracao()
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if evento is None:
        raise NaoEncontrado("Evento não encontrado.")
    token = _access_token(db, _integracao(db, usuario))
    _enviar(db, usuario.id_usuario, evento, token)
    db.commit()


def _enviar(db: Session, id_usuario: int, evento: Evento, token: str) -> bool:
    """Cria ou atualiza o evento na agenda do usuário. Devolve True se criou uma cópia nova."""
    vinculo = (
        db.query(EventoGoogle)
        .filter(EventoGoogle.id_usuario == id_usuario, EventoGoogle.id_evento == evento.id_evento)
        .first()
    )
    if vinculo is not None:
        resp = _calendar("PUT", token, f"/{vinculo.google_event_id}", _corpo_evento(evento))
        if resp.status_code == 200:
            return False
        if resp.status_code not in (404, 410):
            raise RegraNegocio("Não foi possível atualizar o evento no Google Agenda.")
        db.delete(vinculo)  # apagado manualmente no Google: recria abaixo
        db.flush()

    resp = _calendar("POST", token, "", _corpo_evento(evento))
    if resp.status_code not in (200, 201):
        raise RegraNegocio("Não foi possível adicionar o evento ao Google Agenda.")
    db.add(EventoGoogle(id_usuario=id_usuario, id_evento=evento.id_evento, google_event_id=resp.json()["id"]))
    db.flush()
    return True


def definir_receber_todos(db: Session, usuario: Usuario, ativo: bool) -> int:
    """Liga/desliga o envio automático. Ao ligar, envia agora os eventos futuros que ainda não estão na agenda."""
    _exigir_configuracao()
    integracao = _integracao(db, usuario)
    integracao.receber_todos = "S" if ativo else "N"
    novos = 0
    if ativo:
        token = _access_token(db, integracao)
        ja_enviados = {v.id_evento for v in db.query(EventoGoogle).filter(EventoGoogle.id_usuario == usuario.id_usuario)}
        futuros = db.query(Evento).filter(Evento.data_inicio >= datetime.now()).order_by(Evento.data_inicio).all()
        for evento in futuros:
            if evento.id_evento not in ja_enviados and _enviar(db, usuario.id_usuario, evento, token):
                novos += 1
    db.commit()
    return novos


def sincronizar_criacao(db: Session, evento: Evento) -> None:
    """Evento novo na Intranet: envia para quem ativou "receber todos os eventos" (best-effort)."""
    if not configurado():
        return
    for integracao in db.query(IntegracaoGoogle).filter(IntegracaoGoogle.receber_todos == "S").all():
        try:
            _enviar(db, integracao.id_usuario, evento, _access_token(db, integracao))
            db.commit()
        except Exception:  # noqa: BLE001 - falha na agenda de um usuário não pode quebrar a criação do evento
            db.rollback()


def remover_evento(db: Session, usuario: Usuario, id_evento: int) -> None:
    vinculo = (
        db.query(EventoGoogle)
        .filter(EventoGoogle.id_usuario == usuario.id_usuario, EventoGoogle.id_evento == id_evento)
        .first()
    )
    if vinculo is None:
        return
    token = _access_token(db, _integracao(db, usuario))
    resp = _calendar("DELETE", token, f"/{vinculo.google_event_id}")
    if resp.status_code not in (200, 204, 404, 410):
        raise RegraNegocio("Não foi possível remover o evento do Google Agenda.")
    db.delete(vinculo)
    db.commit()


# ---------- Sincronização quando o evento muda na Intranet (best-effort) ----------
def _para_cada_vinculo(db: Session, id_evento: int, acao) -> None:
    for vinculo in db.query(EventoGoogle).filter(EventoGoogle.id_evento == id_evento).all():
        integracao = db.get(IntegracaoGoogle, vinculo.id_usuario)
        if integracao is None:
            continue
        try:
            acao(vinculo, _access_token(db, integracao))
        except Exception:  # noqa: BLE001 - falha na agenda de um usuário não pode quebrar a edição do evento
            db.rollback()


def sincronizar_atualizacao(db: Session, evento: Evento) -> None:
    if not configurado():
        return
    corpo = _corpo_evento(evento)
    _para_cada_vinculo(db, evento.id_evento, lambda v, t: _calendar("PUT", t, f"/{v.google_event_id}", corpo))


def sincronizar_exclusao(db: Session, id_evento: int) -> None:
    """Remove as cópias do Google. Deve ser chamado antes de excluir o evento (FK com EVENTOS_GOOGLE)."""
    if configurado():
        _para_cada_vinculo(db, id_evento, lambda v, t: _calendar("DELETE", t, f"/{v.google_event_id}"))
    db.query(EventoGoogle).filter(EventoGoogle.id_evento == id_evento).delete()

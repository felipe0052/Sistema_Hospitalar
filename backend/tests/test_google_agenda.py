"""Testes da integração opcional com o Google Agenda (chamadas HTTP ao Google simuladas)."""

from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.models.evento import Evento
from app.services import google_agenda_service as svc


class _Resp:
    def __init__(self, status=200, corpo=None):
        self.status_code = status
        self._corpo = corpo or {}
        self.content = b"x" if corpo is not None else b""

    def json(self):
        return self._corpo


@pytest.fixture
def google(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "cid.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "segredo")
    chamadas = []

    def post_form(url, data):
        chamadas.append(("POST_FORM", url, data))
        if url == svc.TOKEN_URL:
            if data["grant_type"] == "authorization_code":
                return _Resp(200, {"access_token": "at", "refresh_token": "rt-secreto"})
            return _Resp(200, {"access_token": "at"})
        return _Resp(200, {})

    def calendar(metodo, token, caminho="", corpo=None):
        chamadas.append((metodo, caminho, corpo))
        return _Resp(200, {"id": "g123"})

    monkeypatch.setattr(svc, "_post_form", post_form)
    monkeypatch.setattr(svc, "_calendar", calendar)
    return chamadas


def _headers(client, email="colaborador@decos.com.br", senha="Colab@123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _conectar(client, h):
    url = client.get("/api/v1/google-agenda/conectar", headers=h).json()["url"]
    state = parse_qs(urlparse(url).query)["state"][0]
    return client.get(
        "/api/v1/google-agenda/callback",
        params={"code": "abc", "state": state},
        follow_redirects=False,
    )


def _evento(db_session):
    ev = Evento(titulo="Treinamento BLS", categoria="TREINAMENTO", data_inicio=datetime.now() + timedelta(days=3))
    db_session.add(ev)
    db_session.commit()
    return ev.id_evento


def test_requer_login_e_configuracao(client: TestClient, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "")
    assert client.get("/api/v1/google-agenda/status").status_code == 401
    h = _headers(client)
    assert client.get("/api/v1/google-agenda/status", headers=h).json()["configurado"] is False
    assert client.get("/api/v1/google-agenda/conectar", headers=h).status_code == 400


def test_url_de_conexao_usa_escopo_minimo_e_offline(client: TestClient, google):
    url = client.get("/api/v1/google-agenda/conectar", headers=_headers(client)).json()["url"]
    q = parse_qs(urlparse(url).query)
    assert q["scope"] == [svc.ESCOPO] and q["access_type"] == ["offline"]
    assert q["client_id"] == ["cid.apps.googleusercontent.com"]
    assert q["redirect_uri"] == [settings.GOOGLE_REDIRECT_URI]


def test_callback_guarda_token_criptografado_e_status_conectado(client: TestClient, google, db_session):
    h = _headers(client)
    resp = _conectar(client, h)
    assert resp.status_code in (302, 307) and resp.headers["location"].endswith("/eventos?google=conectado")
    assert client.get("/api/v1/google-agenda/status", headers=h).json()["conectado"] is True

    from app.models.google_agenda import IntegracaoGoogle

    guardado = db_session.query(IntegracaoGoogle).one().refresh_token
    assert "rt-secreto" not in guardado and svc._decifrar(guardado) == "rt-secreto"


def test_callback_com_state_invalido_ou_negado(client: TestClient, google):
    r = client.get("/api/v1/google-agenda/callback", params={"code": "x", "state": "lixo"}, follow_redirects=False)
    assert r.headers["location"].endswith("google=erro")
    r = client.get("/api/v1/google-agenda/callback", params={"error": "access_denied"}, follow_redirects=False)
    assert r.headers["location"].endswith("google=negado")


def test_adicionar_atualizar_e_remover_evento(client: TestClient, google, db_session):
    h = _headers(client)
    id_evento = _evento(db_session)
    assert client.post(f"/api/v1/google-agenda/eventos/{id_evento}", headers=h).status_code == 400  # sem conexão

    _conectar(client, h)
    assert client.post(f"/api/v1/google-agenda/eventos/{id_evento}", headers=h).status_code == 204
    assert client.get("/api/v1/google-agenda/status", headers=h).json()["eventos_adicionados"] == [id_evento]
    insercao = [c for c in google if c[0] == "POST"][0]
    assert insercao[2]["summary"] == "Treinamento BLS" and insercao[2]["start"]["timeZone"] == svc.FUSO

    assert client.post(f"/api/v1/google-agenda/eventos/{id_evento}", headers=h).status_code == 204
    assert [c[0] for c in google].count("PUT") == 1  # segunda vez atualiza, não duplica

    assert client.delete(f"/api/v1/google-agenda/eventos/{id_evento}", headers=h).status_code == 204
    assert client.get("/api/v1/google-agenda/status", headers=h).json()["eventos_adicionados"] == []


def test_excluir_evento_na_intranet_remove_copia_no_google(client: TestClient, google, db_session):
    colab = _headers(client)
    admin = _headers(client, "admin@decos.com.br", "Admin@123")
    id_evento = _evento(db_session)
    _conectar(client, colab)
    client.post(f"/api/v1/google-agenda/eventos/{id_evento}", headers=colab)

    assert client.delete(f"/api/v1/eventos/{id_evento}", headers=admin).status_code == 204
    assert any(c[0] == "DELETE" and c[1] == "/g123" for c in google)
    assert client.get("/api/v1/google-agenda/status", headers=colab).json()["eventos_adicionados"] == []


def test_desconectar_revoga_e_apaga(client: TestClient, google):
    h = _headers(client)
    _conectar(client, h)
    assert client.delete("/api/v1/google-agenda", headers=h).status_code == 204
    assert client.get("/api/v1/google-agenda/status", headers=h).json()["conectado"] is False
    assert any(c[1] == svc.REVOKE_URL for c in google if c[0] == "POST_FORM")


def test_receber_todos_envia_futuros_agora_e_novos_automaticamente(client: TestClient, google, db_session):
    colab = _headers(client)
    admin = _headers(client, "admin@decos.com.br", "Admin@123")
    _evento(db_session)
    _evento(db_session)
    _conectar(client, colab)

    resp = client.put("/api/v1/google-agenda/preferencias", json={"receber_todos": True}, headers=colab)
    assert resp.json() == {"receber_todos": True, "adicionados": 2}
    assert client.get("/api/v1/google-agenda/status", headers=colab).json()["receber_todos"] is True

    # ligar de novo não duplica
    reativar = client.put("/api/v1/google-agenda/preferencias", json={"receber_todos": True}, headers=colab)
    assert reativar.json()["adicionados"] == 0

    # evento criado depois entra sozinho
    novo = client.post(
        "/api/v1/eventos",
        headers=admin,
        json={
            "titulo": "Evento novo",
            "categoria": "OUTRO",
            "data_inicio": (datetime.now() + timedelta(days=5)).isoformat(),
        },
    )
    assert novo.status_code == 201
    assert len(client.get("/api/v1/google-agenda/status", headers=colab).json()["eventos_adicionados"]) == 3


def test_sem_receber_todos_evento_novo_nao_vai_para_agenda(client: TestClient, google):
    colab = _headers(client)
    admin = _headers(client, "admin@decos.com.br", "Admin@123")
    _conectar(client, colab)
    client.post(
        "/api/v1/eventos",
        headers=admin,
        json={
            "titulo": "Outro evento",
            "categoria": "OUTRO",
            "data_inicio": (datetime.now() + timedelta(days=5)).isoformat(),
        },
    )
    assert client.get("/api/v1/google-agenda/status", headers=colab).json()["eventos_adicionados"] == []


def test_botao_sincronizar_envia_eventos_futuros_sem_duplicar(client: TestClient, google, db_session):
    h = _headers(client)
    assert client.post("/api/v1/google-agenda/sincronizar", headers=h).status_code == 400  # sem conexão

    _conectar(client, h)
    _evento(db_session)
    db_session.add(Evento(titulo="Palestra", categoria="OUTRO", data_inicio=datetime.now() + timedelta(days=9)))
    db_session.commit()

    primeira = client.post("/api/v1/google-agenda/sincronizar", headers=h)
    assert primeira.status_code == 200
    assert primeira.json() == {"criados": 2, "atualizados": 0, "sem_alteracao": 0, "erros": []}

    segunda = client.post("/api/v1/google-agenda/sincronizar", headers=h).json()
    assert segunda == {"criados": 0, "atualizados": 0, "sem_alteracao": 2, "erros": []}
    assert len([c for c in google if c[0] == "POST"]) == 2  # nada duplicado no Google


def test_sincronizar_continua_apos_erro_em_um_evento(client: TestClient, google, db_session, monkeypatch):
    h = _headers(client)
    _conectar(client, h)
    ev_ok = _evento(db_session)
    ev_ruim = Evento(titulo="Falha", categoria="OUTRO", data_inicio=datetime.now() + timedelta(days=1))
    db_session.add(ev_ruim)
    db_session.commit()

    def calendar(metodo, token, caminho="", corpo=None):
        if corpo and corpo["summary"] == "Falha":
            return _Resp(503, {})
        return _Resp(200, {"id": "g1"})

    monkeypatch.setattr(svc, "_calendar", calendar)
    resumo = client.post("/api/v1/google-agenda/sincronizar", headers=h).json()
    assert resumo["criados"] == 1
    assert [e["id_evento"] for e in resumo["erros"]] == [ev_ruim.id_evento]
    assert ev_ok != ev_ruim.id_evento


def test_sincronizar_com_token_revogado_pede_reconexao(client: TestClient, google, monkeypatch):
    h = _headers(client)
    _conectar(client, h)

    def post_form(url, data):
        return _Resp(400, {"error": "invalid_grant"})

    monkeypatch.setattr(svc, "_post_form", post_form)
    res = client.post("/api/v1/google-agenda/sincronizar", headers=h)
    assert res.status_code == 409
    assert res.json()["detail"] == "Reconecte sua conta do Google Agenda."
    assert client.get("/api/v1/google-agenda/status", headers=h).json()["conectado"] is False


def test_sincronizar_simultaneo_retorna_409(client: TestClient, google, db_session):
    h = _headers(client)
    _conectar(client, h)
    from app.models.usuario import Usuario

    uid = db_session.query(Usuario).filter(Usuario.email == "colaborador@decos.com.br").one().id_usuario
    svc._sincronizando.add(uid)
    try:
        res = client.post("/api/v1/google-agenda/sincronizar", headers=h)
    finally:
        svc._sincronizando.discard(uid)
    assert res.status_code == 409 and res.json()["detail"] == "Sincronização em andamento."

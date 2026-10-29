"""Testes das notificações internas (S5-T4, parte 1)."""

from datetime import date, datetime, time, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.evento import Evento
from app.models.notificacao import Notificacao
from app.models.usuario import Usuario
from app.services import notificacao_service


def _headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _colab(client: TestClient) -> dict[str, str]:
    return _headers(client, "colaborador@decos.com.br", "Colab@123")


def _marketing(client: TestClient) -> dict[str, str]:
    return _headers(client, "marketing@decos.com.br", "Mkt@12345")


def _admin(client: TestClient) -> dict[str, str]:
    return _headers(client, "admin@decos.com.br", "Admin@123")


def _publicar_aviso(client: TestClient, headers: dict[str, str], categoria: str, titulo: str = "Aviso de teste"):
    res = client.post(
        "/api/v1/avisos",
        headers=headers,
        json={"titulo": titulo, "conteudo": "<p>Conteúdo do aviso</p>", "categoria": categoria},
    )
    assert res.status_code == 201
    return res.json()


def _total(db: Session, tipo: str | None = None) -> int:
    q = db.query(Notificacao)
    if tipo:
        q = q.filter(Notificacao.tipo == tipo)
    return q.count()


def test_noticia_gera_notificacao_e_comunicado_nao(client: TestClient, db_session: Session):
    _publicar_aviso(client, _marketing(client), "COMUNICADO")
    _publicar_aviso(client, _marketing(client), "PROMOCAO")
    _publicar_aviso(client, _marketing(client), "MUDANCA_SETOR")
    assert _total(db_session) == 0

    aviso = _publicar_aviso(client, _marketing(client), "NOTICIA", "Nova notícia")
    assert _total(db_session, "NOTICIA") == 1

    res = client.get("/api/v1/notificacoes", headers=_colab(client))
    assert res.status_code == 200
    item = res.json()["itens"][0]
    assert item["tipo"] == "NOTICIA"
    assert item["link"] == f"/avisos/{aviso['id_aviso']}"
    assert item["lida"] is False


def test_evento_novo_gera_notificacao_evento(client: TestClient, db_session: Session):
    amanha = (datetime.now() + timedelta(days=1)).replace(microsecond=0).isoformat()
    res = client.post(
        "/api/v1/eventos",
        headers=_admin(client),
        json={"titulo": "Treinamento de brigada", "categoria": "TREINAMENTO", "data_inicio": amanha},
    )
    assert res.status_code == 201
    assert _total(db_session, "EVENTO") == 1
    itens = client.get("/api/v1/notificacoes", headers=_colab(client)).json()["itens"]
    assert itens[0]["link"] == f"/eventos?evento={res.json()['id_evento']}"


def test_evento_do_dia_gera_uma_unica_notificacao_mesmo_com_varias_consultas(client: TestClient, db_session: Session):
    evento = Evento(
        titulo="Reunião geral", categoria="INSTITUCIONAL", data_inicio=datetime.combine(date.today(), time(9, 30))
    )
    db_session.add(evento)
    db_session.commit()

    for headers in (_colab(client), _marketing(client), _admin(client), _colab(client)):
        client.get("/api/v1/notificacoes/nao-lidas/contagem", headers=headers)
        client.get("/api/v1/notificacoes", headers=headers)

    assert _total(db_session, "EVENTO_DO_DIA") == 1
    notif = db_session.query(Notificacao).one()
    assert notif.titulo == "Hoje: Reunião geral às 09:30"


def test_registrar_repetido_nao_duplica(db_session: Session):
    for _ in range(3):
        notificacao_service.registrar(db_session, "RECONHECIMENTO", 7, "Reconhecimento")
    assert _total(db_session) == 1


def test_edicao_nao_gera_notificacao_e_exclusao_remove(client: TestClient, db_session: Session):
    admin = _admin(client)
    aviso = _publicar_aviso(client, admin, "NOTICIA", "Original")
    assert _total(db_session, "NOTICIA") == 1

    res = client.put(
        f"/api/v1/avisos/{aviso['id_aviso']}",
        headers=admin,
        json={"titulo": "Editado", "conteudo": "<p>Novo</p>", "categoria": "NOTICIA"},
    )
    assert res.status_code == 200
    assert _total(db_session, "NOTICIA") == 1

    assert client.delete(f"/api/v1/avisos/{aviso['id_aviso']}", headers=admin).status_code == 204
    assert _total(db_session, "NOTICIA") == 0


def test_contagem_marcar_lida_idempotente_e_marcar_todas(client: TestClient):
    marketing = _marketing(client)
    for i in range(3):
        _publicar_aviso(client, marketing, "NOTICIA", f"Notícia {i}")

    colab = _colab(client)
    assert client.get("/api/v1/notificacoes/nao-lidas/contagem", headers=colab).json() == {"total": 3}

    primeira = client.get("/api/v1/notificacoes?tamanho=10", headers=colab).json()["itens"][0]["id_notificacao"]
    assert client.post(f"/api/v1/notificacoes/{primeira}/lida", headers=colab).status_code == 204
    assert client.post(f"/api/v1/notificacoes/{primeira}/lida", headers=colab).status_code == 204
    assert client.get("/api/v1/notificacoes/nao-lidas/contagem", headers=colab).json() == {"total": 2}

    # O estado de leitura é individual: o Marketing ainda tem as 3 não lidas
    assert client.get("/api/v1/notificacoes/nao-lidas/contagem", headers=marketing).json() == {"total": 3}

    nao_lidas = client.get("/api/v1/notificacoes?apenas_nao_lidas=true", headers=colab).json()
    assert nao_lidas["total"] == 2 and all(not i["lida"] for i in nao_lidas["itens"])

    assert client.post("/api/v1/notificacoes/marcar-todas-lidas", headers=colab).status_code == 204
    assert client.get("/api/v1/notificacoes/nao-lidas/contagem", headers=colab).json() == {"total": 0}
    assert client.post("/api/v1/notificacoes/99999/lida", headers=colab).status_code == 404


def test_usuario_nao_ve_notificacoes_anteriores_a_criacao_da_conta(client: TestClient, db_session: Session):
    _publicar_aviso(client, _marketing(client), "NOTICIA")
    colab = _colab(client)
    assert client.get("/api/v1/notificacoes/nao-lidas/contagem", headers=colab).json() == {"total": 1}

    usuario = db_session.query(Usuario).filter(Usuario.email == "colaborador@decos.com.br").one()
    usuario.data_criacao = datetime.now() + timedelta(days=1)
    db_session.commit()

    assert client.get("/api/v1/notificacoes/nao-lidas/contagem", headers=colab).json() == {"total": 0}
    assert client.get("/api/v1/notificacoes", headers=colab).json()["total"] == 0


def test_notificacoes_exigem_login(client: TestClient):
    assert client.get("/api/v1/notificacoes").status_code == 401
    assert client.get("/api/v1/notificacoes/nao-lidas/contagem").status_code == 401

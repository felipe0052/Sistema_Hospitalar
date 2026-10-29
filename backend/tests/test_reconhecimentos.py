"""Testes de Reconhecimentos, indicações de colegas e avisos urgentes (S5-T3)."""

from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.notificacao import Notificacao
from app.models.usuario import Usuario


def _headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _rh(client):
    return _headers(client, "rh@decos.com.br", "Rh@12345")


def _admin(client):
    return _headers(client, "admin@decos.com.br", "Admin@123")


def _colab(client):
    return _headers(client, "colaborador@decos.com.br", "Colab@123")


def _marketing(client):
    return _headers(client, "marketing@decos.com.br", "Mkt@12345")


def _id(db: Session, email: str) -> int:
    return db.query(Usuario).filter(Usuario.email == email).one().id_usuario


def _corpo(id_colaborador: int, **extra) -> dict:
    return {
        "id_colaborador": id_colaborador,
        "tipo": "DESTAQUE",
        "titulo": "Profissional destaque do mês",
        "mensagem": "Parabéns pela dedicação e pelo cuidado com os pacientes.",
        **extra,
    }


def test_apenas_rh_e_admin_publicam_reconhecimento(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    assert client.post("/api/v1/reconhecimentos", headers=_marketing(client), json=_corpo(alvo)).status_code == 403
    assert client.post("/api/v1/reconhecimentos", headers=_colab(client), json=_corpo(alvo)).status_code == 403
    assert client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(alvo)).status_code == 201
    assert client.post("/api/v1/reconhecimentos", headers=_admin(client), json=_corpo(alvo)).status_code == 201


def test_colaborador_inativo_ou_inexistente_retorna_400(client: TestClient, db_session: Session):
    inativo = _id(db_session, "inativo@decos.com.br")
    res = client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(inativo))
    assert res.status_code == 400
    assert "id_colaborador" in res.json()["erros"]
    assert client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(99999)).status_code == 400


def test_reconhecimento_gera_exatamente_uma_notificacao_e_e_visivel_a_todos(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    criado = client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(alvo)).json()
    assert db_session.query(Notificacao).filter(Notificacao.tipo == "RECONHECIMENTO").count() == 1

    for headers in (_colab(client), _marketing(client)):
        lista = client.get("/api/v1/reconhecimentos", headers=headers).json()
        assert lista["total"] == 1
        item = lista["itens"][0]
        assert item["colaborador"]["nome"] == "Carlos Menezes"
        assert item["colaborador"]["setor"]["nome"] == "UTI"
        assert item["autor"]["nome"] == "Patrícia Nunes"
    detalhe = client.get(f"/api/v1/reconhecimentos/{criado['id_reconhecimento']}", headers=_colab(client))
    assert detalhe.status_code == 200
    assert client.get("/api/v1/reconhecimentos/999", headers=_colab(client)).status_code == 404


def test_filtros_por_tipo_e_setor(client: TestClient, db_session: Session):
    colab, admin = _id(db_session, "colaborador@decos.com.br"), _id(db_session, "admin@decos.com.br")
    rh = _rh(client)
    client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(colab, tipo="PROMOCAO"))
    client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(admin, tipo="AGRADECIMENTO"))

    por_tipo = client.get("/api/v1/reconhecimentos?tipo=PROMOCAO", headers=rh).json()
    assert por_tipo["total"] == 1 and por_tipo["itens"][0]["tipo"] == "PROMOCAO"

    id_setor_uti = db_session.query(Usuario).filter(Usuario.id_usuario == colab).one().id_setor
    por_setor = client.get(f"/api/v1/reconhecimentos?id_setor={id_setor_uti}", headers=rh).json()
    assert por_setor["total"] == 1


def test_editar_nao_notifica_e_excluir_remove_notificacao(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    rh = _rh(client)
    id_rec = client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(alvo)).json()["id_reconhecimento"]

    res = client.put(
        f"/api/v1/reconhecimentos/{id_rec}",
        headers=rh,
        json={"tipo": "AGRADECIMENTO", "titulo": "Título novo", "mensagem": "Mensagem nova"},
    )
    assert res.status_code == 200 and res.json()["titulo"] == "Título novo"
    assert db_session.query(Notificacao).count() == 1

    assert client.put(f"/api/v1/reconhecimentos/{id_rec}", headers=_colab(client), json=res.json()).status_code == 403
    assert client.delete(f"/api/v1/reconhecimentos/{id_rec}", headers=_colab(client)).status_code == 403
    assert client.delete(f"/api/v1/reconhecimentos/{id_rec}", headers=rh).status_code == 204
    assert db_session.query(Notificacao).count() == 0


def test_colaborador_indica_colega_sem_gerar_notificacao(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    colab = _colab(client)
    res = client.post(
        "/api/v1/indicacoes", headers=colab, json={"id_indicado": colega, "motivo": "Sempre ajuda a equipe"}
    )
    assert res.status_code == 201
    assert res.json()["status"] == "PENDENTE"
    assert db_session.query(Notificacao).count() == 0

    minhas = client.get("/api/v1/indicacoes/minhas", headers=colab).json()
    assert len(minhas) == 1 and minhas[0]["indicado"]["nome"] == "Maria Silva"
    assert client.get("/api/v1/indicacoes/minhas", headers=_marketing(client)).json() == []


def test_autoindicacao_e_indicado_inativo_retornam_400(client: TestClient, db_session: Session):
    colab = _colab(client)
    proprio = _id(db_session, "colaborador@decos.com.br")
    para_si = client.post("/api/v1/indicacoes", headers=colab, json={"id_indicado": proprio, "motivo": "Eu mesmo"})
    assert para_si.status_code == 400
    inativo = _id(db_session, "inativo@decos.com.br")
    para_inativo = client.post("/api/v1/indicacoes", headers=colab, json={"id_indicado": inativo, "motivo": "Inativo"})
    assert para_inativo.status_code == 400


def test_colaborador_nao_lista_indicacoes_de_gestao(client: TestClient):
    assert client.get("/api/v1/indicacoes", headers=_colab(client)).status_code == 403
    assert client.get("/api/v1/indicacoes", headers=_marketing(client)).status_code == 403
    assert client.get("/api/v1/indicacoes", headers=_rh(client)).status_code == 200


def test_reconhecimento_com_id_indicacao_aprova_a_indicacao(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    indicacao = client.post(
        "/api/v1/indicacoes", headers=_colab(client), json={"id_indicado": colega, "motivo": "Campanha incrível"}
    ).json()

    rh = _rh(client)
    pendentes = client.get("/api/v1/indicacoes?status=PENDENTE", headers=rh).json()
    assert pendentes["total"] == 1

    rec = client.post(
        "/api/v1/reconhecimentos", headers=rh, json=_corpo(colega, id_indicacao=indicacao["id_indicacao"])
    )
    assert rec.status_code == 201

    minha = client.get("/api/v1/indicacoes/minhas", headers=_colab(client)).json()[0]
    assert minha["status"] == "APROVADA"
    assert minha["id_reconhecimento"] == rec.json()["id_reconhecimento"]
    assert client.get("/api/v1/indicacoes?status=PENDENTE", headers=rh).json()["total"] == 0

    # Indicação já avaliada não pode ser usada de novo
    reuso = _corpo(colega, id_indicacao=indicacao["id_indicacao"])
    outra = client.post("/api/v1/reconhecimentos", headers=rh, json=reuso)
    assert outra.status_code == 409


def test_indicacao_de_outro_colaborador_retorna_400(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    indicacao = client.post(
        "/api/v1/indicacoes", headers=_colab(client), json={"id_indicado": colega, "motivo": "Ótimo trabalho"}
    ).json()
    admin_id = _id(db_session, "admin@decos.com.br")
    res = client.post(
        "/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(admin_id, id_indicacao=indicacao["id_indicacao"])
    )
    assert res.status_code == 400


def test_recusar_indicacao_marca_recusada_e_visivel_ao_indicante(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    indicacao = client.post(
        "/api/v1/indicacoes", headers=_colab(client), json={"id_indicado": colega, "motivo": "Boa colega"}
    ).json()

    url = f"/api/v1/indicacoes/{indicacao['id_indicacao']}/recusar"
    assert client.post(url, headers=_colab(client)).status_code == 403
    res = client.post(url, headers=_rh(client))
    assert res.status_code == 200 and res.json()["status"] == "RECUSADA"
    assert res.json()["data_avaliacao"] is not None

    assert client.get("/api/v1/indicacoes/minhas", headers=_colab(client)).json()[0]["status"] == "RECUSADA"
    assert client.post(url, headers=_rh(client)).status_code == 409
    assert client.post("/api/v1/indicacoes/9999/recusar", headers=_rh(client)).status_code == 404


def test_aviso_urgente_aparece_primeiro_no_dashboard(client: TestClient):
    marketing = _marketing(client)
    base = {"conteudo": "<p>Texto</p>", "categoria": "COMUNICADO", "destaque": True}
    normal = client.post("/api/v1/avisos", headers=marketing, json={**base, "titulo": "Aviso normal"})
    urgente = client.post(
        "/api/v1/avisos", headers=marketing, json={**base, "titulo": "Aviso urgente", "prioridade": "URGENTE"}
    )
    assert normal.status_code == 201 and normal.json()["prioridade"] == "NORMAL"
    assert urgente.status_code == 201 and urgente.json()["prioridade"] == "URGENTE"

    # O urgente foi publicado antes do normal na ordem cronológica inversa? Garante que ele lidera de qualquer forma.
    destaques = client.get("/api/v1/dashboard").json()["avisos_destaque"]
    assert destaques[0]["titulo"] == "Aviso urgente"
    assert destaques[0]["prioridade"] == "URGENTE"

    invalido = client.post("/api/v1/avisos", headers=marketing, json={**base, "titulo": "Outro", "prioridade": "X"})
    assert invalido.status_code == 422


def test_data_criacao_do_reconhecimento_e_preenchida(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    criado = client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(alvo)).json()
    assert datetime.fromisoformat(criado["data_criacao"]).year >= 2026

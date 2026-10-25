"""Testes automatizados da API de Eventos (UC12 — S2-T2)."""

from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.evento import Evento


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_eventos_passados_ocultados_na_busca_padrao_e_visiveis_no_calendario_mensal(
    client: TestClient,
    db_session: Session,
):
    """Eventos passados não aparecem na busca padrão (sem filtro de data), mas aparecem ao consultar mês/ano do calendário."""
    hoje = date.today()
    dt_passado = datetime(2026, 5, 10, 9, 0, 0)
    dt_futuro_1 = datetime.combine(hoje + timedelta(days=5), datetime.min.time()).replace(hour=14)
    dt_futuro_2 = datetime.combine(hoje + timedelta(days=2), datetime.min.time()).replace(hour=8)

    ev_passado = Evento(
        titulo="Treinamento Passado de Maio",
        descricao="Evento já encerrado.",
        categoria="TREINAMENTO",
        data_inicio=dt_passado,
        data_fim=dt_passado + timedelta(hours=2),
        local="Auditório",
        id_setor=1,
    )
    ev_futuro_1 = Evento(
        titulo="Simpósio Institucional Futuro",
        descricao="Simpósio hospitalar.",
        categoria="INSTITUCIONAL",
        data_inicio=dt_futuro_1,
        data_fim=dt_futuro_1 + timedelta(hours=3),
        local="Auditório 4º andar",
        id_setor=2,
    )
    ev_futuro_2 = Evento(
        titulo="Campanha de Vacinação Interna",
        descricao="Vacinação para colaboradores.",
        categoria="ACAO_INTERNA",
        data_inicio=dt_futuro_2,
        data_fim=dt_futuro_2 + timedelta(hours=4),
        local="Posto RH",
        id_setor=3,
    )
    db_session.add_all([ev_passado, ev_futuro_1, ev_futuro_2])
    db_session.commit()

    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    # 1. Busca padrão sem filtro de data: apenas futuros, ordenados por data_inicio ASC
    res_padrao = client.get("/api/v1/eventos", headers=headers_colab)
    assert res_padrao.status_code == 200
    lista_padrao = res_padrao.json()
    assert len(lista_padrao) == 2
    assert lista_padrao[0]["titulo"] == "Campanha de Vacinação Interna"
    assert lista_padrao[1]["titulo"] == "Simpósio Institucional Futuro"

    # 2. Busca por mês/ano do calendário (Maio/2026) retorna os eventos daquele mês
    res_calendario = client.get("/api/v1/eventos?mes=5&ano=2026", headers=headers_colab)
    assert res_calendario.status_code == 200
    lista_cal = res_calendario.json()
    assert len(lista_cal) == 1
    assert lista_cal[0]["titulo"] == "Treinamento Passado de Maio"


def test_validacao_data_fim_anterior_ao_inicio_retorna_422_e_data_inicio_passado_400(
    client: TestClient,
):
    """Valida que data_fim < data_inicio gera 422 e data_inicio no passado gera 400."""
    headers_mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")

    inicio_futuro = datetime.combine(date.today() + timedelta(days=3), datetime.min.time()).replace(hour=14)
    fim_anterior = inicio_futuro - timedelta(hours=2)

    res_422 = client.post(
        "/api/v1/eventos",
        headers=headers_mkt,
        json={
            "titulo": "Treinamento com horário inválido",
            "categoria": "TREINAMENTO",
            "data_inicio": inicio_futuro.isoformat(),
            "data_fim": fim_anterior.isoformat(),
            "local": "Sala 1",
        },
    )
    assert res_422.status_code == 422
    erros = res_422.json()["erros"]
    assert "data_fim" in erros

    # Data de início no passado → 400 RegraNegocio
    inicio_passado = datetime.combine(date.today() - timedelta(days=2), datetime.min.time()).replace(hour=10)
    res_400 = client.post(
        "/api/v1/eventos",
        headers=headers_mkt,
        json={
            "titulo": "Evento no Passado",
            "categoria": "OUTRO",
            "data_inicio": inicio_passado.isoformat(),
        },
    )
    assert res_400.status_code == 400
    assert "data_inicio" in res_400.json()["erros"]


def test_permissoes_eventos_marketing_e_admin_podem_colaborador_e_rh_bloqueados(
    client: TestClient,
):
    """Marketing e Admin podem criar/editar/excluir eventos; Colaborador e RH recebem 403."""
    inicio = datetime.combine(date.today() + timedelta(days=4), datetime.min.time()).replace(hour=9)
    fim = inicio + timedelta(hours=2)

    # Colaborador e RH bloqueados (403)
    for email, senha in [
        ("colaborador@decos.com.br", "Colab@123"),
        ("rh@decos.com.br", "Rh@12345"),
    ]:
        headers_bloq = _obter_headers(client, email, senha)
        res = client.post(
            "/api/v1/eventos",
            headers=headers_bloq,
            json={
                "titulo": "Tentativa não autorizada",
                "categoria": "TREINAMENTO",
                "data_inicio": inicio.isoformat(),
            },
        )
        assert res.status_code == 403

    # Marketing cria evento com sucesso (201)
    headers_mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")
    res_criar = client.post(
        "/api/v1/eventos",
        headers=headers_mkt,
        json={
            "titulo": "Treinamento de Brigada de Incêndio",
            "descricao": "Treinamento prático no pátio externo.",
            "categoria": "TREINAMENTO",
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "local": "Pátio Externo",
            "id_setor": 1,
        },
    )
    assert res_criar.status_code == 201
    criado = res_criar.json()
    assert criado["titulo"] == "Treinamento de Brigada de Incêndio"
    assert criado["setor"]["nome"] == "UTI"
    id_evento = criado["id_evento"]

    # Admin edita e exclui evento
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    res_put = client.put(
        f"/api/v1/eventos/{id_evento}",
        headers=headers_admin,
        json={
            "titulo": "Treinamento de Brigada de Incêndio — Atualizado",
            "descricao": "Treinamento confirmado.",
            "categoria": "TREINAMENTO",
            "data_inicio": inicio.isoformat(),
            "data_fim": fim.isoformat(),
            "local": "Auditório Central",
            "id_setor": 1,
        },
    )
    assert res_put.status_code == 200
    assert res_put.json()["local"] == "Auditório Central"

    res_del = client.delete(f"/api/v1/eventos/{id_evento}", headers=headers_admin)
    assert res_del.status_code == 204

    res_404 = client.get(f"/api/v1/eventos/{id_evento}", headers=headers_admin)
    assert res_404.status_code == 404

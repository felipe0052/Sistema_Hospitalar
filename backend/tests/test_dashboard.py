"""Testes automatizados da API do Dashboard consolidado (S2-T3)."""

from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import gerar_hash_senha
from app.models.aviso import Aviso
from app.models.evento import Evento
from app.models.usuario import Usuario


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_dashboard_retorna_blocos_consolidados_sem_expor_ano_nascimento(
    client: TestClient,
    db_session: Session,
):
    """GET /api/v1/dashboard consolida destaques, últimos avisos, próximos eventos e aniversariantes do dia/mês."""
    hoje = date.today()
    outro_dia_mes = 15 if hoje.day != 15 else 10

    # Cria um colaborador ativo que faz aniversário hoje e um inativo que faz aniversário hoje
    aniv_hoje = Usuario(
        nome="Beatriz Aniversariante Hoje",
        email="beatriz.hoje@decos.com.br",
        senha_hash=gerar_hash_senha("Senha@123"),
        id_setor=1,
        cargo="Enfermeira Assistencial",
        data_nascimento=date(1992, hoje.month, hoje.day),
        perfil="COLABORADOR",
        status="ATIVO",
        versao_token=0,
    )
    aniv_mes = Usuario(
        nome="Daniel Aniversariante Mês",
        email="daniel.mes@decos.com.br",
        senha_hash=gerar_hash_senha("Senha@123"),
        id_setor=2,
        cargo="Analista de TI",
        data_nascimento=date(1990, hoje.month, outro_dia_mes),
        perfil="COLABORADOR",
        status="ATIVO",
        versao_token=0,
    )
    aniv_inativo = Usuario(
        nome="Inativo Hoje Não Deve Aparecer",
        email="inativo.hoje@decos.com.br",
        senha_hash=gerar_hash_senha("Senha@123"),
        id_setor=1,
        cargo="Auxiliar",
        data_nascimento=date(1985, hoje.month, hoje.day),
        perfil="COLABORADOR",
        status="INATIVO",
        versao_token=0,
    )
    db_session.add_all([aniv_hoje, aniv_mes, aniv_inativo])

    # Cria aviso em destaque, aviso comum e aviso expirado
    db_session.add_all(
        [
            Aviso(
                titulo="Destaque Corporativo ONA",
                conteudo="Hospital conquista certificação de excelência.",
                categoria="NOTICIA",
                destaque="S",
                data_publicacao=datetime.now(),
                id_autor=1,
            ),
            Aviso(
                titulo="Comunicado Geral de Fluxo",
                conteudo="Novo fluxo de atendimento na recepção.",
                categoria="COMUNICADO",
                destaque="N",
                data_publicacao=datetime.now() - timedelta(hours=2),
                id_autor=1,
            ),
            Aviso(
                titulo="Aviso Expirado Não Deve Aparecer",
                conteudo="Expirado.",
                categoria="COMUNICADO",
                destaque="S",
                data_publicacao=datetime.now() - timedelta(days=10),
                data_expiracao=hoje - timedelta(days=1),
                id_autor=1,
            ),
        ]
    )

    # Cria evento futuro e evento passado
    inicio_futuro = datetime.combine(hoje + timedelta(days=2), datetime.min.time()).replace(hour=10)
    inicio_passado = datetime.combine(hoje - timedelta(days=5), datetime.min.time()).replace(hour=10)
    db_session.add_all(
        [
            Evento(
                titulo="Treinamento Futuro Dashboard",
                descricao="Capacitação assistencial.",
                categoria="TREINAMENTO",
                data_inicio=inicio_futuro,
                local="Auditório",
                id_setor=1,
            ),
            Evento(
                titulo="Evento Passado Oculto",
                descricao="Passado.",
                categoria="OUTRO",
                data_inicio=inicio_passado,
                local="Sala 1",
                id_setor=1,
            ),
        ]
    )
    db_session.commit()

    headers = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")
    res = client.get("/api/v1/dashboard", headers=headers)
    assert res.status_code == 200
    dados = res.json()

    # 1. Avisos em destaque (apenas vigentes com destaque='S')
    assert len(dados["avisos_destaque"]) == 1
    assert dados["avisos_destaque"][0]["titulo"] == "Destaque Corporativo ONA"

    # 2. Últimos avisos (apenas vigentes)
    assert len(dados["ultimos_avisos"]) == 2
    titulos_ultimos = [a["titulo"] for a in dados["ultimos_avisos"]]
    assert "Aviso Expirado Não Deve Aparecer" not in titulos_ultimos

    # 3. Próximos eventos (apenas futuros)
    assert len(dados["proximos_eventos"]) == 1
    assert dados["proximos_eventos"][0]["titulo"] == "Treinamento Futuro Dashboard"

    # 4. Aniversariantes de hoje (apenas ATIVOS, sem data_nascimento/ano/idade)
    nomes_hoje = [a["nome"] for a in dados["aniversariantes_hoje"]]
    assert "Beatriz Aniversariante Hoje" in nomes_hoje
    assert "Inativo Hoje Não Deve Aparecer" not in nomes_hoje
    for item in dados["aniversariantes_hoje"]:
        assert "data_nascimento" not in item
        assert "ano" not in item
        assert "idade" not in item
        assert item["dia"] == hoje.day
        assert item["mes"] == hoje.month
        assert item["aniversario_hoje"] is True

    # 5. Contagem total de aniversariantes ativos no mês
    assert dados["total_aniversariantes_mes"] >= 2


def test_checkpoint_semana_2_fluxo_integrado_marketing_e_colaborador(client: TestClient):
    """Valida o Checkpoint da Semana 2:
    1. Marketing publica aviso em destaque e evento futuro -> ambos aparecem imediatamente no mural e no Dashboard;
    2. Colaborador acessa o Dashboard (< 300ms), consulta notícias, abre detalhes e visualiza eventos no calendário.
    """
    import time

    headers_mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    hoje = date.today()
    inicio_evento = datetime.combine(hoje + timedelta(days=3), datetime.min.time()).replace(hour=15)

    # Marketing publica aviso em destaque
    res_aviso = client.post(
        "/api/v1/avisos",
        headers=headers_mkt,
        json={
            "titulo": "Novo Aviso em Destaque do Marketing",
            "conteudo": "<p>Comunicado corporativo com <strong>destaque imediato</strong> no Dashboard.</p>",
            "categoria": "NOTICIA",
            "destaque": True,
        },
    )
    assert res_aviso.status_code == 201
    id_aviso = res_aviso.json()["id_aviso"]

    # Marketing publica evento futuro
    res_evento = client.post(
        "/api/v1/eventos",
        headers=headers_mkt,
        json={
            "titulo": "Simpósio de Comunicação Hospitalar",
            "descricao": "Encontro aberto a todos os setores.",
            "categoria": "INSTITUCIONAL",
            "data_inicio": inicio_evento.isoformat(),
            "local": "Auditório 4º andar",
            "id_setor": 3,
        },
    )
    assert res_evento.status_code == 201

    # Colaborador acessa o Dashboard (tempo < 300ms conforme S2-T3)
    t0 = time.perf_counter()
    res_dash = client.get("/api/v1/dashboard", headers=headers_colab)
    duracao_ms = (time.perf_counter() - t0) * 1000
    assert res_dash.status_code == 200
    assert duracao_ms < 300, f"Dashboard demorou {duracao_ms:.1f}ms (limite 300ms)"

    dash = res_dash.json()
    assert any(a["id_aviso"] == id_aviso for a in dash["avisos_destaque"])
    assert any(e["titulo"] == "Simpósio de Comunicação Hospitalar" for e in dash["proximos_eventos"])

    # Colaborador abre detalhes do aviso e visualiza o calendário do mês do evento
    res_detalhe = client.get(f"/api/v1/avisos/{id_aviso}", headers=headers_colab)
    assert res_detalhe.status_code == 200
    assert "<strong>destaque imediato</strong>" in res_detalhe.json()["conteudo"]

    res_cal = client.get(
        f"/api/v1/eventos?mes={inicio_evento.month}&ano={inicio_evento.year}",
        headers=headers_colab,
    )
    assert res_cal.status_code == 200
    assert any(e["titulo"] == "Simpósio de Comunicação Hospitalar" for e in res_cal.json())

    # 3. Colaborador SEM login (Modo Leitura) também visualiza as notícias vigentes, eventos e o Dashboard
    res_avisos_publico = client.get("/api/v1/avisos")
    assert res_avisos_publico.status_code == 200
    assert any(a["id_aviso"] == id_aviso for a in res_avisos_publico.json()["itens"])

    res_detalhe_publico = client.get(f"/api/v1/avisos/{id_aviso}")
    assert res_detalhe_publico.status_code == 200

    res_eventos_publico = client.get("/api/v1/eventos")
    assert res_eventos_publico.status_code == 200
    assert any(e["titulo"] == "Simpósio de Comunicação Hospitalar" for e in res_eventos_publico.json())

    res_dash_publico = client.get("/api/v1/dashboard")
    assert res_dash_publico.status_code == 200
    assert any(a["id_aviso"] == id_aviso for a in res_dash_publico.json()["avisos_destaque"])
    assert any(
        e["titulo"] == "Simpósio de Comunicação Hospitalar"
        for e in res_dash_publico.json()["proximos_eventos"]
    )



def test_listar_aniversariantes_do_mes_ordenados_por_dia(client):
    from datetime import date

    mes_do_admin = client.get("/api/v1/aniversariantes", params={"mes": 3}).json()
    assert [a["nome"] for a in mes_do_admin] == ["André Luiz"]
    assert mes_do_admin[0]["dia"] == 14 and mes_do_admin[0]["mes"] == 3
    assert "data_nascimento" not in mes_do_admin[0]
    # usuário inativo (janeiro) não aparece
    assert client.get("/api/v1/aniversariantes", params={"mes": 1}).json() == []
    assert client.get("/api/v1/aniversariantes", params={"mes": 13}).status_code == 422
    assert isinstance(client.get("/api/v1/aniversariantes").json(), list) and date.today()

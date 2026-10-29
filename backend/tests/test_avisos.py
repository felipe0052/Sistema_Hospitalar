"""Testes automatizados da API de Avisos e Notícias (UC04, UC05 — S2-T1)."""

from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.aviso import Aviso


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_criar_aviso_valido_com_perfis_autorizados_e_sanitizacao_html(client: TestClient):
    """Perfis Marketing, RH e Admin publicam com sucesso (201), sanitizando tags HTML e gerando resumo."""
    perfis = [
        ("marketing@decos.com.br", "Mkt@12345"),
        ("rh@decos.com.br", "Rh@12345"),
        ("admin@decos.com.br", "Admin@123"),
    ]
    amanha = (date.today() + timedelta(days=7)).isoformat()

    for idx, (email, senha) in enumerate(perfis, start=1):
        headers = _obter_headers(client, email, senha)
        conteudo_html = (
            f"<p>Comunicado <strong>importante #{idx}</strong> para a equipe.</p>"
            "<script>alert('xss')</script>"
            "<ul><li>Item 1</li><li>Item 2</li></ul>"
            '<a href="https://decos.com.br" onclick="evil()">Portal</a>'
        )
        res = client.post(
            "/api/v1/avisos",
            headers=headers,
            json={
                "titulo": f"Aviso Corporativo #{idx}",
                "conteudo": conteudo_html,
                "categoria": "NOTICIA",
                "destaque": True,
                "data_expiracao": amanha,
            },
        )
        assert res.status_code == 201
        dados = res.json()
        assert dados["titulo"] == f"Aviso Corporativo #{idx}"
        assert dados["categoria"] == "NOTICIA"
        assert dados["destaque"] is True
        assert dados["data_expiracao"] == amanha
        assert dados["expirado"] is False
        assert "<script>" not in dados["conteudo"]
        assert "onclick" not in dados["conteudo"]
        assert "<strong>importante" in dados["conteudo"]
        assert '<a href="https://decos.com.br">Portal</a>' in dados["conteudo"]
        assert "<" not in dados["resumo"]
        assert f"Comunicado importante #{idx}" in dados["resumo"]
        assert dados["autor"]["id_usuario"] is not None


def test_criar_aviso_titulo_ou_conteudo_em_branco_retorna_422(client: TestClient):
    """Título ou conteúdo em branco ou inválido → 422."""
    headers = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    res_vazio = client.post(
        "/api/v1/avisos",
        headers=headers,
        json={
            "titulo": "  ",
            "conteudo": "   ",
            "categoria": "COMUNICADO",
        },
    )
    assert res_vazio.status_code == 422
    erros = res_vazio.json()["erros"]
    assert "titulo" in erros
    assert "conteudo" in erros

    # Conteúdo contendo apenas tags vazias ou script deve falhar com 422
    res_apenas_tags = client.post(
        "/api/v1/avisos",
        headers=headers,
        json={
            "titulo": "Título válido",
            "conteudo": "<script>evil()</script><p>   </p>",
        },
    )
    assert res_apenas_tags.status_code == 422
    assert "conteudo" in res_apenas_tags.json()["erros"]


def test_criar_e_editar_aviso_data_expiracao_passado_retorna_400(client: TestClient):
    """Data de expiração anterior à data atual → 400 RegraNegocio com erro no campo data_expiracao."""
    headers = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")
    ontem = (date.today() - timedelta(days=1)).isoformat()

    res = client.post(
        "/api/v1/avisos",
        headers=headers,
        json={
            "titulo": "Aviso com expiração no passado",
            "conteudo": "Conteúdo do comunicado corporativo.",
            "categoria": "COMUNICADO",
            "data_expiracao": ontem,
        },
    )
    assert res.status_code == 400
    corpo = res.json()
    assert corpo["detail"] == "A data de expiração não pode ser anterior à data atual"
    assert corpo["erros"]["data_expiracao"] == "A data de expiração não pode ser anterior à data atual"


def test_colaborador_comum_impedido_de_publicar_editar_excluir_e_ver_gestao(client: TestClient):
    """Colaborador comum recebe 403 ao tentar publicar, editar, excluir ou acessar /avisos/gestao."""
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    criado = client.post(
        "/api/v1/avisos",
        headers=headers_admin,
        json={
            "titulo": "Comunicado Oficial da Diretoria",
            "conteudo": "Conteúdo oficial do comunicado.",
            "categoria": "COMUNICADO",
        },
    ).json()
    id_aviso = criado["id_aviso"]

    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    res_post = client.post(
        "/api/v1/avisos",
        headers=headers_colab,
        json={"titulo": "Tentativa", "conteudo": "Texto"},
    )
    assert res_post.status_code == 403

    res_put = client.put(
        f"/api/v1/avisos/{id_aviso}",
        headers=headers_colab,
        json={"titulo": "Tentativa Edição", "conteudo": "Texto"},
    )
    assert res_put.status_code == 403

    res_del = client.delete(f"/api/v1/avisos/{id_aviso}", headers=headers_colab)
    assert res_del.status_code == 403

    res_gestao = client.get("/api/v1/avisos/gestao", headers=headers_colab)
    assert res_gestao.status_code == 403


def test_avisos_expirados_ocultos_na_listagem_publica_e_visiveis_na_gestao(
    client: TestClient,
    db_session: Session,
):
    """Avisos expirados não aparecem para colaboradores em GET /avisos nem em GET /avisos/{id}.

    Eles continuam aparecendo em /avisos/gestao.
    """
    aviso_vigente = Aviso(
        titulo="Campanha de Vacinação Vigente",
        conteudo="Compareça ao posto do 1º andar com carteira de vacinação.",
        categoria="COMUNICADO",
        destaque="S",
        data_publicacao=datetime.now(),
        data_expiracao=date.today() + timedelta(days=10),
        id_autor=1,
    )
    aviso_expirado = Aviso(
        titulo="Manutenção Passada dos Elevadores",
        conteudo="Manutenção concluída na semana anterior.",
        categoria="MUDANCA_SETOR",
        destaque="N",
        data_publicacao=datetime.now() - timedelta(days=10),
        data_expiracao=date.today() - timedelta(days=2),
        id_autor=1,
    )
    db_session.add_all([aviso_vigente, aviso_expirado])
    db_session.commit()

    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    # Listagem pública traz apenas o vigente
    res_lista = client.get("/api/v1/avisos", headers=headers_colab)
    assert res_lista.status_code == 200
    dados_lista = res_lista.json()
    assert dados_lista["total"] == 1
    assert dados_lista["itens"][0]["titulo"] == "Campanha de Vacinação Vigente"

    # Colaborador tentando acessar detalhe de aviso expirado recebe 404
    res_detalhe_colab = client.get(f"/api/v1/avisos/{aviso_expirado.id_aviso}", headers=headers_colab)
    assert res_detalhe_colab.status_code == 404

    # Admin acessando detalhe do aviso expirado recebe 200 com flag expirado=True
    res_detalhe_admin = client.get(f"/api/v1/avisos/{aviso_expirado.id_aviso}", headers=headers_admin)
    assert res_detalhe_admin.status_code == 200
    assert res_detalhe_admin.json()["expirado"] is True

    # Gestão com incluir_expirados=true retorna ambos
    res_gestao = client.get("/api/v1/avisos/gestao?incluir_expirados=true", headers=headers_admin)
    assert res_gestao.status_code == 200
    dados_gestao = res_gestao.json()
    assert dados_gestao["total"] == 2
    mapa_expirado = {item["titulo"]: item["expirado"] for item in dados_gestao["itens"]}
    assert mapa_expirado["Campanha de Vacinação Vigente"] is False
    assert mapa_expirado["Manutenção Passada dos Elevadores"] is True


def test_editar_excluir_e_filtrar_avisos(client: TestClient):
    """Testa filtros por categoria, busca sem acentos, edição (PUT) e exclusão (DELETE 204)."""
    headers_rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")

    res_criar = client.post(
        "/api/v1/avisos",
        headers=headers_rh,
        json={
            "titulo": "Promoção de Colaboradores da Farmácia",
            "conteudo": "Parabenizamos os farmacêuticos promovidos neste ciclo.",
            "categoria": "PROMOCAO",
            "destaque": False,
        },
    )
    assert res_criar.status_code == 201
    id_aviso = res_criar.json()["id_aviso"]

    # Busca sem acentos e maiúsculas
    res_busca = client.get("/api/v1/avisos?busca=farmacia&categoria=PROMOCAO", headers=headers_rh)
    assert res_busca.status_code == 200
    assert res_busca.json()["total"] == 1

    # Editar aviso
    res_put = client.put(
        f"/api/v1/avisos/{id_aviso}",
        headers=headers_rh,
        json={
            "titulo": "Promoção de Colaboradores da Farmácia Clínica",
            "conteudo": "Texto atualizado com destaque.",
            "categoria": "PROMOCAO",
            "destaque": True,
        },
    )
    assert res_put.status_code == 200
    atualizado = res_put.json()
    assert atualizado["titulo"] == "Promoção de Colaboradores da Farmácia Clínica"
    assert atualizado["destaque"] is True
    assert atualizado["data_atualizacao"] is not None

    # Excluir aviso
    res_del = client.delete(f"/api/v1/avisos/{id_aviso}", headers=headers_rh)
    assert res_del.status_code == 204

    res_404 = client.get(f"/api/v1/avisos/{id_aviso}", headers=headers_rh)
    assert res_404.status_code == 404

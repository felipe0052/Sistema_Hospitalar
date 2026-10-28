"""Testes automatizados da API de FAQ — Perguntas Frequentes (UC09 — S3-T2)."""

from fastapi.testclient import TestClient


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_faq_agrupado_por_categoria_ordem_e_busca_sem_acento(client: TestClient):
    """Valida agrupamento por categoria em ordem alfabética, ordenação interna por 'ordem' e busca sem acento."""
    headers_rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    perguntas = [
        {
            "pergunta": "Com quanta antecedência devo solicitar minhas férias?",
            "resposta": "O alinhamento deve ocorrer com no mínimo 60 dias de antecedência junto à coordenação.",
            "categoria": "Férias",
            "ordem": 2,
        },
        {
            "pergunta": "Posso parcelar as férias em até quantos períodos?",
            "resposta": "Em até 3 períodos, sendo um deles de no mínimo 14 dias corridos.",
            "categoria": "Férias",
            "ordem": 1,
        },
        {
            "pergunta": "Como incluir dependentes no plano de saúde e odontológico?",
            "resposta": "Compareça ao setor de Recursos Humanos no 4º andar com certidão de nascimento ou casamento.",
            "categoria": "Benefícios",
            "ordem": 1,
        },
    ]

    for p in perguntas:
        res = client.post("/api/v1/faq", headers=headers_rh, json=p)
        assert res.status_code == 201

    # 1. Listagem agrupada por categoria em ordem alfabética (Benefícios antes de Férias)
    res_lista = client.get("/api/v1/faq", headers=headers_colab)
    assert res_lista.status_code == 200
    grupos = res_lista.json()
    assert [g["categoria"] for g in grupos] == ["Benefícios", "Férias"]

    # Dentro de "Férias", ordem=1 deve vir antes de ordem=2
    perguntas_ferias = grupos[1]["perguntas"]
    assert len(perguntas_ferias) == 2
    assert perguntas_ferias[0]["ordem"] == 1
    assert "parcelar" in perguntas_ferias[0]["pergunta"]
    assert perguntas_ferias[1]["ordem"] == 2

    # 2. Listagem de categorias distintas
    res_cats = client.get("/api/v1/faq/categorias", headers=headers_colab)
    assert res_cats.status_code == 200
    assert res_cats.json() == ["Benefícios", "Férias"]

    # 3. Busca textual sem acento na pergunta ("ferias" encontra "Férias")
    res_busca_p = client.get("/api/v1/faq?busca=ferias", headers=headers_colab)
    assert res_busca_p.status_code == 200
    grupos_busca_p = res_busca_p.json()
    assert len(grupos_busca_p) == 1
    assert grupos_busca_p[0]["categoria"] == "Férias"
    assert len(grupos_busca_p[0]["perguntas"]) == 2

    # 4. Busca textual sem acento na resposta ("certidao" encontra "certidão")
    res_busca_r = client.get("/api/v1/faq?busca=certidao", headers=headers_colab)
    assert res_busca_r.status_code == 200
    grupos_busca_r = res_busca_r.json()
    assert len(grupos_busca_r) == 1
    assert grupos_busca_r[0]["categoria"] == "Benefícios"


def test_faq_edicao_exclusao_e_permissoes_acesso(client: TestClient):
    """Admin e RH podem gerenciar FAQ; Colaborador e Marketing recebem 403."""
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")
    headers_mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")

    res_criar = client.post(
        "/api/v1/faq",
        headers=headers_admin,
        json={
            "pergunta": "Qual a regra para uso de adornos nos setores assistenciais?",
            "resposta": "É proibido o uso de adornos conforme diretrizes da NR-32 e CCIH.",
            "categoria": "Normas Hospitalares",
            "ordem": 1,
        },
    )
    assert res_criar.status_code == 201
    id_faq = res_criar.json()["id_faq"]

    # Colaborador e Marketing bloqueados no POST, PUT e DELETE
    for headers_nao_aut in (headers_colab, headers_mkt):
        assert (
            client.post(
                "/api/v1/faq",
                headers=headers_nao_aut,
                json={"pergunta": "Pergunta teste?", "resposta": "Resposta", "categoria": "Geral"},
            ).status_code
            == 403
        )
        assert (
            client.put(
                f"/api/v1/faq/{id_faq}",
                headers=headers_nao_aut,
                json={"pergunta": "Pergunta alterada?", "resposta": "Resposta", "categoria": "Geral"},
            ).status_code
            == 403
        )
        assert client.delete(f"/api/v1/faq/{id_faq}", headers=headers_nao_aut).status_code == 403

    # Edição por Admin (200)
    res_put = client.put(
        f"/api/v1/faq/{id_faq}",
        headers=headers_admin,
        json={
            "pergunta": "Qual a regra oficial sobre uso de adornos nas áreas assistenciais?",
            "resposta": "Proibido o uso de anéis, relógios e pulseiras conforme NR-32.",
            "categoria": "Normas Hospitalares",
            "ordem": 2,
        },
    )
    assert res_put.status_code == 200
    assert res_put.json()["ordem"] == 2
    assert "oficial" in res_put.json()["pergunta"]

    # Exclusão por Admin (204)
    res_del = client.delete(f"/api/v1/faq/{id_faq}", headers=headers_admin)
    assert res_del.status_code == 204
    assert client.delete(f"/api/v1/faq/{id_faq}", headers=headers_admin).status_code == 404

"""Testes automatizados do Onboarding Digital do novo colaborador."""

from fastapi.testclient import TestClient


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_onboarding_exige_login(client: TestClient):
    res = client.get("/api/v1/onboarding")
    assert res.status_code == 401


def test_onboarding_mostra_nome_funcao_e_setor_do_colaborador(client: TestClient):
    headers = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")
    res = client.get("/api/v1/onboarding", headers=headers)
    assert res.status_code == 200
    dados = res.json()
    assert dados["colaborador"]["nome"] == "Carlos Menezes"
    assert dados["colaborador"]["cargo"] == "Técnico de Enfermagem"
    assert dados["colaborador"]["setor"]["nome"] == "UTI"
    assert dados["colaborador"]["setor"]["andar"] == "2º andar"
    assert dados["progresso"] == {"total": 0, "concluidos": 0, "percentual": 0}
    assert dados["checklist"] == [] and dados["atendimentos"] == [] and dados["contatos"] == []


def test_checklist_e_progresso_por_colaborador(client: TestClient):
    headers_rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    ids = []
    for ordem, (tipo, titulo) in enumerate(
        [
            ("CHECKLIST", "Retirar crachá na portaria"),
            ("CHECKLIST", "Assinar termo de confidencialidade"),
            ("ATENDIMENTO", "Higienizar as mãos antes de cada atendimento"),
            ("CHECKLIST", "Conhecer o POP de admissão"),
        ],
        start=1,
    ):
        res = client.post(
            "/api/v1/onboarding/itens",
            headers=headers_rh,
            json={"tipo": tipo, "titulo": titulo, "descricao": "Detalhes", "ordem": ordem},
        )
        assert res.status_code == 201
        ids.append(res.json()["id_item"])

    res = client.put(f"/api/v1/onboarding/itens/{ids[0]}/conclusao", headers=headers_colab, json={"concluido": True})
    assert res.status_code == 200 and res.json()["concluido"] is True
    # Marcar duas vezes não duplica
    client.put(f"/api/v1/onboarding/itens/{ids[0]}/conclusao", headers=headers_colab, json={"concluido": True})

    dados = client.get("/api/v1/onboarding", headers=headers_colab).json()
    assert [i["titulo"] for i in dados["checklist"]] == [
        "Retirar crachá na portaria",
        "Assinar termo de confidencialidade",
        "Conhecer o POP de admissão",
    ]
    assert [i["titulo"] for i in dados["atendimentos"]] == ["Higienizar as mãos antes de cada atendimento"]
    assert dados["checklist"][0]["concluido"] is True
    assert dados["progresso"] == {"total": 4, "concluidos": 1, "percentual": 25}

    # O progresso é individual: o RH não vê o item do colaborador como concluído
    dados_rh = client.get("/api/v1/onboarding", headers=headers_rh).json()
    assert dados_rh["progresso"]["concluidos"] == 0

    # Desmarcar
    client.put(f"/api/v1/onboarding/itens/{ids[0]}/conclusao", headers=headers_colab, json={"concluido": False})
    dados = client.get("/api/v1/onboarding", headers=headers_colab).json()
    assert dados["progresso"]["concluidos"] == 0

    # Excluir item com progresso
    client.put(f"/api/v1/onboarding/itens/{ids[1]}/conclusao", headers=headers_colab, json={"concluido": True})
    assert client.delete(f"/api/v1/onboarding/itens/{ids[1]}", headers=headers_rh).status_code == 204
    dados = client.get("/api/v1/onboarding", headers=headers_colab).json()
    assert dados["progresso"] == {"total": 3, "concluidos": 0, "percentual": 0}

    res = client.put("/api/v1/onboarding/itens/9999/conclusao", headers=headers_colab, json={"concluido": True})
    assert res.status_code == 404


def test_quem_procurar_crud_com_setor(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    setores = client.get("/api/v1/setores", headers=headers_admin).json()
    lista = setores["itens"] if isinstance(setores, dict) else setores
    id_rh = next(s["id_setor"] for s in lista if s["nome"] == "RH")

    res = client.post(
        "/api/v1/onboarding/contatos",
        headers=headers_admin,
        json={
            "situacao": "Dúvidas sobre holerite e benefícios",
            "responsavel": "Patrícia Nunes",
            "id_setor": id_rh,
            "ramal": "4010",
            "ordem": 1,
        },
    )
    assert res.status_code == 201
    contato = res.json()
    assert contato["setor"]["nome"] == "RH"

    res = client.put(
        f"/api/v1/onboarding/contatos/{contato['id_contato']}",
        headers=headers_admin,
        json={"situacao": "Dúvidas sobre holerite", "responsavel": "Equipe de RH", "id_setor": "", "ramal": ""},
    )
    assert res.status_code == 200
    assert res.json()["setor"] is None and res.json()["ramal"] is None

    dados = client.get("/api/v1/onboarding", headers=headers_colab).json()
    assert dados["contatos"][0]["responsavel"] == "Equipe de RH"

    res = client.post(
        "/api/v1/onboarding/contatos",
        headers=headers_admin,
        json={"situacao": "Setor inexistente", "responsavel": "Alguém", "id_setor": 9999},
    )
    assert res.status_code == 404

    res = client.delete(f"/api/v1/onboarding/contatos/{contato['id_contato']}", headers=headers_admin)
    assert res.status_code == 204


def test_somente_admin_e_rh_gerenciam_onboarding(client: TestClient):
    for email, senha in [("colaborador@decos.com.br", "Colab@123"), ("marketing@decos.com.br", "Mkt@12345")]:
        headers = _obter_headers(client, email, senha)
        res = client.post("/api/v1/onboarding/itens", headers=headers, json={"titulo": "Item proibido"})
        assert res.status_code == 403
        res = client.post(
            "/api/v1/onboarding/contatos", headers=headers, json={"situacao": "Proibido", "responsavel": "Ninguém"}
        )
        assert res.status_code == 403


def test_validacao_tipo_e_titulo(client: TestClient):
    headers_rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")
    res = client.post("/api/v1/onboarding/itens", headers=headers_rh, json={"tipo": "OUTRO", "titulo": "Válido"})
    assert res.status_code == 422
    res = client.post("/api/v1/onboarding/itens", headers=headers_rh, json={"titulo": "  "})
    assert res.status_code == 422

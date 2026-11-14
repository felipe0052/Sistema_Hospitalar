from fastapi.testclient import TestClient


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_crud_links_aniversario_admin(client: TestClient):
    h_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    h_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    r1 = client.post(
        "/api/v1/links-aniversario",
        headers=h_admin,
        json={"titulo": "Cartão de parabéns", "url": "https://cartoes.decos.com.br", "ativo": True},
    )
    assert r1.status_code == 201
    link1 = r1.json()

    r2 = client.post(
        "/api/v1/links-aniversario",
        headers=h_admin,
        json={"titulo": "Folga de aniversário", "url": "https://rh.decos.com.br/folga", "ativo": False},
    )
    assert r2.status_code == 201
    link2 = r2.json()

    res_colab = client.get("/api/v1/links-aniversario", headers=h_colab)
    assert res_colab.status_code == 200
    assert [i["id"] for i in res_colab.json()] == [link1["id"]]

    assert client.get("/api/v1/links-aniversario").status_code == 401

    res_admin = client.get("/api/v1/links-aniversario/admin", headers=h_admin)
    assert res_admin.status_code == 200
    assert len(res_admin.json()) == 2

    r_edit = client.put(
        f"/api/v1/links-aniversario/{link2['id']}",
        headers=h_admin,
        json={"titulo": "Folga de aniversário", "url": "https://rh.decos.com.br/folga", "ativo": True},
    )
    assert r_edit.status_code == 200
    assert r_edit.json()["ativo"] is True

    r_del = client.delete(f"/api/v1/links-aniversario/{link1['id']}", headers=h_admin)
    assert r_del.status_code == 204

    res_final = client.get("/api/v1/links-aniversario", headers=h_colab)
    assert [i["id"] for i in res_final.json()] == [link2["id"]]


def test_links_aniversario_apenas_admin_gerencia(client: TestClient):
    h_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")
    h_rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")
    dados = {"titulo": "Link", "url": "https://exemplo.com"}

    assert client.post("/api/v1/links-aniversario", headers=h_colab, json=dados).status_code == 403
    assert client.post("/api/v1/links-aniversario", headers=h_rh, json=dados).status_code == 403
    assert client.get("/api/v1/links-aniversario/admin", headers=h_colab).status_code == 403


def test_links_aniversario_url_invalida(client: TestClient):
    h_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    res = client.post(
        "/api/v1/links-aniversario",
        headers=h_admin,
        json={"titulo": "Link", "url": "javascript:alert(1)"},
    )
    assert res.status_code == 422


def test_configuracao_mensagem_aniversario_crud_e_permissoes(client: TestClient):
    h_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    h_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    # Colaborador pode ler a mensagem configurada
    res_get = client.get("/api/v1/links-aniversario/configuracao", headers=h_colab)
    assert res_get.status_code == 200
    dados = res_get.json()
    assert "mensagem" in dados
    assert "Hospital Decós" in dados["mensagem"]

    # Colaborador não pode alterar (apenas ADMIN)
    payload_novo = {
        "mensagem": "Parabéns especial do Hospital Decós! Que seu novo ciclo seja repleto de realizações.",
        "titulo": "🎉 Parabéns, {nome}!",
        "assinatura": "— Gestão de Pessoas & Diretoria",
    }
    res_put_colab = client.put(
        "/api/v1/links-aniversario/configuracao",
        headers=h_colab,
        json=payload_novo,
    )
    assert res_put_colab.status_code == 403

    # Admin altera com sucesso
    res_put_admin = client.put(
        "/api/v1/links-aniversario/configuracao",
        headers=h_admin,
        json=payload_novo,
    )
    assert res_put_admin.status_code == 200
    assert res_put_admin.json()["mensagem"] == payload_novo["mensagem"]
    assert res_put_admin.json()["titulo"] == payload_novo["titulo"]
    assert res_put_admin.json()["assinatura"] == payload_novo["assinatura"]

    # Leitura reflete a nova mensagem
    res_get_novo = client.get("/api/v1/links-aniversario/configuracao", headers=h_colab)
    assert res_get_novo.status_code == 200
    assert res_get_novo.json()["mensagem"] == payload_novo["mensagem"]


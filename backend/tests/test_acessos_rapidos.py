"""Testes automatizados de Acesso Rápido gerenciado pelo ADMIN (A4)."""

from fastapi.testclient import TestClient


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_crud_acessos_rapidos_admin_e_visibilidade_ativos(client: TestClient):
    h_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    h_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    # 1. ADMIN cria 2 links externos (201)
    r1 = client.post(
        "/api/v1/acessos-rapidos",
        headers=h_admin,
        json={
            "titulo": "E-mail Corporativo",
            "url": "https://mail.decos.com.br",
            "descricao": "Webmail institucional",
            "icone": "chat",
            "ordem": 1,
            "ativo": True,
        },
    )
    assert r1.status_code == 201
    link1 = r1.json()
    assert link1["titulo"] == "E-mail Corporativo"
    assert link1["url"] == "https://mail.decos.com.br"
    assert link1["ativo"] is True

    r2 = client.post(
        "/api/v1/acessos-rapidos",
        headers=h_admin,
        json={
            "titulo": "Sistema de Ponto",
            "url": "https://ponto.decos.com.br",
            "descricao": "Espelho de ponto",
            "icone": "calendar",
            "ordem": 2,
            "ativo": True,
        },
    )
    assert r2.status_code == 201
    link2 = r2.json()

    # 2. Colaborador logado lista os ativos ordenados (200)
    res_lista = client.get("/api/v1/acessos-rapidos", headers=h_colab)
    assert res_lista.status_code == 200
    assert [i["id"] for i in res_lista.json()] == [link1["id"], link2["id"]]

    # 3. ADMIN reordena invertendo a ordem (200)
    res_ordem = client.put(
        "/api/v1/acessos-rapidos/ordem",
        headers=h_admin,
        json={"ids": [link2["id"], link1["id"]]},
    )
    assert res_ordem.status_code == 200
    assert [i["id"] for i in res_ordem.json()] == [link2["id"], link1["id"]]

    # 4. ADMIN edita o link 1 (200)
    res_edit = client.put(
        f"/api/v1/acessos-rapidos/{link1['id']}",
        headers=h_admin,
        json={
            "titulo": "Webmail Decós",
            "url": "https://webmail.decos.com.br",
            "descricao": "Acesso atualizado",
            "icone": "chat",
            "ordem": 2,
            "ativo": True,
        },
    )
    assert res_edit.status_code == 200
    assert res_edit.json()["titulo"] == "Webmail Decós"

    # 5. ADMIN desativa o link 1 -> não aparece no GET de colaboradores, mas aparece no /admin
    res_inativar = client.patch(
        f"/api/v1/acessos-rapidos/{link1['id']}/ativo",
        headers=h_admin,
        json={"ativo": False},
    )
    assert res_inativar.status_code == 200
    assert res_inativar.json()["ativo"] is False

    res_ativos = client.get("/api/v1/acessos-rapidos", headers=h_colab)
    assert [i["id"] for i in res_ativos.json()] == [link2["id"]]

    res_admin_all = client.get("/api/v1/acessos-rapidos/admin", headers=h_admin)
    assert res_admin_all.status_code == 200
    assert len(res_admin_all.json()) == 2

    # 6. ADMIN exclui o link 1 (204)
    res_del = client.delete(f"/api/v1/acessos-rapidos/{link1['id']}", headers=h_admin)
    assert res_del.status_code == 204
    assert len(client.get("/api/v1/acessos-rapidos/admin", headers=h_admin).json()) == 1


def test_permissoes_e_validacao_url_acessos_rapidos(client: TestClient):
    h_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    perfis_nao_admin = [
        ("colaborador@decos.com.br", "Colab@123"),
        ("rh@decos.com.br", "Rh@12345"),
        ("marketing@decos.com.br", "Mkt@12345"),
    ]

    for email, senha in perfis_nao_admin:
        headers = _obter_headers(client, email, senha)
        assert client.get("/api/v1/acessos-rapidos/admin", headers=headers).status_code == 403
        assert (
            client.post(
                "/api/v1/acessos-rapidos",
                headers=headers,
                json={"titulo": "Teste", "url": "https://decos.com.br"},
            ).status_code
            == 403
        )
        assert (
            client.put(
                "/api/v1/acessos-rapidos/1",
                headers=headers,
                json={"titulo": "Teste", "url": "https://decos.com.br"},
            ).status_code
            == 403
        )
        assert client.patch("/api/v1/acessos-rapidos/1/ativo", headers=headers).status_code == 403
        assert (
            client.put(
                "/api/v1/acessos-rapidos/ordem",
                headers=headers,
                json={"ids": [1]},
            ).status_code
            == 403
        )
        assert client.delete("/api/v1/acessos-rapidos/1", headers=headers).status_code == 403

    # URL inválida ou protocolo bloqueado (javascript:, ftp:, sem esquema) -> 422
    for url_invalida in ("javascript:alert(1)", "ftp://arquivos.decos.com.br", "apenas-texto"):
        res_inv = client.post(
            "/api/v1/acessos-rapidos",
            headers=h_admin,
            json={"titulo": "URL Inválida", "url": url_invalida},
        )
        assert res_inv.status_code == 422, f"URL {url_invalida} deveria retornar 422"

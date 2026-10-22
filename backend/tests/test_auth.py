"""Testes automatizados de Autenticação (UC01 — S1-T3)."""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "banco": "ok"}


def test_login_correto_com_4_perfis_ativos(client: TestClient):
    credenciais = [
        ("  ADMIN@DECOS.COM.BR ", "Admin@123", "ADMIN"),
        ("colaborador@decos.com.br", "Colab@123", "COLABORADOR"),
        ("rh@decos.com.br", "Rh@12345", "RH"),
        ("marketing@decos.com.br", "Mkt@12345", "MARKETING"),
    ]
    for email, senha, perfil_esperado in credenciais:
        res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
        assert res.status_code == 200
        dados = res.json()
        assert "access_token" in dados
        assert dados["token_type"] == "bearer"
        assert dados["usuario"]["email"] == email.strip().lower()
        assert dados["usuario"]["perfil"] == perfil_esperado
        assert dados["usuario"]["status"] == "ATIVO"
        assert "senha" not in dados["usuario"]
        assert "senha_hash" not in dados["usuario"]


def test_login_senha_errada_retorna_401(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@decos.com.br", "senha": "SenhaErrada@123"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "E-mail ou senha inválidos"


def test_login_email_inexistente_retorna_401(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "naoexiste@decos.com.br", "senha": "Admin@123"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "E-mail ou senha inválidos"


def test_login_usuario_inativo_retorna_403(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "inativo@decos.com.br", "senha": "Inativo@123"},
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "Usuário inativo. Procure o administrador."


def test_login_campos_invalidos_retorna_422_padronizado(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "email-invalido", "senha": ""},
    )
    assert res.status_code == 422
    corpo = res.json()
    assert "detail" in corpo
    assert "erros" in corpo
    assert "email" in corpo["erros"]


def test_auth_me_retorna_dados_do_usuario_logado(client: TestClient):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "colaborador@decos.com.br", "senha": "Colab@123"},
    )
    token = login_res.json()["access_token"]

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    dados = me_res.json()
    assert dados["email"] == "colaborador@decos.com.br"
    assert dados["perfil"] == "COLABORADOR"
    assert dados["setor"]["nome"] == "UTI"
    assert "senha_hash" not in dados


def test_auth_me_sem_token_ou_token_invalido_retorna_401(client: TestClient):
    res_sem = client.get("/api/v1/auth/me")
    assert res_sem.status_code == 401
    assert res_sem.json()["detail"] == "Sessão expirada. Faça login novamente."

    res_invalido = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer token.invalido.aqui"},
    )
    assert res_invalido.status_code == 401
    assert res_invalido.json()["detail"] == "Sessão expirada. Faça login novamente."

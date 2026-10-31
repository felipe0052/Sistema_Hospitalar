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
    assert res.json()["detail"] == "E-mail ou senha inválidos. Procure o ADMIN."


def test_login_email_inexistente_retorna_401(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "naoexiste@decos.com.br", "senha": "Admin@123"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "E-mail ou senha inválidos. Procure o ADMIN."


def test_login_usuario_inativo_retorna_401(client: TestClient):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "inativo@decos.com.br", "senha": "Inativo@123"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "E-mail ou senha inválidos. Procure o ADMIN."


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


def test_aniversario_hoje_no_login_e_me_E_bissexto(client: TestClient, db_session):
    from datetime import date, datetime, timedelta
    from zoneinfo import ZoneInfo

    from app.models.usuario import Usuario
    from app.schemas.usuario import eh_aniversario_hoje

    hoje_sp = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    ontem_sp = hoje_sp - timedelta(days=1)

    colab = db_session.query(Usuario).filter(Usuario.email == "colaborador@decos.com.br").first()
    assert colab is not None

    # 1. Data de nascimento = hoje -> aniversario_hoje == True
    colab.data_nascimento = date(1992, hoje_sp.month, hoje_sp.day)
    db_session.commit()

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "colaborador@decos.com.br", "senha": "Colab@123"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["usuario"]["aniversario_hoje"] is True
    token = login_res.json()["access_token"]

    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["aniversario_hoje"] is True

    # 2. Data de nascimento = outro dia -> aniversario_hoje == False
    colab.data_nascimento = date(1992, ontem_sp.month, ontem_sp.day)
    db_session.commit()
    me_outro = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_outro.status_code == 200
    assert me_outro.json()["aniversario_hoje"] is False

    # 3. Data de nascimento = None -> aniversario_hoje == False
    colab.data_nascimento = None
    db_session.commit()
    me_nulo = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_nulo.status_code == 200
    assert me_nulo.json()["aniversario_hoje"] is False

    # 4. Regra 29/02 em ano não bissexto -> comemora em 28/02
    assert eh_aniversario_hoje(date(2000, 2, 29), hoje=date(2026, 2, 28)) is True
    assert eh_aniversario_hoje(date(2000, 2, 29), hoje=date(2024, 2, 28)) is False
    assert eh_aniversario_hoje(date(2000, 2, 29), hoje=date(2024, 2, 29)) is True

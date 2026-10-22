"""Testes automatizados de Gestão de Usuários e Controle de Acesso (UC02, UC03 — S1-T4)."""

from fastapi.testclient import TestClient


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_listar_usuarios_paginado_e_filtros(client: TestClient):
    headers = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    # Busca sem diferenciar maiúsculas e acentos
    res = client.get("/api/v1/usuarios?busca=patricia", headers=headers)
    assert res.status_code == 200
    dados = res.json()
    assert dados["total"] == 1
    assert dados["itens"][0]["email"] == "rh@decos.com.br"
    assert "senha_hash" not in dados["itens"][0]

    # Filtro por perfil e status
    res_inativos = client.get("/api/v1/usuarios?status=INATIVO", headers=headers)
    assert res_inativos.status_code == 200
    assert res_inativos.json()["total"] == 1
    assert res_inativos.json()["itens"][0]["email"] == "inativo@decos.com.br"


def test_obter_usuario_por_id_e_404(client: TestClient):
    headers = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    res_ok = client.get("/api/v1/usuarios/1", headers=headers)
    assert res_ok.status_code == 200
    assert res_ok.json()["id_usuario"] == 1

    res_404 = client.get("/api/v1/usuarios/99999", headers=headers)
    assert res_404.status_code == 404
    assert res_404.json()["detail"] == "Usuário não encontrado."


def test_criar_usuario_com_sucesso_padrao_colaborador_ativo(client: TestClient):
    headers = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    res = client.post(
        "/api/v1/usuarios",
        headers=headers,
        json={
            "nome": "Dra. Juliana Mendes",
            "email": "JULIANA.MENDES@DECOS.COM.BR",
            "senha": "Senha@123",
            "cargo": "Enfermeira",
            "data_nascimento": "1993-07-15",
            "id_setor": 1,
        },
    )
    assert res.status_code == 201
    criado = res.json()
    assert criado["email"] == "juliana.mendes@decos.com.br"
    assert criado["perfil"] == "COLABORADOR"
    assert criado["status"] == "ATIVO"
    assert criado["setor"]["nome"] == "UTI"
    assert "senha_hash" not in criado


def test_criar_usuario_sem_setor_e_validacao_422(client: TestClient):
    headers = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    # Sem setor cadastrado (UC02 fluxo alternativo)
    res_sem_setor = client.post(
        "/api/v1/usuarios",
        headers=headers,
        json={
            "nome": "Lucas Sem Setor",
            "email": "lucas.semsetor@decos.com.br",
            "senha": "Senha@123",
            "cargo": "",
            "id_setor": None,
        },
    )
    assert res_sem_setor.status_code == 201
    assert res_sem_setor.json()["setor"] is None
    assert res_sem_setor.json()["cargo"] is None

    # Senha fraca e data futura → 422 padronizado
    res_invalido = client.post(
        "/api/v1/usuarios",
        headers=headers,
        json={
            "nome": "Teste Inválido",
            "email": "invalido@decos.com.br",
            "senha": "semnumeros",
            "data_nascimento": "2099-01-01",
        },
    )
    assert res_invalido.status_code == 422
    erros = res_invalido.json()["erros"]
    assert "senha" in erros
    assert "data_nascimento" in erros


def test_criar_usuario_email_duplicado_retorna_409(client: TestClient):
    headers = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    res = client.post(
        "/api/v1/usuarios",
        headers=headers,
        json={
            "nome": "Outro Colaborador",
            "email": "colaborador@decos.com.br",
            "senha": "Senha@123",
        },
    )
    assert res.status_code == 409
    corpo = res.json()
    assert "erros" in corpo
    assert corpo["erros"]["email"] == "Este e-mail já pertence a outro usuário"


def test_colaborador_e_marketing_bloqueados_em_rota_administrativa_403(client: TestClient):
    for email, senha in [
        ("colaborador@decos.com.br", "Colab@123"),
        ("marketing@decos.com.br", "Mkt@12345"),
    ]:
        headers = _obter_headers(client, email, senha)
        res = client.get("/api/v1/usuarios", headers=headers)
        assert res.status_code == 403
        assert res.json()["detail"] == "Permissão insuficiente."


def test_rh_pode_cadastrar_e_editar_colaborador_mas_nao_alterar_acesso_nem_admin(client: TestClient):
    headers_rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")

    # RH cria colaborador comum
    res_criar = client.post(
        "/api/v1/usuarios",
        headers=headers_rh,
        json={
            "nome": "Novo Colaborador RH",
            "email": "novo.rh@decos.com.br",
            "senha": "Senha@123",
            "cargo": "Técnico de Enfermagem",
        },
    )
    assert res_criar.status_code == 201
    id_novo = res_criar.json()["id_usuario"]

    # RH não pode criar usuário com perfil ADMIN
    res_criar_admin = client.post(
        "/api/v1/usuarios",
        headers=headers_rh,
        json={
            "nome": "Tentativa Admin",
            "email": "tentativa.admin@decos.com.br",
            "senha": "Senha@123",
            "perfil": "ADMIN",
        },
    )
    assert res_criar_admin.status_code == 403

    # RH edita colaborador comum
    res_editar = client.put(
        f"/api/v1/usuarios/{id_novo}",
        headers=headers_rh,
        json={
            "nome": "Novo Colaborador RH Atualizado",
            "email": "novo.rh@decos.com.br",
            "cargo": "Enfermeiro Pleno",
        },
    )
    assert res_editar.status_code == 200
    assert res_editar.json()["nome"] == "Novo Colaborador RH Atualizado"

    # RH não pode editar conta ADMIN
    res_editar_admin = client.put(
        "/api/v1/usuarios/1",
        headers=headers_rh,
        json={
            "nome": "Tentativa Editar Admin",
            "email": "admin@decos.com.br",
        },
    )
    assert res_editar_admin.status_code == 403

    # RH não pode acessar /acesso (exclusivo ADMIN)
    res_acesso = client.patch(
        f"/api/v1/usuarios/{id_novo}/acesso",
        headers=headers_rh,
        json={"perfil": "ADMIN"},
    )
    assert res_acesso.status_code == 403


def test_inativacao_incrementa_versao_token_derruba_sessao_e_grava_historico(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    # Sessão ativa do colaborador funciona antes da alteração
    me_antes = client.get("/api/v1/auth/me", headers=headers_colab)
    assert me_antes.status_code == 200
    id_colab = me_antes.json()["id_usuario"]

    # Admin altera perfil para MARKETING e depois inativa o usuário
    res_perfil = client.patch(
        f"/api/v1/usuarios/{id_colab}/acesso",
        headers=headers_admin,
        json={"perfil": "MARKETING"},
    )
    assert res_perfil.status_code == 200
    assert res_perfil.json()["perfil"] == "MARKETING"

    # O token antigo do colaborador já deve ser invalidado (401) pois VERSAO_TOKEN mudou
    me_apos_perfil = client.get("/api/v1/auth/me", headers=headers_colab)
    assert me_apos_perfil.status_code == 401

    # Admin inativa o colaborador
    res_inativar = client.patch(
        f"/api/v1/usuarios/{id_colab}/acesso",
        headers=headers_admin,
        json={"status": "INATIVO"},
    )
    assert res_inativar.status_code == 200
    assert res_inativar.json()["status"] == "INATIVO"

    # Colaborador inativado não consegue mais fazer login
    login_inativo = client.post(
        "/api/v1/auth/login",
        json={"email": "colaborador@decos.com.br", "senha": "Colab@123"},
    )
    assert login_inativo.status_code == 403

    # Verifica histórico de auditoria gravado (do mais recente para o mais antigo)
    res_hist = client.get(f"/api/v1/usuarios/{id_colab}/historico-acesso", headers=headers_admin)
    assert res_hist.status_code == 200
    historico = res_hist.json()
    assert len(historico) == 2
    assert historico[0]["campo"] == "STATUS"
    assert historico[0]["valor_anterior"] == "ATIVO"
    assert historico[0]["valor_novo"] == "INATIVO"
    assert historico[0]["admin"]["nome"] == "André Luiz"
    assert historico[1]["campo"] == "PERFIL"
    assert historico[1]["valor_anterior"] == "COLABORADOR"
    assert historico[1]["valor_novo"] == "MARKETING"


def test_admin_impedido_de_inativar_ou_remover_admin_de_si_proprio(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    me_admin = client.get("/api/v1/auth/me", headers=headers_admin).json()
    id_admin = me_admin["id_usuario"]

    res_inativar = client.patch(
        f"/api/v1/usuarios/{id_admin}/acesso",
        headers=headers_admin,
        json={"status": "INATIVO"},
    )
    assert res_inativar.status_code == 400
    assert (
        res_inativar.json()["detail"]
        == "Você não pode remover seu próprio perfil de administrador ou inativar sua própria conta."
    )

    res_rebaixar = client.patch(
        f"/api/v1/usuarios/{id_admin}/acesso",
        headers=headers_admin,
        json={"perfil": "COLABORADOR"},
    )
    assert res_rebaixar.status_code == 400


def test_redefinir_senha_invalida_sessao_anterior(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")
    id_colab = client.get("/api/v1/auth/me", headers=headers_colab).json()["id_usuario"]

    res = client.patch(
        f"/api/v1/usuarios/{id_colab}/senha",
        headers=headers_admin,
        json={"nova_senha": "NovaSenha@99"},
    )
    assert res.status_code == 204

    # Token antigo foi derrubado
    assert client.get("/api/v1/auth/me", headers=headers_colab).status_code == 401

    # Login com a nova senha funciona
    novo_login = client.post(
        "/api/v1/auth/login",
        json={"email": "colaborador@decos.com.br", "senha": "NovaSenha@99"},
    )
    assert novo_login.status_code == 200

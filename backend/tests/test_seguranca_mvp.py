"""Testes de Segurança, Robustez, Auditoria de Permissões e Homologação Integrada do MVP (S4-T2 e S4-T7)."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session

from app.schemas.auth import LoginRequest
from app.services import auth_service
from app.storage.storage_service import LocalStorage


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_auditoria_permissoes_colaborador_comum_recebe_403_em_todas_rotas_administrativas(
    client: TestClient,
):
    """
    S4-T2 (Item 1): Varredura completa iterando por todas as rotas de criação, edição,
    exclusão e gestão administrativa simulando um colaborador comum e esperando HTTP 403.
    """
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    rotas_administrativas = [
        # Usuários e Controle de Acesso (UC02, UC03)
        ("GET", "/api/v1/usuarios", None, None),
        ("GET", "/api/v1/usuarios/1", None, None),
        (
            "POST",
            "/api/v1/usuarios",
            {"nome": "Teste", "email": "teste@decos.com.br", "senha": "Teste@123"},
            None,
        ),
        (
            "PUT",
            "/api/v1/usuarios/1",
            {"nome": "Teste", "email": "admin@decos.com.br"},
            None,
        ),
        ("PATCH", "/api/v1/usuarios/1/senha", {"nova_senha": "NovaSenha@123"}, None),
        ("PATCH", "/api/v1/usuarios/1/acesso", {"perfil": "ADMIN"}, None),
        ("GET", "/api/v1/usuarios/1/historico-acesso", None, None),
        # Setores e Ramais (UC08)
        (
            "POST",
            "/api/v1/setores",
            {"nome": "Setor Bloqueado", "andar": "Térreo", "ramais": [{"numero": "9991"}]},
            None,
        ),
        (
            "PUT",
            "/api/v1/setores/1",
            {"nome": "UTI Editada", "andar": "2º andar", "ramais": [{"numero": "2101"}]},
            None,
        ),
        ("DELETE", "/api/v1/setores/1", None, None),
        # Avisos e Comunicados — Gestão (UC04)
        ("GET", "/api/v1/avisos/gestao", None, None),
        (
            "POST",
            "/api/v1/avisos",
            {"titulo": "Aviso Bloqueado", "conteudo": "Conteúdo", "categoria": "COMUNICADO", "destaque": False},
            None,
        ),
        (
            "PUT",
            "/api/v1/avisos/1",
            {"titulo": "Aviso Editado", "conteudo": "Conteúdo", "categoria": "COMUNICADO", "destaque": False},
            None,
        ),
        ("DELETE", "/api/v1/avisos/1", None, None),
        # Eventos — Gestão (UC12)
        (
            "POST",
            "/api/v1/eventos",
            {
                "titulo": "Evento Bloqueado",
                "categoria": "TREINAMENTO",
                "data_inicio": "2027-05-10T10:00:00",
            },
            None,
        ),
        (
            "PUT",
            "/api/v1/eventos/1",
            {
                "titulo": "Evento Editado",
                "categoria": "TREINAMENTO",
                "data_inicio": "2027-05-10T10:00:00",
            },
            None,
        ),
        ("DELETE", "/api/v1/eventos/1", None, None),
        # Documentos / POPs — Gestão (UC06)
        (
            "POST",
            "/api/v1/documentos",
            None,
            {
                "data": {"titulo": "POP Bloqueado", "tipo": "POP"},
                "files": {"arquivo": ("pop.pdf", b"%PDF-1.4\nteste", "application/pdf")},
            },
        ),
        (
            "PUT",
            "/api/v1/documentos/1",
            None,
            {"data": {"titulo": "POP Editado", "tipo": "POP"}},
        ),
        ("DELETE", "/api/v1/documentos/1", None, None),
        ("GET", "/api/v1/documentos/1/versoes", None, None),
        # FAQ — Gestão (UC09)
        (
            "POST",
            "/api/v1/faq",
            {"pergunta": "Pergunta bloqueada?", "resposta": "Resposta", "categoria": "Normas", "ordem": 1},
            None,
        ),
        (
            "PUT",
            "/api/v1/faq/1",
            {"pergunta": "Pergunta editada?", "resposta": "Resposta", "categoria": "Normas", "ordem": 1},
            None,
        ),
        ("DELETE", "/api/v1/faq/1", None, None),
    ]

    for metodo, url, json_body, multipart in rotas_administrativas:
        if multipart:
            res = client.request(
                metodo,
                url,
                headers=headers_colab,
                data=multipart.get("data"),
                files=multipart.get("files"),
            )
        else:
            res = client.request(metodo, url, headers=headers_colab, json=json_body)

        assert res.status_code == 403, f"Falha de permissão em {metodo} {url}: retornou {res.status_code}"
        assert res.json()["detail"] == "Permissão insuficiente."


def test_protecao_forca_bruta_login_bloqueia_com_429_apos_5_falhas_em_15_minutos(
    client: TestClient,
    db_session: Session,
):
    """
    S4-T2 (Item 2 / RNF03): 5 tentativas inválidas consecutivas em 15 minutos
    bloqueiam novas tentativas com HTTP 429 Too Many Requests.
    """
    auth_service.limpar_tentativas_login()

    for tentativa in range(1, 6):
        res = client.post(
            "/api/v1/auth/login",
            json={"email": "colaborador@decos.com.br", "senha": f"SenhaErrada@{tentativa}"},
        )
        assert res.status_code == 401
        assert res.json()["detail"] == "E-mail ou senha inválidos"

    # 6ª tentativa (mesmo com a senha correta!) dentro dos 15 minutos recebe 429
    res_bloqueado = client.post(
        "/api/v1/auth/login",
        json={"email": "colaborador@decos.com.br", "senha": "Colab@123"},
    )
    assert res_bloqueado.status_code == 429
    assert "15 minutos" in res_bloqueado.json()["detail"]

    # Outro usuário/e-mail não é afetado pelo bloqueio
    res_outro = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@decos.com.br", "senha": "Admin@123"},
    )
    assert res_outro.status_code == 200

    # Após 16 minutos, o bloqueio expira automaticamente
    futuro = datetime.now(timezone.utc) + timedelta(minutes=16)
    token_resp = auth_service.login(
        db_session,
        LoginRequest(email="colaborador@decos.com.br", senha="Colab@123"),
        client_ip="testclient",
        agora=futuro,
    )
    assert token_resp.access_token


def test_headers_seguranca_e_tratamento_excecao_global_500_sem_vazar_traceback(
    client: TestClient,
):
    """
    S4-T2 (Itens 3 e 4): Headers HTTP de segurança presentes e handler global de
    exceções responde HTTP 500 amigável sem vazar tracebacks ou SQL.
    """
    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200
    assert res_health.headers.get("x-content-type-options") == "nosniff"
    assert res_health.headers.get("x-frame-options") == "SAMEORIGIN"
    assert res_health.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

    # Simula erro inesperado em um service e verifica resposta 500 amigável
    with patch("app.services.dashboard_service.obter_dashboard", side_effect=RuntimeError("SELECT * FROM SECRET_TABLE")):
        with TestClient(client.app, raise_server_exceptions=False) as safe_client:
            res_500 = safe_client.get("/api/v1/dashboard")
            assert res_500.status_code == 500
            corpo = res_500.json()
            assert corpo == {"detail": "Ocorreu um erro interno no servidor. Tente novamente mais tarde."}
            assert "SECRET_TABLE" not in res_500.text
            assert "Traceback" not in res_500.text


def test_local_storage_seguranca_path_traversal_e_limpeza_temporarios(tmp_path: Path):
    """
    S4-T2 (Item 5): Consolidação da classe LocalStorage com segurança contra Path Traversal
    e limpeza automática de arquivos temporários (.tmp).
    """
    arquivo_orfao = tmp_path / "documentos" / ".orfao.pdf.123.tmp"
    arquivo_orfao.parent.mkdir(parents=True, exist_ok=True)
    arquivo_orfao.write_bytes(b"temporario")
    assert arquivo_orfao.exists()

    storage = LocalStorage(base_dir=tmp_path)
    # Limpou na inicialização
    assert not arquivo_orfao.exists()

    # Salva e lê arquivo legítimo
    storage.salvar(b"%PDF-1.4 conteudo", "documentos/teste.pdf", "application/pdf")
    assert storage.abrir("documentos/teste.pdf") == b"%PDF-1.4 conteudo"

    # Bloqueia tentativas de Path Traversal
    with pytest.raises(ValueError, match="inválida"):
        storage.salvar(b"malicioso", "../../etc/passwd", "text/plain")

    with pytest.raises(ValueError, match="inválida"):
        storage.abrir("../fora.pdf")


def test_homologacao_mvp_fluxo_completo_uc01_a_uc12(client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """
    S4-T7: Homologação ponta a ponta cobrindo os 12 Casos de Uso (UC01 a UC12)
    integrados em uma única jornada.
    """
    from app.core.config import settings
    from app.storage import storage_service

    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(storage_service, "_storage_instance", None)

    # UC01: Login válido (Admin, RH, Marketing, Colaborador), senha inválida (401) e inativo (403)
    assert client.post("/api/v1/auth/login", json={"email": "admin@decos.com.br", "senha": "Errada123"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={"email": "inativo@decos.com.br", "senha": "Inativo@123"}).status_code == 403

    h_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    h_rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")
    h_mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")
    h_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    # UC08: Admin cadastra setor com múltiplos ramais
    res_setor = client.post(
        "/api/v1/setores",
        headers=h_admin,
        json={
            "nome": "Hemodinâmica",
            "andar": "3º andar",
            "ramais": [
                {"numero": "3301", "descricao": "Sala de Procedimentos"},
                {"numero": "3302", "descricao": "Posto de Enfermagem"},
            ],
        },
    )
    assert res_setor.status_code == 201
    id_setor_hemo = res_setor.json()["id_setor"]

    # UC02: RH cadastra novo colaborador e valida bloqueio de e-mail duplicado (409)
    res_user = client.post(
        "/api/v1/usuarios",
        headers=h_rh,
        json={
            "nome": "Helena Vasconcelos",
            "email": "helena.vasconcelos@decos.com.br",
            "senha": "Helena@123",
            "cargo": "Enfermeira Hemodinamicista",
            "id_setor": id_setor_hemo,
            "data_nascimento": "1992-11-18",
        },
    )
    assert res_user.status_code == 201
    id_helena = res_user.json()["id_usuario"]

    res_dup = client.post(
        "/api/v1/usuarios",
        headers=h_rh,
        json={
            "nome": "Duplicada",
            "email": "helena.vasconcelos@decos.com.br",
            "senha": "Helena@123",
        },
    )
    assert res_dup.status_code == 409

    # UC03: Admin altera perfil, grava histórico e é bloqueado de rebaixar a si mesmo
    assert (
        client.patch(
            "/api/v1/usuarios/1/acesso",
            headers=h_admin,
            json={"perfil": "COLABORADOR"},
        ).status_code
        == 400
    )
    res_acesso = client.patch(
        f"/api/v1/usuarios/{id_helena}/acesso",
        headers=h_admin,
        json={"perfil": "RH"},
    )
    assert res_acesso.status_code == 200
    assert len(client.get(f"/api/v1/usuarios/{id_helena}/historico-acesso", headers=h_admin).json()) == 1

    # UC04 & UC05: Marketing publica aviso em destaque e Colaborador visualiza no mural
    res_aviso = client.post(
        "/api/v1/avisos",
        headers=h_mkt,
        json={
            "titulo": "Inauguração do Setor de Hemodinâmica no 3º Andar",
            "conteudo": "<p>O novo setor de Hemodinâmica já está em operação nos ramais 3301 e 3302.</p>",
            "categoria": "NOTICIA",
            "destaque": True,
        },
    )
    assert res_aviso.status_code == 201
    assert client.get("/api/v1/avisos?busca=Hemodinamica", headers=h_colab).json()["total"] == 1

    # UC06 & UC07: Admin envia POP em PDF e Colaborador pesquisa e baixa
    res_pop = client.post(
        "/api/v1/documentos",
        headers=h_admin,
        data={
            "titulo": "POP — Preparo de Paciente para Cateterismo Cardíaco",
            "tipo": "POP",
            "categoria": "Enfermagem",
            "palavras_chave": "cateterismo, hemodinâmica, preparo",
        },
        files={"arquivo": ("pop_cateterismo.pdf", b"%PDF-1.4\nCateterismo", "application/pdf")},
    )
    assert res_pop.status_code == 201
    pop_json = res_pop.json()
    assert client.get("/api/v1/documentos?busca=cateterismo", headers=h_colab).json()["total"] == 1
    assert client.get(pop_json["url_download"], headers=h_colab).status_code == 200

    # UC09: RH cadastra FAQ e Colaborador consulta
    res_faq = client.post(
        "/api/v1/faq",
        headers=h_rh,
        json={
            "pergunta": "Qual o ramal de contato da Hemodinâmica?",
            "resposta": "Os ramais da Hemodinâmica no 3º andar são 3301 e 3302.",
            "categoria": "Normas Hospitalares",
            "ordem": 1,
        },
    )
    assert res_faq.status_code == 201
    assert len(client.get("/api/v1/faq?busca=3301", headers=h_colab).json()) == 1

    # UC10: Colaborador pesquisa Helena no Diretório e consulta Guia de Ramais por Andar
    res_dir = client.get("/api/v1/diretorio?busca=helena", headers=h_colab)
    assert res_dir.status_code == 200
    assert res_dir.json()["total"] == 1
    assert res_dir.json()["itens"][0]["ramais"] == ["3301", "3302"]

    res_ramais = client.get("/api/v1/diretorio/ramais?andar=3º andar", headers=h_colab)
    assert res_ramais.status_code == 200
    assert res_ramais.json()[0]["setores"][0]["nome"] == "Hemodinâmica"

    # UC11: Colaborador visualiza aniversariantes de novembro sem exposição de ano ou idade
    res_aniv = client.get("/api/v1/aniversariantes?mes=11", headers=h_colab)
    assert res_aniv.status_code == 200
    helena_aniv = next(a for a in res_aniv.json() if a["id_usuario"] == id_helena)
    assert helena_aniv["dia"] == 18
    assert helena_aniv["mes"] == 11
    assert "ano" not in helena_aniv and "idade" not in helena_aniv

    # UC12: Marketing publica evento futuro e Colaborador visualiza na agenda e no Dashboard
    futuro_iso = (datetime.now() + timedelta(days=5)).replace(microsecond=0).isoformat()
    res_ev = client.post(
        "/api/v1/eventos",
        headers=h_mkt,
        json={
            "titulo": "Simpósio Interno de Enfermagem em Hemodinâmica",
            "categoria": "TREINAMENTO",
            "data_inicio": futuro_iso,
            "local": "Auditório — 4º andar",
            "id_setor": id_setor_hemo,
        },
    )
    assert res_ev.status_code == 201
    assert len(client.get("/api/v1/eventos?busca=Simposio", headers=h_colab).json()) == 1

    res_dash = client.get("/api/v1/dashboard", headers=h_colab)
    assert res_dash.status_code == 200
    assert len(res_dash.json()["avisos_destaque"]) >= 1
    assert len(res_dash.json()["proximos_eventos"]) >= 1


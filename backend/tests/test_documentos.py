"""Testes da API de Documentos (upload PDF/DOCX, palavras-chave e versionamento)."""

from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.core.config import settings

PDF = b"%PDF-1.4\n%conteudo de teste\n"
DOCX = b"PK\x03\x04conteudo de teste"


@pytest.fixture(autouse=True)
def _upload_tmp(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))


def _headers(client: TestClient, email="admin@decos.com.br", senha="Admin@123"):
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _enviar(client, headers, nome="pop.pdf", conteudo=PDF, **dados):
    form = {"titulo": "POP Higienização das Mãos", "tipo": "POP", **dados}
    return client.post(
        "/api/v1/documentos", headers=headers, data=form, files={"arquivo": (nome, conteudo)}
    )


def test_upload_pdf_e_docx_validos(client: TestClient):
    h = _headers(client)
    assert _enviar(client, h).status_code == 201
    res = _enviar(client, h, nome="norma.docx", conteudo=DOCX, titulo="Norma Interna", tipo="DOCUMENTO")
    assert res.status_code == 201
    assert res.json()["versao"] == 1 and res.json()["ativo"] is True


def test_rejeita_formato_tamanho_e_assinatura_invalidos(client: TestClient, monkeypatch):
    h = _headers(client)
    assert _enviar(client, h, nome="x.exe", conteudo=PDF).status_code == 400
    assert _enviar(client, h, nome="x.pdf", conteudo=b"nao e pdf").status_code == 400
    assert _enviar(client, h, nome="x.pdf", conteudo=b"").status_code == 400
    grande = PDF + b"0" * (10 * 1024 * 1024)
    res = _enviar(client, h, conteudo=grande)
    assert res.status_code == 400 and "10 MB" in res.json()["detail"]


def test_somente_admin_e_rh_enviam(client: TestClient):
    colab = _headers(client, "colaborador@decos.com.br", "Colab@123")
    assert _enviar(client, colab).status_code == 403
    assert _enviar(client, {}).status_code == 401
    rh = _headers(client, "rh@decos.com.br", "Rh@12345")
    assert _enviar(client, rh).status_code == 201


def test_palavras_chave_normalizadas_e_categoria_inferida(client: TestClient):
    h = _headers(client)
    res = _enviar(client, h, palavras_chave="Curativo, curativo; Enfermagem , paciente")
    corpo = res.json()
    assert corpo["palavras_chave"] == ["Curativo", "Enfermagem", "paciente"]
    assert corpo["categoria"] == "Enfermagem"

    explicito = _enviar(client, h, titulo="Outro", categoria="Qualidade", palavras_chave="curativo")
    assert explicito.json()["categoria"] == "Qualidade"

    busca = client.get("/api/v1/documentos", params={"palavra_chave": "curativo"})
    assert busca.json()["total"] == 2


def test_versionamento_mantem_apenas_a_vigente_ativa(client: TestClient):
    h = _headers(client)
    v1 = _enviar(client, h).json()
    v2 = _enviar(client, h, titulo="pop higienização das mãos").json()
    assert (v1["versao"], v2["versao"]) == (1, 2)

    lista = client.get("/api/v1/documentos").json()
    assert [d["id_doc"] for d in lista["itens"]] == [v2["id_doc"]]

    # versão antiga some para o público e é acessível a gestores
    assert client.get(f"/api/v1/documentos/{v1['id_doc']}").status_code == 404
    assert client.get(f"/api/v1/documentos/{v1['id_doc']}", headers=h).json()["ativo"] is False
    versoes = client.get(f"/api/v1/documentos/{v2['id_doc']}/versoes", headers=h).json()
    assert [v["versao"] for v in versoes] == [2, 1]
    com_inativas = client.get("/api/v1/documentos", params={"incluir_inativas": True}, headers=h).json()
    assert com_inativas["total"] == 2
    assert client.get("/api/v1/documentos", params={"incluir_inativas": True}).json()["total"] == 1


def test_tipo_diferente_nao_versiona_junto(client: TestClient):
    h = _headers(client)
    _enviar(client, h, tipo="POP")
    _enviar(client, h, tipo="DOCUMENTO")
    assert client.get("/api/v1/documentos").json()["total"] == 2


def test_download_e_exclusao_reativa_versao_anterior(client: TestClient):
    h = _headers(client)
    v1 = _enviar(client, h).json()
    v2 = _enviar(client, h, conteudo=PDF + b"v2").json()

    baixado = client.get(f"/api/v1/documentos/{v2['id_doc']}/arquivo")
    assert baixado.status_code == 200 and baixado.content == PDF + b"v2"
    assert client.get(f"/api/v1/documentos/{v1['id_doc']}/arquivo").status_code == 404

    assert client.delete(f"/api/v1/documentos/{v2['id_doc']}", headers=h).status_code == 204
    lista = client.get("/api/v1/documentos").json()
    assert [d["id_doc"] for d in lista["itens"]] == [v1["id_doc"]]

"""Testes automatizados da API de Documentos/POPs e StorageService (UC06, UC07 — S3-T1 com versionamento)."""

from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.usuario import Usuario
from app.schemas.documento import DocumentoMetadadosIn
from app.services import documento_service
from app.storage import storage_service

PDF_PADRAO = b"%PDF-1.4\n%conteudo de teste\n"
DOCX_PADRAO = b"PK\x03\x04conteudo de teste"


def _obter_headers(client: TestClient, email: str = "admin@decos.com.br", senha: str = "Admin@123") -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _gerar_pdf_valido(texto: str = "Procedimento Operacional Padrao Hospital Decos") -> bytes:
    corpo = (
        "%PDF-1.4\n"
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        f"3 0 obj << /Type /Page /Parent 2 0 R /Resources << >> /Contents 4 0 R >> endobj\n"
        f"4 0 obj << /Length {len(texto) + 20} >> stream\nBT ({texto}) Tj ET\nendstream endobj\n"
        "trailer << /Root 1 0 R >>\n%%EOF\n"
    )
    return corpo.encode("latin-1", errors="ignore")


def _gerar_docx_valido(conteudo_extra: bytes = b"Documento DOCX Hospital Decos") -> bytes:
    return b"PK\x03\x04\x14\x00\x00\x00\x08\x00" + conteudo_extra


def _enviar(client: TestClient, headers: dict[str, str], nome: str = "pop.pdf", conteudo: bytes = PDF_PADRAO, **dados):
    form = {"titulo": "POP Higienização das Mãos", "tipo": "POP", **dados}
    return client.post(
        "/api/v1/documentos", headers=headers, data=form, files={"arquivo": (nome, conteudo)}
    )


@pytest.fixture(autouse=True)
def _isolar_diretorio_uploads(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Isola o diretório de uploads em cada teste para não poluir o workspace."""
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(storage_service, "_storage_instance", None)
    yield
    monkeypatch.setattr(storage_service, "_storage_instance", None)


def test_upload_pdf_e_docx_legitimos_visualizacao_e_download(
    client: TestClient,
    tmp_path: Path,
):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    pdf_bytes = _gerar_pdf_valido("POP Higienizacao das Maos CCIH")
    res_pdf = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={
            "titulo": "POP — Higienização Simples e Antisséptica das Mãos",
            "tipo": "POP",
            "categoria": "Enfermagem",
            "descricao": "Protocolo assistencial obrigatório da CCIH para higienização das mãos.",
            "palavras_chave": "higienização, mãos, ccih, infecção",
        },
        files={"arquivo": ("pop_higienizacao_maos.pdf", pdf_bytes, "application/pdf")},
    )
    assert res_pdf.status_code == 201
    doc_pdf = res_pdf.json()
    assert doc_pdf["titulo"] == "POP — Higienização Simples e Antisséptica das Mãos"
    assert doc_pdf["tipo"] == "POP"
    assert doc_pdf["categoria"] == "Enfermagem"
    assert doc_pdf["palavras_chave"] == ["higienização", "mãos", "ccih", "infecção"]
    assert doc_pdf["nome_arquivo"] == "pop_higienizacao_maos.pdf"
    assert doc_pdf["mime_type"] == "application/pdf"
    assert doc_pdf["tamanho_bytes"] == len(pdf_bytes)
    assert doc_pdf["versao"] == 1
    assert doc_pdf["ativo"] is True
    assert doc_pdf["url_visualizar"] == f"/api/v1/documentos/{doc_pdf['id_doc']}/arquivo"
    assert doc_pdf["url_download"] == f"/api/v1/documentos/{doc_pdf['id_doc']}/arquivo?download=true"

    arquivos_disco = list((tmp_path / "documentos").glob("*.pdf"))
    assert len(arquivos_disco) == 1
    assert arquivos_disco[0].name != "pop_higienizacao_maos.pdf"

    # Upload de DOCX legítimo
    docx_bytes = _gerar_docx_valido()
    res_docx = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={
            "titulo": "Manual de Acolhimento e Classificação de Risco",
            "tipo": "DOCUMENTO",
            "categoria": "Pronto-Socorro",
            "descricao": "Diretrizes de triagem clínica e acolhimento humanizado.",
            "palavras_chave": "triagem, acolhimento, emergencia",
        },
        files={
            "arquivo": (
                "manual_triagem.docx",
                docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert res_docx.status_code == 201
    doc_docx = res_docx.json()
    assert doc_docx["tipo"] == "DOCUMENTO"
    assert doc_docx["mime_type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    # Visualização inline
    res_inline = client.get(doc_pdf["url_visualizar"], headers=headers_colab)
    assert res_inline.status_code == 200
    assert res_inline.content == pdf_bytes
    assert res_inline.headers["content-type"] == "application/pdf"
    assert "inline" in res_inline.headers["content-disposition"]

    # Download forçado
    res_download = client.get(doc_pdf["url_download"], headers=headers_colab)
    assert res_download.status_code == 200
    assert res_download.content == pdf_bytes
    assert "attachment" in res_download.headers["content-disposition"]


def test_rejeicao_arquivo_malicioso_ou_executavel_renomeado_retorna_415(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    # Executável MZ
    res_exe_pdf = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={"titulo": "Arquivo Malicioso Disfarçado", "tipo": "POP"},
        files={"arquivo": ("malware.pdf", b"MZ\x90\x00\x03\x00\x00\x00executavel_falso", "application/pdf")},
    )
    assert res_exe_pdf.status_code == 415

    # Falso docx
    res_falso_docx = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={"titulo": "Falso Documento Word", "tipo": "DOCUMENTO"},
        files={"arquivo": ("falso.docx", b"#!/bin/bash\nrm -rf /", "application/octet-stream")},
    )
    assert res_falso_docx.status_code == 415

    # Extensão inválida
    res_ext_invalida = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={"titulo": "Arquivo de Texto Simples", "tipo": "DOCUMENTO"},
        files={"arquivo": ("notas.txt", b"%PDF-1.4 mesmo com magic byte", "text/plain")},
    )
    assert res_ext_invalida.status_code == 415


def test_arquivo_acima_do_limite_20mb_retorna_413(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    conteudo_20mb_mais_1 = b"%PDF-1.4\n" + (b"0" * (20 * 1024 * 1024))
    res = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={"titulo": "POP Gigante Acima de 20MB", "tipo": "POP"},
        files={"arquivo": ("gigante.pdf", conteudo_20mb_mais_1, "application/pdf")},
    )
    assert res.status_code == 413
    assert "20 MB" in res.json()["detail"]


def test_pesquisa_por_palavra_chave_categoria_tipo_e_sem_acentos(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    docs = [
        {
            "titulo": "POP — Curativo em Cateter Venoso Central",
            "tipo": "POP",
            "categoria": "Enfermagem",
            "descricao": "Técnica asséptica para troca de curativo em pacientes de UTI.",
            "palavras_chave": "curativo, cateter, punção, uti",
        },
        {
            "titulo": "POP — Dispensação de Medicamentos Controlados (Portaria 344)",
            "tipo": "POP",
            "categoria": "Farmácia",
            "descricao": "Conferência farmacêutica e rastreabilidade de psicotrópicos.",
            "palavras_chave": "farmácia, controlados, portaria 344, dispensação",
        },
        {
            "titulo": "Protocolo Institucional de Solicitação de Férias e Escalas",
            "tipo": "DOCUMENTO",
            "categoria": "Administrativo",
            "descricao": "Normas administrativas para agendamento de férias.",
            "palavras_chave": "rh, férias, administrativo",
        },
    ]

    for item in docs:
        r = client.post(
            "/api/v1/documentos",
            headers=headers_admin,
            data=item,
            files={"arquivo": ("arquivo.pdf", _gerar_pdf_valido(item["titulo"]), "application/pdf")},
        )
        assert r.status_code == 201

    res_cats = client.get("/api/v1/documentos/categorias", headers=headers_colab)
    assert res_cats.status_code == 200
    assert "Enfermagem" in res_cats.json()
    assert "Farmácia" in res_cats.json()

    res_kw = client.get("/api/v1/documentos?busca=puncao", headers=headers_colab)
    assert res_kw.status_code == 200
    assert res_kw.json()["total"] == 1
    assert "Cateter Venoso Central" in res_kw.json()["itens"][0]["titulo"]

    res_filtro = client.get("/api/v1/documentos?tipo=POP&categoria=Enfermagem", headers=headers_colab)
    assert res_filtro.status_code == 200
    assert res_filtro.json()["total"] == 1


def test_substituicao_e_exclusao_de_arquivo_limpam_disco_e_rollback_orfao(
    client: TestClient,
    db_session: Session,
    tmp_path: Path,
):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    pdf_v1 = _gerar_pdf_valido("Versao 1 do POP")
    res_criar = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={
            "titulo": "POP — Coleta de Hemocultura",
            "tipo": "POP",
            "categoria": "Laboratório",
            "palavras_chave": "coleta, sangue, laboratório",
        },
        files={"arquivo": ("hemocultura_v1.pdf", pdf_v1, "application/pdf")},
    )
    assert res_criar.status_code == 201
    id_doc = res_criar.json()["id_doc"]

    arquivos_v1 = list((tmp_path / "documentos").glob("*"))
    assert len(arquivos_v1) == 1
    caminho_v1 = arquivos_v1[0]
    assert caminho_v1.exists()

    pdf_v2 = _gerar_pdf_valido("Versao 2 Atualizada do POP de Hemocultura")
    res_put = client.put(
        f"/api/v1/documentos/{id_doc}",
        headers=headers_admin,
        data={
            "titulo": "POP — Coleta de Hemocultura (Revisado)",
            "tipo": "POP",
            "categoria": "Laboratório",
            "palavras_chave": "coleta, sangue, laboratório, revisado",
        },
        files={"arquivo": ("hemocultura_v2.pdf", pdf_v2, "application/pdf")},
    )
    assert res_put.status_code == 200
    atualizado = res_put.json()
    assert atualizado["titulo"] == "POP — Coleta de Hemocultura (Revisado)"
    assert not caminho_v1.exists()

    res_del = client.delete(f"/api/v1/documentos/{id_doc}", headers=headers_admin)
    assert res_del.status_code == 204
    assert list((tmp_path / "documentos").glob("*")) == []

    # Rollback transacional
    admin_user = db_session.query(Usuario).filter(Usuario.email == "admin@decos.com.br").first()
    assert admin_user is not None
    metadados = DocumentoMetadadosIn(titulo="POP Teste Rollback", tipo="POP")
    with patch.object(db_session, "commit", side_effect=RuntimeError("Falha simulada no banco")):
        with pytest.raises(RuntimeError, match="Falha simulada no banco"):
            documento_service.criar_documento(
                db=db_session,
                metadados=metadados,
                nome_arquivo="orfao.pdf",
                conteudo=_gerar_pdf_valido("Nao deve sobrar no disco"),
                autor=admin_user,
            )
    assert list((tmp_path / "documentos").glob("*")) == []


def test_somente_admin_e_rh_enviam_documentos(client: TestClient):
    colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")
    mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")
    rh = _obter_headers(client, "rh@decos.com.br", "Rh@12345")
    admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    assert _enviar(client, colab).status_code == 403
    assert _enviar(client, mkt).status_code == 403
    assert _enviar(client, {}).status_code == 401
    assert _enviar(client, rh, titulo="Documento RH").status_code == 201
    assert _enviar(client, admin, titulo="Documento Admin").status_code == 201


def test_palavras_chave_normalizadas_e_categoria_inferida(client: TestClient):
    h = _obter_headers(client)
    res = _enviar(client, h, titulo="POP Curativo", palavras_chave="Curativo, curativo; Enfermagem , paciente")
    corpo = res.json()
    assert corpo["palavras_chave"] == ["Curativo", "Enfermagem", "paciente"]
    assert corpo["categoria"] == "Enfermagem"

    explicito = _enviar(client, h, titulo="Outro Protocolo", categoria="Qualidade", palavras_chave="curativo")
    assert explicito.json()["categoria"] == "Qualidade"

    busca = client.get("/api/v1/documentos", params={"palavra_chave": "curativo"})
    assert busca.json()["total"] >= 2


def test_versionamento_mantem_apenas_a_vigente_ativa(client: TestClient):
    h = _obter_headers(client)
    v1 = _enviar(client, h, titulo="POP Higienização Geral").json()
    v2 = _enviar(client, h, titulo="pop higienização geral").json()
    assert (v1["versao"], v2["versao"]) == (1, 2)

    lista = client.get("/api/v1/documentos").json()
    ids_vigentes = [d["id_doc"] for d in lista["itens"]]
    assert v2["id_doc"] in ids_vigentes
    assert v1["id_doc"] not in ids_vigentes

    # versão antiga desaparece para colaborador e é visível para gestores
    assert client.get(f"/api/v1/documentos/{v1['id_doc']}").status_code == 404
    assert client.get(f"/api/v1/documentos/{v1['id_doc']}", headers=h).json()["ativo"] is False

    versoes = client.get(f"/api/v1/documentos/{v2['id_doc']}/versoes", headers=h).json()
    assert [v["versao"] for v in versoes] == [2, 1]

    com_inativas = client.get("/api/v1/documentos", params={"incluir_inativas": True}, headers=h).json()
    assert com_inativas["total"] >= 2


def test_tipo_diferente_nao_versiona_junto(client: TestClient):
    h = _obter_headers(client)
    r1 = _enviar(client, h, titulo="Protocolo Compartilhado", tipo="POP")
    r2 = _enviar(client, h, titulo="Protocolo Compartilhado", tipo="DOCUMENTO")
    assert r1.status_code == 201
    assert r2.status_code == 201
    assert r1.json()["versao"] == 1
    assert r2.json()["versao"] == 1


def test_download_e_exclusao_reativa_versao_anterior(client: TestClient):
    h = _obter_headers(client)
    v1 = _enviar(client, h, titulo="POP Reativacao", conteudo=_gerar_pdf_valido("v1")).json()
    v2 = _enviar(client, h, titulo="POP Reativacao", conteudo=_gerar_pdf_valido("v2")).json()

    baixado = client.get(f"/api/v1/documentos/{v2['id_doc']}/arquivo")
    assert baixado.status_code == 200 and "v2" in baixado.content.decode("latin-1")
    assert client.get(f"/api/v1/documentos/{v1['id_doc']}/arquivo").status_code == 404

    assert client.delete(f"/api/v1/documentos/{v2['id_doc']}", headers=h).status_code == 204
    lista = client.get("/api/v1/documentos").json()
    assert any(d["id_doc"] == v1["id_doc"] for d in lista["itens"])


def test_checkpoint_semana_3_fluxo_integrado(client: TestClient):
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    # 1. Admin cadastra setor com 2 ramais
    res_setor = client.post(
        "/api/v1/setores",
        headers=headers_admin,
        json={
            "nome": "Unidade Coronariana",
            "andar": "2º andar",
            "ramais": [
                {"numero": "2501", "descricao": "Posto Enfermagem UCO"},
                {"numero": "2502", "descricao": "Coordenação UCO"},
            ],
        },
    )
    assert res_setor.status_code == 201
    assert len(res_setor.json()["ramais"]) == 2

    # 2. Admin faz upload de POP em PDF
    pdf_bytes = _gerar_pdf_valido("POP Monitorizacao Hemodinamica Invasiva")
    res_pop = client.post(
        "/api/v1/documentos",
        headers=headers_admin,
        data={
            "titulo": "POP — Monitorização Hemodinâmica na Unidade Coronariana",
            "tipo": "POP",
            "categoria": "Enfermagem",
            "descricao": "Protocolo de aferição invasiva e cuidados de enfermagem.",
            "palavras_chave": "hemodinâmica, coronariana, monitorização",
        },
        files={"arquivo": ("pop_hemodinamica.pdf", pdf_bytes, "application/pdf")},
    )
    assert res_pop.status_code == 201
    pop_criado = res_pop.json()

    # 3. Colaborador pesquisa o POP por palavra-chave sem acento, visualiza (inline) e faz download (attachment)
    res_busca_pop = client.get("/api/v1/documentos?busca=hemodinamica", headers=headers_colab)
    assert res_busca_pop.status_code == 200
    assert res_busca_pop.json()["total"] == 1

    res_vis = client.get(pop_criado["url_visualizar"], headers=headers_colab)
    assert res_vis.status_code == 200
    assert "inline" in res_vis.headers["content-disposition"]

    res_dl = client.get(pop_criado["url_download"], headers=headers_colab)
    assert res_dl.status_code == 200
    assert "attachment" in res_dl.headers["content-disposition"]

    # 4. Admin/RH cadastra dúvida no FAQ e Colaborador consulta por termo e categoria
    res_faq = client.post(
        "/api/v1/faq",
        headers=headers_admin,
        json={
            "pergunta": "Como acessar os protocolos da Unidade Coronariana?",
            "resposta": "Consulte a Central de Documentos & POPs filtrando pela categoria Enfermagem.",
            "categoria": "Normas Hospitalares",
            "ordem": 1,
        },
    )
    assert res_faq.status_code == 201

    res_consulta_faq = client.get("/api/v1/faq?busca=coronariana", headers=headers_colab)
    assert res_consulta_faq.status_code == 200
    assert len(res_consulta_faq.json()) == 1
    assert res_consulta_faq.json()[0]["categoria"] == "Normas Hospitalares"

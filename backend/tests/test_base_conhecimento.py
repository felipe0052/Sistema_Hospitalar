"""Testes de versões de POP e da base de conhecimento do RAG (S5-T2) — sem nenhuma chamada a API externa."""

from io import BytesIO
from pathlib import Path

import pytest
from docx import Document as DocxDocument
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.documento import Documento
from app.models.documento_trecho import DocumentoTrecho
from app.services.ia import embeddings, indexador
from app.services.ia.extrator import dividir_em_trechos, extrair_paginas
from app.storage import storage_service


@pytest.fixture(autouse=True)
def _ambiente(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Uploads em pasta temporária e embedder leve por hashing (determinístico, sem baixar modelos)."""
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "IA_EMBEDDING_BACKEND", "hash")
    monkeypatch.setattr(storage_service, "_storage_instance", None)
    yield
    monkeypatch.setattr(storage_service, "_storage_instance", None)


def _headers(client: TestClient, email: str = "admin@decos.com.br", senha: str = "Admin@123") -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _docx(*paragrafos: str) -> bytes:
    doc = DocxDocument()
    for p in paragrafos:
        doc.add_paragraph(p)
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def _pdf_com_texto(texto: str) -> bytes:
    """PDF mínimo, mas válido, com uma página de texto extraível (fonte Helvetica)."""
    stream = f"BT /F1 12 Tf 72 720 Td ({texto}) Tj ET".encode("latin-1")
    objetos = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    saida = bytearray(b"%PDF-1.4\n")
    posicoes = []
    for i, obj in enumerate(objetos, start=1):
        posicoes.append(len(saida))
        saida += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(saida)
    saida += f"xref\n0 {len(objetos) + 1}\n0000000000 65535 f \n".encode()
    for pos in posicoes:
        saida += f"{pos:010d} 00000 n \n".encode()
    saida += f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(saida)


def _pdf_sem_texto() -> bytes:
    escritor = PdfWriter()
    escritor.add_blank_page(width=200, height=200)
    buf = BytesIO()
    escritor.write(buf)
    return buf.getvalue()


def _enviar(client, headers, titulo, conteudo, nome="pop.docx", **dados):
    return client.post(
        "/api/v1/documentos",
        headers=headers,
        data={"titulo": titulo, "tipo": "POP", **dados},
        files={"arquivo": (nome, conteudo)},
    )


# ------------------------------- versões de POP -------------------------------


def test_nova_versao_arquiva_a_anterior_e_herda_dados(client: TestClient, db_session: Session):
    admin = _headers(client)
    v1 = _enviar(client, admin, "POP Higienização das Mãos", _docx("Versão um"), codigo="POP-ENF-012").json()
    assert v1["versao"] == 1 and v1["status_versao"] == "VIGENTE" and v1["codigo"] == "POP-ENF-012"

    res = client.post(
        f"/api/v1/documentos/{v1['id_doc']}/nova-versao",
        headers=admin,
        data={"justificativa": "Atualização da RDC"},
        files={"arquivo": ("pop-v2.docx", _docx("Versão dois"))},
    )
    assert res.status_code == 201
    v2 = res.json()
    assert v2["versao"] == 2 and v2["status_versao"] == "VIGENTE"
    assert v2["codigo"] == "POP-ENF-012" and v2["titulo"] == v1["titulo"]
    assert v2["justificativa"] == "Atualização da RDC"

    antiga = db_session.query(Documento).filter(Documento.id_doc == v1["id_doc"]).one()
    assert antiga.ativo == "N"

    historico = client.get(f"/api/v1/documentos/{v2['id_doc']}/versoes", headers=admin).json()
    assert [d["versao"] for d in historico] == [2, 1]
    assert [d["status_versao"] for d in historico] == ["VIGENTE", "ARQUIVADO"]


def test_listagem_so_vigentes_por_padrao_e_incluir_arquivados(client: TestClient):
    admin = _headers(client)
    v1 = _enviar(client, admin, "POP Isolamento", _docx("a")).json()
    client.post(
        f"/api/v1/documentos/{v1['id_doc']}/nova-versao", headers=admin, files={"arquivo": ("v2.docx", _docx("b"))}
    )

    padrao = client.get("/api/v1/documentos", headers=admin).json()
    assert padrao["total"] == 1 and padrao["itens"][0]["versao"] == 2

    com_arquivados = client.get("/api/v1/documentos?incluir_arquivados=true", headers=admin).json()
    assert com_arquivados["total"] == 2

    # Colaborador nunca enxerga versões arquivadas, mesmo pedindo
    colab = _headers(client, "colaborador@decos.com.br", "Colab@123")
    assert client.get("/api/v1/documentos?incluir_arquivados=true", headers=colab).json()["total"] == 1
    assert client.get(f"/api/v1/documentos/{v1['id_doc']}", headers=colab).status_code == 404


def test_nova_versao_exige_gestor_e_arquivo_valido(client: TestClient):
    admin = _headers(client)
    v1 = _enviar(client, admin, "POP Teste", _docx("x")).json()
    colab = _headers(client, "colaborador@decos.com.br", "Colab@123")
    url = f"/api/v1/documentos/{v1['id_doc']}/nova-versao"
    assert client.post(url, headers=colab, files={"arquivo": ("v.docx", _docx("y"))}).status_code == 403
    assert client.post(url, headers=admin, files={"arquivo": ("v.txt", b"texto")}).status_code == 415
    inexistente = client.post(
        "/api/v1/documentos/9999/nova-versao", headers=admin, files={"arquivo": ("v.docx", _docx("y"))}
    )
    assert inexistente.status_code == 404


# ------------------------------- extração e chunking -------------------------------


def test_extrai_texto_de_docx_e_pdf():
    docx_paginas = extrair_paginas(
        _docx("Higienização das mãos", "Usar álcool em gel 70%."),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert docx_paginas[0][0] == 1
    assert "álcool em gel" in docx_paginas[0][1]

    pdf_paginas = extrair_paginas(_pdf_com_texto("Procedimento de curativo"), "application/pdf")
    assert pdf_paginas == [(1, "Procedimento de curativo")]


def test_pdf_sem_texto_vira_sem_texto(client: TestClient, db_session: Session):
    doc = _enviar(client, _headers(client), "POP Digitalizado", _pdf_sem_texto(), nome="scan.pdf").json()
    assert db_session.query(Documento).filter_by(id_doc=doc["id_doc"]).one().status_indexacao == "SEM_TEXTO"
    assert db_session.query(DocumentoTrecho).count() == 0


def test_chunking_com_sobreposicao_e_pagina():
    texto = " ".join(f"palavra{i}" for i in range(600))  # ~4.700 caracteres
    trechos = dividir_em_trechos([(1, texto), (2, "curta")], tamanho=1000, sobreposicao=200)

    da_pagina_1 = [t for p, t in trechos if p == 1]
    assert len(da_pagina_1) >= 5
    assert all(len(t) <= 1000 for t in da_pagina_1)
    # Sobreposição: o fim de um trecho reaparece no começo do seguinte
    final_do_primeiro = da_pagina_1[0].split()[-3:]
    assert all(palavra in da_pagina_1[1] for palavra in final_do_primeiro)
    assert (2, "curta") in trechos
    assert " ".join(da_pagina_1[0].split()[:2]) == "palavra0 palavra1"  # não perde o começo


# ------------------------------- indexação e busca -------------------------------


def test_upload_indexa_em_background_sem_api_externa(client: TestClient, db_session: Session):
    doc = _enviar(client, _headers(client), "POP Curativo", _docx("Realizar curativo com técnica asséptica.")).json()
    banco = db_session.query(Documento).filter_by(id_doc=doc["id_doc"]).one()
    assert banco.status_indexacao == "INDEXADO"
    trechos = db_session.query(DocumentoTrecho).filter_by(id_doc=doc["id_doc"]).all()
    assert len(trechos) == 1 and len(trechos[0].embedding) == 384


def test_buscar_trechos_nunca_retorna_arquivado_e_devolve_o_trecho_certo(client: TestClient, db_session: Session):
    admin = _headers(client)
    assunto = {
        "POP Higienização das Mãos": "Higienize as mãos com água e sabonete ou álcool em gel antes de tocar o paciente",
        "POP Descarte de Resíduos": "Resíduos perfurocortantes devem ser descartados em caixa coletora rígida amarela.",
        "POP Controle de Estoque Farmácia": "Medicamentos controlados exigem conferência diária do estoque e registro",
    }
    ids = {t: _enviar(client, admin, t, _docx(txt)).json()["id_doc"] for t, txt in assunto.items()}

    cenarios = [
        ("como lavar as mãos com álcool em gel", "POP Higienização das Mãos"),
        ("onde descartar agulhas e perfurocortantes", "POP Descarte de Resíduos"),
        ("conferência do estoque de medicamentos controlados", "POP Controle de Estoque Farmácia"),
    ]
    for pergunta, esperado in cenarios:
        melhores = indexador.buscar_trechos(db_session, pergunta, k=3)
        assert melhores[0]["id_doc"] == ids[esperado], pergunta
        assert melhores[0]["pagina"] == 1 and melhores[0]["versao"] == 1

    # Nova versão do primeiro POP: a v1 arquiva e deixa de aparecer na busca
    v1 = ids["POP Higienização das Mãos"]
    v2 = client.post(
        f"/api/v1/documentos/{v1}/nova-versao",
        headers=admin,
        files={"arquivo": ("v2.docx", _docx("Nova regra: higienizar as mãos por trinta segundos."))},
    ).json()
    resultados = indexador.buscar_trechos(db_session, "higienizar as mãos", k=10)
    assert v1 not in {r["id_doc"] for r in resultados}
    assert resultados[0]["id_doc"] == v2["id_doc"] and resultados[0]["versao"] == 2


def test_reindexar_exige_admin_e_atualiza_status(client: TestClient, db_session: Session):
    admin = _headers(client)
    doc = _enviar(client, admin, "POP Reindexação", _docx("Conteúdo para reindexar.")).json()
    id_doc = doc["id_doc"]
    db_session.query(DocumentoTrecho).delete()
    db_session.query(Documento).update({Documento.status_indexacao: "ERRO"})
    db_session.commit()

    colab = _headers(client, "colaborador@decos.com.br", "Colab@123")
    assert client.post(f"/api/v1/ia/documentos/{id_doc}/reindexar", headers=colab).status_code == 403
    assert client.post("/api/v1/ia/reindexar-todos", headers=colab).status_code == 403
    assert client.post("/api/v1/ia/documentos/9999/reindexar", headers=admin).status_code == 404

    assert client.post(f"/api/v1/ia/documentos/{id_doc}/reindexar", headers=admin).status_code == 202
    db_session.expire_all()
    assert db_session.query(Documento).filter_by(id_doc=id_doc).one().status_indexacao == "INDEXADO"

    db_session.query(DocumentoTrecho).delete()
    db_session.commit()
    assert client.post("/api/v1/ia/reindexar-todos", headers=admin).json() == {"total": 1}
    db_session.expire_all()
    assert db_session.query(DocumentoTrecho).count() == 1


def test_arquivo_ausente_no_storage_marca_erro(client: TestClient, db_session: Session, tmp_path: Path):
    doc = _enviar(client, _headers(client), "POP Sumiu", _docx("Texto.")).json()
    for arquivo in (tmp_path / "documentos").glob("*"):
        arquivo.unlink()
    assert indexador.indexar_documento(db_session, doc["id_doc"]) == "ERRO"
    assert db_session.query(Documento).filter_by(id_doc=doc["id_doc"]).one().status_indexacao == "ERRO"


def test_embedder_hash_e_deterministico_e_normalizado():
    a1, a2 = embeddings.gerar_embeddings(["lavar as mãos", "lavar as mãos"])
    assert a1 == a2 and len(a1) == 384
    assert abs(sum(x * x for x in a1) - 1.0) < 1e-6
    assert embeddings.gerar_embeddings([]) == []

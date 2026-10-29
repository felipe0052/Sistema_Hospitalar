"""Indexação dos documentos na base de conhecimento e busca dos trechos mais próximos."""

import logging
import math

from sqlalchemy import func, literal, literal_column
from sqlalchemy.orm import Session

from app.core.exceptions import NaoEncontrado
from app.models.documento import Documento
from app.models.documento_trecho import DocumentoTrecho, VetorEmbedding
from app.services import documento_service
from app.services.ia.embeddings import gerar_embeddings
from app.services.ia.extrator import dividir_em_trechos, extrair_paginas

logger = logging.getLogger(__name__)


def indexar_documento(db: Session, id_doc: int) -> str:
    """Extrai o texto, gera os trechos e vetores e grava em DOCUMENTO_TRECHOS. Retorna o status final."""
    doc = db.query(Documento).filter(Documento.id_doc == id_doc).first()
    if doc is None:
        raise NaoEncontrado("Documento não encontrado.")

    doc.status_indexacao = "PROCESSANDO"
    db.commit()
    try:
        conteudo, mime_type, _ = documento_service.abrir_arquivo_documento(db, id_doc)
        trechos = dividir_em_trechos(extrair_paginas(conteudo, mime_type))
        db.query(DocumentoTrecho).filter(DocumentoTrecho.id_doc == id_doc).delete(synchronize_session=False)
        if not trechos:
            status = "SEM_TEXTO"
        else:
            vetores = gerar_embeddings([texto for _, texto in trechos])
            db.add_all(
                DocumentoTrecho(id_doc=id_doc, ordem=i, pagina=pagina, texto=texto, embedding=vetor)
                for i, ((pagina, texto), vetor) in enumerate(zip(trechos, vetores, strict=True), start=1)
            )
            status = "INDEXADO"
        doc.status_indexacao = status
        db.commit()
        return status
    except Exception:
        db.rollback()
        logger.exception("Falha ao indexar o documento %s", id_doc)
        db.query(Documento).filter(Documento.id_doc == id_doc).update({Documento.status_indexacao: "ERRO"})
        db.commit()
        return "ERRO"


def indexar_em_background(bind, id_doc: int) -> None:
    """Tarefa de background: abre uma sessão própria, pois a da requisição já foi encerrada."""
    with Session(bind=bind) as db:
        indexar_documento(db, id_doc)


def reindexar_todos(bind) -> int:
    """Reprocessa todos os documentos vigentes. Retorna quantos foram processados."""
    with Session(bind=bind) as db:
        ids = [i for (i,) in db.query(Documento.id_doc).filter(Documento.ativo == "S").all()]
        for id_doc in ids:
            indexar_documento(db, id_doc)
    return len(ids)


def _cosseno(a: list[float], b: list[float]) -> float:
    prod = sum(x * y for x, y in zip(a, b, strict=True))
    na, nb = math.sqrt(sum(x * x for x in a)), math.sqrt(sum(y * y for y in b))
    return 1.0 - (prod / (na * nb)) if na and nb else 1.0


def buscar_trechos(db: Session, pergunta: str, k: int = 6) -> list[dict]:
    """Os `k` trechos mais próximos da pergunta, somente de documentos vigentes (ATIVO = 'S')."""
    vetor = gerar_embeddings([pergunta])[0]
    base = (
        db.query(DocumentoTrecho, Documento)
        .join(Documento, Documento.id_doc == DocumentoTrecho.id_doc)
        .filter(Documento.ativo == "S")
    )
    if db.get_bind().dialect.name == "oracle":
        distancia = func.vector_distance(
            DocumentoTrecho.embedding, literal(vetor, VetorEmbedding()), literal_column("COSINE")
        )
        linhas = base.add_columns(distancia.label("distancia")).order_by(distancia).limit(k).all()
        ordenadas = [(t, d, float(dist)) for t, d, dist in linhas]
    else:
        calculadas = [(t, d, _cosseno(vetor, t.embedding)) for t, d in base.all()]
        ordenadas = sorted(calculadas, key=lambda x: x[2])[:k]

    return [
        {
            "id_doc": d.id_doc,
            "codigo": d.codigo,
            "titulo": d.titulo,
            "versao": d.versao,
            "pagina": t.pagina,
            "texto": t.texto,
            "distancia": round(dist, 4),
        }
        for t, d, dist in ordenadas
    ]

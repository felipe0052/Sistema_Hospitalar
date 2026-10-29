"""Endpoints de IA. Na Semana 5 só a indexação da base de conhecimento; o assistente RAG é da Semana 6."""

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.exceptions import NaoEncontrado
from app.models.documento import Documento
from app.models.usuario import Usuario
from app.services.ia import indexador

router = APIRouter(prefix="/ia", tags=["IA — base de conhecimento"])


@router.post("/documentos/{id_doc}/reindexar", status_code=status.HTTP_202_ACCEPTED)
def reindexar_documento(
    id_doc: int,
    tarefas: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
) -> dict[str, str | int]:
    """Reprocessa a extração e os embeddings de um documento (em segundo plano)."""
    if db.query(Documento.id_doc).filter(Documento.id_doc == id_doc).first() is None:
        raise NaoEncontrado("Documento não encontrado.")
    db.query(Documento).filter(Documento.id_doc == id_doc).update({Documento.status_indexacao: "PENDENTE"})
    db.commit()
    tarefas.add_task(indexador.indexar_em_background, db.get_bind(), id_doc)
    return {"id_doc": id_doc, "status": "PENDENTE"}


@router.post("/reindexar-todos", status_code=status.HTTP_202_ACCEPTED)
def reindexar_todos(
    tarefas: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
) -> dict[str, int]:
    """Reprocessa todos os POPs/documentos vigentes (em segundo plano)."""
    total = db.query(Documento).filter(Documento.ativo == "S").count()
    tarefas.add_task(indexador.reindexar_todos, db.get_bind())
    return {"total": total}


@router.get("/trechos")
def buscar_trechos(
    pergunta: str = Query(min_length=3, max_length=1000),
    k: int = Query(default=6, ge=1, le=20),
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
) -> list[dict]:
    """Diagnóstico (ADMIN): trechos vigentes mais próximos da pergunta. O assistente usará isto na Semana 6."""
    return indexador.buscar_trechos(db, pergunta, k)

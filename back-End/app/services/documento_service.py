from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import DocumentoModel, FaqModel
from app.repositories import documento_repository
from app.schemas.documento import DocumentoCreate, FaqCreate


def listar(db: Session, categoria: str | None, busca: str | None) -> list[DocumentoModel]:
    """POPs/documentos, com busca por palavra-chave no título ou por categoria."""
    return documento_repository.listar(db, categoria, busca)


def criar(db: Session, dados: DocumentoCreate) -> DocumentoModel:
    return documento_repository.criar(db, dados)


def remover(db: Session, id_doc: int) -> None:
    documento = documento_repository.obter_por_id(db, id_doc)
    if documento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado")
    documento_repository.remover(db, documento)


def listar_faq(db: Session, categoria: str | None) -> list[FaqModel]:
    return documento_repository.listar_faq(db, categoria)


def criar_faq(db: Session, dados: FaqCreate) -> FaqModel:
    return documento_repository.criar_faq(db, dados)

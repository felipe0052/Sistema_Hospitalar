from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.documento import DocumentoModel
from app.models.enums import TipoDocumento
from app.models.faq import FaqModel
from app.schemas.documento import DocumentoCreate, FaqCreate


def listar(db: Session, categoria: str | None, busca: str | None) -> list[DocumentoModel]:
    query = db.query(DocumentoModel)
    if categoria:
        query = query.filter(DocumentoModel.categoria == categoria)
    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            or_(
                DocumentoModel.titulo.ilike(termo),
                DocumentoModel.categoria.ilike(termo),
                DocumentoModel.palavras_chave.ilike(termo),
            )
        )
    return query.order_by(DocumentoModel.data_upload.desc()).all()


def obter_por_id(db: Session, id_doc: int) -> DocumentoModel | None:
    return db.get(DocumentoModel, id_doc)


def criar(db: Session, dados: DocumentoCreate, url_arquivo: str, tipo: TipoDocumento) -> DocumentoModel:
    documento = DocumentoModel(
        titulo=dados.titulo,
        categoria=dados.categoria,
        descricao=dados.descricao,
        palavras_chave=dados.palavras_chave,
        tipo=tipo,
        url_arquivo=url_arquivo,
        versao=dados.versao,
    )
    db.add(documento)
    db.commit()
    db.refresh(documento)
    return documento


def remover(db: Session, documento: DocumentoModel) -> None:
    db.delete(documento)
    db.commit()


def listar_faq(db: Session, categoria: str | None) -> list[FaqModel]:
    query = db.query(FaqModel)
    if categoria:
        query = query.filter(FaqModel.categoria == categoria)
    return query.order_by(FaqModel.id_faq.asc()).all()


def criar_faq(db: Session, dados: FaqCreate) -> FaqModel:
    faq = FaqModel(pergunta=dados.pergunta, resposta=dados.resposta, categoria=dados.categoria)
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

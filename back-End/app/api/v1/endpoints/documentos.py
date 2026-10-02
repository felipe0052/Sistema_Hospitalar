from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import UsuarioModel
from app.db.session import get_db
from app.schemas.documento import DocumentoCreate, DocumentoOut, FaqCreate, FaqOut
from app.services import documento_service

router = APIRouter(prefix="/documentos", tags=["Documentos & FAQ"])


@router.get("", response_model=list[DocumentoOut])
def listar_documentos(
    categoria: str | None = None,
    busca: str | None = None,
    db: Session = Depends(get_db),
) -> list[DocumentoOut]:
    """Busca de POPs por palavra-chave no título ou por categoria."""
    return documento_service.listar(db, categoria, busca)


@router.post("", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
def registrar_documento(
    payload: DocumentoCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_current_user),
) -> DocumentoOut:
    """Cadastro de novo POP/documento (acesso restrito)."""
    return documento_service.criar(db, payload)


@router.delete("/{id_doc}", status_code=status.HTTP_204_NO_CONTENT)
def remover_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_current_user),
) -> None:
    documento_service.remover(db, id_doc)


@router.get("/faq", response_model=list[FaqOut])
def listar_faq(categoria: str | None = None, db: Session = Depends(get_db)) -> list[FaqOut]:
    """Perguntas e respostas frequentes sobre normas e processos internos."""
    return documento_service.listar_faq(db, categoria)


@router.post("/faq", response_model=FaqOut, status_code=status.HTTP_201_CREATED)
def criar_faq(
    payload: FaqCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_current_user),
) -> FaqOut:
    return documento_service.criar_faq(db, payload)

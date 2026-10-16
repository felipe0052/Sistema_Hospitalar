from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_perfil
from app.models.enums import Perfil
from app.models.usuario import UsuarioModel
from app.schemas.documento import DocumentoCreate, DocumentoOut, FaqCreate, FaqOut
from app.services import documento_service

router = APIRouter(prefix="/documentos", tags=["Documentos & FAQ"])

# Cadastro/remoção de POPs e FAQ ficam restritos a Administrador e RH.
_PERFIS_GESTAO_DOCUMENTOS = (Perfil.ADMINISTRADOR, Perfil.RH)


@router.get("", response_model=list[DocumentoOut])
def listar_documentos(
    categoria: str | None = None,
    busca: str | None = None,
    db: Session = Depends(get_db),
) -> list[DocumentoOut]:
    """Busca de POPs por palavra-chave (título/palavras-chave) ou por categoria."""
    return documento_service.listar(db, categoria, busca)


@router.post("", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
def registrar_documento(
    titulo: str = Form(..., min_length=1, max_length=200),
    categoria: str | None = Form(default=None, max_length=100),
    descricao: str | None = Form(default=None),
    palavras_chave: str | None = Form(default=None, max_length=300),
    versao: str = Form(default="1.0", max_length=20),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(require_perfil(*_PERFIS_GESTAO_DOCUMENTOS)),
) -> DocumentoOut:
    """Cadastro de novo POP/documento via multipart/form-data. O arquivo é
    validado quanto a tipo (PDF/DOCX) e tamanho (máx. 10 MB) — RN06."""
    dados = DocumentoCreate(
        titulo=titulo,
        categoria=categoria,
        descricao=descricao,
        palavras_chave=palavras_chave,
        versao=versao,
    )
    return documento_service.criar(db, dados, arquivo)


@router.delete("/{id_doc}", status_code=status.HTTP_204_NO_CONTENT)
def remover_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(require_perfil(*_PERFIS_GESTAO_DOCUMENTOS)),
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
    usuario_atual: UsuarioModel = Depends(require_perfil(*_PERFIS_GESTAO_DOCUMENTOS)),
) -> FaqOut:
    return documento_service.criar_faq(db, payload)

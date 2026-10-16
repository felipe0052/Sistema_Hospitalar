import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.documento import DocumentoModel
from app.models.enums import TipoDocumento
from app.models.faq import FaqModel
from app.repositories import documento_repository
from app.schemas.documento import DocumentoCreate, FaqCreate

_TIPOS_PERMITIDOS: dict[str, TipoDocumento] = {
    "application/pdf": TipoDocumento.PDF,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": TipoDocumento.DOCX,
}
_EXTENSAO_POR_TIPO = {TipoDocumento.PDF: "pdf", TipoDocumento.DOCX: "docx"}
_TAMANHO_MAXIMO_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _validar_e_salvar_arquivo(arquivo: UploadFile) -> tuple[str, TipoDocumento]:
    """RN06 — aceita apenas PDF/DOCX, até `MAX_UPLOAD_SIZE_MB` (padrão 10 MB)."""
    tipo = _TIPOS_PERMITIDOS.get(arquivo.content_type or "")
    if tipo is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Apenas arquivos PDF ou DOCX são permitidos",
        )

    conteudo = arquivo.file.read()
    if len(conteudo) > _TAMANHO_MAXIMO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Arquivo excede o limite de {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    destino = Path(settings.UPLOAD_DIR)
    destino.mkdir(parents=True, exist_ok=True)
    nome_arquivo = f"{uuid.uuid4().hex}.{_EXTENSAO_POR_TIPO[tipo]}"
    (destino / nome_arquivo).write_bytes(conteudo)

    return f"/{settings.UPLOAD_DIR}/{nome_arquivo}", tipo


def listar(db: Session, categoria: str | None, busca: str | None) -> list[DocumentoModel]:
    """POPs/documentos, com busca por palavra-chave no título ou por categoria."""
    return documento_repository.listar(db, categoria, busca)


def criar(db: Session, dados: DocumentoCreate, arquivo: UploadFile) -> DocumentoModel:
    url_arquivo, tipo = _validar_e_salvar_arquivo(arquivo)
    return documento_repository.criar(db, dados, url_arquivo=url_arquivo, tipo=tipo)


def remover(db: Session, id_doc: int) -> None:
    documento = documento_repository.obter_por_id(db, id_doc)
    if documento is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento não encontrado")
    documento_repository.remover(db, documento)


def listar_faq(db: Session, categoria: str | None) -> list[FaqModel]:
    return documento_repository.listar_faq(db, categoria)


def criar_faq(db: Session, dados: FaqCreate) -> FaqModel:
    return documento_repository.criar_faq(db, dados)

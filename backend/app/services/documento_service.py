"""Regras de negócio de Documentos e POPs (UC06, UC07 — S3-T1)."""

from datetime import datetime, timezone
from pathlib import Path
import unicodedata
import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.exceptions import (
    ArquivoMuitoGrande,
    NaoEncontrado,
    TipoArquivoNaoAceito,
)
from app.models.documento import Documento
from app.models.usuario import Usuario
from app.schemas.documento import (
    AutorDocumentoOut,
    DocumentoMetadadosIn,
    DocumentoOut,
    PaginadoDocumentosOut,
    normalizar_palavras_chave_lista,
)
from app.storage.storage_service import StorageService, get_storage_service

MAGIC_PDF = b"%PDF"
MAGIC_DOCX = b"PK\x03\x04"

MIME_PDF = "application/pdf"
MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def validar_arquivo_upload(nome_arquivo: str | None, conteudo: bytes) -> tuple[str, str, str]:
    """Valida extensão (.pdf / .docx), tamanho máximo (UPLOAD_MAX_MB) e assinatura Magic Bytes.

    Retorna (extensao_sem_ponto, mime_type, nome_original_seguro).
    """
    limite_bytes = settings.UPLOAD_MAX_MB * 1024 * 1024
    if len(conteudo) > limite_bytes:
        msg = f"O arquivo excede o tamanho máximo permitido de {settings.UPLOAD_MAX_MB} MB."
        raise ArquivoMuitoGrande(msg, erros={"arquivo": msg})

    nome_limpo = Path(nome_arquivo or "").name.strip()
    if not nome_limpo or "." not in nome_limpo:
        msg = "Formato de arquivo não suportado. Envie apenas arquivos PDF ou DOCX."
        raise TipoArquivoNaoAceito(msg, erros={"arquivo": msg})

    ext = nome_limpo.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx"):
        msg = "Formato de arquivo não suportado. Apenas arquivos PDF e DOCX são aceitos."
        raise TipoArquivoNaoAceito(msg, erros={"arquivo": msg})

    if not conteudo:
        msg = "O arquivo enviado está vazio ou corrompido."
        raise TipoArquivoNaoAceito(msg, erros={"arquivo": msg})

    if ext == "pdf":
        if not conteudo.startswith(MAGIC_PDF):
            msg = "O arquivo enviado não possui assinatura binária válida de PDF (%PDF)."
            raise TipoArquivoNaoAceito(msg, erros={"arquivo": msg})
        return "pdf", MIME_PDF, nome_limpo

    # ext == "docx"
    if not conteudo.startswith(MAGIC_DOCX):
        msg = "O arquivo enviado não possui assinatura binária válida de DOCX (PK)."
        raise TipoArquivoNaoAceito(msg, erros={"arquivo": msg})
    return "docx", MIME_DOCX, nome_limpo


def converter_para_out(doc: Documento) -> DocumentoOut:
    autor_out = (
        AutorDocumentoOut(id_usuario=doc.autor.id_usuario, nome=doc.autor.nome)
        if doc.autor is not None
        else None
    )
    return DocumentoOut(
        id_doc=doc.id_doc,
        titulo=doc.titulo,
        tipo=doc.tipo,  # type: ignore[arg-type]
        categoria=doc.categoria,
        descricao=doc.descricao,
        palavras_chave=normalizar_palavras_chave_lista(doc.palavras_chave),
        nome_arquivo=doc.nome_arquivo,
        mime_type=doc.mime_type,
        tamanho_bytes=doc.tamanho_bytes,
        data_upload=doc.data_upload,
        data_atualizacao=doc.data_atualizacao,
        autor=autor_out,
        url_visualizar=f"/api/v1/documentos/{doc.id_doc}/arquivo",
        url_download=f"/api/v1/documentos/{doc.id_doc}/arquivo?download=true",
    )


def listar_documentos(
    db: Session,
    busca: str | None = None,
    tipo: str | None = None,
    categoria: str | None = None,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoDocumentosOut:
    query = db.query(Documento).options(joinedload(Documento.autor))

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Documento.titulo.like(termo),
                Documento.descricao.like(termo),
                Documento.palavras_chave.like(termo),
            )
        )

    if tipo and tipo.strip():
        query = query.filter(Documento.tipo == tipo.strip().upper())

    if categoria and categoria.strip():
        query = query.filter(Documento.categoria.like(categoria.strip()))

    total = query.count()
    registros = (
        query.order_by(Documento.data_upload.desc(), Documento.id_doc.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )

    return PaginadoDocumentosOut(
        itens=[converter_para_out(d) for d in registros],
        total=total,
        pagina=pagina,
        tamanho=tamanho,
    )


def listar_categorias_documentos(db: Session) -> list[str]:
    linhas = (
        db.query(Documento.categoria)
        .filter(Documento.categoria.is_not(None))
        .distinct()
        .all()
    )
    categorias_unicas: dict[str, str] = {}
    for (cat,) in linhas:
        if cat and cat.strip():
            limpa = cat.strip()
            chave = _sem_acentos(limpa)
            if chave not in categorias_unicas:
                categorias_unicas[chave] = limpa
    return [categorias_unicas[k] for k in sorted(categorias_unicas.keys())]


def _obter_modelo_documento(db: Session, id_doc: int) -> Documento:
    doc = (
        db.query(Documento)
        .options(joinedload(Documento.autor))
        .filter(Documento.id_doc == id_doc)
        .first()
    )
    if doc is None:
        raise NaoEncontrado("Documento não encontrado.")
    return doc


def obter_documento(db: Session, id_doc: int) -> DocumentoOut:
    doc = _obter_modelo_documento(db, id_doc)
    return converter_para_out(doc)


def abrir_arquivo_documento(
    db: Session,
    id_doc: int,
    storage: StorageService | None = None,
) -> tuple[bytes, str, str]:
    doc = _obter_modelo_documento(db, id_doc)
    servico_storage = storage or get_storage_service()
    try:
        dados = servico_storage.abrir(doc.url_arquivo)
        if isinstance(dados, (bytes, bytearray)):
            conteudo = bytes(dados)
        else:
            conteudo = b"".join(dados)
    except FileNotFoundError as exc:
        raise NaoEncontrado("Arquivo do documento não encontrado no armazenamento.") from exc

    return conteudo, doc.mime_type, doc.nome_arquivo


def criar_documento(
    db: Session,
    metadados: DocumentoMetadadosIn,
    nome_arquivo: str | None,
    conteudo: bytes,
    autor: Usuario,
    storage: StorageService | None = None,
) -> DocumentoOut:
    ext, mime_type, nome_limpo = validar_arquivo_upload(nome_arquivo, conteudo)
    chave = f"documentos/{uuid.uuid4()}.{ext}"
    servico_storage = storage or get_storage_service()

    servico_storage.salvar(conteudo, chave, mime_type)
    try:
        novo = Documento(
            titulo=metadados.titulo,
            tipo=metadados.tipo,
            categoria=metadados.categoria,
            descricao=metadados.descricao,
            palavras_chave=metadados.palavras_chave,
            url_arquivo=chave,
            nome_arquivo=nome_limpo,
            mime_type=mime_type,
            tamanho_bytes=len(conteudo),
            id_autor=autor.id_usuario,
            data_upload=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(novo)
        db.commit()
        db.refresh(novo)
    except Exception:
        db.rollback()
        servico_storage.excluir(chave)
        raise

    return obter_documento(db, novo.id_doc)


def atualizar_documento(
    db: Session,
    id_doc: int,
    metadados: DocumentoMetadadosIn,
    nome_arquivo: str | None = None,
    conteudo: bytes | None = None,
    storage: StorageService | None = None,
) -> DocumentoOut:
    doc = _obter_modelo_documento(db, id_doc)
    servico_storage = storage or get_storage_service()

    nova_chave: str | None = None
    chave_antiga = doc.url_arquivo

    if conteudo is not None:
        ext, mime_type, nome_limpo = validar_arquivo_upload(nome_arquivo, conteudo)
        nova_chave = f"documentos/{uuid.uuid4()}.{ext}"
        servico_storage.salvar(conteudo, nova_chave, mime_type)
        doc.url_arquivo = nova_chave
        doc.nome_arquivo = nome_limpo
        doc.mime_type = mime_type
        doc.tamanho_bytes = len(conteudo)

    try:
        doc.titulo = metadados.titulo
        doc.tipo = metadados.tipo
        doc.categoria = metadados.categoria
        doc.descricao = metadados.descricao
        doc.palavras_chave = metadados.palavras_chave
        doc.data_atualizacao = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        if nova_chave is not None:
            servico_storage.excluir(nova_chave)
        raise

    if nova_chave is not None and chave_antiga and chave_antiga != nova_chave:
        servico_storage.excluir(chave_antiga)

    return obter_documento(db, doc.id_doc)


def excluir_documento(
    db: Session,
    id_doc: int,
    storage: StorageService | None = None,
) -> None:
    doc = _obter_modelo_documento(db, id_doc)
    chave_arquivo = doc.url_arquivo
    servico_storage = storage or get_storage_service()

    db.delete(doc)
    db.commit()

    if chave_arquivo:
        servico_storage.excluir(chave_arquivo)

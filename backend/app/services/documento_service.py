"""Regras de negócio de Documentos e POPs (UC06, UC07 — S3-T1 com versionamento)."""

from datetime import datetime, timezone
from pathlib import Path
import unicodedata
import uuid

from fastapi import UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.exceptions import (
    ArquivoMuitoGrande,
    NaoEncontrado,
    RegraNegocio,
    TipoArquivoNaoAceito,
)
from app.models.documento import Documento
from app.models.usuario import Usuario
from app.schemas.documento import (
    AutorDocumentoOut,
    DocumentoMetadadosIn,
    DocumentoOut,
    PaginadoDocumentosOut,
    normalizar_palavras_chave_banco,
    normalizar_palavras_chave_lista,
)
from app.storage.storage_service import StorageService, get_storage_service

PERFIS_GESTAO_DOCUMENTOS = ("ADMIN", "RH")

MAGIC_PDF = b"%PDF"
MAGIC_DOCX = b"PK\x03\x04"

MIME_PDF = "application/pdf"
MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
EXTENSOES_PERMITIDAS = {".pdf": MIME_PDF, ".docx": MIME_DOCX}

CATEGORIAS_POR_PALAVRA_CHAVE: dict[str, tuple[str, ...]] = {
    "Enfermagem": (
        "enfermagem",
        "enfermeiro",
        "curativo",
        "sondagem",
        "medicacao",
        "puncao",
        "higienizacao",
        "paciente",
    ),
    "Farmácia": (
        "farmacia",
        "farmaceutico",
        "dispensacao",
        "estoque",
        "medicamento",
        "controlados",
        "receita",
    ),
    "Controle de Infecção": (
        "ccih",
        "infeccao",
        "isolamento",
        "epi",
        "assepsia",
        "contato",
        "precaucao",
    ),
    "Administrativo": (
        "administrativo",
        "compras",
        "contrato",
        "financeiro",
        "faturamento",
        "protocolo",
        "recepcao",
    ),
    "Recursos Humanos": (
        "rh",
        "ferias",
        "folha",
        "beneficios",
        "admissao",
        "demissao",
        "escala",
    ),
    "Segurança do Trabalho": (
        "seguranca",
        "acidente",
        "cipa",
        "nr32",
        "risco",
        "incendio",
        "brigada",
    ),
    "TI": ("ti", "sistema", "senha", "acesso", "rede", "backup", "lgpd"),
}


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


_normalizar = _sem_acentos


def inferir_categoria(palavras_chave: list[str]) -> str | None:
    """Infere a categoria baseada na frequência de termos chave nas palavras-chave."""
    tokens: set[str] = set()
    for p in palavras_chave:
        norm = _sem_acentos(p)
        tokens.add(norm)
        tokens.update(norm.split())
    melhor, acertos_melhor = None, 0
    for categoria, termos in CATEGORIAS_POR_PALAVRA_CHAVE.items():
        acertos = len(tokens.intersection(termos))
        if acertos > acertos_melhor:
            melhor, acertos_melhor = categoria, acertos
    return melhor


def normalizar_palavras_chave(bruto: str | list[str] | None) -> list[str]:
    return normalizar_palavras_chave_lista(bruto)


def validar_arquivo_upload(nome_arquivo: str | None, conteudo: bytes) -> tuple[str, str, str]:
    """Valida extensão (.pdf / .docx), tamanho máximo (UPLOAD_MAX_MB) e assinatura Magic Bytes.

    Retorna (extensao_sem_ponto, mime_type, nome_original_seguro).
    """
    max_mb = getattr(settings, "UPLOAD_MAX_MB", 20)
    limite_bytes = max_mb * 1024 * 1024
    if len(conteudo) > limite_bytes:
        msg = f"O arquivo excede o tamanho máximo permitido de {max_mb} MB."
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
        versao=doc.versao,
        ativo=(doc.ativo == "S"),
        autor=autor_out,
        data_upload=doc.data_upload,
        data_atualizacao=doc.data_atualizacao,
        url_visualizar=f"/api/v1/documentos/{doc.id_doc}/arquivo",
        url_download=f"/api/v1/documentos/{doc.id_doc}/arquivo?download=true",
    )


_converter = converter_para_out


def _mesmo_documento(query, tipo: str, titulo: str):
    return query.filter(Documento.tipo == tipo, func.lower(Documento.titulo) == titulo.lower())


def listar_documentos(
    db: Session,
    busca: str | None = None,
    tipo: str | None = None,
    categoria: str | None = None,
    palavra_chave: str | None = None,
    incluir_inativas: bool = False,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoDocumentosOut:
    query = db.query(Documento).options(joinedload(Documento.autor))
    if not incluir_inativas:
        query = query.filter(Documento.ativo == "S")

    if tipo and tipo.strip():
        query = query.filter(Documento.tipo == tipo.strip().upper())

    if categoria and categoria.strip():
        query = query.filter(Documento.categoria == categoria.strip())

    if palavra_chave and palavra_chave.strip():
        query = query.filter(Documento.palavras_chave.like(f"%{palavra_chave.strip()}%"))

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Documento.titulo.like(termo),
                Documento.categoria.like(termo),
                Documento.descricao.like(termo),
                Documento.palavras_chave.like(termo),
            )
        )

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
        .filter(Documento.ativo == "S", Documento.categoria.is_not(None))
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


listar_categorias = listar_categorias_documentos


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


_obter = _obter_modelo_documento


def obter_documento(db: Session, id_doc: int, pode_ver_historico: bool = True) -> DocumentoOut:
    doc = _obter_modelo_documento(db, id_doc)
    if doc.ativo != "S" and not pode_ver_historico:
        raise NaoEncontrado("Documento não encontrado.")
    return converter_para_out(doc)


def historico_versoes(db: Session, id_doc: int) -> list[DocumentoOut]:
    doc = _obter_modelo_documento(db, id_doc)
    query = _mesmo_documento(
        db.query(Documento).options(joinedload(Documento.autor)), doc.tipo, doc.titulo
    )
    return [converter_para_out(d) for d in query.order_by(Documento.versao.desc()).all()]


def abrir_arquivo_documento(
    db: Session,
    id_doc: int,
    storage: StorageService | None = None,
    pode_ver_historico: bool = True,
) -> tuple[bytes, str, str]:
    doc = _obter_modelo_documento(db, id_doc)
    if doc.ativo != "S" and not pode_ver_historico:
        raise NaoEncontrado("Documento não encontrado.")
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


def caminho_arquivo(db: Session, id_doc: int, pode_ver_historico: bool = True) -> tuple[Path, Documento]:
    doc = _obter_modelo_documento(db, id_doc)
    if doc.ativo != "S" and not pode_ver_historico:
        raise NaoEncontrado("Documento não encontrado.")
    caminho = Path(settings.UPLOAD_DIR) / doc.url_arquivo
    if not caminho.is_file():
        raise NaoEncontrado("Arquivo não encontrado no armazenamento.")
    return caminho, doc


def criar_documento(
    db: Session,
    arquivo: UploadFile | None = None,
    titulo: str | None = None,
    tipo: str | None = None,
    categoria: str | None = None,
    descricao: str | None = None,
    palavras_chave: str | None = None,
    usuario: Usuario | None = None,
    *,
    metadados: DocumentoMetadadosIn | None = None,
    nome_arquivo: str | None = None,
    conteudo: bytes | None = None,
    autor: Usuario | None = None,
    storage: StorageService | None = None,
) -> DocumentoOut:
    usuario_autor = usuario or autor
    if usuario_autor is None:
        raise RegraNegocio("Autor não informado.", {"autor": "Autor obrigatório."})

    if metadados is not None:
        titulo_final = metadados.titulo
        tipo_final = metadados.tipo
        categoria_informada = metadados.categoria
        descricao_final = metadados.descricao
        palavras_banco = metadados.palavras_chave
        palavras_lista = normalizar_palavras_chave_lista(metadados.palavras_chave)
    else:
        titulo_final = " ".join((titulo or "").split())
        if not titulo_final:
            raise RegraNegocio("Informe o título.", {"titulo": "Este campo é obrigatório."})
        if len(titulo_final) > 200:
            raise RegraNegocio("Título muito longo.", {"titulo": "Deve ter no máximo 200 caracteres."})
        tipo_final = (tipo or "POP").strip().upper()
        if tipo_final not in ("POP", "DOCUMENTO"):
            raise RegraNegocio("Tipo inválido.", {"tipo": "Valor inválido para este campo."})
        descricao_final = (descricao or "").strip() or None
        if descricao_final and len(descricao_final) > 1000:
            raise RegraNegocio("Descrição muito longa.", {"descricao": "Deve ter no máximo 1000 caracteres."})
        categoria_informada = (categoria or "").strip() or None
        if categoria_informada and len(categoria_informada) > 100:
            raise RegraNegocio("Categoria muito longa.", {"categoria": "Deve ter no máximo 100 caracteres."})
        palavras_lista = normalizar_palavras_chave_lista(palavras_chave)
        palavras_banco = normalizar_palavras_chave_banco(palavras_chave)

    if conteudo is None:
        if arquivo is None:
            raise RegraNegocio("Arquivo não enviado.", {"arquivo": "Este campo é obrigatório."})
        nome_arquivo = arquivo.filename
        conteudo = arquivo.file.read()

    ext, mime_type, nome_limpo = validar_arquivo_upload(nome_arquivo, conteudo)
    categoria_final = categoria_informada or inferir_categoria(palavras_lista)

    # Versionamento: mesmo tipo + titulo (case insensitive) => nova versao, anteriores ficam inativas
    anteriores = _mesmo_documento(db.query(Documento), tipo_final, titulo_final).all()
    nova_versao = max((d.versao for d in anteriores), default=0) + 1

    chave = f"documentos/{uuid.uuid4().hex}.{ext}"
    servico_storage = storage or get_storage_service()
    servico_storage.salvar(conteudo, chave, mime_type)

    try:
        agora = datetime.now(timezone.utc).replace(tzinfo=None)
        for d in anteriores:
            if d.ativo == "S":
                d.ativo = "N"
                d.data_atualizacao = agora
        novo = Documento(
            titulo=titulo_final,
            tipo=tipo_final,
            categoria=categoria_final,
            descricao=descricao_final,
            palavras_chave=palavras_banco,
            url_arquivo=chave,
            nome_arquivo=nome_limpo[:255],
            mime_type=mime_type,
            tamanho_bytes=len(conteudo),
            versao=nova_versao,
            ativo="S",
            id_autor=usuario_autor.id_usuario,
            data_upload=agora,
        )
        db.add(novo)
        db.commit()
        db.refresh(novo)
    except Exception:
        db.rollback()
        servico_storage.excluir(chave)
        raise

    return converter_para_out(novo)


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
        nova_chave = f"documentos/{uuid.uuid4().hex}.{ext}"
        servico_storage.salvar(conteudo, nova_chave, mime_type)
        doc.url_arquivo = nova_chave
        doc.nome_arquivo = nome_limpo
        doc.mime_type = mime_type
        doc.tamanho_bytes = len(conteudo)

    try:
        doc.titulo = metadados.titulo
        doc.tipo = metadados.tipo
        doc.categoria = metadados.categoria or inferir_categoria(normalizar_palavras_chave_lista(metadados.palavras_chave))
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

    return converter_para_out(doc)


def excluir_documento(
    db: Session,
    id_doc: int,
    storage: StorageService | None = None,
) -> None:
    doc = _obter_modelo_documento(db, id_doc)
    era_ativo = (doc.ativo == "S")
    tipo, titulo = doc.tipo, doc.titulo
    chave_arquivo = doc.url_arquivo
    servico_storage = storage or get_storage_service()

    db.delete(doc)
    db.flush()
    if era_ativo:
        anterior = (
            _mesmo_documento(db.query(Documento), tipo, titulo)
            .order_by(Documento.versao.desc())
            .first()
        )
        if anterior is not None:
            anterior.ativo = "S"
    db.commit()

    if chave_arquivo:
        servico_storage.excluir(chave_arquivo)

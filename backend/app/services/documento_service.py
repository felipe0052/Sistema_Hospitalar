from datetime import datetime, timezone
from pathlib import Path
import unicodedata
import uuid

from fastapi import UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.exceptions import NaoEncontrado, RegraNegocio
from app.models.documento import Documento
from app.models.usuario import Usuario
from app.schemas.documento import AutorDocumentoOut, DocumentoOut, PaginadoDocumentosOut

PERFIS_GESTAO_DOCUMENTOS = ("ADMIN", "RH")

MIME_PDF = "application/pdf"
MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
EXTENSOES_PERMITIDAS = {".pdf": MIME_PDF, ".docx": MIME_DOCX}

# Categorização automática: se a categoria não for informada, é inferida pelas
# palavras-chave (categoria com mais acertos).
CATEGORIAS_POR_PALAVRA_CHAVE: dict[str, tuple[str, ...]] = {
    "Enfermagem": ("enfermagem", "enfermeiro", "curativo", "sondagem", "medicacao", "puncao", "higienizacao", "paciente"),
    "Farmácia": ("farmacia", "farmaceutico", "dispensacao", "estoque", "medicamento", "controlados", "receita"),
    "Controle de Infecção": ("ccih", "infeccao", "isolamento", "epi", "assepsia", "contato", "precaucao"),
    "Administrativo": ("administrativo", "compras", "contrato", "financeiro", "faturamento", "protocolo", "recepcao"),
    "Recursos Humanos": ("rh", "ferias", "folha", "beneficios", "admissao", "demissao", "escala"),
    "Segurança do Trabalho": ("seguranca", "acidente", "cipa", "nr32", "risco", "incendio", "brigada"),
    "TI": ("ti", "sistema", "senha", "acesso", "rede", "backup", "lgpd"),
}


def _normalizar(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def normalizar_palavras_chave(bruto: str | None) -> list[str]:
    """Separa por vírgula/ponto e vírgula e remove duplicadas (sem acento/caixa)."""
    vistas: set[str] = set()
    resultado: list[str] = []
    for parte in (bruto or "").replace(";", ",").split(","):
        palavra = " ".join(parte.split())
        chave = _normalizar(palavra)
        if palavra and chave not in vistas:
            vistas.add(chave)
            resultado.append(palavra)
    if len(", ".join(resultado)) > 500:
        raise RegraNegocio(
            "As palavras-chave excedem 500 caracteres.",
            {"palavras_chave": "Máximo de 500 caracteres."},
        )
    return resultado


def inferir_categoria(palavras_chave: list[str]) -> str | None:
    tokens: set[str] = set()
    for p in palavras_chave:
        norm = _normalizar(p)
        tokens.add(norm)
        tokens.update(norm.split())
    melhor, acertos_melhor = None, 0
    for categoria, termos in CATEGORIAS_POR_PALAVRA_CHAVE.items():
        acertos = len(tokens.intersection(termos))
        if acertos > acertos_melhor:
            melhor, acertos_melhor = categoria, acertos
    return melhor


def _converter(doc: Documento) -> DocumentoOut:
    autor = (
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
        palavras_chave=[p.strip() for p in (doc.palavras_chave or "").split(",") if p.strip()],
        nome_arquivo=doc.nome_arquivo,
        mime_type=doc.mime_type,
        tamanho_bytes=doc.tamanho_bytes,
        versao=doc.versao,
        ativo=(doc.ativo == "S"),
        autor=autor,
        data_upload=doc.data_upload,
        data_atualizacao=doc.data_atualizacao,
    )


def _validar_conteudo(nome: str, conteudo: bytes) -> tuple[str, str]:
    ext = Path(nome).suffix.lower()
    if ext not in EXTENSOES_PERMITIDAS:
        raise RegraNegocio("Formato inválido. Envie um arquivo PDF ou DOCX.", {"arquivo": "Apenas PDF ou DOCX."})
    limite = settings.DOCUMENTOS_MAX_MB * 1024 * 1024
    if len(conteudo) == 0:
        raise RegraNegocio("O arquivo está vazio.", {"arquivo": "O arquivo está vazio."})
    if len(conteudo) > limite:
        raise RegraNegocio(
            f"O arquivo excede o limite de {settings.DOCUMENTOS_MAX_MB} MB.",
            {"arquivo": f"Tamanho máximo: {settings.DOCUMENTOS_MAX_MB} MB."},
        )
    # Confere a assinatura do arquivo, sem confiar só na extensão/Content-Type do cliente
    ok = conteudo.startswith(b"%PDF-") if ext == ".pdf" else conteudo.startswith(b"PK\x03\x04")
    if not ok:
        raise RegraNegocio(
            "O conteúdo do arquivo não corresponde ao formato informado.",
            {"arquivo": "Arquivo corrompido ou inválido."},
        )
    return ext, EXTENSOES_PERMITIDAS[ext]


def _mesmo_documento(query, tipo: str, titulo: str):
    return query.filter(Documento.tipo == tipo, func.lower(Documento.titulo) == titulo.lower())


def criar_documento(
    db: Session,
    arquivo: UploadFile,
    titulo: str,
    tipo: str,
    categoria: str | None,
    descricao: str | None,
    palavras_chave: str | None,
    usuario: Usuario,
) -> DocumentoOut:
    titulo = " ".join((titulo or "").split())
    if not titulo:
        raise RegraNegocio("Informe o título.", {"titulo": "Este campo é obrigatório."})
    if len(titulo) > 200:
        raise RegraNegocio("Título muito longo.", {"titulo": "Deve ter no máximo 200 caracteres."})
    tipo = (tipo or "").upper()
    if tipo not in ("POP", "DOCUMENTO"):
        raise RegraNegocio("Tipo inválido.", {"tipo": "Valor inválido para este campo."})
    if descricao and len(descricao) > 1000:
        raise RegraNegocio("Descrição muito longa.", {"descricao": "Deve ter no máximo 1000 caracteres."})
    if categoria and len(categoria.strip()) > 100:
        raise RegraNegocio("Categoria muito longa.", {"categoria": "Deve ter no máximo 100 caracteres."})

    # Lê no máximo limite+1 bytes para não carregar uploads gigantes em memória
    limite = settings.DOCUMENTOS_MAX_MB * 1024 * 1024
    conteudo = arquivo.file.read(limite + 1)
    ext, mime = _validar_conteudo(arquivo.filename or "", conteudo)

    palavras = normalizar_palavras_chave(palavras_chave)
    categoria_final = (categoria or "").strip() or inferir_categoria(palavras)

    # Versionamento: mesmo tipo + título (sem diferenciar caixa) => nova versão; só a última fica ativa
    anteriores = _mesmo_documento(db.query(Documento), tipo, titulo).all()
    nova_versao = max((d.versao for d in anteriores), default=0) + 1

    chave = f"documentos/{uuid.uuid4().hex}{ext}"
    destino = Path(settings.UPLOAD_DIR) / chave
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(conteudo)

    try:
        agora = datetime.now(timezone.utc).replace(tzinfo=None)
        for d in anteriores:
            if d.ativo == "S":
                d.ativo = "N"
                d.data_atualizacao = agora
        doc = Documento(
            titulo=titulo,
            tipo=tipo,
            categoria=categoria_final,
            descricao=(descricao or "").strip() or None,
            palavras_chave=", ".join(palavras) or None,
            url_arquivo=chave,
            nome_arquivo=Path(arquivo.filename or f"arquivo{ext}").name[:255],
            mime_type=mime,
            tamanho_bytes=len(conteudo),
            versao=nova_versao,
            ativo="S",
            id_autor=usuario.id_usuario,
        )
        db.add(doc)
        db.commit()
    except Exception:
        db.rollback()
        destino.unlink(missing_ok=True)
        raise
    db.refresh(doc)
    return _converter(doc)


def listar_documentos(
    db: Session,
    busca: str | None,
    tipo: str | None,
    categoria: str | None,
    palavra_chave: str | None,
    incluir_inativas: bool,
    pagina: int,
    tamanho: int,
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
        itens=[_converter(d) for d in registros], total=total, pagina=pagina, tamanho=tamanho
    )


def listar_categorias(db: Session) -> list[str]:
    linhas = (
        db.query(Documento.categoria)
        .filter(Documento.ativo == "S", Documento.categoria.isnot(None))
        .distinct()
        .order_by(Documento.categoria)
        .all()
    )
    return [c for (c,) in linhas]


def _obter(db: Session, id_doc: int) -> Documento:
    doc = db.query(Documento).options(joinedload(Documento.autor)).filter(Documento.id_doc == id_doc).first()
    if doc is None:
        raise NaoEncontrado("Documento não encontrado.")
    return doc


def obter_documento(db: Session, id_doc: int, pode_ver_historico: bool) -> DocumentoOut:
    doc = _obter(db, id_doc)
    if doc.ativo != "S" and not pode_ver_historico:
        raise NaoEncontrado("Documento não encontrado.")
    return _converter(doc)


def historico_versoes(db: Session, id_doc: int) -> list[DocumentoOut]:
    doc = _obter(db, id_doc)
    query = _mesmo_documento(db.query(Documento).options(joinedload(Documento.autor)), doc.tipo, doc.titulo)
    return [_converter(d) for d in query.order_by(Documento.versao.desc()).all()]


def caminho_arquivo(db: Session, id_doc: int, pode_ver_historico: bool) -> tuple[Path, Documento]:
    doc = _obter(db, id_doc)
    if doc.ativo != "S" and not pode_ver_historico:
        raise NaoEncontrado("Documento não encontrado.")
    caminho = Path(settings.UPLOAD_DIR) / doc.url_arquivo
    if not caminho.is_file():
        raise NaoEncontrado("Arquivo não encontrado no armazenamento.")
    return caminho, doc


def excluir_documento(db: Session, id_doc: int) -> None:
    """Remove a versão; se era a vigente, a versão anterior mais recente volta a ser a ativa."""
    doc = _obter(db, id_doc)
    era_ativo = doc.ativo == "S"
    tipo, titulo = doc.tipo, doc.titulo
    caminho = Path(settings.UPLOAD_DIR) / doc.url_arquivo
    db.delete(doc)
    db.flush()
    if era_ativo:
        anterior = _mesmo_documento(db.query(Documento), tipo, titulo).order_by(Documento.versao.desc()).first()
        if anterior is not None:
            anterior.ativo = "S"
    db.commit()
    caminho.unlink(missing_ok=True)

"""Endpoints da Central de Documentos e POPs (UC06, UC07 — §7.7 e S3-T1)."""

from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, require_roles
from app.core.exceptions import AppError
from app.models.usuario import Usuario
from app.schemas.documento import (
    DocumentoMetadadosIn,
    DocumentoOut,
    PaginadoDocumentosOut,
)
from app.services import documento_service

router = APIRouter(prefix="/documentos", tags=["Documentos e POPs"])


def _validar_metadados_form(
    titulo: str | None,
    tipo: str | None,
    categoria: str | None,
    descricao: str | None,
    palavras_chave: str | None,
) -> DocumentoMetadadosIn:
    try:
        return DocumentoMetadadosIn(
            titulo=titulo or "",
            tipo=tipo or "",  # type: ignore[arg-type]
            categoria=categoria,
            descricao=descricao,
            palavras_chave=palavras_chave,
        )
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


@router.get("", response_model=PaginadoDocumentosOut)
def listar_documentos(
    busca: str | None = Query(
        default=None,
        description="Busca em título, descrição e palavras-chave (sem diferenciar maiúsculas/acentos)",
    ),
    tipo: str | None = Query(default=None, description="Filtro por tipo: POP ou DOCUMENTO"),
    categoria: str | None = Query(default=None, description="Filtro por categoria"),
    pagina: int = Query(default=1, ge=1, description="Número da página"),
    tamanho: int = Query(default=20, ge=1, le=100, description="Itens por página (máx. 100)"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> PaginadoDocumentosOut:
    """Lista e pesquisa POPs e documentos paginados do mais recente para o mais antigo (UC07)."""
    return documento_service.listar_documentos(
        db=db,
        busca=busca,
        tipo=tipo,
        categoria=categoria,
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/categorias", response_model=list[str])
def listar_categorias_documentos(
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[str]:
    """Retorna a lista de categorias distintas de documentos cadastrados, em ordem alfabética (§7.7)."""
    return documento_service.listar_categorias_documentos(db)


@router.get("/{id_doc}", response_model=DocumentoOut)
def obter_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> DocumentoOut:
    """Obtém os metadados detalhados de um documento ou POP pelo ID (UC07)."""
    return documento_service.obter_documento(db, id_doc)


@router.get("/{id_doc}/arquivo")
def baixar_ou_visualizar_arquivo_documento(
    id_doc: int,
    download: bool = Query(
        default=False,
        description="Se true, retorna Content-Disposition: attachment; caso contrário, inline",
    ),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> Response:
    """Retorna o binário do arquivo PDF ou DOCX para visualização embutida ou download (§7.7)."""
    conteudo, mime_type, nome_arquivo = documento_service.abrir_arquivo_documento(db, id_doc)
    disposicao = "attachment" if download else "inline"
    nome_ascii = nome_arquivo.encode("ascii", "ignore").decode("ascii") or "documento"
    nome_utf8 = quote(nome_arquivo)
    headers = {
        "Content-Disposition": f'{disposicao}; filename="{nome_ascii}"; filename*=UTF-8\'\'{nome_utf8}',
        "Content-Length": str(len(conteudo)),
    }
    return Response(content=conteudo, media_type=mime_type, headers=headers)


@router.post("", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
async def criar_documento(
    titulo: str | None = Form(default=None, description="Título do POP ou documento (3–200 caracteres)"),
    tipo: str | None = Form(default=None, description="POP ou DOCUMENTO"),
    categoria: str | None = Form(default=None, description="Categoria opcional (ex.: Enfermagem, Farmácia)"),
    descricao: str | None = Form(default=None, description="Descrição opcional (máx. 1000 caracteres)"),
    palavras_chave: str | None = Form(default=None, description="Palavras-chave separadas por vírgula"),
    arquivo: UploadFile | None = File(default=None, description="Arquivo binário PDF ou DOCX (máx. 20 MB)"),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles("ADMIN")),
) -> DocumentoOut:
    """Faz upload seguro e cadastra um novo POP ou documento institucional (UC06)."""
    metadados = _validar_metadados_form(
        titulo=titulo,
        tipo=tipo,
        categoria=categoria,
        descricao=descricao,
        palavras_chave=palavras_chave,
    )
    if arquivo is None or not arquivo.filename:
        raise AppError(
            "Selecione um arquivo PDF ou DOCX para enviar.",
            erros={"arquivo": "Este campo é obrigatório."},
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    conteudo = await arquivo.read()
    return documento_service.criar_documento(
        db=db,
        metadados=metadados,
        nome_arquivo=arquivo.filename,
        conteudo=conteudo,
        autor=usuario_atual,
    )


@router.put("/{id_doc}", response_model=DocumentoOut)
async def atualizar_documento(
    id_doc: int,
    titulo: str | None = Form(default=None, description="Título do POP ou documento (3–200 caracteres)"),
    tipo: str | None = Form(default=None, description="POP ou DOCUMENTO"),
    categoria: str | None = Form(default=None, description="Categoria opcional"),
    descricao: str | None = Form(default=None, description="Descrição opcional"),
    palavras_chave: str | None = Form(default=None, description="Palavras-chave separadas por vírgula"),
    arquivo: UploadFile | None = File(default=None, description="Novo arquivo opcional para substituição"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN")),
) -> DocumentoOut:
    """Atualiza metadados de um documento/POP e, opcionalmente, substitui seu arquivo binário (UC06)."""
    metadados = _validar_metadados_form(
        titulo=titulo,
        tipo=tipo,
        categoria=categoria,
        descricao=descricao,
        palavras_chave=palavras_chave,
    )
    conteudo: bytes | None = None
    nome_arquivo: str | None = None
    if arquivo is not None and arquivo.filename:
        conteudo = await arquivo.read()
        nome_arquivo = arquivo.filename

    return documento_service.atualizar_documento(
        db=db,
        id_doc=id_doc,
        metadados=metadados,
        nome_arquivo=nome_arquivo,
        conteudo=conteudo,
    )


@router.delete("/{id_doc}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN")),
) -> Response:
    """Exclui fisicamente o registro do documento e remove o arquivo do storage (UC06)."""
    documento_service.excluir_documento(db, id_doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

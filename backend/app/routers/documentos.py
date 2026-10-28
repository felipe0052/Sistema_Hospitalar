"""Endpoints da Central de Documentos e POPs (UC06, UC07)."""

from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, require_roles
from app.core.exceptions import HTTP_422_STATUS, AppError
from app.models.usuario import Usuario
from app.schemas.documento import (
    DocumentoMetadadosIn,
    DocumentoOut,
    PaginadoDocumentosOut,
)
from app.services import documento_service
from app.services.documento_service import PERFIS_GESTAO_DOCUMENTOS

router = APIRouter(prefix="/documentos", tags=["Documentos e POPs"])


def _eh_gestor(usuario: Usuario | None) -> bool:
    return usuario is not None and usuario.perfil in PERFIS_GESTAO_DOCUMENTOS


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
        description="Busca em título, categoria, descrição ou palavras-chave",
    ),
    tipo: str | None = Query(default=None, description="Filtro por tipo: POP ou DOCUMENTO"),
    categoria: str | None = Query(default=None, description="Filtro por categoria"),
    palavra_chave: str | None = Query(default=None, description="Filtro por palavra-chave"),
    incluir_inativas: bool = Query(default=False, description="Inclui versões antigas (apenas ADMIN/RH)"),
    pagina: int = Query(default=1, ge=1, description="Número da página"),
    tamanho: int = Query(default=20, ge=1, le=100, description="Itens por página (máx. 100)"),
    db: Session = Depends(get_db),
    usuario_atual: Usuario | None = Depends(get_optional_user),
) -> PaginadoDocumentosOut:
    """Lista e pesquisa POPs e documentos paginados do mais recente para o mais antigo (UC06, UC07)."""
    return documento_service.listar_documentos(
        db=db,
        busca=busca,
        tipo=tipo,
        categoria=categoria,
        palavra_chave=palavra_chave,
        incluir_inativas=bool(incluir_inativas and _eh_gestor(usuario_atual)),
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/categorias", response_model=list[str])
def listar_categorias(
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[str]:
    """Retorna a lista de categorias distintas de documentos cadastrados, em ordem alfabética."""
    return documento_service.listar_categorias(db)


@router.post("", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
async def criar_documento(
    arquivo: UploadFile = File(..., description="Arquivo binário PDF ou DOCX (máx. 20 MB)"),
    titulo: str = Form(..., description="Título do POP ou documento (3–200 caracteres)"),
    tipo: str = Form(default="POP", description="POP ou DOCUMENTO"),
    categoria: str | None = Form(default=None, description="Categoria opcional"),
    descricao: str | None = Form(default=None, description="Descrição opcional (máx. 1000 caracteres)"),
    palavras_chave: str | None = Form(default=None, description="Palavras-chave separadas por vírgula"),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> DocumentoOut:
    """Upload seguro com versionamento automático (mesmo tipo+título gera nova versão)."""
    if not arquivo or not arquivo.filename:
        raise AppError(
            "Selecione um arquivo PDF ou DOCX para enviar.",
            erros={"arquivo": "Este campo é obrigatório."},
            status_code=HTTP_422_STATUS,
        )

    conteudo = await arquivo.read()
    return documento_service.criar_documento(
        db=db,
        arquivo=None,
        titulo=titulo,
        tipo=tipo,
        categoria=categoria,
        descricao=descricao,
        palavras_chave=palavras_chave,
        usuario=usuario_atual,
        nome_arquivo=arquivo.filename,
        conteudo=conteudo,
    )


@router.get("/{id_doc}", response_model=DocumentoOut)
def obter_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario | None = Depends(get_optional_user),
) -> DocumentoOut:
    """Obtém os metadados detalhados de um documento ou POP pelo ID (UC07)."""
    return documento_service.obter_documento(db, id_doc, pode_ver_historico=_eh_gestor(usuario_atual))


@router.get("/{id_doc}/versoes", response_model=list[DocumentoOut])
def historico_versoes(
    id_doc: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> list[DocumentoOut]:
    """Retorna o histórico de todas as versões do documento."""
    return documento_service.historico_versoes(db, id_doc)


@router.get("/{id_doc}/arquivo")
def baixar_ou_visualizar_arquivo_documento(
    id_doc: int,
    download: bool = Query(
        default=False,
        description="Se true, retorna Content-Disposition: attachment; caso contrário, inline",
    ),
    db: Session = Depends(get_db),
    usuario_atual: Usuario | None = Depends(get_optional_user),
) -> Response:
    """Retorna o binário do arquivo PDF ou DOCX para visualização embutida ou download."""
    conteudo, mime_type, nome_arquivo = documento_service.abrir_arquivo_documento(
        db, id_doc, pode_ver_historico=_eh_gestor(usuario_atual)
    )
    disposicao = "attachment" if download else "inline"
    nome_ascii = nome_arquivo.encode("ascii", "ignore").decode("ascii") or "documento"
    nome_utf8 = quote(nome_arquivo)
    headers = {
        "Content-Disposition": f'{disposicao}; filename="{nome_ascii}"; filename*=UTF-8\'\'{nome_utf8}',
        "Content-Length": str(len(conteudo)),
    }
    return Response(content=conteudo, media_type=mime_type, headers=headers)


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
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> DocumentoOut:
    """Atualiza metadados de um documento/POP e, opcionalmente, substitui seu arquivo binário."""
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
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> Response:
    """Exclui a versão do documento (reativando a anterior se vigente)."""
    documento_service.excluir_documento(db, id_doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

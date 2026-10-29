"""Endpoints da Central de Documentos e POPs (UC06, UC07)."""

from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, Response, UploadFile, status
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
from app.services.ia import indexador

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
    incluir_arquivados: bool = Query(default=False, description="Alias de incluir_inativas (versões ARQUIVADAS)"),
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
        incluir_inativas=bool((incluir_inativas or incluir_arquivados) and _eh_gestor(usuario_atual)),
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
    tarefas: BackgroundTasks,
    arquivo: UploadFile = File(..., description="Arquivo binário PDF ou DOCX (máx. 20 MB)"),
    titulo: str = Form(..., description="Título do POP ou documento (3–200 caracteres)"),
    tipo: str = Form(default="POP", description="POP ou DOCUMENTO"),
    categoria: str | None = Form(default=None, description="Categoria opcional"),
    descricao: str | None = Form(default=None, description="Descrição opcional (máx. 1000 caracteres)"),
    palavras_chave: str | None = Form(default=None, description="Palavras-chave separadas por vírgula"),
    codigo: str | None = Form(default=None, description="Código do POP (ex.: POP-ENF-012)"),
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
    novo = documento_service.criar_documento(
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
        codigo=codigo,
    )
    tarefas.add_task(indexador.indexar_em_background, db.get_bind(), novo.id_doc)
    return novo


@router.post("/{id_doc}/nova-versao", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
async def enviar_nova_versao(
    id_doc: int,
    tarefas: BackgroundTasks,
    arquivo: UploadFile = File(..., description="Novo arquivo PDF ou DOCX (máx. 20 MB)"),
    justificativa: str | None = Form(default=None, max_length=500, description="Motivo da alteração"),
    categoria: str | None = Form(default=None),
    descricao: str | None = Form(default=None),
    palavras_chave: str | None = Form(default=None),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> DocumentoOut:
    """Publica nova versão do POP (versão + 1, vigente) e arquiva a anterior; indexa em background."""
    if not arquivo or not arquivo.filename:
        raise AppError(
            "Selecione um arquivo PDF ou DOCX para enviar.",
            erros={"arquivo": "Este campo é obrigatório."},
            status_code=HTTP_422_STATUS,
        )
    conteudo = await arquivo.read()
    nova = documento_service.criar_nova_versao(
        db=db,
        id_doc=id_doc,
        nome_arquivo=arquivo.filename,
        conteudo=conteudo,
        usuario=usuario_atual,
        justificativa=justificativa,
        categoria=categoria,
        descricao=descricao,
        palavras_chave=palavras_chave,
    )
    tarefas.add_task(indexador.indexar_em_background, db.get_bind(), nova.id_doc)
    return nova


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
    tarefas: BackgroundTasks,
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

    atualizado = documento_service.atualizar_documento(
        db=db,
        id_doc=id_doc,
        metadados=metadados,
        nome_arquivo=nome_arquivo,
        conteudo=conteudo,
    )
    if conteudo is not None:
        tarefas.add_task(indexador.indexar_em_background, db.get_bind(), id_doc)
    return atualizado


@router.delete("/{id_doc}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> Response:
    """Exclui a versão do documento (reativando a anterior se vigente)."""
    documento_service.excluir_documento(db, id_doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

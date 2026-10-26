from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, require_roles
from app.models.usuario import Usuario
from app.schemas.documento import DocumentoOut, PaginadoDocumentosOut
from app.services import documento_service
from app.services.documento_service import PERFIS_GESTAO_DOCUMENTOS

router = APIRouter(prefix="/documentos", tags=["Documentos e POPs"])


def _eh_gestor(usuario: Usuario | None) -> bool:
    return usuario is not None and usuario.perfil in PERFIS_GESTAO_DOCUMENTOS


@router.get("", response_model=PaginadoDocumentosOut)
def listar_documentos(
    busca: str | None = Query(default=None, description="Busca por título, categoria, descrição ou palavra-chave"),
    tipo: str | None = Query(default=None, description="POP ou DOCUMENTO"),
    categoria: str | None = Query(default=None),
    palavra_chave: str | None = Query(default=None),
    incluir_inativas: bool = Query(default=False, description="Inclui versões antigas (apenas ADMIN/RH)"),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    usuario_atual: Usuario | None = Depends(get_optional_user),
) -> PaginadoDocumentosOut:
    """Lista apenas as versões vigentes (UC06)."""
    return documento_service.listar_documentos(
        db,
        busca,
        tipo,
        categoria,
        palavra_chave,
        incluir_inativas and _eh_gestor(usuario_atual),
        pagina,
        tamanho,
    )


@router.get("/categorias", response_model=list[str])
def listar_categorias(
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[str]:
    return documento_service.listar_categorias(db)


@router.post("", response_model=DocumentoOut, status_code=status.HTTP_201_CREATED)
def enviar_documento(
    arquivo: UploadFile = File(..., description="PDF ou DOCX de até 10 MB"),
    titulo: str = Form(...),
    tipo: str = Form(default="POP"),
    categoria: str | None = Form(default=None),
    descricao: str | None = Form(default=None),
    palavras_chave: str | None = Form(default=None, description="Separadas por vírgula"),
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> DocumentoOut:
    """Upload com versionamento automático: mesmo tipo+título gera nova versão e desativa a anterior (UC06)."""
    return documento_service.criar_documento(
        db, arquivo, titulo, tipo, categoria, descricao, palavras_chave, usuario_atual
    )


@router.get("/{id_doc}", response_model=DocumentoOut)
def obter_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario | None = Depends(get_optional_user),
) -> DocumentoOut:
    return documento_service.obter_documento(db, id_doc, _eh_gestor(usuario_atual))


@router.get("/{id_doc}/versoes", response_model=list[DocumentoOut])
def historico_versoes(
    id_doc: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> list[DocumentoOut]:
    return documento_service.historico_versoes(db, id_doc)


@router.get("/{id_doc}/arquivo")
def baixar_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario | None = Depends(get_optional_user),
) -> FileResponse:
    caminho, doc = documento_service.caminho_arquivo(db, id_doc, _eh_gestor(usuario_atual))
    return FileResponse(caminho, media_type=doc.mime_type, filename=doc.nome_arquivo)


@router.delete("/{id_doc}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_documento(
    id_doc: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_DOCUMENTOS)),
) -> Response:
    documento_service.excluir_documento(db, id_doc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

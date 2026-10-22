from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.usuario import Usuario
from app.schemas.usuario import (
    AcessoUpdate,
    HistoricoAcessoOut,
    PaginadoUsuariosOut,
    SenhaUpdate,
    UsuarioCreate,
    UsuarioOut,
    UsuarioUpdate,
)
from app.services import usuario_service

router = APIRouter(prefix="/usuarios", tags=["Usuários e Controle de Acesso"])


@router.get("", response_model=PaginadoUsuariosOut)
def listar_usuarios(
    busca: str | None = Query(default=None, description="Busca por nome ou e-mail"),
    id_setor: int | None = Query(default=None, description="Filtro por ID do setor"),
    perfil: str | None = Query(default=None, description="Filtro por perfil (ADMIN, COLABORADOR, RH, MARKETING)"),
    status_filtro: str | None = Query(default=None, alias="status", description="Filtro por status (ATIVO, INATIVO)"),
    pagina: int = Query(default=1, ge=1, description="Número da página"),
    tamanho: int = Query(default=20, ge=1, le=100, description="Itens por página (máx. 100)"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH")),
) -> PaginadoUsuariosOut:
    """Lista usuários com paginação e filtros (UC02/UC03)."""
    return usuario_service.listar_usuarios(
        db=db,
        busca=busca,
        id_setor=id_setor,
        perfil=perfil,
        status=status_filtro,
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/{id_usuario}", response_model=UsuarioOut)
def obter_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH")),
) -> UsuarioOut:
    """Obtém os detalhes de um usuário pelo ID."""
    usuario = usuario_service.obter_usuario(db, id_usuario)
    return UsuarioOut.model_validate(usuario)


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    payload: UsuarioCreate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH")),
) -> UsuarioOut:
    """Cadastra um novo usuário no sistema (UC02)."""
    usuario = usuario_service.criar_usuario(db, payload, usuario_atual)
    return UsuarioOut.model_validate(usuario)


@router.put("/{id_usuario}", response_model=UsuarioOut)
def atualizar_usuario(
    id_usuario: int,
    payload: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH")),
) -> UsuarioOut:
    """Atualiza os dados cadastrais de um usuário existente (UC02)."""
    usuario = usuario_service.atualizar_usuario(db, id_usuario, payload, usuario_atual)
    return UsuarioOut.model_validate(usuario)


@router.patch("/{id_usuario}/senha", status_code=status.HTTP_204_NO_CONTENT)
def redefinir_senha(
    id_usuario: int,
    payload: SenhaUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
) -> Response:
    """Redefine a senha de um usuário e invalida sessões anteriores (exclusivo ADMIN)."""
    usuario_service.redefinir_senha(db, id_usuario, payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{id_usuario}/acesso", response_model=UsuarioOut)
def alterar_acesso(
    id_usuario: int,
    payload: AcessoUpdate,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_roles("ADMIN")),
) -> UsuarioOut:
    """Altera perfil e/ou status do usuário, registrando histórico de auditoria (UC03 — exclusivo ADMIN)."""
    usuario = usuario_service.alterar_acesso(db, id_usuario, payload, admin)
    return UsuarioOut.model_validate(usuario)


@router.get("/{id_usuario}/historico-acesso", response_model=list[HistoricoAcessoOut])
def listar_historico_acesso(
    id_usuario: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_roles("ADMIN")),
) -> list[HistoricoAcessoOut]:
    """Lista o histórico de alterações de perfil e status de um usuário (UC03)."""
    return usuario_service.listar_historico_acesso(db, id_usuario)

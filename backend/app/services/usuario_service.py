from datetime import UTC, datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import Conflito, NaoEncontrado, Proibido, RegraNegocio
from app.core.security import gerar_hash_senha
from app.models.historico_acesso import HistoricoAcesso
from app.models.setor import Setor
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


def _validar_setor(db: Session, id_setor: int | None) -> None:
    if id_setor is not None:
        setor = db.query(Setor).filter(Setor.id_setor == id_setor).first()
        if setor is None:
            raise NaoEncontrado("Setor não encontrado.", erros={"id_setor": "Setor informado não existe"})


def listar_usuarios(
    db: Session,
    busca: str | None = None,
    id_setor: int | None = None,
    perfil: str | None = None,
    status: str | None = None,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoUsuariosOut:
    query = db.query(Usuario).options(joinedload(Usuario.setor))

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Usuario.nome.like(termo),
                Usuario.email.like(termo),
            )
        )

    if id_setor is not None:
        query = query.filter(Usuario.id_setor == id_setor)

    if perfil and perfil.strip():
        query = query.filter(Usuario.perfil == perfil.strip().upper())

    if status and status.strip():
        query = query.filter(Usuario.status == status.strip().upper())

    total = query.count()
    itens = (
        query.order_by(func.lower(Usuario.nome).asc(), Usuario.id_usuario.asc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )

    return PaginadoUsuariosOut(
        itens=[UsuarioOut.model_validate(u) for u in itens],
        total=total,
        pagina=pagina,
        tamanho=tamanho,
    )


def obter_usuario(db: Session, id_usuario: int) -> Usuario:
    usuario = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor))
        .filter(Usuario.id_usuario == id_usuario)
        .first()
    )
    if usuario is None:
        raise NaoEncontrado("Usuário não encontrado.")
    return usuario


def criar_usuario(db: Session, dados: UsuarioCreate, autor: Usuario) -> Usuario:
    email_norm = dados.email.strip().lower()
    existente = db.query(Usuario).filter(func.lower(Usuario.email) == email_norm).first()
    if existente is not None:
        raise Conflito(
            "Este e-mail já pertence a outro usuário",
            erros={"email": "Este e-mail já pertence a outro usuário"},
        )

    _validar_setor(db, dados.id_setor)

    # S1-T4 regra 2: Usuário criado por padrão com perfil COLABORADOR e status ATIVO.
    # Se o autor for RH, só pode criar com perfil COLABORADOR.
    perfil_inicial = "COLABORADOR"
    if dados.perfil:
        if autor.perfil == "RH" and dados.perfil != "COLABORADOR":
            raise Proibido("Permissão insuficiente.")
        if autor.perfil == "ADMIN":
            perfil_inicial = dados.perfil

    novo = Usuario(
        nome=dados.nome.strip(),
        email=email_norm,
        senha_hash=gerar_hash_senha(dados.senha),
        id_setor=dados.id_setor,
        cargo=dados.cargo,
        data_nascimento=dados.data_nascimento,
        perfil=perfil_inicial,
        status="ATIVO",
        versao_token=0,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return obter_usuario(db, novo.id_usuario)


def atualizar_usuario(db: Session, id_usuario: int, dados: UsuarioUpdate, autor: Usuario) -> Usuario:
    usuario = obter_usuario(db, id_usuario)

    # Matriz §5.1: RH só edita colaboradores não-admin
    if autor.perfil == "RH" and usuario.perfil == "ADMIN":
        raise Proibido("Permissão insuficiente.")

    email_norm = dados.email.strip().lower()
    duplicado = (
        db.query(Usuario)
        .filter(func.lower(Usuario.email) == email_norm, Usuario.id_usuario != id_usuario)
        .first()
    )
    if duplicado is not None:
        raise Conflito(
            "Este e-mail já pertence a outro usuário",
            erros={"email": "Este e-mail já pertence a outro usuário"},
        )

    _validar_setor(db, dados.id_setor)

    usuario.nome = dados.nome.strip()
    usuario.email = email_norm
    usuario.data_nascimento = dados.data_nascimento
    usuario.cargo = dados.cargo
    usuario.id_setor = dados.id_setor
    usuario.data_atualizacao = datetime.now(UTC)

    db.commit()
    db.refresh(usuario)
    return obter_usuario(db, usuario.id_usuario)


def redefinir_senha(db: Session, id_usuario: int, dados: SenhaUpdate) -> None:
    usuario = obter_usuario(db, id_usuario)
    usuario.senha_hash = gerar_hash_senha(dados.nova_senha)
    usuario.versao_token = (usuario.versao_token or 0) + 1
    usuario.data_atualizacao = datetime.now(UTC)
    db.commit()


def alterar_acesso(db: Session, id_usuario: int, dados: AcessoUpdate, admin: Usuario) -> Usuario:
    usuario = obter_usuario(db, id_usuario)

    # UC03 / S1-T4 regra 5: admin não pode remover o próprio perfil de ADMIN nem inativar a própria conta
    if usuario.id_usuario == admin.id_usuario:
        tentou_remover_admin = dados.perfil is not None and dados.perfil != "ADMIN"
        tentou_inativar = dados.status is not None and dados.status == "INATIVO"
        if tentou_remover_admin or tentou_inativar or (dados.perfil is not None or dados.status is not None):
            raise RegraNegocio(
                "Você não pode remover seu próprio perfil de administrador ou inativar sua própria conta."
            )

    alterou_acesso = False
    agora = datetime.now(UTC)

    if dados.perfil is not None and dados.perfil != usuario.perfil:
        historico_perfil = HistoricoAcesso(
            id_usuario=usuario.id_usuario,
            id_admin=admin.id_usuario,
            campo="PERFIL",
            valor_anterior=usuario.perfil,
            valor_novo=dados.perfil,
            data_hora=agora,
        )
        db.add(historico_perfil)
        usuario.perfil = dados.perfil
        alterou_acesso = True

    if dados.status is not None and dados.status != usuario.status:
        historico_status = HistoricoAcesso(
            id_usuario=usuario.id_usuario,
            id_admin=admin.id_usuario,
            campo="STATUS",
            valor_anterior=usuario.status,
            valor_novo=dados.status,
            data_hora=agora,
        )
        db.add(historico_status)
        usuario.status = dados.status
        alterou_acesso = True

    if alterou_acesso:
        usuario.versao_token = (usuario.versao_token or 0) + 1
        usuario.data_atualizacao = agora
        db.commit()
        db.refresh(usuario)

    return obter_usuario(db, usuario.id_usuario)


def listar_historico_acesso(db: Session, id_usuario: int) -> list[HistoricoAcessoOut]:
    obter_usuario(db, id_usuario)
    registros = (
        db.query(HistoricoAcesso)
        .options(joinedload(HistoricoAcesso.admin))
        .filter(HistoricoAcesso.id_usuario == id_usuario)
        .order_by(HistoricoAcesso.data_hora.desc(), HistoricoAcesso.id_historico.desc())
        .all()
    )
    return [HistoricoAcessoOut.model_validate(r) for r in registros]

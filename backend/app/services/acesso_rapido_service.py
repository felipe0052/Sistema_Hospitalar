from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NaoEncontrado, RegraNegocio
from app.models.acesso_rapido import AcessoRapido
from app.models.usuario import Usuario
from app.schemas.acesso_rapido import AcessoRapidoCreate, AcessoRapidoOut, AcessoRapidoUpdate


def listar_ativos(db: Session) -> list[AcessoRapidoOut]:
    itens = (
        db.query(AcessoRapido)
        .filter(AcessoRapido.ativo == 1)
        .order_by(AcessoRapido.ordem.asc(), AcessoRapido.id.asc())
        .all()
    )
    return [AcessoRapidoOut.model_validate(item) for item in itens]


def listar_todos_admin(db: Session) -> list[AcessoRapidoOut]:
    itens = (
        db.query(AcessoRapido)
        .order_by(AcessoRapido.ordem.asc(), AcessoRapido.id.asc())
        .all()
    )
    return [AcessoRapidoOut.model_validate(item) for item in itens]


def _buscar_por_id(db: Session, id_acesso: int) -> AcessoRapido:
    acesso = db.query(AcessoRapido).filter(AcessoRapido.id == id_acesso).first()
    if not acesso:
        raise NaoEncontrado("Acesso rápido não encontrado.")
    return acesso


def criar_acesso_rapido(
    db: Session, dados: AcessoRapidoCreate, usuario: Usuario
) -> AcessoRapidoOut:
    ordem = dados.ordem
    if ordem == 0:
        total = db.query(AcessoRapido).count()
        ordem = total + 1

    novo = AcessoRapido(
        titulo=dados.titulo,
        url=dados.url,
        descricao=dados.descricao,
        icone=dados.icone or "compass",
        ordem=ordem,
        ativo=1 if dados.ativo else 0,
        criado_por=usuario.id_usuario,
        criado_em=datetime.now(),
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return AcessoRapidoOut.model_validate(novo)


def atualizar_acesso_rapido(
    db: Session, id_acesso: int, dados: AcessoRapidoUpdate
) -> AcessoRapidoOut:
    acesso = _buscar_por_id(db, id_acesso)
    acesso.titulo = dados.titulo
    acesso.url = dados.url
    acesso.descricao = dados.descricao
    acesso.icone = dados.icone or "compass"
    acesso.ordem = dados.ordem
    acesso.ativo = 1 if dados.ativo else 0
    acesso.atualizado_em = datetime.now()
    db.commit()
    db.refresh(acesso)
    return AcessoRapidoOut.model_validate(acesso)


def alterar_ativo_acesso_rapido(
    db: Session, id_acesso: int, ativo: bool | None = None
) -> AcessoRapidoOut:
    acesso = _buscar_por_id(db, id_acesso)
    if ativo is None:
        acesso.ativo = 0 if acesso.ativo == 1 else 1
    else:
        acesso.ativo = 1 if ativo else 0
    acesso.atualizado_em = datetime.now()
    db.commit()
    db.refresh(acesso)
    return AcessoRapidoOut.model_validate(acesso)


def reordenar_acessos_rapidos(db: Session, ids: list[int]) -> list[AcessoRapidoOut]:
    if not ids:
        raise RegraNegocio("Informe a lista de IDs para reordenação.")
    existentes = db.query(AcessoRapido).filter(AcessoRapido.id.in_(ids)).all()
    mapa = {item.id: item for item in existentes}
    agora = datetime.now()
    for indice, id_item in enumerate(ids, start=1):
        if id_item in mapa:
            mapa[id_item].ordem = indice
            mapa[id_item].atualizado_em = agora
    db.commit()
    return listar_todos_admin(db)


def excluir_acesso_rapido(db: Session, id_acesso: int) -> None:
    acesso = _buscar_por_id(db, id_acesso)
    db.delete(acesso)
    db.commit()

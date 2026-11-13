from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NaoEncontrado
from app.models.link_aniversario import LinkAniversario
from app.models.usuario import Usuario
from app.schemas.link_aniversario import LinkAniversarioIn, LinkAniversarioOut


def listar_ativos(db: Session) -> list[LinkAniversarioOut]:
    itens = (
        db.query(LinkAniversario)
        .filter(LinkAniversario.ativo == 1)
        .order_by(LinkAniversario.id.asc())
        .all()
    )
    return [LinkAniversarioOut.model_validate(item) for item in itens]


def listar_todos(db: Session) -> list[LinkAniversarioOut]:
    itens = db.query(LinkAniversario).order_by(LinkAniversario.id.asc()).all()
    return [LinkAniversarioOut.model_validate(item) for item in itens]


def _buscar_por_id(db: Session, id_link: int) -> LinkAniversario:
    link = db.query(LinkAniversario).filter(LinkAniversario.id == id_link).first()
    if not link:
        raise NaoEncontrado("Link de aniversário não encontrado.")
    return link


def criar_link(db: Session, dados: LinkAniversarioIn, usuario: Usuario) -> LinkAniversarioOut:
    novo = LinkAniversario(
        titulo=dados.titulo,
        url=dados.url,
        ativo=1 if dados.ativo else 0,
        criado_por=usuario.id_usuario,
        criado_em=datetime.now(),
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return LinkAniversarioOut.model_validate(novo)


def atualizar_link(db: Session, id_link: int, dados: LinkAniversarioIn) -> LinkAniversarioOut:
    link = _buscar_por_id(db, id_link)
    link.titulo = dados.titulo
    link.url = dados.url
    link.ativo = 1 if dados.ativo else 0
    link.atualizado_em = datetime.now()
    db.commit()
    db.refresh(link)
    return LinkAniversarioOut.model_validate(link)


def excluir_link(db: Session, id_link: int) -> None:
    link = _buscar_por_id(db, id_link)
    db.delete(link)
    db.commit()

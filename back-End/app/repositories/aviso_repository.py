from sqlalchemy.orm import Session

from app.models.aviso import AvisoModel
from app.schemas.aviso import AvisoCreate, AvisoUpdate

CATEGORIA_EVENTO = "Evento"


def listar(db: Session, categoria: str | None) -> list[AvisoModel]:
    query = db.query(AvisoModel)
    if categoria:
        query = query.filter(AvisoModel.categoria == categoria)
    return query.order_by(AvisoModel.data_publicacao.desc()).all()


def listar_eventos(db: Session) -> list[AvisoModel]:
    return (
        db.query(AvisoModel)
        .filter(AvisoModel.categoria == CATEGORIA_EVENTO)
        .order_by(AvisoModel.data_publicacao.asc())
        .all()
    )


def obter_por_id(db: Session, id_aviso: int) -> AvisoModel | None:
    return db.get(AvisoModel, id_aviso)


def criar(db: Session, dados: AvisoCreate, id_autor: int) -> AvisoModel:
    aviso = AvisoModel(
        titulo=dados.titulo,
        conteudo=dados.conteudo,
        categoria=dados.categoria,
        prioridade=dados.prioridade,
        data_expiracao=dados.data_expiracao,
        id_autor=id_autor,
    )
    db.add(aviso)
    db.commit()
    db.refresh(aviso)
    return aviso


def atualizar(db: Session, aviso: AvisoModel, dados: AvisoUpdate) -> AvisoModel:
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(aviso, campo, valor)
    db.commit()
    db.refresh(aviso)
    return aviso


def remover(db: Session, aviso: AvisoModel) -> None:
    db.delete(aviso)
    db.commit()

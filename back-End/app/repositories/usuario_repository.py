from sqlalchemy import extract, or_
from sqlalchemy.orm import Session

from app.models.setor import SetorModel
from app.models.usuario import UsuarioModel
from app.schemas.usuario import UsuarioCreate


def obter_por_email(db: Session, email: str) -> UsuarioModel | None:
    return db.query(UsuarioModel).filter(UsuarioModel.email == email).first()


def obter_por_id(db: Session, id_usuario: int) -> UsuarioModel | None:
    return db.get(UsuarioModel, id_usuario)


def criar(db: Session, dados: UsuarioCreate, senha_hash: str) -> UsuarioModel:
    usuario = UsuarioModel(
        nome=dados.nome,
        email=dados.email,
        senha_hash=senha_hash,
        id_setor=dados.id_setor,
        cargo=dados.cargo,
        perfil=dados.perfil,
        data_nascimento=dados.data_nascimento,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def atualizar_senha(db: Session, usuario: UsuarioModel, senha_hash: str) -> UsuarioModel:
    """RN07 — ao trocar a senha, a conta deixa de exigir troca no próximo login."""
    usuario.senha_hash = senha_hash
    usuario.senha_provisoria = False
    db.commit()
    db.refresh(usuario)
    return usuario


def listar_contatos(db: Session, id_setor: int | None, busca: str | None) -> list[UsuarioModel]:
    query = db.query(UsuarioModel)
    if id_setor is not None:
        query = query.filter(UsuarioModel.id_setor == id_setor)
    if busca:
        termo = f"%{busca}%"
        query = query.filter(or_(UsuarioModel.nome.ilike(termo), UsuarioModel.cargo.ilike(termo)))
    return query.order_by(UsuarioModel.nome.asc()).all()


def listar_aniversariantes(db: Session, mes: int, dia: int | None, id_setor: int | None) -> list[UsuarioModel]:
    query = db.query(UsuarioModel).filter(extract("month", UsuarioModel.data_nascimento) == mes)
    if dia is not None:
        query = query.filter(extract("day", UsuarioModel.data_nascimento) == dia)
    if id_setor is not None:
        query = query.filter(UsuarioModel.id_setor == id_setor)
    return query.order_by(extract("day", UsuarioModel.data_nascimento).asc()).all()


def listar_setores(db: Session) -> list[SetorModel]:
    return db.query(SetorModel).order_by(SetorModel.nome.asc()).all()

"""Regras de negócio de Setores e Ramais (UC08 — S3-T2)."""

import unicodedata

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import Conflito, NaoEncontrado
from app.models.ramal import Ramal
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.setor import RamalIn, RamalOut, SetorIn, SetorOut


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _converter_setor_out(setor: Setor, total_usuarios: int = 0) -> SetorOut:
    ramais_ordenados = sorted(setor.ramais or [], key=lambda r: (r.numero, r.id_ramal or 0))
    return SetorOut(
        id_setor=setor.id_setor,
        nome=setor.nome,
        andar=setor.andar,
        ramais=[RamalOut.model_validate(r) for r in ramais_ordenados],
        total_usuarios=total_usuarios,
    )


def _mapa_contagem_usuarios(db: Session) -> dict[int, int]:
    linhas = (
        db.query(Usuario.id_setor, func.count(Usuario.id_usuario))
        .filter(Usuario.id_setor.is_not(None))
        .group_by(Usuario.id_setor)
        .all()
    )
    return {int(id_setor): int(qtd) for id_setor, qtd in linhas if id_setor is not None}


def listar_setores(
    db: Session,
    busca: str | None = None,
    andar: str | None = None,
) -> list[SetorOut]:
    query = db.query(Setor).options(joinedload(Setor.ramais))

    if andar and andar.strip():
        query = query.filter(Setor.andar.like(andar.strip()))

    setores = query.all()
    contagens = _mapa_contagem_usuarios(db)

    if busca and busca.strip():
        termo_norm = _sem_acentos(busca.strip())
        filtrados: list[Setor] = []
        for s in setores:
            nome_match = termo_norm in _sem_acentos(s.nome)
            andar_match = termo_norm in _sem_acentos(s.andar)
            ramal_match = any(
                termo_norm in _sem_acentos(r.numero) or termo_norm in _sem_acentos(r.descricao)
                for r in (s.ramais or [])
            )
            if nome_match or andar_match or ramal_match:
                filtrados.append(s)
        setores = filtrados

    setores_ordenados = sorted(setores, key=lambda s: (_sem_acentos(s.nome), s.id_setor))
    return [
        _converter_setor_out(s, total_usuarios=contagens.get(s.id_setor, 0))
        for s in setores_ordenados
    ]


def obter_setor(db: Session, id_setor: int) -> SetorOut:
    setor = (
        db.query(Setor)
        .options(joinedload(Setor.ramais))
        .filter(Setor.id_setor == id_setor)
        .first()
    )
    if setor is None:
        raise NaoEncontrado("Setor não encontrado.")

    total_usuarios = (
        db.query(func.count(Usuario.id_usuario))
        .filter(Usuario.id_setor == id_setor)
        .scalar()
        or 0
    )
    return _converter_setor_out(setor, total_usuarios=int(total_usuarios))


def _validar_nome_setor_unico(db: Session, nome: str, ignorar_id_setor: int | None = None) -> None:
    nome_limpo = nome.strip()
    query = db.query(Setor).filter(func.upper(Setor.nome) == nome_limpo.upper())
    if ignorar_id_setor is not None:
        query = query.filter(Setor.id_setor != ignorar_id_setor)
    existente = query.first()
    if existente is not None:
        msg = "Já existe um setor cadastrado com este nome."
        raise Conflito(msg, erros={"nome": msg})


def _validar_ramais_unicos(
    db: Session,
    ramais: list[RamalIn],
    ignorar_id_setor: int | None = None,
) -> None:
    vistos: set[str] = set()
    for r in ramais:
        if r.numero in vistos:
            msg = f"O número de ramal {r.numero} foi informado mais de uma vez."
            raise Conflito(msg, erros={"ramais": msg})
        vistos.add(r.numero)

    numeros = list(vistos)
    query = db.query(Ramal).options(joinedload(Ramal.setor)).filter(Ramal.numero.in_(numeros))
    if ignorar_id_setor is not None:
        query = query.filter(Ramal.id_setor != ignorar_id_setor)

    conflito_existente = query.first()
    if conflito_existente is not None:
        nome_outro = conflito_existente.setor.nome if conflito_existente.setor else "outro setor"
        msg = f"O ramal {conflito_existente.numero} já está vinculado ao setor {nome_outro}."
        raise Conflito(msg, erros={"ramais": msg})


def criar_setor(db: Session, dados: SetorIn) -> SetorOut:
    _validar_nome_setor_unico(db, dados.nome)
    _validar_ramais_unicos(db, dados.ramais)

    novo_setor = Setor(
        nome=dados.nome.strip(),
        andar=dados.andar,
    )
    db.add(novo_setor)
    db.flush()

    for r in dados.ramais:
        db.add(
            Ramal(
                numero=r.numero,
                descricao=r.descricao,
                id_setor=novo_setor.id_setor,
            )
        )

    db.commit()
    return obter_setor(db, novo_setor.id_setor)


def atualizar_setor(db: Session, id_setor: int, dados: SetorIn) -> SetorOut:
    setor = db.query(Setor).filter(Setor.id_setor == id_setor).first()
    if setor is None:
        raise NaoEncontrado("Setor não encontrado.")

    _validar_nome_setor_unico(db, dados.nome, ignorar_id_setor=id_setor)
    _validar_ramais_unicos(db, dados.ramais, ignorar_id_setor=id_setor)

    setor.nome = dados.nome.strip()
    setor.andar = dados.andar

    # Substituição atômica da lista de ramais do setor (§7.3 e S3-T2)
    db.query(Ramal).filter(Ramal.id_setor == id_setor).delete(synchronize_session=False)
    db.flush()

    for r in dados.ramais:
        db.add(
            Ramal(
                numero=r.numero,
                descricao=r.descricao,
                id_setor=id_setor,
            )
        )

    db.commit()
    db.expire_all()
    return obter_setor(db, id_setor)


def excluir_setor(db: Session, id_setor: int) -> None:
    setor = db.query(Setor).filter(Setor.id_setor == id_setor).first()
    if setor is None:
        raise NaoEncontrado("Setor não encontrado.")

    total_usuarios = (
        db.query(func.count(Usuario.id_usuario))
        .filter(Usuario.id_setor == id_setor)
        .scalar()
        or 0
    )
    if total_usuarios > 0:
        raise Conflito("Existem usuários vinculados a este setor")

    db.delete(setor)
    db.commit()

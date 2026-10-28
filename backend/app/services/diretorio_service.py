"""Regras de negócio do Diretório de Colaboradores e Guia de Ramais por Andar (UC10 — §7.9 e S4-T1)."""

import re
import unicodedata

from sqlalchemy.orm import Session, joinedload

from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.diretorio import (
    AndarRamaisGrupoOut,
    DiretorioColaboradorOut,
    PaginadoDiretorioOut,
    RamalGuiaOut,
    SetorDiretorioOut,
    SetorGuiaRamaisOut,
)


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def _ordem_andar(andar: str) -> tuple[int, str]:
    norm = _sem_acentos(andar).strip()
    if not norm or norm == "andar nao informado":
        return (999, norm)
    if "terreo" in norm or "subsolo" in norm:
        return (0 if "terreo" in norm else -1, norm)
    m = re.search(r"(\d+)", norm)
    if m:
        return (int(m.group(1)), norm)
    return (100, norm)


def _converter_colaborador_out(usuario: Usuario) -> DiretorioColaboradorOut:
    if usuario.setor is not None:
        setor_out = SetorDiretorioOut(
            id_setor=usuario.setor.id_setor,
            nome=usuario.setor.nome,
            andar=usuario.setor.andar,
        )
        ramais_ordenados = sorted(
            {r.numero for r in (usuario.setor.ramais or []) if r.numero}
        )
    else:
        setor_out = None
        ramais_ordenados = []

    return DiretorioColaboradorOut(
        id_usuario=usuario.id_usuario,
        nome=usuario.nome,
        cargo=usuario.cargo,
        email=usuario.email,
        setor=setor_out,
        ramais=ramais_ordenados,
    )


def listar_diretorio(
    db: Session,
    busca: str | None = None,
    id_setor: int | None = None,
    andar: str | None = None,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoDiretorioOut:
    """Lista colaboradores ativos com setor, andar e ramais, com filtros e paginação (UC10)."""
    query = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor).joinedload(Setor.ramais))
        .filter(Usuario.status == "ATIVO")
    )

    if id_setor is not None:
        query = query.filter(Usuario.id_setor == id_setor)

    usuarios = query.all()

    if andar and andar.strip():
        andar_norm = _sem_acentos(andar.strip())
        usuarios = [
            u
            for u in usuarios
            if u.setor is not None and _sem_acentos(u.setor.andar) == andar_norm
        ]

    if busca and busca.strip():
        termo_norm = _sem_acentos(busca.strip())
        usuarios = [
            u
            for u in usuarios
            if termo_norm in _sem_acentos(u.nome)
            or termo_norm in _sem_acentos(u.cargo)
        ]

    usuarios.sort(key=lambda u: (_sem_acentos(u.nome), u.id_usuario))

    total = len(usuarios)
    inicio = (pagina - 1) * tamanho
    fim = inicio + tamanho
    fatia = usuarios[inicio:fim]

    return PaginadoDiretorioOut(
        itens=[_converter_colaborador_out(u) for u in fatia],
        total=total,
        pagina=pagina,
        tamanho=tamanho,
    )


def listar_ramais_por_andar(
    db: Session,
    busca: str | None = None,
    andar: str | None = None,
) -> list[AndarRamaisGrupoOut]:
    """Retorna o guia telefônico estruturado agrupando os setores e seus ramais por andar (§7.9 e S4-T1)."""
    setores = db.query(Setor).options(joinedload(Setor.ramais)).all()

    if andar and andar.strip():
        andar_norm = _sem_acentos(andar.strip())
        setores = [s for s in setores if _sem_acentos(s.andar) == andar_norm]

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

    grupos: dict[str, list[Setor]] = {}
    for s in setores:
        chave_andar = (s.andar or "").strip() or "Andar não informado"
        grupos.setdefault(chave_andar, []).append(s)

    andares_ordenados = sorted(grupos.keys(), key=_ordem_andar)
    resultado: list[AndarRamaisGrupoOut] = []

    for nome_andar in andares_ordenados:
        setores_do_andar = sorted(
            grupos[nome_andar],
            key=lambda s: (_sem_acentos(s.nome), s.id_setor),
        )
        setores_out: list[SetorGuiaRamaisOut] = []
        for s in setores_do_andar:
            ramais_ord = sorted(s.ramais or [], key=lambda r: (r.numero, r.id_ramal or 0))
            setores_out.append(
                SetorGuiaRamaisOut(
                    id_setor=s.id_setor,
                    nome=s.nome,
                    ramais=[
                        RamalGuiaOut(numero=r.numero, descricao=r.descricao)
                        for r in ramais_ord
                    ],
                )
            )
        resultado.append(AndarRamaisGrupoOut(andar=nome_andar, setores=setores_out))

    return resultado

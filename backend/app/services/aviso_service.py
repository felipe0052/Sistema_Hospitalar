import uuid
from datetime import UTC, date, datetime

from sqlalchemy import case, or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ArquivoMuitoGrande, NaoEncontrado, RegraNegocio, TipoArquivoNaoAceito
from app.models.aviso import Aviso
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.aviso import (
    AutorAvisoOut,
    AvisoIn,
    AvisoOut,
    AvisoResumo,
    PaginadoAvisosOut,
    PaginadoAvisosResumoOut,
    SetorAvisoOut,
    extrair_resumo_sem_html,
)
from app.services import notificacao_service
from app.storage.storage_service import get_storage_service

PERFIS_GESTAO_AVISOS = ("ADMIN", "RH", "MARKETING")
TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024


def _eh_expirado(aviso: Aviso, referencia: date | None = None) -> bool:
    hoje = referencia or date.today()
    return aviso.data_expiracao is not None and aviso.data_expiracao < hoje


def converter_para_resumo(aviso: Aviso) -> AvisoResumo:
    autor_out = (
        AutorAvisoOut(id_usuario=aviso.autor.id_usuario, nome=aviso.autor.nome)
        if aviso.autor is not None
        else None
    )
    setor_out = (
        SetorAvisoOut(id_setor=aviso.setor.id_setor, nome=aviso.setor.nome)
        if aviso.setor is not None
        else None
    )
    return AvisoResumo(
        id_aviso=aviso.id_aviso,
        titulo=aviso.titulo,
        resumo=extrair_resumo_sem_html(aviso.conteudo, tamanho_max=200),
        categoria=aviso.categoria,  # type: ignore[arg-type]
        destaque=(aviso.destaque == "S"),
        prioridade=aviso.prioridade or "NORMAL",  # type: ignore[arg-type]
        data_publicacao=aviso.data_publicacao,
        autor=autor_out,
        setor=setor_out,
        tem_imagem=bool(aviso.imagem_caminho),
    )


def converter_para_out(aviso: Aviso) -> AvisoOut:
    resumo_obj = converter_para_resumo(aviso)
    return AvisoOut(
        **resumo_obj.model_dump(),
        conteudo=aviso.conteudo,
        data_expiracao=aviso.data_expiracao,
        data_atualizacao=aviso.data_atualizacao,
        expirado=_eh_expirado(aviso),
    )


def _aplicar_filtros_comuns(
    query,
    busca: str | None = None,
    categoria: str | None = None,
    destaque: bool | None = None,
    apenas_vigentes: bool = True,
    id_setor: int | None = None,
):
    hoje = date.today()
    if apenas_vigentes:
        query = query.filter(
            or_(
                Aviso.data_expiracao.is_(None),
                Aviso.data_expiracao >= hoje,
            )
        )

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Aviso.titulo.like(termo),
                Aviso.conteudo.like(termo),
            )
        )

    if categoria and categoria.strip():
        query = query.filter(Aviso.categoria == categoria.strip().upper())

    if destaque is not None:
        flag = "S" if destaque else "N"
        query = query.filter(Aviso.destaque == flag)

    if id_setor is not None:
        query = query.filter(Aviso.id_setor == id_setor)

    return query


def listar_avisos(
    db: Session,
    busca: str | None = None,
    categoria: str | None = None,
    destaque: bool | None = None,
    pagina: int = 1,
    tamanho: int = 20,
    id_setor: int | None = None,
) -> PaginadoAvisosResumoOut:
    query = db.query(Aviso).options(joinedload(Aviso.autor), joinedload(Aviso.setor))
    query = _aplicar_filtros_comuns(
        query,
        busca=busca,
        categoria=categoria,
        destaque=destaque,
        apenas_vigentes=True,
        id_setor=id_setor,
    )

    total = query.count()
    registros = (
        query.order_by(Aviso.data_publicacao.desc(), Aviso.id_aviso.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )

    return PaginadoAvisosResumoOut(
        itens=[converter_para_resumo(a) for a in registros],
        total=total,
        pagina=pagina,
        tamanho=tamanho,
    )


def listar_avisos_gestao(
    db: Session,
    busca: str | None = None,
    categoria: str | None = None,
    destaque: bool | None = None,
    incluir_expirados: bool = False,
    pagina: int = 1,
    tamanho: int = 20,
    id_setor: int | None = None,
) -> PaginadoAvisosOut:
    query = db.query(Aviso).options(joinedload(Aviso.autor), joinedload(Aviso.setor))
    query = _aplicar_filtros_comuns(
        query,
        busca=busca,
        categoria=categoria,
        destaque=destaque,
        apenas_vigentes=not incluir_expirados,
        id_setor=id_setor,
    )

    total = query.count()
    registros = (
        query.order_by(Aviso.data_publicacao.desc(), Aviso.id_aviso.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )

    return PaginadoAvisosOut(
        itens=[converter_para_out(a) for a in registros],
        total=total,
        pagina=pagina,
        tamanho=tamanho,
    )


def obter_aviso(db: Session, id_aviso: int, usuario_atual: Usuario | None = None) -> AvisoOut:
    aviso = (
        db.query(Aviso)
        .options(joinedload(Aviso.autor), joinedload(Aviso.setor))
        .filter(Aviso.id_aviso == id_aviso)
        .first()
    )
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")

    eh_gestor = usuario_atual is not None and usuario_atual.perfil in PERFIS_GESTAO_AVISOS
    if _eh_expirado(aviso) and not eh_gestor:
        raise NaoEncontrado("Aviso não encontrado.")

    return converter_para_out(aviso)


def _validar_data_expiracao(data_expiracao: date | None) -> None:
    if data_expiracao is not None and data_expiracao < date.today():
        msg = "A data de expiração não pode ser anterior à data atual"
        raise RegraNegocio(msg, erros={"data_expiracao": msg})


def _validar_setor(db: Session, id_setor: int | None) -> None:
    if id_setor is not None:
        setor = db.query(Setor).filter(Setor.id_setor == id_setor).first()
        if setor is None:
            raise NaoEncontrado("Setor não encontrado.", erros={"id_setor": "Setor informado não existe"})


def criar_aviso(db: Session, dados: AvisoIn, autor: Usuario) -> AvisoOut:
    _validar_data_expiracao(dados.data_expiracao)
    _validar_setor(db, dados.id_setor)

    novo = Aviso(
        titulo=dados.titulo.strip(),
        conteudo=dados.conteudo,
        categoria=dados.categoria,
        destaque="S" if dados.destaque else "N",
        prioridade=dados.prioridade,
        data_publicacao=datetime.now(UTC).replace(tzinfo=None),
        data_expiracao=dados.data_expiracao,
        id_autor=autor.id_usuario,
        id_setor=dados.id_setor,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    notificacao_service.registrar(db, "NOTICIA", novo.id_aviso, novo.titulo)
    return obter_aviso(db, novo.id_aviso, autor)


def atualizar_aviso(db: Session, id_aviso: int, dados: AvisoIn, autor: Usuario) -> AvisoOut:
    aviso = db.query(Aviso).filter(Aviso.id_aviso == id_aviso).first()
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")

    _validar_data_expiracao(dados.data_expiracao)
    _validar_setor(db, dados.id_setor)

    aviso.titulo = dados.titulo.strip()
    aviso.conteudo = dados.conteudo
    aviso.categoria = dados.categoria
    aviso.destaque = "S" if dados.destaque else "N"
    aviso.prioridade = dados.prioridade
    aviso.data_expiracao = dados.data_expiracao
    aviso.id_setor = dados.id_setor
    aviso.data_atualizacao = datetime.now(UTC).replace(tzinfo=None)

    db.commit()
    db.refresh(aviso)
    return obter_aviso(db, aviso.id_aviso, autor)


def excluir_aviso(db: Session, id_aviso: int) -> None:
    aviso = db.query(Aviso).filter(Aviso.id_aviso == id_aviso).first()
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")

    caminho_imagem = aviso.imagem_caminho
    db.delete(aviso)
    db.commit()
    notificacao_service.remover(db, "NOTICIA", id_aviso)
    if caminho_imagem:
        get_storage_service().excluir(caminho_imagem)


def _descobrir_tipo_imagem(conteudo: bytes) -> tuple[str, str] | None:
    if conteudo.startswith(b"\xff\xd8\xff"):
        return "jpg", "image/jpeg"
    if conteudo.startswith(b"\x89PNG"):
        return "png", "image/png"
    if conteudo[:4] == b"RIFF" and conteudo[8:12] == b"WEBP":
        return "webp", "image/webp"
    return None


def salvar_imagem_aviso(db: Session, id_aviso: int, conteudo: bytes, usuario: Usuario) -> AvisoOut:
    aviso = db.query(Aviso).filter(Aviso.id_aviso == id_aviso).first()
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")

    if not conteudo:
        raise RegraNegocio("Selecione uma imagem.", erros={"imagem": "Selecione uma imagem."})
    if len(conteudo) > TAMANHO_MAXIMO_IMAGEM:
        raise ArquivoMuitoGrande("A imagem deve ter no máximo 5 MB.", erros={"imagem": "A imagem deve ter no máximo 5 MB."})

    tipo = _descobrir_tipo_imagem(conteudo)
    if tipo is None:
        msg = "Formato de imagem não aceito. Envie JPG, PNG ou WEBP."
        raise TipoArquivoNaoAceito(msg, erros={"imagem": msg})

    extensao, mime = tipo
    storage = get_storage_service()
    caminho_antigo = aviso.imagem_caminho
    caminho = f"avisos/{aviso.id_aviso}_{uuid.uuid4().hex}.{extensao}"
    storage.salvar(conteudo, caminho, mime)

    aviso.imagem_caminho = caminho
    aviso.imagem_mime = mime
    aviso.data_atualizacao = datetime.now(UTC).replace(tzinfo=None)
    db.commit()

    if caminho_antigo:
        storage.excluir(caminho_antigo)

    return obter_aviso(db, aviso.id_aviso, usuario)


def abrir_imagem_aviso(db: Session, id_aviso: int) -> tuple[bytes, str]:
    aviso = db.query(Aviso).filter(Aviso.id_aviso == id_aviso).first()
    if aviso is None or not aviso.imagem_caminho:
        raise NaoEncontrado("Imagem não encontrada.")
    try:
        conteudo = get_storage_service().abrir(aviso.imagem_caminho)
    except FileNotFoundError as exc:
        raise NaoEncontrado("Imagem não encontrada.") from exc
    return conteudo, aviso.imagem_mime or "image/jpeg"


def remover_imagem_aviso(db: Session, id_aviso: int) -> None:
    aviso = db.query(Aviso).filter(Aviso.id_aviso == id_aviso).first()
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")
    if aviso.imagem_caminho:
        get_storage_service().excluir(aviso.imagem_caminho)
    aviso.imagem_caminho = None
    aviso.imagem_mime = None
    aviso.data_atualizacao = datetime.now(UTC).replace(tzinfo=None)
    db.commit()


def listar_destaques_e_ultimos_dashboard(
    db: Session,
    limite_destaques: int = 5,
    limite_ultimos: int = 5,
) -> tuple[list[AvisoResumo], list[AvisoResumo]]:
    """Retorna os avisos vigentes em destaque e os mais recentes para o Dashboard (S2-T3)."""
    base_query = _aplicar_filtros_comuns(
        db.query(Aviso).options(joinedload(Aviso.autor), joinedload(Aviso.setor)),
        apenas_vigentes=True,
    )

    destaques = (
        base_query.filter(Aviso.destaque == "S")
        .order_by(
            case((Aviso.prioridade == "URGENTE", 0), else_=1),
            Aviso.data_publicacao.desc(),
            Aviso.id_aviso.desc(),
        )
        .limit(limite_destaques)
        .all()
    )
    ultimos = (
        base_query.order_by(Aviso.data_publicacao.desc(), Aviso.id_aviso.desc())
        .limit(limite_ultimos)
        .all()
    )

    return (
        [converter_para_resumo(a) for a in destaques],
        [converter_para_resumo(a) for a in ultimos],
    )

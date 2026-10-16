"""Popula o banco com dados de demonstração.

Uso: python -m app.scripts.seed
"""

from datetime import date

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.aviso import AvisoModel
from app.models.documento import DocumentoModel
from app.models.enums import Perfil, Prioridade, StatusUsuario, TipoDocumento
from app.models.faq import FaqModel
from app.models.setor import SetorModel
from app.models.usuario import UsuarioModel


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(SetorModel).count() > 0:
            print("Banco já populado — nada a fazer.")
            return

        rh = SetorModel(nome="Recursos Humanos", ramal="1200", andar="2º Andar")
        ti = SetorModel(nome="TI · Sistemas Hospitalares", ramal="1300", andar="8º Andar")
        comunicacao = SetorModel(nome="Comunicação Institucional", ramal="1100", andar="8º Andar")
        db.add_all([rh, ti, comunicacao])
        db.flush()

        hoje = date.today()
        admin = UsuarioModel(
            nome="Mariana Ferreira",
            email="mariana.ferreira@decos.com.br",
            senha_hash=hash_password("decos123"),
            id_setor=rh.id_setor,
            cargo="Gestão de Pessoas",
            perfil=Perfil.ADMINISTRADOR,
            status=StatusUsuario.ATIVO,
            senha_provisoria=False,
            # Nascimento no dia/mês atual para que o widget "Aniversários do mês"
            # sempre tenha algo a mostrar na demonstração.
            data_nascimento=date(1990, hoje.month, hoje.day),
        )
        carlos = UsuarioModel(
            nome="Dr. Carlos Mendes",
            email="carlos.mendes@decos.com.br",
            senha_hash=hash_password("decos123"),
            id_setor=ti.id_setor,
            cargo="Cardiologista · UTI Adulto",
            perfil=Perfil.COLABORADOR,
            status=StatusUsuario.ATIVO,
            senha_provisoria=False,
            data_nascimento=date(1985, 9, 4),
        )
        laura = UsuarioModel(
            nome="Laura Nascimento",
            email="laura.nascimento@decos.com.br",
            senha_hash=hash_password("decos123"),
            id_setor=comunicacao.id_setor,
            cargo="Analista de Comunicação",
            perfil=Perfil.MARKETING,
            status=StatusUsuario.ATIVO,
            senha_provisoria=False,
            data_nascimento=date(1992, 3, 15),
        )
        admin_ti = UsuarioModel(
            nome="Admin TI",
            email="admin.ti@decos.com.br",
            senha_hash=hash_password("abcd1234"),
            id_setor=ti.id_setor,
            cargo="Administrador de TI",
            perfil=Perfil.ADMINISTRADOR,
            status=StatusUsuario.ATIVO,
            senha_provisoria=False,
        )
        db.add_all([admin, carlos, laura, admin_ti])
        db.flush()

        db.add_all(
            [
                AvisoModel(
                    titulo="Decós conquista certificação ONA Nível III em Gestão da Qualidade",
                    conteudo=(
                        "Após auditoria realizada em agosto, o grupo Decós recebe a mais alta "
                        "certificação da Organização Nacional de Acreditação."
                    ),
                    categoria="Comunicado",
                    prioridade=Prioridade.ALTA,
                    id_autor=admin.id_usuario,
                ),
                AvisoModel(
                    titulo="Treinamento BLS/ACLS — Turma C",
                    conteudo="Suporte Básico e Avançado de Vida. Obrigatório para equipes de UTI.",
                    categoria="Evento",
                    prioridade=Prioridade.MEDIA,
                    data_expiracao=date(hoje.year, 12, 31),
                    id_autor=laura.id_usuario,
                ),
            ]
        )

        db.add(
            DocumentoModel(
                titulo="POP — Higienização das Mãos",
                categoria="Protocolo",
                descricao="Procedimento operacional padrão para higienização das mãos conforme ANVISA.",
                palavras_chave="higienização, mãos, protocolo, segurança do paciente",
                tipo=TipoDocumento.PDF,
                url_arquivo="/uploads/pop-higienizacao-maos.pdf",
                versao="1.0",
            )
        )

        db.add(
            FaqModel(
                pergunta="Como solicito férias pelo portal?",
                resposta="Acesse Portal RH > Minhas Solicitações > Férias e preencha o período desejado.",
                categoria="Recursos Humanos",
            )
        )

        db.commit()
        print("Seed concluído com sucesso.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

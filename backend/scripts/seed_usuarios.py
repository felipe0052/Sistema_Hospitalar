"""Script de seed de setores base, usuários de teste, avisos e eventos (§9 do Contexto Global, S1-T3 e S2-T4)."""

from datetime import date, datetime, timedelta

from sqlalchemy import func

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import gerar_hash_senha
from app.models.aviso import Aviso
from app.models.evento import Evento
from app.models.ramal import Ramal
from app.models.setor import Setor
from app.models.usuario import Usuario

SETORES_BASE = [
    ("UTI", "2º andar", [("2101", "Posto de Enfermagem UTI"), ("2102", "Coordenação UTI"), ("2103", "Secretaria UTI")]),
    (
        "Pronto-Socorro",
        "Térreo",
        [
            ("1001", "Triagem / Classificação de Risco"),
            ("1002", "Posto de Enfermagem PS"),
            ("1003", "Sala de Emergência"),
        ],
    ),
    (
        "Centro Cirúrgico",
        "3º andar",
        [("3101", "Posto de Enfermagem CC"), ("3102", "Recuperação Pós-Anestésica (RPA)")],
    ),
    ("Pediatria", "1º andar", [("1101", "Posto de Enfermagem Pediatria"), ("1102", "Coordenação Pediatria")]),
    ("Farmácia", "Térreo", [("1201", "Dispensação Central"), ("1202", "Farmácia Clínica / Controlados")]),
    ("Recepção", "Térreo", [("1000", "Recepção Central"), ("1005", "Internação e Altas")]),
    ("Administração", "4º andar", [("4001", "Diretoria Administrativa"), ("4002", "Financeiro e Faturamento")]),
    ("RH", "4º andar", [("4101", "Atendimento ao Colaborador"), ("4102", "Departamento Pessoal e Benefícios")]),
    ("Laboratório", "1º andar", [("1301", "Coleta e Recepção de Amostras"), ("1302", "Bancada de Análises Clínicas")]),
    ("Tecnologia", "4º andar", [("4201", "Service Desk / Suporte TI"), ("4202", "Infraestrutura e Sistemas")]),
]

# 5 usuários obrigatórios do §9 do Contexto Global
USUARIOS_TESTE = [
    {
        "nome": "André Luiz (Administrador)",
        "email": "admin@decos.com.br",
        "senha": "Admin@123",
        "perfil": "ADMIN",
        "status": "ATIVO",
        "cargo": "Administrador de Sistemas",
        "setor": "Tecnologia",
        "data_nascimento": date(1988, 3, 14),
    },
    {
        "nome": "Carlos Menezes",
        "email": "colaborador@decos.com.br",
        "senha": "Colab@123",
        "perfil": "COLABORADOR",
        "status": "ATIVO",
        "cargo": "Técnico de Enfermagem",
        "setor": "UTI",
        "data_nascimento": date(1997, date.today().month, date.today().day),
    },
    {
        "nome": "Patrícia Nunes",
        "email": "rh@decos.com.br",
        "senha": "Rh@12345",
        "perfil": "RH",
        "status": "ATIVO",
        "cargo": "Analista de Recursos Humanos",
        "setor": "RH",
        "data_nascimento": date(1982, 5, 19),
    },
    {
        "nome": "Maria Silva",
        "email": "marketing@decos.com.br",
        "senha": "Mkt@12345",
        "perfil": "MARKETING",
        "status": "ATIVO",
        "cargo": "Analista de Comunicação e Marketing",
        "setor": "Administração",
        "data_nascimento": date(1999, 8, 9),
    },
    {
        "nome": "Roberto Almeida (Inativo)",
        "email": "inativo@decos.com.br",
        "senha": "Inativo@123",
        "perfil": "COLABORADOR",
        "status": "INATIVO",
        "cargo": "Auxiliar Administrativo",
        "setor": "Administração",
        "data_nascimento": date(1991, 1, 30),
    },
]

# ~25 colaboradores fictícios distribuídos pelos setores do Hospital Decós
COLABORADORES_FICTICIOS = [
    ("Ana Souza", "ana.souza@decos.com.br", "Enfermeira Assistencial", "UTI", date(1990, 5, 12)),
    ("Juliana Torres", "juliana.torres@decos.com.br", "Recepcionista Hospitalar", "Recepção", date(1991, 10, 5)),
    ("Rafael Vasconcelos", "rafael.vasconcelos@decos.com.br", "Enfermeiro Intensivista", "UTI", date(1987, 10, 18)),
    ("Fernanda Queiroz", "fernanda.queiroz@decos.com.br", "Supervisora de Atendimento", "Recepção", date(1989, 10, 25)),
    ("Thiago Barros", "thiago.barros@decos.com.br", "Analista de Suporte TI", "Tecnologia", date(1994, 4, 11)),
    ("Luciana Moreira", "luciana.moreira@decos.com.br", "Farmacêutica Hospitalar", "Farmácia", date(1992, 7, 22)),
    ("Bruno Cavalcanti", "bruno.cavalcanti@decos.com.br", "Técnico de Farmácia", "Farmácia", date(1996, 11, 3)),
    ("Camila Rocha", "camila.rocha@decos.com.br", "Enfermeira Pediátrica", "Pediatria", date(1993, 2, 14)),
    ("Diego Nascimento", "diego.nascimento@decos.com.br", "Técnico de Enfermagem", "Pediatria", date(1995, 9, 28)),
    ("Eliane Costa", "eliane.costa@decos.com.br", "Instrumentadora Cirúrgica", "Centro Cirúrgico", date(1986, 6, 7)),
    ("Fábio Monteiro", "fabio.monteiro@decos.com.br", "Enfermeiro de Centro Cirúrgico", "Centro Cirúrgico", date(1988, 12, 19)),
    ("Gabriela Peixoto", "gabriela.peixoto@decos.com.br", "Biomédica Analista", "Laboratório", date(1994, 3, 25)),
    ("Henrique Duarte", "henrique.duarte@decos.com.br", "Técnico de Laboratório", "Laboratório", date(1998, 8, 16)),
    (
        "Isabela Martins",
        "isabela.martins@decos.com.br",
        "Enfermeira de Emergência",
        "Pronto-Socorro",
        date(1991, date.today().month, date.today().day),
    ),
    ("João Pedro Lira", "joao.lira@decos.com.br", "Técnico de Enfermagem", "Pronto-Socorro", date(1997, 1, 9)),
    ("Karina Azevedo", "karina.azevedo@decos.com.br", "Assistente de Faturamento", "Administração", date(1993, 5, 30)),
    ("Leonardo Farias", "leonardo.farias@decos.com.br", "Analista Financeiro", "Administração", date(1985, 7, 4)),
    ("Mariana Ferreira", "mariana.ferreira@decos.com.br", "Coordenadora de Gestão de Pessoas", "RH", date(1984, 9, 15)),
    ("Natália Gomes", "natalia.gomes@decos.com.br", "Assistente de Departamento Pessoal", "RH", date(1996, 11, 23)),
    ("Otávio Ribeiro", "otavio.ribeiro@decos.com.br", "Técnico de Enfermagem", "UTI", date(1992, 4, 2)),
    ("Priscila Dantas", "priscila.dantas@decos.com.br", "Farmacêutica Clínica", "Farmácia", date(1990, 10, 12)),
    ("Renato Siqueira", "renato.siqueira@decos.com.br", "Analista de Infraestrutura", "Tecnologia", date(1991, 6, 18)),
    ("Sabrina Melo", "sabrina.melo@decos.com.br", "Recepcionista de Internação", "Recepção", date(1998, 2, 27)),
    ("Tatiane Borges", "tatiane.borges@decos.com.br", "Enfermeira Classificadora", "Pronto-Socorro", date(1989, 8, 8)),
    ("Vinícius Andrade", "vinicius.andrade@decos.com.br", "Coletador Laboratorial", "Laboratório", date(1995, 12, 1)),
]


def _seed_avisos_e_eventos(db, mapa_setores: dict[str, int], mapa_usuarios: dict[str, int]) -> None:
    agora = datetime.now().replace(second=0, microsecond=0)
    hoje = date.today()
    id_admin = mapa_usuarios.get("admin@decos.com.br")
    id_mkt = mapa_usuarios.get("marketing@decos.com.br") or id_admin
    id_rh = mapa_usuarios.get("rh@decos.com.br") or id_admin

    avisos_seed = [
        (
            "Hospital Decós conquista certificação ONA Nível III em Gestão da Qualidade",
            "<p>Após auditoria realizada no último ciclo avaliativo, o <strong>Hospital Decós</strong> conquistou a certificação <strong>ONA Nível III (Acreditado com Excelência)</strong>, reafirmando o compromisso de todas as equipes assistenciais e administrativas com a segurança do paciente e a melhoria contínua dos processos hospitalares.</p><p>Agradecemos a dedicação de cada colaborador em manter nossos protocolos assistenciais e operacionais em conformidade com os mais altos padrões nacionais.</p>",
            "NOTICIA",
            "S",
            agora - timedelta(days=1),
            None,
            id_mkt,
        ),
        (
            "Atualização obrigatória do protocolo de higienização das mãos e controle de infecção",
            "<p>A <strong>Comissão de Controle de Infecção Hospitalar (CCIH)</strong> informa que a revisão anual do protocolo de higienização das mãos e precauções de contato já está em vigor em todas as unidades assistenciais.</p><ul><li>Reforçar os 5 momentos para a higienização das mãos;</li><li>Conferir a disponibilidade de dispensadores de solução alcoólica nos postos;</li><li>Consultar o POP atualizado na Central de Documentos.</li></ul>",
            "COMUNICADO",
            "S",
            agora - timedelta(days=2),
            hoje + timedelta(days=60),
            id_admin,
        ),
        (
            "Parabéns aos colaboradores promovidos no ciclo de avaliação semestral",
            "<p>O setor de <strong>Recursos Humanos</strong> parabeniza os profissionais promovidos neste semestre nos setores de Enfermagem, Farmácia, Recepção e Administração.</p><p>O reconhecimento reflete a excelência técnica, a empatia no acolhimento e a dedicação diária ao cuidado hospitalar.</p>",
            "PROMOCAO",
            "S",
            agora - timedelta(days=3),
            hoje + timedelta(days=30),
            id_rh,
        ),
        (
            "Inauguração do novo Centro de Simulação Clínica para treinamentos internos",
            "<p>O novo espaço de capacitação assistencial no 2º andar conta com manequins de alta fidelidade e sala de debriefing para treinamentos de suporte básico e avançado de vida e procedimentos de enfermagem.</p>",
            "NOTICIA",
            "N",
            agora - timedelta(days=4),
            None,
            id_mkt,
        ),
        (
            "Transferência do atendimento presencial do RH para o 4º andar",
            "<p>Informamos que a sala de atendimento ao colaborador do setor de <strong>Recursos Humanos e Departamento Pessoal</strong> passa a atender exclusivamente no 4º andar (ramais 4101 e 4102), de segunda a sexta-feira, das 08h às 17h30.</p>",
            "MUDANCA_SETOR",
            "N",
            agora - timedelta(days=5),
            hoje + timedelta(days=45),
            id_rh,
        ),
        (
            "Nova coordenação de Enfermagem da Unidade de Terapia Intensiva",
            "<p>Comunicamos a promoção da enfermeira sênior <strong>Ana Beatriz Costa</strong> ao cargo de Coordenadora de Enfermagem da UTI, desejando sucesso na condução da equipe assistencial do 2º andar.</p>",
            "PROMOCAO",
            "N",
            agora - timedelta(days=6),
            None,
            id_rh,
        ),
        (
            "Reorganização física da Central de Coleta do Laboratório no 1º andar",
            "<p>A recepção interna de amostras biológicas do Laboratório foi unificada na ala norte do 1º andar (ramais 1301 e 1302) para agilizar o fluxo de exames de urgência do Pronto-Socorro e UTI.</p>",
            "MUDANCA_SETOR",
            "N",
            agora - timedelta(days=7),
            None,
            id_admin,
        ),
        (
            "Cronograma de inventário mensal da Farmácia Central",
            "<p>A Farmácia Hospitalar informa que o inventário mensal de medicamentos e correlatos ocorrerá na última sexta-feira do mês, das 20h às 23h. Requisições de rotina devem ser antecipadas até as 18h.</p>",
            "COMUNICADO",
            "N",
            agora - timedelta(days=8),
            hoje + timedelta(days=20),
            id_admin,
        ),
        (
            "Manutenção preventiva concluída nos elevadores do Bloco A",
            "<p>Informamos que a manutenção preventiva programada nos elevadores do Bloco A foi realizada no último mês sem intercorrências. Este aviso já teve sua vigência encerrada.</p>",
            "COMUNICADO",
            "N",
            agora - timedelta(days=15),
            hoje - timedelta(days=5),
            id_admin,
        ),
        (
            "Interdição temporária do corredor de serviço do Térreo (Encerrada)",
            "<p>O serviço de pintura e adequação de piso do corredor técnico do Térreo foi finalizado e o fluxo normal já foi restabelecido.</p>",
            "MUDANCA_SETOR",
            "N",
            agora - timedelta(days=20),
            hoje - timedelta(days=2),
            id_admin,
        ),
    ]

    for titulo, conteudo, categoria, destaque, dt_pub, dt_exp, id_autor in avisos_seed:
        existente = db.query(Aviso).filter(Aviso.titulo == titulo).first()
        if existente is None:
            db.add(
                Aviso(
                    titulo=titulo,
                    conteudo=conteudo,
                    categoria=categoria,
                    destaque=destaque,
                    data_publicacao=dt_pub,
                    data_expiracao=dt_exp,
                    id_autor=id_autor,
                )
            )

    base_dia = datetime.combine(hoje, datetime.min.time())
    eventos_seed = [
        (
            "Integração Institucional de Novos Colaboradores — Turma Anterior",
            "Onboarding institucional apresentando normas de biossegurança, fluxos de RH e cultura de atendimento do Hospital Decós.",
            "TREINAMENTO",
            base_dia - timedelta(days=14) + timedelta(hours=9),
            base_dia - timedelta(days=14) + timedelta(hours=12),
            "Auditório Principal — 4º andar",
            mapa_setores.get("RH"),
            id_mkt,
        ),
        (
            "Reunião de Alinhamento sobre Dispensação de Medicamentos Controlados",
            "Revisão dos fluxos de rastreabilidade de lotes e conferência dupla entre Farmácia e postos de enfermagem.",
            "INSTITUCIONAL",
            base_dia - timedelta(days=7) + timedelta(hours=14),
            base_dia - timedelta(days=7) + timedelta(hours=16),
            "Sala de Reuniões — Térreo",
            mapa_setores.get("Farmácia"),
            id_admin,
        ),
        (
            "Campanha Interna de Vacinação contra Influenza e Hepatite B",
            "Imunização anual destinada a todos os colaboradores assistenciais e administrativos. Apresentar crachá funcional e carteira de vacinação.",
            "ACAO_INTERNA",
            base_dia + timedelta(days=2, hours=8),
            base_dia + timedelta(days=2, hours=14),
            "Sala de Medicina do Trabalho — 1º andar",
            mapa_setores.get("RH"),
            id_mkt,
        ),
        (
            "Treinamento Prático de Suporte Básico de Vida (BLS) para Equipes Assistenciais",
            "Capacitação prática obrigatória para técnicos de enfermagem e enfermeiros da UTI, Pronto-Socorro e Centro Cirúrgico.",
            "TREINAMENTO",
            base_dia + timedelta(days=5, hours=9),
            base_dia + timedelta(days=5, hours=13),
            "Centro de Simulação Clínica — 2º andar",
            mapa_setores.get("UTI"),
            id_admin,
        ),
        (
            "Reunião Geral de Lideranças e Apresentação de Indicadores ONA",
            "Encontro institucional com coordenações e supervisões para análise dos indicadores mensais de segurança do paciente e metas de qualidade.",
            "INSTITUCIONAL",
            base_dia + timedelta(days=9, hours=14),
            base_dia + timedelta(days=9, hours=16),
            "Auditório Principal — 4º andar",
            mapa_setores.get("Administração"),
            id_admin,
        ),
        (
            "Ação Interna de Saúde Mental e Qualidade de Vida no Plantão",
            "Rodas de conversa, orientações ergonômicas e ações de acolhimento para colaboradores dos turnos diurno e noturno.",
            "ACAO_INTERNA",
            base_dia + timedelta(days=14, hours=10),
            base_dia + timedelta(days=14, hours=15),
            "Espaço Convivência — Térreo",
            mapa_setores.get("RH"),
            id_mkt,
        ),
        (
            "Workshop de Segurança da Informação e Boas Práticas na Intranet",
            "Orientações práticas sobre proteção de credenciais, privacidade de dados hospitalares (LGPD) e utilização dos módulos da Intranet Decós.",
            "OUTRO",
            base_dia + timedelta(days=19, hours=10),
            base_dia + timedelta(days=19, hours=12),
            "Sala de Treinamento TI — 4º andar",
            mapa_setores.get("Tecnologia"),
            id_admin,
        ),
        (
            "Capacitação em Protocolo de Sepse e Atendimento de Emergência",
            "Revisão sistematizada dos critérios de triagem, coleta precoce de exames laboratoriais e administração antimicrobiana na primeira hora.",
            "TREINAMENTO",
            base_dia + timedelta(days=24, hours=14),
            base_dia + timedelta(days=24, hours=17),
            "Auditório Principal — 4º andar",
            mapa_setores.get("Pronto-Socorro"),
            id_mkt,
        ),
        (
            "Simulado Semestral da Brigada de Incêndio e Evacuação Segura",
            "Treinamento prático com a equipe de brigadistas de todos os andares para revisão de rotas de fuga e protocolos de contingência.",
            "TREINAMENTO",
            base_dia + timedelta(days=28, hours=9),
            base_dia + timedelta(days=28, hours=12),
            "Pátio Externo e Escadas de Emergência",
            mapa_setores.get("Administração"),
            id_admin,
        ),
    ]

    for titulo, desc, cat, dt_ini, dt_fim, local, id_setor, id_autor in eventos_seed:
        existente = db.query(Evento).filter(Evento.titulo == titulo).first()
        if existente is None:
            db.add(
                Evento(
                    titulo=titulo,
                    descricao=desc,
                    categoria=cat,
                    data_inicio=dt_ini,
                    data_fim=dt_fim,
                    local=local,
                    id_setor=id_setor,
                    id_autor=id_autor,
                )
            )


def executar_seed() -> None:
    if settings.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Garante os 10 setores e seus ramais
        mapa_setores: dict[str, int] = {}
        for nome_setor, andar, ramais in SETORES_BASE:
            setor = (
                db.query(Setor)
                .filter((Setor.nome == nome_setor) | (func.upper(Setor.nome) == nome_setor.upper()))
                .first()
            )
            if setor is None:
                setor = Setor(nome=nome_setor, andar=andar)
                db.add(setor)
                db.flush()
            for numero, descricao in ramais:
                ramal_existente = db.query(Ramal).filter(Ramal.numero == numero).first()
                if ramal_existente is None:
                    db.add(Ramal(numero=numero, descricao=descricao, id_setor=setor.id_setor))
            mapa_setores[nome_setor] = setor.id_setor

        db.commit()

        # 2. Cria ou atualiza os 5 usuários de teste obrigatórios (§9)
        mapa_usuarios: dict[str, int] = {}
        for dados in USUARIOS_TESTE:
            email_norm = dados["email"].lower()
            usuario = db.query(Usuario).filter(func.lower(Usuario.email) == email_norm).first()
            id_setor = mapa_setores.get(dados["setor"])
            senha_hash = gerar_hash_senha(dados["senha"])
            if usuario is None:
                usuario = Usuario(
                    nome=dados["nome"],
                    email=email_norm,
                    senha_hash=senha_hash,
                    id_setor=id_setor,
                    cargo=dados["cargo"],
                    data_nascimento=dados["data_nascimento"],
                    perfil=dados["perfil"],
                    status=dados["status"],
                    versao_token=0,
                )
                db.add(usuario)
                db.flush()
            else:
                usuario.nome = dados["nome"]
                usuario.senha_hash = senha_hash
                usuario.id_setor = id_setor
                usuario.cargo = dados["cargo"]
                usuario.data_nascimento = dados["data_nascimento"]
                usuario.perfil = dados["perfil"]
                usuario.status = dados["status"]
            mapa_usuarios[email_norm] = usuario.id_usuario

        # 3. Cria os ~25 colaboradores fictícios (senha padrão: Colab@123)
        hash_padrao_colab = gerar_hash_senha("Colab@123")
        for nome, email, cargo, nome_setor, data_nasc in COLABORADORES_FICTICIOS:
            email_norm = email.lower()
            existente = db.query(Usuario).filter(func.lower(Usuario.email) == email_norm).first()
            if existente is None:
                db.add(
                    Usuario(
                        nome=nome,
                        email=email_norm,
                        senha_hash=hash_padrao_colab,
                        id_setor=mapa_setores.get(nome_setor),
                        cargo=cargo,
                        data_nascimento=data_nasc,
                        perfil="COLABORADOR",
                        status="ATIVO",
                        versao_token=0,
                    )
                )
            elif email_norm == "isabela.martins@decos.com.br":
                existente.data_nascimento = data_nasc

        # 4. Cria avisos e eventos realistas da Semana 2 (S2-T4)
        _seed_avisos_e_eventos(db, mapa_setores, mapa_usuarios)

        db.commit()
        total_usuarios = db.query(Usuario).count()
        total_setores = db.query(Setor).count()
        total_avisos = db.query(Aviso).count()
        total_eventos = db.query(Evento).count()
        print(
            f"Seed concluído com sucesso: {total_setores} setores, {total_usuarios} usuários, "
            f"{total_avisos} avisos e {total_eventos} eventos cadastrados."
        )
    finally:
        db.close()


if __name__ == "__main__":
    executar_seed()

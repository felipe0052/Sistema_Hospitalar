"""Script de seed de setores base e usuários de teste (§9 do Contexto Global e S1-T3)."""

from datetime import date

from sqlalchemy import func

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.security import gerar_hash_senha
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
        "data_nascimento": date(1997, 10, 21),
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
    ("Isabela Martins", "isabela.martins@decos.com.br", "Enfermeira de Emergência", "Pronto-Socorro", date(1991, 10, 21)),
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


def executar_seed() -> None:
    if settings.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Garante os 10 setores e seus ramais
        mapa_setores: dict[str, int] = {}
        for nome_setor, andar, ramais in SETORES_BASE:
            setor = db.query(Setor).filter(func.upper(Setor.nome) == nome_setor.upper()).first()
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
            else:
                usuario.nome = dados["nome"]
                usuario.senha_hash = senha_hash
                usuario.id_setor = id_setor
                usuario.cargo = dados["cargo"]
                usuario.data_nascimento = dados["data_nascimento"]
                usuario.perfil = dados["perfil"]
                usuario.status = dados["status"]

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

        db.commit()
        total_usuarios = db.query(Usuario).count()
        total_setores = db.query(Setor).count()
        print(f"Seed concluído com sucesso: {total_setores} setores e {total_usuarios} usuários cadastrados.")
    finally:
        db.close()


if __name__ == "__main__":
    executar_seed()

"""Testes automatizados da API de Aniversariantes do Mês (UC11 — §7.6 e S4-T1)."""

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import gerar_hash_senha
from app.models.setor import Setor
from app.models.usuario import Usuario


def _obter_headers(
    client: TestClient,
    email: str = "colaborador@decos.com.br",
    senha: str = "Colab@123",
) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_aniversariantes_privacidade_sem_ano_ou_idade_e_inativos_ocultos(
    client: TestClient,
    db_session: Session,
):
    headers = _obter_headers(client)

    # No conftest, Roberto Inativo faz aniversário em 30/01 (status INATIVO)
    # Adicionamos um colaborador ATIVO em janeiro para comparar
    ativo_jan = Usuario(
        nome="Lucas Ativo Janeiro",
        email="lucas.jan@decos.com.br",
        senha_hash=gerar_hash_senha("Colab@123"),
        id_setor=None,
        cargo="Auxiliar de Farmácia",
        data_nascimento=date(1992, 1, 15),
        perfil="COLABORADOR",
        status="ATIVO",
        versao_token=0,
    )
    sem_data = Usuario(
        nome="Colaborador Sem Data",
        email="sem.data@decos.com.br",
        senha_hash=gerar_hash_senha("Colab@123"),
        id_setor=None,
        cargo="Assistente",
        data_nascimento=None,
        perfil="COLABORADOR",
        status="ATIVO",
        versao_token=0,
    )
    db_session.add_all([ativo_jan, sem_data])
    db_session.commit()

    res = client.get("/api/v1/aniversariantes?mes=1", headers=headers)
    assert res.status_code == 200
    lista = res.json()

    nomes = [item["nome"] for item in lista]
    assert "Lucas Ativo Janeiro" in nomes
    assert "Roberto Inativo" not in nomes
    assert "Colaborador Sem Data" not in nomes

    # Privacidade obrigatória (UC11): nunca expor ano de nascimento, data_nascimento ou idade
    for item in lista:
        assert "ano" not in item
        assert "idade" not in item
        assert "data_nascimento" not in item
        assert set(item.keys()) == {
            "id_usuario",
            "nome",
            "cargo",
            "setor",
            "dia",
            "mes",
            "aniversario_hoje",
        }

    # Colaborador sem setor retorna setor nulo
    lucas = next(i for i in lista if i["nome"] == "Lucas Ativo Janeiro")
    assert lucas["setor"] is None
    assert lucas["dia"] == 15
    assert lucas["mes"] == 1


def test_aniversariantes_ordenacao_e_filtros_por_dia_setor_e_busca_sem_acento(
    client: TestClient,
    db_session: Session,
):
    headers = _obter_headers(client)

    setor_uti = db_session.query(Setor).filter(Setor.nome == "UTI").first()
    setor_rh = db_session.query(Setor).filter(Setor.nome == "RH").first()
    assert setor_uti is not None and setor_rh is not None

    hoje = date.today()
    db_session.add_all(
        [
            Usuario(
                nome="Zélia Assunção",
                email="zelia@decos.com.br",
                senha_hash=gerar_hash_senha("Colab@123"),
                id_setor=setor_uti.id_setor,
                cargo="Enfermeira",
                data_nascimento=date(1988, 11, 5),
                perfil="COLABORADOR",
                status="ATIVO",
                versao_token=0,
            ),
            Usuario(
                nome="Amanda Borges",
                email="amanda@decos.com.br",
                senha_hash=gerar_hash_senha("Colab@123"),
                id_setor=setor_rh.id_setor,
                cargo="Analista",
                data_nascimento=date(1995, 11, 5),
                perfil="COLABORADOR",
                status="ATIVO",
                versao_token=0,
            ),
            Usuario(
                nome="Breno Cardoso",
                email="breno@decos.com.br",
                senha_hash=gerar_hash_senha("Colab@123"),
                id_setor=setor_uti.id_setor,
                cargo="Fisioterapeuta",
                data_nascimento=date(1991, 11, 20),
                perfil="COLABORADOR",
                status="ATIVO",
                versao_token=0,
            ),
            Usuario(
                nome="Aniversariante do Dia",
                email="hoje@decos.com.br",
                senha_hash=gerar_hash_senha("Colab@123"),
                id_setor=setor_uti.id_setor,
                cargo="Técnico",
                data_nascimento=date(1994, hoje.month, hoje.day),
                perfil="COLABORADOR",
                status="ATIVO",
                versao_token=0,
            ),
        ]
    )
    db_session.commit()

    # Ordenação em novembro: dia 5 (Amanda, depois Zélia), depois dia 20 (Breno)
    res_nov = client.get("/api/v1/aniversariantes?mes=11", headers=headers)
    assert res_nov.status_code == 200
    nov = res_nov.json()
    assert [i["nome"] for i in nov] == ["Amanda Borges", "Zélia Assunção", "Breno Cardoso"]

    # Filtro por dia específico
    res_dia = client.get("/api/v1/aniversariantes?mes=11&dia=5", headers=headers)
    assert res_dia.status_code == 200
    assert len(res_dia.json()) == 2

    # Filtro por setor
    res_setor = client.get(f"/api/v1/aniversariantes?mes=11&id_setor={setor_uti.id_setor}", headers=headers)
    assert res_setor.status_code == 200
    assert [i["nome"] for i in res_setor.json()] == ["Zélia Assunção", "Breno Cardoso"]

    # Busca por nome sem acento
    res_busca = client.get("/api/v1/aniversariantes?mes=11&busca=zelia assuncao", headers=headers)
    assert res_busca.status_code == 200
    assert len(res_busca.json()) == 1
    assert res_busca.json()[0]["nome"] == "Zélia Assunção"

    # Default sem parâmetro `mes` usa o mês corrente e marca aniversario_hoje=True
    res_atual = client.get("/api/v1/aniversariantes", headers=headers)
    assert res_atual.status_code == 200
    hoje_item = next((i for i in res_atual.json() if i["nome"] == "Aniversariante do Dia"), None)
    assert hoje_item is not None
    assert hoje_item["aniversario_hoje"] is True

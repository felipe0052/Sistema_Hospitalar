"""Testes automatizados da API de Diretório e Guia de Ramais (UC10 — §7.9 e S4-T1)."""

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import gerar_hash_senha
from app.models.ramal import Ramal
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


def test_diretorio_lista_apenas_ativos_ordenados_por_nome_e_com_ramais(
    client: TestClient,
    db_session: Session,
):
    headers = _obter_headers(client)

    res = client.get("/api/v1/diretorio", headers=headers)
    assert res.status_code == 200
    dados = res.json()

    assert "itens" in dados
    assert "total" in dados
    assert dados["pagina"] == 1
    assert dados["tamanho"] == 20

    emails = [u["email"] for u in dados["itens"]]
    nomes = [u["nome"] for u in dados["itens"]]

    # Regra estrita UC10: usuário INATIVO nunca aparece no diretório
    assert "inativo@decos.com.br" not in emails
    assert "colaborador@decos.com.br" in emails

    # Ordenação alfabética por nome
    assert nomes == sorted(nomes, key=lambda n: n.lower())

    # Colaborador da UTI possui ramal 2101 na lista de strings
    carlos = next(u for u in dados["itens"] if u["email"] == "colaborador@decos.com.br")
    assert carlos["setor"] == {"id_setor": carlos["setor"]["id_setor"], "nome": "UTI", "andar": "2º andar"}
    assert carlos["ramais"] == ["2101"]


def test_diretorio_colaborador_sem_setor_retorna_setor_nulo_e_ramais_vazios(
    client: TestClient,
    db_session: Session,
):
    headers = _obter_headers(client)

    sem_setor = Usuario(
        nome="Beatriz Sem Setor",
        email="beatriz.avulsa@decos.com.br",
        senha_hash=gerar_hash_senha("Colab@123"),
        id_setor=None,
        cargo="Enfermeira Volante",
        data_nascimento=date(1993, 6, 15),
        perfil="COLABORADOR",
        status="ATIVO",
        versao_token=0,
    )
    db_session.add(sem_setor)
    db_session.commit()

    res = client.get("/api/v1/diretorio?busca=Beatriz", headers=headers)
    assert res.status_code == 200
    itens = res.json()["itens"]
    assert len(itens) == 1
    assert itens[0]["nome"] == "Beatriz Sem Setor"
    assert itens[0]["setor"] is None
    assert itens[0]["ramais"] == []


def test_diretorio_busca_sem_acento_por_nome_e_cargo_e_filtros_setor_andar(
    client: TestClient,
    db_session: Session,
):
    headers = _obter_headers(client)

    setor_farmacia = Setor(nome="Farmácia", andar="Térreo")
    db_session.add(setor_farmacia)
    db_session.flush()
    db_session.add_all(
        [
            Ramal(numero="1201", descricao="Dispensação Central", id_setor=setor_farmacia.id_setor),
            Ramal(numero="1202", descricao="Controlados", id_setor=setor_farmacia.id_setor),
        ]
    )
    db_session.add(
        Usuario(
            nome="João Conceição",
            email="joao.conceicao@decos.com.br",
            senha_hash=gerar_hash_senha("Colab@123"),
            id_setor=setor_farmacia.id_setor,
            cargo="Farmacêutico Clínico",
            data_nascimento=date(1990, 4, 10),
            perfil="COLABORADOR",
            status="ATIVO",
            versao_token=0,
        )
    )
    db_session.commit()

    # Busca por nome sem acento
    res_nome = client.get("/api/v1/diretorio?busca=joao conceicao", headers=headers)
    assert res_nome.status_code == 200
    assert res_nome.json()["total"] == 1
    assert res_nome.json()["itens"][0]["ramais"] == ["1201", "1202"]

    # Busca por cargo sem acento ("farmaceutico" encontra "Farmacêutico Clínico",
    # "tecnico" encontra "Técnico de Enfermagem")
    res_cargo = client.get("/api/v1/diretorio?busca=farmaceutico clinico", headers=headers)
    assert res_cargo.status_code == 200
    assert res_cargo.json()["total"] == 1
    assert res_cargo.json()["itens"][0]["email"] == "joao.conceicao@decos.com.br"

    # Filtro por id_setor
    res_setor = client.get(f"/api/v1/diretorio?id_setor={setor_farmacia.id_setor}", headers=headers)
    assert res_setor.status_code == 200
    assert res_setor.json()["total"] == 1

    # Filtro por andar sem acento ("terreo" encontra "Térreo")
    res_andar = client.get("/api/v1/diretorio?andar=Terreo", headers=headers)
    assert res_andar.status_code == 200
    assert res_andar.json()["total"] == 1
    assert res_andar.json()["itens"][0]["setor"]["andar"] == "Térreo"


def test_guia_ramais_agrupado_por_andar_e_filtros(
    client: TestClient,
    db_session: Session,
):
    headers = _obter_headers(client)

    setor_recepcao = Setor(nome="Recepção", andar="Térreo")
    db_session.add(setor_recepcao)
    db_session.flush()
    db_session.add(Ramal(numero="1001", descricao="Balcão Principal", id_setor=setor_recepcao.id_setor))
    db_session.commit()

    res = client.get("/api/v1/diretorio/ramais", headers=headers)
    assert res.status_code == 200
    grupos = res.json()
    assert len(grupos) >= 2

    # Térreo vem antes de 2º andar e 4º andar
    andares = [g["andar"] for g in grupos]
    assert andares[0] == "Térreo"
    assert "2º andar" in andares
    assert "4º andar" in andares

    grupo_terreo = grupos[0]
    assert grupo_terreo["setores"][0]["nome"] == "Recepção"
    assert grupo_terreo["setores"][0]["ramais"] == [{"numero": "1001", "descricao": "Balcão Principal"}]

    # Filtro por número de ramal
    res_busca_ramal = client.get("/api/v1/diretorio/ramais?busca=2101", headers=headers)
    assert res_busca_ramal.status_code == 200
    grupos_ramal = res_busca_ramal.json()
    assert len(grupos_ramal) == 1
    assert grupos_ramal[0]["andar"] == "2º andar"
    assert grupos_ramal[0]["setores"][0]["nome"] == "UTI"

    # Filtro por nome de setor sem acento
    res_busca_setor = client.get("/api/v1/diretorio/ramais?busca=recepcao", headers=headers)
    assert res_busca_setor.status_code == 200
    assert len(res_busca_setor.json()) == 1
    assert res_busca_setor.json()[0]["setores"][0]["nome"] == "Recepção"

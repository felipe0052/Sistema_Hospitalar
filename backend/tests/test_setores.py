"""Testes automatizados da API de Setores e Ramais (UC08 — S3-T2)."""

from fastapi.testclient import TestClient


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_listar_criar_e_editar_setor_com_multiplos_ramais(client: TestClient):
    """Testa listagem com contagem de usuários, cadastro de setor com múltiplos ramais e substituição atômica no PUT."""
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")
    headers_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    # 1. Listagem inicial ordenada alfabeticamente (RH, Tecnologia, UTI do conftest)
    res_lista = client.get("/api/v1/setores", headers=headers_colab)
    assert res_lista.status_code == 200
    setores_iniciais = res_lista.json()
    assert [s["nome"] for s in setores_iniciais] == ["RH", "Tecnologia", "UTI"]
    uti = next(s for s in setores_iniciais if s["nome"] == "UTI")
    assert uti["total_usuarios"] == 2  # Carlos Menezes (ATIVO) + Roberto Inativo (INATIVO)

    # 2. Criar novo setor com 2 ramais
    res_criar = client.post(
        "/api/v1/setores",
        headers=headers_admin,
        json={
            "nome": "Farmácia Central",
            "andar": "Térreo",
            "ramais": [
                {"numero": "1201", "descricao": "Dispensação"},
                {"numero": "1202", "descricao": "Controlados"},
            ],
        },
    )
    assert res_criar.status_code == 201
    criado = res_criar.json()
    assert criado["nome"] == "Farmácia Central"
    assert criado["andar"] == "Térreo"
    assert criado["total_usuarios"] == 0
    assert len(criado["ramais"]) == 2
    assert [r["numero"] for r in criado["ramais"]] == ["1201", "1202"]
    id_setor = criado["id_setor"]

    # 3. Atualizar setor substituindo a lista de ramais
    res_put = client.put(
        f"/api/v1/setores/{id_setor}",
        headers=headers_admin,
        json={
            "nome": "Farmácia Hospitalar",
            "andar": "1º andar",
            "ramais": [
                {"numero": "1205", "descricao": "Atendimento Clínico"},
            ],
        },
    )
    assert res_put.status_code == 200
    atualizado = res_put.json()
    assert atualizado["nome"] == "Farmácia Hospitalar"
    assert atualizado["andar"] == "1º andar"
    assert len(atualizado["ramais"]) == 1
    assert atualizado["ramais"][0]["numero"] == "1205"


def test_setor_nome_duplicado_e_ramal_conflitante_retornam_409_e_ramal_com_letras_422(
    client: TestClient,
):
    """Garante bloqueio de nome de setor duplicado (409), ramal com letras (422) e ramal já vinculado a outro setor (409)."""
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    # 1. Nome de setor duplicado (UTI já existe no conftest) -> 409
    res_dup_nome = client.post(
        "/api/v1/setores",
        headers=headers_admin,
        json={
            "nome": "uti",
            "andar": "2º andar",
            "ramais": [{"numero": "2999", "descricao": "Ramal extra"}],
        },
    )
    assert res_dup_nome.status_code == 409
    assert "nome" in res_dup_nome.json()["erros"]

    # 2. Ramal contendo letras ou caracteres não numéricos -> 422
    res_ramal_letras = client.post(
        "/api/v1/setores",
        headers=headers_admin,
        json={
            "nome": "Pediatria",
            "andar": "1º andar",
            "ramais": [{"numero": "11A1", "descricao": "Posto"}],
        },
    )
    assert res_ramal_letras.status_code == 422

    # 3. Ramal já existente em outro setor (2101 pertence à UTI no conftest) -> 409
    res_ramal_outro_setor = client.post(
        "/api/v1/setores",
        headers=headers_admin,
        json={
            "nome": "Pediatria",
            "andar": "1º andar",
            "ramais": [{"numero": "2101", "descricao": "Posto Pediatria"}],
        },
    )
    assert res_ramal_outro_setor.status_code == 409
    assert "ramais" in res_ramal_outro_setor.json()["erros"]

    # 4. Ramais duplicados na própria requisição -> 409
    res_ramal_repetido_req = client.post(
        "/api/v1/setores",
        headers=headers_admin,
        json={
            "nome": "Pediatria",
            "andar": "1º andar",
            "ramais": [
                {"numero": "1101", "descricao": "Posto 1"},
                {"numero": "1101", "descricao": "Posto 2"},
            ],
        },
    )
    assert res_ramal_repetido_req.status_code == 409


def test_exclusao_setor_com_colaboradores_bloqueada_409_e_sem_colaboradores_204(
    client: TestClient,
):
    """Impede exclusão de setor com usuários vinculados retornando 409 'Existem usuários vinculados a este setor'."""
    headers_admin = _obter_headers(client, "admin@decos.com.br", "Admin@123")

    # 1. Tenta excluir setor UTI (id_setor=1, possui usuários vinculados) -> 409
    res_conflito = client.delete("/api/v1/setores/1", headers=headers_admin)
    assert res_conflito.status_code == 409
    assert res_conflito.json()["detail"] == "Existem usuários vinculados a este setor"

    # 2. Cria setor sem colaboradores e o exclui com sucesso -> 204
    novo = client.post(
        "/api/v1/setores",
        headers=headers_admin,
        json={
            "nome": "Ouvidoria",
            "andar": "Térreo",
            "ramais": [{"numero": "1500", "descricao": "Atendimento Ouvidoria"}],
        },
    ).json()

    res_del = client.delete(f"/api/v1/setores/{novo['id_setor']}", headers=headers_admin)
    assert res_del.status_code == 204

    res_404 = client.get(f"/api/v1/setores/{novo['id_setor']}", headers=headers_admin)
    assert res_404.status_code == 404

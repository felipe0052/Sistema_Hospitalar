"""Testes de Reconhecimentos, indicações de colegas e avisos urgentes (S5-T3)."""

from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.notificacao import Notificacao
from app.models.setor import Setor
from app.models.usuario import Usuario


def _headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _rh(client):
    return _headers(client, "rh@decos.com.br", "Rh@12345")


def _admin(client):
    return _headers(client, "admin@decos.com.br", "Admin@123")


def _colab(client):
    return _headers(client, "colaborador@decos.com.br", "Colab@123")


def _marketing(client):
    return _headers(client, "marketing@decos.com.br", "Mkt@12345")


def _id(db: Session, email: str) -> int:
    return db.query(Usuario).filter(Usuario.email == email).one().id_usuario


def _id_setor(db: Session, nome: str) -> int:
    return db.query(Setor).filter(Setor.nome == nome).one().id_setor


def _corpo(id_colaborador: int, **extra) -> dict:
    return {
        "id_colaborador": id_colaborador,
        "tipo": "DESTAQUE",
        "titulo": "Profissional destaque do mês",
        "mensagem": "Parabéns pela dedicação e pelo cuidado com os pacientes.",
        **extra,
    }


def _corpo_setor(id_setor: int, **extra) -> dict:
    return {
        "id_setor": id_setor,
        "tipo": "DESTAQUE",
        "titulo": "Setor destaque do mês",
        "mensagem": "Parabéns a toda a equipe pela excelência no atendimento.",
        **extra,
    }


def test_apenas_rh_e_admin_publicam_reconhecimento(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    assert client.post("/api/v1/reconhecimentos", headers=_marketing(client), json=_corpo(alvo)).status_code == 403
    assert client.post("/api/v1/reconhecimentos", headers=_colab(client), json=_corpo(alvo)).status_code == 403
    assert client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(alvo)).status_code == 201
    assert client.post("/api/v1/reconhecimentos", headers=_admin(client), json=_corpo(alvo)).status_code == 201


def test_colaborador_inativo_ou_inexistente_retorna_400(client: TestClient, db_session: Session):
    inativo = _id(db_session, "inativo@decos.com.br")
    res = client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(inativo))
    assert res.status_code == 400
    assert "id_colaborador" in res.json()["erros"]
    assert client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(99999)).status_code == 400


def test_reconhecimento_gera_exatamente_uma_notificacao_e_e_visivel_a_todos(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    criado = client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(alvo)).json()
    assert db_session.query(Notificacao).filter(Notificacao.tipo == "RECONHECIMENTO").count() == 1

    lista_colab = client.get("/api/v1/reconhecimentos", headers=_colab(client)).json()
    assert lista_colab["total"] == 1
    item = lista_colab["itens"][0]
    assert item["colaborador"]["nome"] == "Carlos Menezes"
    assert item["colaborador"]["setor"]["nome"] == "UTI"
    assert item["autor"]["nome"] == "Patrícia Nunes"

    lista_mkt = client.get("/api/v1/reconhecimentos", headers=_marketing(client)).json()
    assert lista_mkt["total"] == 0

    detalhe = client.get(f"/api/v1/reconhecimentos/{criado['id_reconhecimento']}", headers=_colab(client))
    assert detalhe.status_code == 200
    assert client.get(f"/api/v1/reconhecimentos/{criado['id_reconhecimento']}", headers=_marketing(client)).status_code == 404
    assert client.get("/api/v1/reconhecimentos/999", headers=_colab(client)).status_code == 404


def test_filtros_por_tipo_e_setor(client: TestClient, db_session: Session):
    colab, admin = _id(db_session, "colaborador@decos.com.br"), _id(db_session, "admin@decos.com.br")
    rh = _rh(client)
    client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(colab, tipo="PROMOCAO"))
    client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(admin, tipo="AGRADECIMENTO"))

    por_tipo = client.get("/api/v1/reconhecimentos?tipo=PROMOCAO", headers=rh).json()
    assert por_tipo["total"] == 1 and por_tipo["itens"][0]["tipo"] == "PROMOCAO"

    id_setor_uti = db_session.query(Usuario).filter(Usuario.id_usuario == colab).one().id_setor
    por_setor = client.get(f"/api/v1/reconhecimentos?id_setor={id_setor_uti}", headers=rh).json()
    assert por_setor["total"] == 1


def test_editar_nao_notifica_e_excluir_remove_notificacao(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    rh = _rh(client)
    id_rec = client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(alvo)).json()["id_reconhecimento"]

    res = client.put(
        f"/api/v1/reconhecimentos/{id_rec}",
        headers=rh,
        json={"tipo": "AGRADECIMENTO", "titulo": "Título novo", "mensagem": "Mensagem nova"},
    )
    assert res.status_code == 200 and res.json()["titulo"] == "Título novo"
    assert db_session.query(Notificacao).count() == 1

    assert client.put(f"/api/v1/reconhecimentos/{id_rec}", headers=_colab(client), json=res.json()).status_code == 403
    assert client.delete(f"/api/v1/reconhecimentos/{id_rec}", headers=_colab(client)).status_code == 403
    assert client.delete(f"/api/v1/reconhecimentos/{id_rec}", headers=rh).status_code == 204
    assert db_session.query(Notificacao).count() == 0


def test_colaborador_indica_colega_sem_gerar_notificacao(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    colab = _colab(client)
    res = client.post(
        "/api/v1/indicacoes", headers=colab, json={"id_indicado": colega, "motivo": "Sempre ajuda a equipe"}
    )
    assert res.status_code == 201
    assert res.json()["status"] == "PENDENTE"
    assert db_session.query(Notificacao).count() == 0

    minhas = client.get("/api/v1/indicacoes/minhas", headers=colab).json()
    assert len(minhas) == 1 and minhas[0]["indicado"]["nome"] == "Maria Silva"
    recebidas_mkt = client.get("/api/v1/indicacoes/minhas", headers=_marketing(client)).json()
    assert len(recebidas_mkt) == 1
    assert recebidas_mkt[0]["indicado"]["nome"] == "Maria Silva"
    assert recebidas_mkt[0]["indicante"] is None


def test_autoindicacao_e_indicado_inativo_retornam_400(client: TestClient, db_session: Session):
    colab = _colab(client)
    proprio = _id(db_session, "colaborador@decos.com.br")
    para_si = client.post("/api/v1/indicacoes", headers=colab, json={"id_indicado": proprio, "motivo": "Eu mesmo"})
    assert para_si.status_code == 400
    inativo = _id(db_session, "inativo@decos.com.br")
    para_inativo = client.post("/api/v1/indicacoes", headers=colab, json={"id_indicado": inativo, "motivo": "Inativo"})
    assert para_inativo.status_code == 400


def test_colaborador_nao_lista_indicacoes_de_gestao(client: TestClient):
    assert client.get("/api/v1/indicacoes", headers=_colab(client)).status_code == 403
    assert client.get("/api/v1/indicacoes", headers=_marketing(client)).status_code == 403
    assert client.get("/api/v1/indicacoes", headers=_rh(client)).status_code == 200


def test_reconhecimento_com_id_indicacao_aprova_a_indicacao(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    indicacao = client.post(
        "/api/v1/indicacoes", headers=_colab(client), json={"id_indicado": colega, "motivo": "Campanha incrível"}
    ).json()

    rh = _rh(client)
    pendentes = client.get("/api/v1/indicacoes?status=PENDENTE", headers=rh).json()
    assert pendentes["total"] == 1

    rec = client.post(
        "/api/v1/reconhecimentos", headers=rh, json=_corpo(colega, id_indicacao=indicacao["id_indicacao"])
    )
    assert rec.status_code == 201

    minha = client.get("/api/v1/indicacoes/minhas", headers=_colab(client)).json()[0]
    assert minha["status"] == "APROVADA"
    assert minha["id_reconhecimento"] == rec.json()["id_reconhecimento"]
    assert client.get("/api/v1/indicacoes?status=PENDENTE", headers=rh).json()["total"] == 0

    # Indicação já avaliada não pode ser usada de novo
    reuso = _corpo(colega, id_indicacao=indicacao["id_indicacao"])
    outra = client.post("/api/v1/reconhecimentos", headers=rh, json=reuso)
    assert outra.status_code == 409


def test_indicacao_de_outro_colaborador_retorna_400(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    indicacao = client.post(
        "/api/v1/indicacoes", headers=_colab(client), json={"id_indicado": colega, "motivo": "Ótimo trabalho"}
    ).json()
    admin_id = _id(db_session, "admin@decos.com.br")
    res = client.post(
        "/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(admin_id, id_indicacao=indicacao["id_indicacao"])
    )
    assert res.status_code == 400


def test_recusar_indicacao_marca_recusada_e_visivel_ao_indicante(client: TestClient, db_session: Session):
    colega = _id(db_session, "marketing@decos.com.br")
    indicacao = client.post(
        "/api/v1/indicacoes", headers=_colab(client), json={"id_indicado": colega, "motivo": "Boa colega"}
    ).json()

    url = f"/api/v1/indicacoes/{indicacao['id_indicacao']}/recusar"
    assert client.post(url, headers=_colab(client)).status_code == 403
    res = client.post(url, headers=_rh(client))
    assert res.status_code == 200 and res.json()["status"] == "RECUSADA"
    assert res.json()["data_avaliacao"] is not None

    assert client.get("/api/v1/indicacoes/minhas", headers=_colab(client)).json()[0]["status"] == "RECUSADA"
    assert client.post(url, headers=_rh(client)).status_code == 409
    assert client.post("/api/v1/indicacoes/9999/recusar", headers=_rh(client)).status_code == 404


def test_aviso_urgente_aparece_primeiro_no_dashboard(client: TestClient):
    marketing = _marketing(client)
    base = {"conteudo": "<p>Texto</p>", "categoria": "COMUNICADO", "destaque": True}
    normal = client.post("/api/v1/avisos", headers=marketing, json={**base, "titulo": "Aviso normal"})
    urgente = client.post(
        "/api/v1/avisos", headers=marketing, json={**base, "titulo": "Aviso urgente", "prioridade": "URGENTE"}
    )
    assert normal.status_code == 201 and normal.json()["prioridade"] == "NORMAL"
    assert urgente.status_code == 201 and urgente.json()["prioridade"] == "URGENTE"

    # O urgente foi publicado antes do normal na ordem cronológica inversa? Garante que ele lidera de qualquer forma.
    destaques = client.get("/api/v1/dashboard").json()["avisos_destaque"]
    assert destaques[0]["titulo"] == "Aviso urgente"
    assert destaques[0]["prioridade"] == "URGENTE"

    invalido = client.post("/api/v1/avisos", headers=marketing, json={**base, "titulo": "Outro", "prioridade": "X"})
    assert invalido.status_code == 422


def test_data_criacao_do_reconhecimento_e_preenchida(client: TestClient, db_session: Session):
    alvo = _id(db_session, "colaborador@decos.com.br")
    criado = client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo(alvo)).json()
    assert datetime.fromisoformat(criado["data_criacao"]).year >= 2026


# ===========================================================================
# Testes de Reconhecimento por Setor e Indicação por Setor
# ===========================================================================


def test_reconhecimento_por_setor_criacao_e_notificacao(client: TestClient, db_session: Session):
    id_setor = _id_setor(db_session, "UTI")
    rh = _rh(client)

    # Não autorizados recebem 403
    assert client.post("/api/v1/reconhecimentos", headers=_marketing(client), json=_corpo_setor(id_setor)).status_code == 403
    assert client.post("/api/v1/reconhecimentos", headers=_colab(client), json=_corpo_setor(id_setor)).status_code == 403

    # RH cria reconhecimento para o setor inteiro
    res = client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo_setor(id_setor))
    assert res.status_code == 201
    dados = res.json()
    assert dados["alvo_tipo"] == "SETOR"
    assert dados["setor"]["nome"] == "UTI"
    assert dados["colaborador"] is None
    assert dados["titulo"] == "Setor destaque do mês"

    # Gera exatamente 1 notificação interna
    assert db_session.query(Notificacao).filter(Notificacao.tipo == "RECONHECIMENTO").count() == 1

    # Visível no mural para todos os colaboradores
    detalhe = client.get(f"/api/v1/reconhecimentos/{dados['id_reconhecimento']}", headers=_colab(client))
    assert detalhe.status_code == 200
    assert detalhe.json()["alvo_tipo"] == "SETOR"
    assert detalhe.json()["setor"]["nome"] == "UTI"


def test_reconhecimento_por_setor_inexistente_retorna_400(client: TestClient):
    res = client.post("/api/v1/reconhecimentos", headers=_rh(client), json=_corpo_setor(99999))
    assert res.status_code == 400
    assert "id_setor" in res.json()["erros"]


def test_reconhecimento_sem_alvo_ou_com_ambos_retorna_422(client: TestClient, db_session: Session):
    colab = _id(db_session, "colaborador@decos.com.br")
    setor = _id_setor(db_session, "UTI")
    rh = _rh(client)

    # Sem alvo
    assert client.post("/api/v1/reconhecimentos", headers=rh, json={"tipo": "DESTAQUE", "titulo": "Sem alvo", "mensagem": "Texto"}).status_code == 422

    # Com ambos
    assert client.post("/api/v1/reconhecimentos", headers=rh, json={"id_colaborador": colab, "id_setor": setor, "tipo": "DESTAQUE", "titulo": "Ambos", "mensagem": "Texto"}).status_code == 422


def test_filtrar_reconhecimentos_por_alvo_tipo_e_setor(client: TestClient, db_session: Session):
    colab = _id(db_session, "colaborador@decos.com.br")  # pertence ao setor UTI
    setor_uti = _id_setor(db_session, "UTI")
    setor_ti = _id_setor(db_session, "Tecnologia")
    rh = _rh(client)

    # Cria 1 individual (colab UTI), 1 setor (UTI) e 1 setor (Tecnologia)
    client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(colab, titulo="Colaborador UTI"))
    client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo_setor(setor_uti, titulo="Equipe UTI"))
    client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo_setor(setor_ti, titulo="Equipe TI"))

    # Filtro por alvo_tipo: apenas colaboradores
    res_colabs = client.get("/api/v1/reconhecimentos?alvo_tipo=COLABORADOR", headers=rh).json()
    assert res_colabs["total"] == 1
    assert res_colabs["itens"][0]["titulo"] == "Colaborador UTI"

    # Filtro por alvo_tipo: apenas setores
    res_setores = client.get("/api/v1/reconhecimentos?alvo_tipo=SETOR", headers=rh).json()
    assert res_setores["total"] == 2

    # Filtro por id_setor=UTI: deve retornar tanto o reconhecimento do setor UTI quanto do colaborador da UTI!
    res_uti = client.get(f"/api/v1/reconhecimentos?id_setor={setor_uti}", headers=rh).json()
    assert res_uti["total"] == 2


def test_indicacao_por_setor_e_aprovacao_pelo_rh(client: TestClient, db_session: Session):
    setor_ti = _id_setor(db_session, "Tecnologia")
    colab = _colab(client)
    rh = _rh(client)

    # Colaborador indica o setor de TI
    res = client.post(
        "/api/v1/indicacoes",
        headers=colab,
        json={"id_setor": setor_ti, "motivo": "Atendimento rápido a chamados da emergência"}
    )
    assert res.status_code == 201
    indicacao = res.json()
    assert indicacao["alvo_tipo"] == "SETOR"
    assert indicacao["setor"]["nome"] == "Tecnologia"
    assert indicacao["indicado"] is None
    assert indicacao["status"] == "PENDENTE"

    # Aparece em "Minhas indicações" do colaborador
    minhas = client.get("/api/v1/indicacoes/minhas", headers=colab).json()
    assert len(minhas) == 1
    assert minhas[0]["alvo_tipo"] == "SETOR"
    assert minhas[0]["setor"]["nome"] == "Tecnologia"

    # RH visualiza nas pendentes
    pendentes = client.get("/api/v1/indicacoes?status=PENDENTE", headers=rh).json()
    assert pendentes["total"] == 1
    assert pendentes["itens"][0]["alvo_tipo"] == "SETOR"

    # RH aprova criando o reconhecimento para o setor
    rec = client.post(
        "/api/v1/reconhecimentos",
        headers=rh,
        json=_corpo_setor(setor_ti, id_indicacao=indicacao["id_indicacao"], titulo="Destaque TI")
    )
    assert rec.status_code == 201
    assert rec.json()["alvo_tipo"] == "SETOR"
    assert rec.json()["setor"]["nome"] == "Tecnologia"

    # Indicação vira APROVADA
    minhas_pos = client.get("/api/v1/indicacoes/minhas", headers=colab).json()
    assert minhas_pos[0]["status"] == "APROVADA"
    assert minhas_pos[0]["id_reconhecimento"] == rec.json()["id_reconhecimento"]


def test_indicacao_por_setor_inexistente_retorna_400(client: TestClient):
    colab = _colab(client)
    res = client.post(
        "/api/v1/indicacoes",
        headers=colab,
        json={"id_setor": 99999, "motivo": "Setor fantasma"}
    )
    assert res.status_code == 400
    assert "id_setor" in res.json()["erros"]


def test_recusar_indicacao_de_setor(client: TestClient, db_session: Session):
    setor_ti = _id_setor(db_session, "Tecnologia")
    colab = _colab(client)
    rh = _rh(client)

    ind = client.post(
        "/api/v1/indicacoes",
        headers=colab,
        json={"id_setor": setor_ti, "motivo": "Muito bom trabalho"}
    ).json()

    res = client.post(f"/api/v1/indicacoes/{ind['id_indicacao']}/recusar", headers=rh)
    assert res.status_code == 200
    assert res.json()["status"] == "RECUSADA"

    minhas = client.get("/api/v1/indicacoes/minhas", headers=colab).json()
    assert minhas[0]["status"] == "RECUSADA"


# ----------------------------- Líder de setor e Cadeia de comando -----------------------------


def _admin(client: TestClient) -> dict[str, str]:
    token = client.post(
        "/api/v1/auth/login", json={"email": "admin@decos.com.br", "senha": "Admin@123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _criar_colaborador(
    db_session: Session, nome: str, email: str, id_setor: int, perfil: str = "COLABORADOR"
) -> Usuario:
    from datetime import date
    from app.core.security import gerar_hash_senha

    u = Usuario(
        nome=nome,
        email=email,
        senha_hash=gerar_hash_senha("Colab@123"),
        id_setor=id_setor,
        cargo="Enfermeiro",
        data_nascimento=date(1995, 5, 10),
        perfil=perfil,
        status="ATIVO",
        versao_token=0,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


def _definir_lider_api(client: TestClient, id_setor: int, id_lider: int | None, setor_obj) -> any:
    ramais = [{"numero": r.numero, "descricao": r.descricao} for r in setor_obj.ramais]
    if not ramais:
        ramais = [{"numero": f"9{id_setor}01", "descricao": "Ramal teste"}]
    return client.put(
        f"/api/v1/setores/{id_setor}",
        headers=_admin(client),
        json={
            "nome": setor_obj.nome,
            "andar": setor_obj.andar,
            "id_lider": id_lider,
            "ramais": ramais,
        },
    )


def test_definir_lider_outro_setor_falha_e_inativar_ou_trocar_setor_limpa_lider(
    client: TestClient, db_session: Session
):
    from app.models.setor import Setor

    setor_uti = db_session.query(Setor).filter(Setor.nome == "UTI").one()
    setor_ti = db_session.query(Setor).filter(Setor.nome == "Tecnologia").one()
    colab_uti = db_session.query(Usuario).filter(Usuario.email == "colaborador@decos.com.br").one()
    admin_ti = db_session.query(Usuario).filter(Usuario.email == "admin@decos.com.br").one()

    # Definir como líder alguém de outro setor falha (400 RegraNegocio com erro em id_lider)
    res_outro = _definir_lider_api(client, setor_uti.id_setor, admin_ti.id_usuario, setor_uti)
    assert res_outro.status_code == 400
    assert "id_lider" in res_outro.json()["erros"]

    # Definir colaborador do próprio setor funciona
    res_ok = _definir_lider_api(client, setor_uti.id_setor, colab_uti.id_usuario, setor_uti)
    assert res_ok.status_code == 200
    assert res_ok.json()["lider"]["id_usuario"] == colab_uti.id_usuario

    # /auth/me expõe setores_liderados
    me = client.get("/api/v1/auth/me", headers=_colab(client)).json()
    assert me["setores_liderados"] == [{"id_setor": setor_uti.id_setor, "nome": "UTI"}]

    # Trocar usuário de setor limpa ID_LIDER
    res_troca = client.put(
        f"/api/v1/usuarios/{colab_uti.id_usuario}",
        headers=_admin(client),
        json={
            "nome": colab_uti.nome,
            "email": colab_uti.email,
            "cargo": colab_uti.cargo,
            "id_setor": setor_ti.id_setor,
        },
    )
    assert res_troca.status_code == 200
    db_session.expire_all()
    assert db_session.query(Setor).filter(Setor.id_setor == setor_uti.id_setor).one().id_lider is None

    # Reatribuir à TI e definir como líder da TI; depois inativar limpa ID_LIDER
    res_ti = _definir_lider_api(client, setor_ti.id_setor, colab_uti.id_usuario, setor_ti)
    assert res_ti.status_code == 200
    res_inativar = client.patch(
        f"/api/v1/usuarios/{colab_uti.id_usuario}/acesso",
        headers=_admin(client),
        json={"status": "INATIVO"},
    )
    assert res_inativar.status_code == 200
    db_session.expire_all()
    assert db_session.query(Setor).filter(Setor.id_setor == setor_ti.id_setor).one().id_lider is None


def test_escopo_colaborador_vs_setor_vs_lider_e_filtros(client: TestClient, db_session: Session):
    from app.models.setor import Setor

    setor_uti = db_session.query(Setor).filter(Setor.nome == "UTI").one()
    setor_ti = db_session.query(Setor).filter(Setor.nome == "Tecnologia").one()
    colab_a = db_session.query(Usuario).filter(Usuario.email == "colaborador@decos.com.br").one()
    colab_b = _criar_colaborador(db_session, "Beatriz UTI", "beatriz@decos.com.br", setor_uti.id_setor)
    admin_ti = db_session.query(Usuario).filter(Usuario.email == "admin@decos.com.br").one()

    rh = _rh(client)
    rec_a = client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(colab_a.id_usuario, titulo="Rec A")).json()
    rec_b = client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(colab_b.id_usuario, titulo="Rec B")).json()
    rec_ti = client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo(admin_ti.id_usuario, titulo="Rec TI")).json()
    rec_setor_uti = client.post("/api/v1/reconhecimentos", headers=rh, json=_corpo_setor(setor_uti.id_setor, titulo="Rec Setor UTI")).json()

    headers_a = _colab(client)
    token_b = client.post("/api/v1/auth/login", json={"email": "beatriz@decos.com.br", "senha": "Colab@123"}).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Colaborador A vê o próprio + do seu setor, mas não vê o individual de B nem o da TI
    lista_a = client.get("/api/v1/reconhecimentos", headers=headers_a).json()
    ids_a = {r["id_reconhecimento"] for r in lista_a["itens"]}
    assert ids_a == {rec_a["id_reconhecimento"], rec_setor_uti["id_reconhecimento"]}
    assert client.get(f"/api/v1/reconhecimentos/{rec_b['id_reconhecimento']}", headers=headers_a).status_code == 404
    assert client.get(f"/api/v1/reconhecimentos/{rec_ti['id_reconhecimento']}", headers=headers_a).status_code == 404

    # Colaborador não-líder não acessa colaboradores-filtro (403) e tem filtros ignorados
    assert client.get("/api/v1/reconhecimentos/colaboradores-filtro", headers=headers_a).status_code == 403
    lista_a_tentando_filtrar = client.get(
        f"/api/v1/reconhecimentos?id_colaborador={colab_b.id_usuario}&id_setor={setor_ti.id_setor}",
        headers=headers_a,
    ).json()
    assert {r["id_reconhecimento"] for r in lista_a_tentando_filtrar["itens"]} == {
        rec_a["id_reconhecimento"],
        rec_setor_uti["id_reconhecimento"],
    }

    # Tornar Beatriz líder da UTI
    assert _definir_lider_api(client, setor_uti.id_setor, colab_b.id_usuario, setor_uti).status_code == 200

    # Beatriz líder vê todos da UTI (A, B, setor UTI), mas não vê TI
    lista_b = client.get("/api/v1/reconhecimentos", headers=headers_b).json()
    ids_b = {r["id_reconhecimento"] for r in lista_b["itens"]}
    assert ids_b == {rec_a["id_reconhecimento"], rec_b["id_reconhecimento"], rec_setor_uti["id_reconhecimento"]}

    # Filtro id_colaborador funciona para líder
    filtrado_b = client.get(
        f"/api/v1/reconhecimentos?id_colaborador={colab_a.id_usuario}", headers=headers_b
    ).json()
    assert [r["id_reconhecimento"] for r in filtrado_b["itens"]] == [rec_a["id_reconhecimento"]]

    # colaboradores-filtro: líder vê só ativos do seu setor
    colab_filtro_b = client.get("/api/v1/reconhecimentos/colaboradores-filtro", headers=headers_b).json()
    nomes_filtro_b = {c["nome"] for c in colab_filtro_b}
    assert nomes_filtro_b == {"Carlos Menezes", "Beatriz UTI"}

    # Indicações: Beatriz líder vê indicações da UTI, mas recebe 403 ao tentar recusar
    ind_uti = client.post(
        "/api/v1/indicacoes",
        headers=headers_a,
        json={"id_indicado": colab_b.id_usuario, "motivo": "Excelente plantão"},
    ).json()
    inds_b = client.get("/api/v1/indicacoes", headers=headers_b).json()
    assert inds_b["total"] == 1 and inds_b["itens"][0]["id_indicacao"] == ind_uti["id_indicacao"]
    assert client.post(f"/api/v1/indicacoes/{ind_uti['id_indicacao']}/recusar", headers=headers_b).status_code == 403

    # RH continua vendo tudo (mesmo se também for líder)
    assert client.get("/api/v1/reconhecimentos", headers=rh).json()["total"] == 4

    # Remover liderança de Beatriz -> perde visão do setor
    assert _definir_lider_api(client, setor_uti.id_setor, None, setor_uti).status_code == 200
    lista_b_sem_lider = client.get("/api/v1/reconhecimentos", headers=headers_b).json()
    assert {r["id_reconhecimento"] for r in lista_b_sem_lider["itens"]} == {
        rec_b["id_reconhecimento"],
        rec_setor_uti["id_reconhecimento"],
    }

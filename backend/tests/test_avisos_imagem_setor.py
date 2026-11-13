from fastapi.testclient import TestClient

from app.services import aviso_service
from app.storage.storage_service import LocalStorage

PNG_PEQUENO = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def _obter_headers(client: TestClient, email: str, senha: str) -> dict[str, str]:
    res = client.post("/api/v1/auth/login", json={"email": email, "senha": senha})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _id_setor(client: TestClient, nome: str) -> int:
    setores = client.get("/api/v1/setores").json()
    return next(s["id_setor"] for s in setores if s["nome"] == nome)


def test_filtro_de_avisos_por_setor(client: TestClient):
    h_mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")
    id_uti = _id_setor(client, "UTI")
    id_rh = _id_setor(client, "RH")

    r1 = client.post(
        "/api/v1/avisos",
        headers=h_mkt,
        json={"titulo": "Novidade da UTI", "conteudo": "<p>Texto da UTI</p>", "categoria": "NOTICIA", "id_setor": id_uti},
    )
    assert r1.status_code == 201
    assert r1.json()["setor"]["nome"] == "UTI"

    r2 = client.post(
        "/api/v1/avisos",
        headers=h_mkt,
        json={"titulo": "Novidade do RH", "conteudo": "<p>Texto do RH</p>", "categoria": "NOTICIA", "id_setor": id_rh},
    )
    assert r2.status_code == 201

    r3 = client.post(
        "/api/v1/avisos",
        headers=h_mkt,
        json={"titulo": "Aviso geral", "conteudo": "<p>Para todos</p>", "categoria": "COMUNICADO", "id_setor": ""},
    )
    assert r3.status_code == 201
    assert r3.json()["setor"] is None

    res = client.get(f"/api/v1/avisos?id_setor={id_uti}")
    assert res.status_code == 200
    titulos = [a["titulo"] for a in res.json()["itens"]]
    assert titulos == ["Novidade da UTI"]

    r_invalido = client.post(
        "/api/v1/avisos",
        headers=h_mkt,
        json={"titulo": "Setor errado", "conteudo": "<p>x</p>", "id_setor": 9999},
    )
    assert r_invalido.status_code == 404


def test_imagem_do_aviso(client: TestClient, tmp_path, monkeypatch):
    storage = LocalStorage(tmp_path)
    monkeypatch.setattr(aviso_service, "get_storage_service", lambda: storage)
    h_mkt = _obter_headers(client, "marketing@decos.com.br", "Mkt@12345")
    h_colab = _obter_headers(client, "colaborador@decos.com.br", "Colab@123")

    aviso = client.post(
        "/api/v1/avisos",
        headers=h_mkt,
        json={"titulo": "Aviso com foto", "conteudo": "<p>Veja a foto</p>", "categoria": "NOTICIA"},
    ).json()
    assert aviso["tem_imagem"] is False

    r_colab = client.post(
        f"/api/v1/avisos/{aviso['id_aviso']}/imagem",
        headers=h_colab,
        files={"imagem": ("foto.png", PNG_PEQUENO, "image/png")},
    )
    assert r_colab.status_code == 403

    r_txt = client.post(
        f"/api/v1/avisos/{aviso['id_aviso']}/imagem",
        headers=h_mkt,
        files={"imagem": ("foto.png", b"nao sou imagem", "image/png")},
    )
    assert r_txt.status_code == 415

    r_ok = client.post(
        f"/api/v1/avisos/{aviso['id_aviso']}/imagem",
        headers=h_mkt,
        files={"imagem": ("foto.png", PNG_PEQUENO, "image/png")},
    )
    assert r_ok.status_code == 200
    assert r_ok.json()["tem_imagem"] is True

    r_img = client.get(f"/api/v1/avisos/{aviso['id_aviso']}/imagem")
    assert r_img.status_code == 200
    assert r_img.headers["content-type"] == "image/png"
    assert r_img.content == PNG_PEQUENO

    r_del = client.delete(f"/api/v1/avisos/{aviso['id_aviso']}/imagem", headers=h_mkt)
    assert r_del.status_code == 204
    assert client.get(f"/api/v1/avisos/{aviso['id_aviso']}/imagem").status_code == 404

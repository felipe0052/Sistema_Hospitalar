"""Testes isolados: não utilizam o banco de desenvolvimento."""
import os
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "chave-exclusiva-dos-testes-de-login"

import unittest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.db.session import Base, get_db
from app.db.models import UsuarioModel
from app.core.security import hash_password
from app.core.config import settings


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(bind=self.engine)
        with self.sessions() as db:
            db.add(UsuarioModel(nome="Colaborador Teste", email="teste@decos.com.br", senha_hash=hash_password("Senha1234")))
            db.commit()
        def override_db():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[get_db] = override_db
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def login(self):
        return self.client.post("/api/v1/auth/login", json={"email": "teste@decos.com.br", "senha": "Senha1234"})

    def test_login_and_me_do_not_expose_password(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertNotIn("senha_hash", body["usuario"])
        me = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "teste@decos.com.br")
        self.assertNotIn("senha_hash", me.json())

    def test_wrong_password_and_unknown_email_have_same_response(self):
        wrong = self.client.post("/api/v1/auth/login", json={"email": "teste@decos.com.br", "senha": "errada"})
        missing = self.client.post("/api/v1/auth/login", json={"email": "outro@decos.com.br", "senha": "errada"})
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(missing.status_code, 401)
        self.assertEqual(wrong.json(), missing.json())

    def test_me_rejects_missing_invalid_expired_and_unknown_user_tokens(self):
        tokens = [None, "invalido"]
        for email, expiry in [("teste@decos.com.br", -60), ("ausente@decos.com.br", 60)]:
            tokens.append(jwt.encode({"sub": email, "exp": datetime.now(timezone.utc) + timedelta(seconds=expiry)}, settings.SECRET_KEY, algorithm=settings.ALGORITHM))
        for token in tokens:
            with self.subTest(token=token):
                response = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"} if token else {})
                self.assertEqual(response.status_code, 401)

    def test_invalid_form_is_rejected(self):
        for payload in [{}, {"email": "invalido", "senha": "teste"}]:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post("/api/v1/auth/login", json=payload).status_code, 422)


if __name__ == "__main__":
    unittest.main()

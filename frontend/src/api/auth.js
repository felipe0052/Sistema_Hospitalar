import apiClient from "./client";
import { USUARIOS_MOCK } from "../mocks/usuarios";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

export async function login(email, senha) {
  if (useMocks) {
    const emailNorm = String(email || "").trim().toLowerCase();
    const encontrado = USUARIOS_MOCK.find((u) => u.email.toLowerCase() === emailNorm);
    if (!encontrado) {
      const err = new Error("E-mail ou senha inválidos");
      err.status = 401;
      err.mensagem = err.message;
      throw err;
    }
    if (encontrado.status === "INATIVO") {
      const err = new Error("Usuário inativo. Procure o administrador.");
      err.status = 403;
      err.mensagem = err.message;
      throw err;
    }
    return {
      access_token: "mock-jwt-token",
      token_type: "bearer",
      usuario: encontrado,
    };
  }

  const { data } = await apiClient.post("/auth/login", { email, senha });
  return data;
}

export async function me() {
  if (useMocks) {
    return USUARIOS_MOCK[0];
  }
  const { data } = await apiClient.get("/auth/me");
  return data;
}

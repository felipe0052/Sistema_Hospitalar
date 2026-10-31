import apiClient from "./client";
import { USUARIOS_MOCK } from "../mocks/usuarios";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

export const MSG_LOGIN_INVALIDO = "E-mail ou senha inválidos. Procure o ADMIN.";

function calcularAniversarioHoje(dataNascimento) {
  if (!dataNascimento || typeof dataNascimento !== "string") return false;
  const partes = dataNascimento.split("-").map(Number);
  if (partes.length !== 3) return false;
  const [, mesNasc, diaNasc] = partes;
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const dia = hoje.getDate();
  const bissexto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  if (mesNasc === 2 && diaNasc === 29 && !bissexto) {
    return mes === 2 && dia === 28;
  }
  return mesNasc === mes && diaNasc === dia;
}

function enriquecerUsuarioMock(u) {
  if (!u) return u;
  return {
    ...u,
    aniversario_hoje:
      typeof u.aniversario_hoje === "boolean"
        ? u.aniversario_hoje
        : calcularAniversarioHoje(u.data_nascimento),
  };
}

export async function login(email, senha) {
  if (useMocks) {
    const emailNorm = String(email || "").trim().toLowerCase();
    const encontrado = USUARIOS_MOCK.find((u) => u.email.toLowerCase() === emailNorm);
    if (!encontrado || encontrado.status === "INATIVO") {
      const err = new Error(MSG_LOGIN_INVALIDO);
      err.status = 401;
      err.mensagem = err.message;
      throw err;
    }
    return {
      access_token: "mock-jwt-token",
      token_type: "bearer",
      usuario: enriquecerUsuarioMock(encontrado),
    };
  }

  const { data } = await apiClient.post("/auth/login", { email, senha });
  return data;
}

export async function me() {
  if (useMocks) {
    return enriquecerUsuarioMock(USUARIOS_MOCK[0]);
  }
  const { data } = await apiClient.get("/auth/me");
  return data;
}

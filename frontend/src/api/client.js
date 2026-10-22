import axios from "axios";

export const TOKEN_STORAGE_KEY = "decos.auth.token";
export const USER_STORAGE_KEY = "decos.auth.user";
const LEGACY_SESSION_KEY = "decos.auth.token";

export function lerTokenSalvo() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(LEGACY_SESSION_KEY);
  } catch {
    return null;
  }
}

export function salvarSessaoStorage(token, usuario) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(LEGACY_SESSION_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
    }

    if (usuario) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(usuario));
    } else if (!token) {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    /* Ignora se storage estiver bloqueado */
  }
}

export function lerUsuarioSalvo() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const rawBaseUrl = import.meta.env?.VITE_API_URL || "http://localhost:8000/api/v1";
const normalizedBaseUrl = rawBaseUrl.endsWith("/api/v1")
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, "")}/api/v1`;

export const apiClient = axios.create({
  baseURL: normalizedBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export function traduzirErroApi(error) {
  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data || {};
    const detail =
      typeof data.detail === "string"
        ? data.detail
        : status === 401
          ? "E-mail ou senha inválidos"
          : status === 403
            ? "Você não tem permissão para acessar esta funcionalidade."
            : status === 404
              ? "Registro não encontrado."
              : status === 422
                ? "Verifique os campos informados."
                : "Ocorreu um erro ao processar a solicitação.";
    const erros = data.erros && typeof data.erros === "object" ? data.erros : {};
    const errObj = new Error(detail);
    errObj.status = status;
    errObj.mensagem = detail;
    errObj.detail = detail;
    errObj.erros = erros;
    return errObj;
  }

  const netErr = new Error(
    "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  );
  netErr.status = 0;
  netErr.mensagem = netErr.message;
  netErr.detail = netErr.message;
  netErr.erros = {};
  return netErr;
}

apiClient.interceptors.request.use((config) => {
  const token = lerTokenSalvo();
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const traduzido = traduzirErroApi(error);
    const isLoginRoute = String(error?.config?.url || "").includes("/auth/login");

    if (traduzido.status === 401 && !isLoginRoute) {
      salvarSessaoStorage(null, null);
      window.dispatchEvent(
        new CustomEvent("decos:unauthorized", {
          detail: traduzido.mensagem || "Sessão expirada. Faça login novamente.",
        }),
      );
    } else if (traduzido.status === 403 && !isLoginRoute) {
      window.dispatchEvent(
        new CustomEvent("decos:forbidden", {
          detail:
            traduzido.mensagem || "Você não tem permissão para acessar esta funcionalidade.",
        }),
      );
    }

    return Promise.reject(traduzido);
  },
);

export default apiClient;

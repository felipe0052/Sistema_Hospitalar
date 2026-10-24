import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as authApi from "../api/auth";
import { lerTokenSalvo, lerUsuarioSalvo, salvarSessaoStorage } from "../api/client";

const AuthContext = createContext(null);

function obterExpiracaoMs(token) {
  try {
    const partes = String(token || "").split(".");
    if (partes.length < 2) return Date.now() + 3600_000;
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === "number" ? payload.exp * 1000 : Date.now() + 3600_000;
  } catch {
    return 0;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => lerTokenSalvo());
  const [usuario, setUsuario] = useState(() => lerUsuarioSalvo());
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");
  const geracaoRef = useRef(0);

  const sair = useCallback((mensagem = "") => {
    geracaoRef.current += 1;
    salvarSessaoStorage(null, null);
    setToken(null);
    setUsuario(null);
    setAviso(mensagem);
  }, []);

  useEffect(() => {
    let cancelado = false;
    const salvo = lerTokenSalvo();

    if (!salvo) {
      setCarregando(false);
      return;
    }

    if (obterExpiracaoMs(salvo) <= Date.now()) {
      sair("Sessão expirada. Faça login novamente.");
      setCarregando(false);
      return;
    }

    authApi
      .me()
      .then((dadosUsuario) => {
        if (!cancelado) {
          salvarSessaoStorage(salvo, dadosUsuario);
          setToken(salvo);
          setUsuario(dadosUsuario);
        }
      })
      .catch((err) => {
        if (cancelado) return;
        if (err?.status === 401 || err?.status === 403) {
          sair(err?.mensagem || "Sessão expirada. Faça login novamente.");
        } else {
          salvarSessaoStorage(null, null);
          setToken(null);
          setUsuario(null);
          setAviso("Não foi possível validar sua sessão. Confira a conexão e entre novamente.");
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [sair]);

  useEffect(() => {
    if (!token) return;

    const checarExpiracao = () => {
      if (obterExpiracaoMs(token) <= Date.now()) {
        sair("Sessão expirada. Faça login novamente.");
      }
    };

    const delay = Math.min(Math.max(0, obterExpiracaoMs(token) - Date.now()), 2147483647);
    const timer = window.setTimeout(checarExpiracao, delay);
    window.addEventListener("focus", checarExpiracao);

    const onUnauthorized = (e) => {
      sair(e?.detail || "Sessão expirada. Faça login novamente.");
    };
    window.addEventListener("decos:unauthorized", onUnauthorized);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", checarExpiracao);
      window.removeEventListener("decos:unauthorized", onUnauthorized);
    };
  }, [token, sair]);

  const entrar = useCallback(async (email, senha) => {
    const versao = ++geracaoRef.current;
    const resposta = await authApi.login(email, senha);
    if (versao !== geracaoRef.current) return resposta;

    if (obterExpiracaoMs(resposta.access_token) <= Date.now()) {
      const err = new Error("Sessão expirada. Faça login novamente.");
      err.status = 401;
      err.mensagem = err.message;
      throw err;
    }

    salvarSessaoStorage(resposta.access_token, resposta.usuario);
    setToken(resposta.access_token);
    setUsuario(resposta.usuario);
    setAviso("");
    return resposta.usuario;
  }, []);

  const autenticado = Boolean(usuario);
  const modoLeitura = !autenticado;
  const perfilEfetivo = usuario?.perfil || "COLABORADOR";
  const isAdmin = Boolean(usuario && usuario.perfil === "ADMIN");

  const temPerfil = useCallback(
    (...perfis) => {
      if (!usuario || !usuario.perfil) return false;
      const lista = perfis.flat().map((p) => String(p).toUpperCase());
      return lista.includes(String(usuario.perfil).toUpperCase());
    },
    [usuario],
  );

  const valor = {
    usuario,
    user: usuario,
    token,
    autenticado,
    isAuthenticated: autenticado,
    modoLeitura,
    isReadOnly: modoLeitura,
    perfilEfetivo,
    carregando,
    restoring: carregando,
    aviso,
    notice: aviso,
    entrar,
    signIn: entrar,
    sair,
    signOut: sair,
    isAdmin,
    temPerfil,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return ctx;
}

export default AuthContext;

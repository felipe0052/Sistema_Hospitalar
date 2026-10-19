import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import * as api from "./api";

const SESSION_KEY = "decos.auth.token";
const AuthContext = createContext<AuthValue | null>(null);
interface AuthValue {
  token: string | null;
  user: api.UsuarioOut | null;
  restoring: boolean;
  notice: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (notice?: string) => void;
}

function readToken() {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
function storeToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* A sessão continua em memória se o navegador bloquear armazenamento. */ }
}
function expiresAt(token: string): number {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = JSON.parse(atob(part)).exp;
    return typeof exp === "number" ? exp * 1000 : 0;
  } catch { return 0; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<api.UsuarioOut | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState("");
  const generation = useRef(0);

  const signOut = useCallback((message = "") => {
    generation.current += 1;
    storeToken(null);
    setToken(null);
    setUser(null);
    setNotice(message);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const saved = readToken();
    if (!saved) { setRestoring(false); return; }
    if (expiresAt(saved) <= Date.now()) {
      signOut("Sua sessão expirou. Entre novamente.");
      setRestoring(false);
      return;
    }
    api.getCurrentUser(saved).then(current => {
      if (!cancelled) { setToken(saved); setUser(current); }
    }).catch(error => {
      if (cancelled) return;
      if (error instanceof api.ApiError && error.status === 401) {
        signOut("Sua sessão expirou. Entre novamente.");
      } else {
        setNotice("Não foi possível validar sua sessão. Confira a conexão e entre novamente.");
      }
    }).finally(() => { if (!cancelled) setRestoring(false); });
    return () => { cancelled = true; };
  }, [signOut]);

  useEffect(() => {
    if (!token) return;
    const checkExpiry = () => {
      if (expiresAt(token) <= Date.now()) signOut("Sua sessão expirou. Entre novamente.");
    };
    const timer = window.setTimeout(checkExpiry, Math.min(Math.max(0, expiresAt(token) - Date.now()), 2147483647));
    window.addEventListener("focus", checkExpiry);
    const unauthorized = () => signOut("Sua sessão expirou. Entre novamente.");
    window.addEventListener("decos:unauthorized", unauthorized);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
      window.removeEventListener("decos:unauthorized", unauthorized);
    };
  }, [token, signOut]);

  async function signIn(email: string, password: string) {
    const version = ++generation.current;
    const auth = await api.login(email, password);
    if (version !== generation.current) return;
    if (expiresAt(auth.access_token) <= Date.now()) throw new Error("A sessão recebida está expirada. Tente novamente.");
    storeToken(auth.access_token);
    setToken(auth.access_token);
    setUser(auth.usuario);
    setNotice("");
  }

  return <AuthContext.Provider value={{ token, user, restoring, notice, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requer AuthProvider");
  return value;
}

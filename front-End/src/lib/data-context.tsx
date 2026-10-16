import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";

const TOKEN_KEY = "decos-token";
const USER_KEY = "decos-usuario";

interface DataContextValue {
  loading: boolean;
  apiOnline: boolean;
  token: string | null;
  usuarioLogado: api.UsuarioOut | null;
  avisos: api.AvisoOut[];
  aniversariantes: api.AniversarianteOut[];
  documentos: api.DocumentoOut[];
  faq: api.FaqOut[];
  contatos: api.UsuarioOut[];
  setores: api.SetorOut[];
  refetchAvisos: () => Promise<void>;
  refetchDocumentos: () => Promise<void>;
  refetchContatos: () => Promise<void>;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  alterarSenhaObrigatoria: (senhaAtual: string, novaSenha: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<api.UsuarioOut | null>(null);
  const [avisos, setAvisos] = useState<api.AvisoOut[]>([]);
  const [aniversariantes, setAniversariantes] = useState<api.AniversarianteOut[]>([]);
  const [documentos, setDocumentos] = useState<api.DocumentoOut[]>([]);
  const [faq, setFaq] = useState<api.FaqOut[]>([]);
  const [contatos, setContatos] = useState<api.UsuarioOut[]>([]);
  const [setores, setSetores] = useState<api.SetorOut[]>([]);

  const refetchAvisos = useCallback(async () => {
    try {
      setAvisos(await api.getAvisos());
    } catch (err) {
      console.error("Falha ao recarregar avisos:", err);
    }
  }, []);

  const refetchDocumentos = useCallback(async () => {
    try {
      setDocumentos(await api.getDocumentos());
    } catch (err) {
      console.error("Falha ao recarregar documentos:", err);
    }
  }, []);

  const refetchContatos = useCallback(async () => {
    try {
      setContatos(await api.getContatos());
    } catch (err) {
      console.error("Falha ao recarregar contatos:", err);
    }
  }, []);

  const loadAppData = useCallback(async () => {
    const [avisosData, aniversariantesData, documentosData, faqData, contatosData, setoresData] = await Promise.all([
      api.getAvisos(),
      api.getAniversariantes(),
      api.getDocumentos(),
      api.getFaq(),
      api.getContatos(),
      api.getSetores(),
    ]);
    setAvisos(avisosData);
    setAniversariantes(aniversariantesData);
    setDocumentos(documentosData);
    setFaq(faqData);
    setContatos(contatosData);
    setSetores(setoresData);
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      const auth = await api.login(email, senha);
      // Carrega os dados ANTES de liberar o token: abrir o gate de auth com
      // avisos/documentos ainda vazios quebra a Home (ex.: `featured` undefined).
      await loadAppData();
      setToken(auth.access_token);
      setUsuarioLogado(auth.usuario);
      try {
        localStorage.setItem(TOKEN_KEY, auth.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(auth.usuario));
      } catch {
        // Modo privado/bloqueado — sessão segue só em memória.
      }
    },
    [loadAppData],
  );

  const alterarSenhaObrigatoria = useCallback(
    async (senhaAtual: string, novaSenha: string) => {
      if (!token) throw new Error("Sessão expirada — faça login novamente.");
      const usuarioAtualizado = await api.alterarSenha({ senha_atual: senhaAtual, nova_senha: novaSenha }, token);
      setUsuarioLogado(usuarioAtualizado);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(usuarioAtualizado));
      } catch {
        // Nada a fazer.
      }
      await loadAppData();
    },
    [token, loadAppData],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUsuarioLogado(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Nada a fazer.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const online = await api.checkHealth();
      if (cancelled) return;
      setApiOnline(online);

      if (!online) {
        setLoading(false);
        return;
      }

      let restoredToken: string | null = null;
      let restoredUser: api.UsuarioOut | null = null;
      try {
        restoredToken = localStorage.getItem(TOKEN_KEY);
        const rawUser = localStorage.getItem(USER_KEY);
        restoredUser = rawUser ? (JSON.parse(rawUser) as api.UsuarioOut) : null;
      } catch {
        restoredToken = null;
        restoredUser = null;
      }

      if (restoredToken && restoredUser) {
        setToken(restoredToken);
        setUsuarioLogado(restoredUser);
        try {
          await loadAppData();
        } catch (err) {
          console.error("Sessão restaurada, mas falha ao carregar dados — mantendo login:", err);
        }
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAppData]);

  return (
    <DataContext.Provider
      value={{
        loading,
        apiOnline,
        token,
        usuarioLogado,
        avisos,
        aniversariantes,
        documentos,
        faq,
        contatos,
        setores,
        refetchAvisos,
        refetchDocumentos,
        refetchContatos,
        login,
        logout,
        alterarSenhaObrigatoria,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData precisa ser usado dentro de <DataProvider>");
  return ctx;
}

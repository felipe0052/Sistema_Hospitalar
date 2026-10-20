import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";

import { useAuth } from "./auth-context";

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
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(true);
  const { token, user: usuarioLogado } = useAuth();
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [avisosData, aniversariantesData, documentosData, faqData, contatosData, setoresData] =
          await Promise.all([
            api.getAvisos(),
            api.getAniversariantes(),
            api.getDocumentos(),
            api.getFaq(),
            api.getContatos(),
            api.getSetores(),
          ]);

        if (cancelled) return;
        setAvisos(avisosData);
        setAniversariantes(aniversariantesData);
        setDocumentos(documentosData);
        setFaq(faqData);
        setContatos(contatosData);
        setSetores(setoresData);
      } catch (err) {
        console.error("Não foi possível conectar à API do back-end — usando dados de demonstração locais:", err);
        if (!cancelled) setApiOnline(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

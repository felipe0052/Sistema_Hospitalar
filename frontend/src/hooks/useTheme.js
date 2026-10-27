import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "decos.theme";
const THEME_CHANGE_EVENT = "decos:theme-change";

function temaInicial() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === "dark" || salvo === "light") return salvo;
  } catch {
    /* storage bloqueado */
  }
  // Padrão obrigatório: Light Mode para novos acessos ou ausência de preferência salva
  return "light";
}

function aplicarTemaNoDocumento(novoTema) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = novoTema;
  if (novoTema === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme() {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    aplicarTemaNoDocumento(tema);
    try {
      localStorage.setItem(STORAGE_KEY, tema);
    } catch {
      /* ignora */
    }
  }, [tema]);

  // Sincroniza instâncias de useTheme entre diferentes componentes e abas
  useEffect(() => {
    function handleCustomEvent(e) {
      const novo = e?.detail;
      if (novo === "dark" || novo === "light") {
        setTema(novo);
        aplicarTemaNoDocumento(novo);
      }
    }

    function handleStorage(e) {
      if (e.key === STORAGE_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        setTema(e.newValue);
        aplicarTemaNoDocumento(e.newValue);
      }
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleCustomEvent);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const alternar = useCallback(() => {
    setTema((t) => {
      const proximo = t === "dark" ? "light" : "dark";
      aplicarTemaNoDocumento(proximo);
      try {
        localStorage.setItem(STORAGE_KEY, proximo);
        window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: proximo }));
      } catch {
        /* ignora */
      }
      return proximo;
    });
  }, []);

  return { tema, escuro: tema === "dark", alternar };
}

export default useTheme;

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "decos.theme";

function temaInicial() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo === "dark" || salvo === "light") return salvo;
  } catch {
    /* storage bloqueado */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem(STORAGE_KEY, tema);
    } catch {
      /* ignora */
    }
  }, [tema]);

  const alternar = useCallback(() => setTema((t) => (t === "dark" ? "light" : "dark")), []);
  return { tema, escuro: tema === "dark", alternar };
}

export default useTheme;

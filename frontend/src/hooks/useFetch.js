import { useCallback, useEffect, useRef, useState } from "react";

export function useFetch(fnFetcher, deps = [], opcoes = { imediato: true }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(opcoes.imediato));
  const [erro, setErro] = useState(null);
  const fnRef = useRef(fnFetcher);
  fnRef.current = fnFetcher;

  const recarregar = useCallback(async (...args) => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await fnRef.current(...args);
      setDados(resultado);
      return resultado;
    } catch (err) {
      const mensagem = err?.mensagem || err?.message || "Não foi possível carregar os dados.";
      setErro(mensagem);
      throw err;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (opcoes.imediato === false) return;
    recarregar().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, recarregar]);

  return { dados, setDados, carregando, erro, recarregar };
}

export default useFetch;

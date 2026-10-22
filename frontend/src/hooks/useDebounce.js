import { useEffect, useState } from "react";

export function useDebounce(valor, atrasoMs = 400) {
  const [valorDebounced, setValorDebounced] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => {
      setValorDebounced(valor);
    }, atrasoMs);

    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);

  return valorDebounced;
}

export default useDebounce;

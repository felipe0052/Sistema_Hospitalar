import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import "./Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removerToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const adicionarToast = useCallback(
    (mensagem, tipo = "success", duracao = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, mensagem, tipo }]);
      if (duracao > 0) {
        setTimeout(() => removerToast(id), duracao);
      }
      return id;
    },
    [removerToast],
  );

  // Escuta eventos globais disparados pelo interceptor de 403 do Axios
  useEffect(() => {
    function onForbidden(e) {
      const msg = e?.detail || "Você não tem permissão para acessar esta funcionalidade.";
      adicionarToast(msg, "error");
    }
    window.addEventListener("decos:forbidden", onForbidden);
    return () => window.removeEventListener("decos:forbidden", onForbidden);
  }, [adicionarToast]);

  const value = {
    toast: adicionarToast,
    sucesso: (msg) => adicionarToast(msg, "success"),
    erro: (msg) => adicionarToast(msg, "error"),
    info: (msg) => adicionarToast(msg, "info"),
    removerToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ui-toast ui-toast--${t.tipo}`} role="status">
            <span>{t.mensagem}</span>
            <button
              type="button"
              onClick={() => removerToast(t.id)}
              aria-label="Fechar notificação"
              className="ui-toast__close"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
      sucesso: () => {},
      erro: () => {},
      info: () => {},
      removerToast: () => {},
    };
  }
  return ctx;
}

export default ToastProvider;

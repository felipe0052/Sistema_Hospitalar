import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../../components/ui";

export default function SemPermissao() {
  const navigate = useNavigate();

  return (
    <div className="p-8 flex items-center justify-center min-h-[70vh]">
      <Card className="max-w-md w-full text-center space-y-4">
        <div
          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "var(--color-danger-bg)",
            color: "var(--color-danger)",
          }}
          aria-hidden="true"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#b4233e]">
            Erro 403 — Acesso Restrito
          </span>
          <h1 className="text-xl font-bold text-[#1e293b]">Acesso negado</h1>
          <p className="text-sm text-[#64748b]" role="alert">
            Você não tem permissão para acessar esta funcionalidade.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Button variant="primary" onClick={() => navigate("/")}>
            Voltar para o Início
          </Button>
        </div>
      </Card>
    </div>
  );
}

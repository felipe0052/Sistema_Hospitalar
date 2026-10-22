import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card } from "../../components/ui";

export default function NaoEncontrada() {
  const navigate = useNavigate();

  return (
    <div className="p-8 flex items-center justify-center min-h-[70vh]">
      <Card className="max-w-md w-full text-center space-y-4">
        <div
          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "var(--color-primary-light)",
            color: "var(--color-primary)",
          }}
          aria-hidden="true"
        >
          <span className="text-xl font-black">404</span>
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-[#1e293b]">Página não encontrada</h1>
          <p className="text-sm text-[#64748b]">
            O endereço que você tentou acessar não existe ou foi movido na Intranet Decós.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Button variant="primary" onClick={() => navigate("/")}>
            Ir para a Página Inicial
          </Button>
        </div>
      </Card>
    </div>
  );
}

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function PermissaoRoute({ perfis = ["ADMIN"], children }) {
  const { usuario, carregando, temPerfil } = useAuth();

  if (carregando) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center bg-white text-[#800020] font-semibold"
        role="status"
      >
        Validando permissões…
      </main>
    );
  }

  // Se o usuário estiver autenticado mas não possuir o perfil exigido, bloqueia com 403 (/sem-permissao).
  // No modo não autenticado (Modo Leitura), permite a visualização somente leitura das telas mapeadas.
  if (usuario && !temPerfil(...perfis)) {
    return <Navigate to="/sem-permissao" replace />;
  }

  return children ? children : <Outlet />;
}

export default PermissaoRoute;

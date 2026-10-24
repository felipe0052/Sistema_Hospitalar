import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function PrivateRoute({ children, requireAuth = false }) {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <main
        className="min-h-dvh flex items-center justify-center bg-white text-[#800020] font-semibold"
        role="status"
      >
        Validando seu acesso…
      </main>
    );
  }

  if (requireAuth && !usuario) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
}

export default PrivateRoute;

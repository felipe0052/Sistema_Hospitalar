import React from "react";
import { Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import AdminSetores from "../pages/AdminSetores";
import AdminUsuarios from "../pages/AdminUsuarios";
import Aniversariantes from "../pages/Aniversariantes";
import Avisos from "../pages/Avisos";
import ComponentesDemo from "../pages/Componentes";
import Dashboard from "../pages/Dashboard";
import Diretorio from "../pages/Diretorio";
import Documentos from "../pages/Documentos";
import Eventos from "../pages/Eventos";
import Faq from "../pages/Faq";
import Login from "../pages/Login";
import NaoEncontrada from "../pages/NaoEncontrada";
import SemPermissao from "../pages/SemPermissao";
import PermissaoRoute from "./PermissaoRoute";
import PrivateRoute from "./PrivateRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/avisos" element={<Avisos />} />
          <Route path="/avisos/:id" element={<Avisos />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/aniversariantes" element={<Aniversariantes />} />
          <Route path="/diretorio" element={<Diretorio />} />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/_componentes" element={<ComponentesDemo />} />
          <Route path="/sem-permissao" element={<SemPermissao />} />

          <Route element={<PermissaoRoute perfis={["ADMIN", "RH"]} />}>
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
          </Route>

          <Route element={<PermissaoRoute perfis={["ADMIN"]} />}>
            <Route path="/admin/setores" element={<AdminSetores />} />
          </Route>

          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;

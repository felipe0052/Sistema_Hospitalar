import React from "react";
import { Route, Routes } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import QuickAccessFab from "../components/layout/QuickAccessFab";
import AdminAcessoRapido from "../pages/AdminAcessoRapido";
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
import Integracoes from "../pages/Integracoes";
import Login from "../pages/Login";
import NaoEncontrada from "../pages/NaoEncontrada";
import Notificacoes from "../pages/Notificacoes";
import Reconhecimentos from "../pages/Reconhecimentos";
import SemPermissao from "../pages/SemPermissao";
import PermissaoRoute from "./PermissaoRoute";
import PrivateRoute from "./PrivateRoute";

export const TELAS_PRINCIPAIS = [
  {
    path: "/",
    label: "Início (Dashboard)",
    descricao: "Painel principal da intranet hospitalar",
    grupo: "Portal do Colaborador",
    icon: "home",
    component: Dashboard,
    index: true,
    publica: true,
  },
  {
    path: "/avisos",
    label: "Notícias e Comunicados",
    descricao: "Mural de avisos, promoções e informes",
    grupo: "Portal do Colaborador",
    icon: "megaphone",
    component: Avisos,
    publica: true,
  },
  {
    path: "/eventos",
    label: "Agenda de Eventos",
    descricao: "Treinamentos, palestras e ações internas",
    grupo: "Portal do Colaborador",
    icon: "calendar",
    component: Eventos,
    publica: true,
  },
  {
    path: "/aniversariantes",
    label: "Aniversariantes",
    descricao: "Colaboradores aniversariantes do mês",
    grupo: "Portal do Colaborador",
    icon: "gift",
    component: Aniversariantes,
    publica: false,
  },
  {
    path: "/diretorio",
    label: "Diretório e Ramais",
    descricao: "Guia telefônico por setor e andar",
    grupo: "Portal do Colaborador",
    icon: "users",
    component: Diretorio,
    publica: true,
  },
  {
    path: "/documentos",
    label: "Documentos (POPs)",
    descricao: "Procedimentos operacionais e protocolos",
    grupo: "Portal do Colaborador",
    icon: "folder",
    component: Documentos,
    publica: true,
  },
  {
    path: "/faq",
    label: "FAQ (Central de Ajuda)",
    descricao: "Perguntas frequentes sobre RH e normas",
    grupo: "Portal do Colaborador",
    icon: "chat",
    component: Faq,
    publica: true,
  },
];

export function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/avisos" element={<Avisos />} />
            <Route path="/avisos/:id" element={<Avisos />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/diretorio" element={<Diretorio />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/faq" element={<Faq />} />
            <Route element={<PrivateRoute requireAuth />}>
              <Route path="/aniversariantes" element={<Aniversariantes />} />
              <Route path="/reconhecimentos" element={<Reconhecimentos />} />
              <Route path="/notificacoes" element={<Notificacoes />} />
              <Route path="/perfil/integracoes" element={<Integracoes />} />
            </Route>
            <Route path="/_componentes" element={<ComponentesDemo />} />
            <Route path="/sem-permissao" element={<SemPermissao />} />

            <Route element={<PermissaoRoute perfis={["ADMIN", "RH"]} />}>
              <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            </Route>

            <Route element={<PermissaoRoute perfis={["ADMIN"]} />}>
              <Route path="/admin/setores" element={<AdminSetores />} />
              <Route path="/admin/acesso-rapido" element={<AdminAcessoRapido />} />
            </Route>

            <Route path="*" element={<NaoEncontrada />} />
          </Route>
        </Route>
      </Routes>
      <QuickAccessFab />
    </>
  );
}

export default AppRoutes;

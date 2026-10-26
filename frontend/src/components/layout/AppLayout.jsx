import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

const STORAGE_KEY = "decos.menu.aberto";

function menuInicial() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(menuInicial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, menuAberto ? "1" : "0");
    } catch {
      /* storage bloqueado */
    }
  }, [menuAberto]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        fontFamily: "var(--font-family-sans)",
        backgroundColor: "var(--color-bg-app)",
      }}
    >
      <Header menuAberto={menuAberto} onAlternarMenu={() => setMenuAberto((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <div
          id="menu-lateral"
          className="flex flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-out"
          style={{ width: menuAberto ? "15rem" : 0 }}
          aria-hidden={!menuAberto}
          inert={!menuAberto}
        >
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

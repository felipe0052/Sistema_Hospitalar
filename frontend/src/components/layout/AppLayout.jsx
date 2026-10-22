import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export function AppLayout() {
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        fontFamily: "var(--font-family-sans)",
        backgroundColor: "var(--color-bg-app)",
      }}
    >
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

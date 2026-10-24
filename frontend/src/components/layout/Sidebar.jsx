import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ICONS = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  megaphone: "M3 11l19-9-9 19-2-8-8-2z",
  calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  gift: "M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  building: "M3 21h18 M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16 M9 9h2 M13 9h2 M9 13h2 M13 13h2",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  login: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4 M10 17l5-5-5-5 M15 12H3",
};

function NavIcon({ path }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="flex-shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

const MENU_PRINCIPAL = [
  { to: "/", label: "Início", icon: ICONS.home, end: true },
  { to: "/avisos", label: "Notícias e Comunicados", icon: ICONS.megaphone, badge: 3 },
  { to: "/eventos", label: "Eventos", icon: ICONS.calendar },
  { to: "/aniversariantes", label: "Aniversariantes", icon: ICONS.gift },
  { to: "/diretorio", label: "Diretório e Ramais", icon: ICONS.users },
  { to: "/documentos", label: "Documentos (POPs)", icon: ICONS.folder },
  { to: "/faq", label: "FAQ (Central de Ajuda)", icon: ICONS.chat },
];

export function Sidebar() {
  const { autenticado, temPerfil, sair } = useAuth();
  const podeGerirUsuarios = autenticado && temPerfil("ADMIN", "RH");
  const podeGerirSetores = autenticado && temPerfil("ADMIN");

  return (
    <aside
      aria-label="Menu lateral de navegação"
      className="w-60 bg-white flex flex-col flex-shrink-0 overflow-y-auto py-4"
      style={{ borderRight: "1px solid var(--color-border)" }}
    >
      <nav className="flex-1 px-3 space-y-1">
        <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
          Navegação
        </div>
        {MENU_PRINCIPAL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={({ isActive }) => ({
              background: isActive ? "var(--bordeaux-gradient)" : "transparent",
              color: isActive ? "var(--white)" : "var(--gray-500)",
              boxShadow: isActive ? "0 2px 8px rgba(128, 0, 32, 0.25)" : undefined,
            })}
          >
            {({ isActive }) => (
              <>
                <NavIcon path={item.icon} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{
                      backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "var(--bordeaux)",
                      color: "#fff",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {(podeGerirUsuarios || podeGerirSetores) && (
          <div className="pt-4 mt-4" style={{ borderTop: "1px solid var(--gray-100)" }}>
            <div
              className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--bordeaux)" }}
            >
              Administração
            </div>
            {podeGerirUsuarios && (
              <NavLink
                to="/admin/usuarios"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={({ isActive }) => ({
                  background: isActive ? "var(--bordeaux-gradient)" : "transparent",
                  color: isActive ? "var(--white)" : "var(--gray-500)",
                  boxShadow: isActive ? "0 2px 8px rgba(128, 0, 32, 0.25)" : undefined,
                })}
              >
                <NavIcon path={ICONS.shield} />
                <span className="flex-1 text-left truncate">Usuários e Acesso</span>
              </NavLink>
            )}
            {podeGerirSetores && (
              <NavLink
                to="/admin/setores"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={({ isActive }) => ({
                  background: isActive ? "var(--bordeaux-gradient)" : "transparent",
                  color: isActive ? "var(--white)" : "var(--gray-500)",
                  boxShadow: isActive ? "0 2px 8px rgba(128, 0, 32, 0.25)" : undefined,
                })}
              >
                <NavIcon path={ICONS.building} />
                <span className="flex-1 text-left truncate">Setores e Ramais</span>
              </NavLink>
            )}
          </div>
        )}
      </nav>

      <div className="px-3 pt-3 mt-auto" style={{ borderTop: "1px solid var(--color-border)" }}>
        {autenticado ? (
          <button
            type="button"
            onClick={() => sair()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#64748b] hover:bg-[#fff5f5] hover:text-[#dc2626] transition-all cursor-pointer"
          >
            <NavIcon path={ICONS.logout} />
            <span>Sair</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#800020] bg-[#fff5f5] hover:bg-[#f3dfe5] transition-all no-underline"
          >
            <NavIcon path={ICONS.login} />
            <span>Entrar / Login</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

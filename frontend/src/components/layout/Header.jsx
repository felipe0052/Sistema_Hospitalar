import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import decoLogo from "../../imports/Decos_Hospital_Logo_Horizontal_Transparente.png";
import { useTheme } from "../../hooks/useTheme";
import { Badge } from "../ui/Badge";

export function Header({ menuAberto = false, onAlternarMenu }) {
  const { usuario, autenticado, sair } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const { escuro, alternar } = useTheme();

  const iniciais = (usuario?.nome || "Colaborador")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  return (
    <header
      className="h-16 bg-white flex items-center justify-between px-6 gap-4 z-30 flex-shrink-0"
      style={{
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
      }}
    >
      <button
        type="button"
        onClick={onAlternarMenu}
        aria-label={menuAberto ? "Ocultar menu de navegação" : "Mostrar menu de navegação"}
        aria-expanded={menuAberto}
        aria-controls="menu-lateral"
        title={menuAberto ? "Ocultar menu" : "Mostrar menu"}
        className="w-9 h-9 -ml-2 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-[#64748b] cursor-pointer flex-shrink-0"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <Link
        to="/"
        className="flex items-center gap-3 flex-shrink-0 no-underline group"
        aria-label="Decós Hospital — Ir para o Início"
      >
        <img
          src={decoLogo}
          alt="Decós Hospital"
          className="h-9 w-auto object-contain object-left transition-transform group-hover:scale-[1.01]"
        />
        <span
          className="h-5 w-px hidden sm:inline-block"
          style={{ backgroundColor: "var(--gray-200)" }}
          aria-hidden="true"
        />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] hidden sm:inline-block">
          Intranet Corporativa
        </span>
      </Link>

      <div className="flex items-center gap-4 ml-auto">
        <button
          type="button"
          onClick={alternar}
          aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
          title={escuro ? "Modo claro" : "Modo escuro"}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-[#64748b] cursor-pointer"
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {escuro ? (
              <>
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </>
            ) : (
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            )}
          </svg>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notificações"
            aria-expanded={notifOpen}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-[#64748b] cursor-pointer"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span
              className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ backgroundColor: "var(--bordeaux)" }}
            >
              3
            </span>
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-11 w-80 bg-white rounded-xl z-50 overflow-hidden"
              style={{
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <span className="font-semibold text-sm text-[#1e293b]">Notificações</span>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-medium text-[#800020] hover:underline cursor-pointer"
                >
                  Fechar
                </button>
              </div>
              {[
                "Hospital Decós conquista certificação ONA Nível III",
                "Protocolo de higienização das mãos atualizado pela CCIH",
                "Treinamento prático de BLS disponível na agenda",
              ].map((texto, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 text-xs text-[#334155] flex gap-2.5 items-start border-b border-slate-100 last:border-none"
                >
                  <span
                    className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "var(--bordeaux)" }}
                  />
                  <span>{texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className="flex items-center gap-3 pl-4"
          style={{ borderLeft: "1px solid var(--color-border)" }}
        >
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold bg-[#fff5f5] text-[#800020] border border-[#f3dfe5]"
          >
            {iniciais}
          </div>
          <div className="flex flex-col text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-semibold text-[#1e293b] leading-tight">
                {usuario?.nome || "Colaborador"}
              </span>
              {autenticado && usuario?.perfil ? (
                <Badge tipo="perfil" valor={usuario.perfil} />
              ) : (
                <Badge variant="leitura">Modo Leitura</Badge>
              )}
            </div>
            <span className="text-xs text-[#64748b] mt-0.5">
              {autenticado
                ? `${usuario?.cargo || "Colaborador"}${usuario?.setor?.nome ? ` · ${usuario.setor.nome}` : ""}`
                : "Perfil Colaborador · Somente visualização"}
            </span>
          </div>

          {autenticado ? (
            <button
              type="button"
              onClick={() => sair()}
              aria-label="Sair da conta"
              title="Sair"
              className="ml-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748b] hover:bg-[#fff5f5] hover:text-[#dc2626] border border-[#e2e8f0] hover:border-[#fecaca] transition-colors cursor-pointer"
            >
              Sair
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              aria-label="Entrar / Login"
              className="ml-2 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-sm hover:opacity-95"
              style={{
                background: "var(--bordeaux-gradient)",
                boxShadow: "0 2px 8px rgba(128, 0, 32, 0.22)",
              }}
            >
              <svg
                aria-hidden="true"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4 M10 17l5-5-5-5 M15 12H3" />
              </svg>
              <span>Entrar / Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

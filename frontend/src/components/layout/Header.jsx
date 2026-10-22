import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import decoLogo from "../../imports/Decos_Hospital_Logo_Horizontal_Transparente.png";
import { Badge } from "../ui/Badge";

export function Header() {
  const { usuario, sair } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);

  const iniciais = (usuario?.nome || "Colaborador")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

  return (
    <header
      className="h-16 bg-white flex items-center justify-between px-5 gap-4 z-30 flex-shrink-0"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <Link to="/" className="flex flex-col w-56 flex-shrink-0 justify-center no-underline">
        <img
          src={decoLogo}
          alt="Decós Hospital"
          className="h-8 w-auto object-contain object-left"
        />
        <span className="text-[10px] font-medium text-[#64748b] mt-0.5">
          Intranet Corporativa
        </span>
      </Link>

      <div className="flex items-center gap-4 ml-auto">
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
              style={{ backgroundColor: "var(--color-primary)" }}
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
                    style={{ backgroundColor: "var(--color-primary)" }}
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
              {usuario?.perfil && <Badge tipo="perfil" valor={usuario.perfil} />}
            </div>
            <span className="text-xs text-[#64748b] mt-0.5">
              {usuario?.cargo || "Colaborador"}
              {usuario?.setor?.nome ? ` · ${usuario.setor.nome}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => sair()}
            aria-label="Sair da conta"
            title="Sair"
            className="ml-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#64748b] hover:bg-[#fff5f5] hover:text-[#b4233e] border border-transparent hover:border-[#f1c5cf] transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;

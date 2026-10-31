import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { listarAcessosRapidos } from "../../api/acessosRapidos";
import { useAuth } from "../../contexts/AuthContext";
import symbol from "../../imports/Decos_Hospital_Simbolo_Transparente_v2.png";
import "./QuickAccessFab.css";

const ICON_PATHS = {
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  megaphone: "M3 11l19-9-9 19-2-8-8-2z",
  calendar:
    "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  gift: "M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
  users:
    "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  building:
    "M3 21h18 M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16 M9 9h2 M13 9h2 M9 13h2 M13 13h2",
  layers: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  login: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4 M10 17l5-5-5-5 M15 12H3",
  compass:
    "M12 22a10 10 0 100-20 10 10 0 000 20z M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6 M15 3h6v6 M10 14L21 3",
  close: "M18 6L6 18 M6 6l12 12",
};

function QuickIcon({ name, size = 16, className = "" }) {
  const d = ICON_PATHS[name] || ICON_PATHS.compass;
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}

export function QuickAccessFab() {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const containerRef = useRef(null);
  const location = useLocation();
  const { autenticado, usuario, temPerfil } = useAuth();
  const podeGerir = autenticado && temPerfil("ADMIN");

  const carregarItens = useCallback(async () => {
    if (!autenticado) {
      setItens([]);
      return;
    }
    setCarregando(true);
    try {
      const dados = await listarAcessosRapidos();
      setItens(Array.isArray(dados) ? dados : []);
    } catch {
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [autenticado]);

  useEffect(() => {
    if (autenticado) {
      carregarItens();
    } else {
      setItens([]);
      setAberto(false);
    }
  }, [autenticado, carregarItens]);

  // Recarrega a lista sempre que o pop-up é aberto (reflete alterações do ADMIN sem relogar)
  useEffect(() => {
    if (aberto && autenticado) {
      carregarItens();
    }
  }, [aberto, autenticado, carregarItens]);

  // Fecha o pop-up automaticamente ao trocar de rota
  useEffect(() => {
    setAberto(false);
  }, [location.pathname]);

  // Fecha o pop-up ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!aberto) return;

    function handleClickFora(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAberto(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setAberto(false);
      }
    }

    document.addEventListener("pointerdown", handleClickFora);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickFora);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [aberto]);

  // Visível apenas para usuários logados (A1 e A4)
  if (!autenticado) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="quick-access-fab-root"
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1000 }}
    >
      <div
        id="quick-access-popup"
        role="dialog"
        aria-label="Acesso rápido a sistemas externos"
        aria-hidden={!aberto}
        className={`quick-access-fab-popup ${aberto ? "quick-access-fab-popup--open" : ""}`}
      >
        <div className="quick-access-fab-popup__header">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={symbol}
              alt=""
              className="w-6 h-6 object-contain brightness-0 invert flex-shrink-0"
            />
            <div className="min-w-0">
              <h2 className="quick-access-fab-popup__title">Acesso Rápido</h2>
              <p className="quick-access-fab-popup__subtitle">
                Sistemas e portais externos do hospital
              </p>
            </div>
          </div>
          <span className="quick-access-fab-popup__badge">
            {usuario?.perfil || "Autenticado"}
          </span>
        </div>

        <nav
          aria-label="Atalhos rápidos para sistemas externos"
          className="quick-access-fab-popup__list"
        >
          {carregando && itens.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[#64748b]">
              Carregando atalhos...
            </div>
          ) : itens.length === 0 ? (
            <div className="px-4 py-6 text-center space-y-2">
              <p className="text-xs font-medium text-[#64748b]">
                Nenhum acesso rápido configurado
              </p>
              {podeGerir && (
                <Link
                  to="/admin/acesso-rapido"
                  onClick={() => setAberto(false)}
                  className="inline-block text-xs font-semibold text-[#800020] hover:underline"
                >
                  Gerenciar →
                </Link>
              )}
            </div>
          ) : (
            itens.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setAberto(false)}
                className="quick-access-fab-item"
              >
                <span className="quick-access-fab-item__icon">
                  <QuickIcon name={item.icone || "compass"} size={16} />
                </span>
                <span className="quick-access-fab-item__content">
                  <span className="quick-access-fab-item__label flex items-center gap-1.5">
                    <span className="truncate">{item.titulo}</span>
                    <QuickIcon name="external" size={12} className="opacity-60 shrink-0" />
                  </span>
                  {item.descricao && (
                    <span className="quick-access-fab-item__desc">{item.descricao}</span>
                  )}
                </span>
              </a>
            ))
          )}
        </nav>

        <div className="quick-access-fab-popup__footer">
          <span>
            {itens.length} {itens.length === 1 ? "link disponível" : "links disponíveis"}
          </span>
          {podeGerir ? (
            <Link
              to="/admin/acesso-rapido"
              onClick={() => setAberto(false)}
              className="font-semibold text-[#800020] hover:underline"
            >
              Gerenciar
            </Link>
          ) : (
            <span>ESC ou clique fora para fechar</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar menu de acesso rápido" : "Abrir menu de acesso rápido"}
        aria-expanded={aberto}
        aria-controls="quick-access-popup"
        title="Acesso Rápido"
        className={`quick-access-fab-trigger ${aberto ? "quick-access-fab-trigger--open" : ""}`}
      >
        <QuickIcon
          name={aberto ? "close" : "compass"}
          size={24}
          className="quick-access-fab-trigger__icon"
        />
      </button>
    </div>
  );
}

export default QuickAccessFab;

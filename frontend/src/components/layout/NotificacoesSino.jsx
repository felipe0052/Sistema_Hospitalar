import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  TIPOS_NOTIFICACAO,
  conteudoDisponivel,
  contarNaoLidas,
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "../../api/notificacoes";
import { useToast } from "../ui";

const INTERVALO_POLLING_MS = 60000;

export function tempoRelativo(iso) {
  if (!iso) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const horas = Math.round(diffMin / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

/** Sino do Header: contador por polling (60 s e a cada troca de rota) + dropdown com as 10 mais recentes. */
export function NotificacoesSino() {
  const navigate = useNavigate();
  const location = useLocation();
  const { info: toastInfo } = useToast();
  const [aberto, setAberto] = useState(false);
  const [total, setTotal] = useState(0);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const raizRef = useRef(null);

  const atualizarContagem = useCallback(async () => {
    try {
      setTotal(await contarNaoLidas());
    } catch {
      /* contador é opcional: falha de rede não deve interromper a navegação */
    }
  }, []);

  const carregarLista = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const dados = await listarNotificacoes({ tamanho: 10 });
      setItens(dados.itens || []);
    } catch (err) {
      setErro(err?.mensagem || "Não foi possível carregar as notificações.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Polling a cada 60 s e ao trocar de rota
  useEffect(() => {
    atualizarContagem();
  }, [atualizarContagem, location.pathname]);

  useEffect(() => {
    const timer = setInterval(atualizarContagem, INTERVALO_POLLING_MS);
    return () => clearInterval(timer);
  }, [atualizarContagem]);

  // Esc fecha; clique fora fecha
  useEffect(() => {
    if (!aberto) return undefined;
    function aoTeclar(e) {
      if (e.key === "Escape") setAberto(false);
    }
    function aoClicarFora(e) {
      if (raizRef.current && !raizRef.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto]);

  function alternar() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);
    if (vaiAbrir) carregarLista();
  }

  async function abrirNotificacao(n) {
    setAberto(false);
    if (!(await conteudoDisponivel(n))) {
      toastInfo("Este conteúdo não está mais disponível.");
    } else {
      navigate(n.link);
    }
    if (!n.lida) {
      try {
        await marcarNotificacaoLida(n.id_notificacao);
      } catch {
        /* a leitura será refeita na próxima consulta */
      }
    }
    atualizarContagem();
  }

  async function marcarTodas() {
    try {
      await marcarTodasNotificacoesLidas();
      setItens((atuais) => atuais.map((n) => ({ ...n, lida: true })));
      setTotal(0);
    } catch (err) {
      setErro(err?.mensagem || "Não foi possível marcar como lidas.");
    }
  }

  const rotuloContador = total > 9 ? "9+" : String(total);

  return (
    <div className="relative" ref={raizRef}>
      <button
        type="button"
        onClick={alternar}
        aria-label={`Notificações, ${total} não ${total === 1 ? "lida" : "lidas"}`}
        aria-expanded={aberto}
        aria-haspopup="true"
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
        {total > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ backgroundColor: "var(--bordeaux)" }}
          >
            {rotuloContador}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="region"
          aria-label="Notificações recentes"
          className="absolute right-0 top-11 w-96 max-w-[90vw] bg-white rounded-xl z-50 overflow-hidden"
          style={{ boxShadow: "var(--shadow-lg)", border: "1px solid var(--color-border)" }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <span className="font-semibold text-sm text-[#1e293b]">Notificações</span>
            <button
              type="button"
              onClick={marcarTodas}
              disabled={total === 0}
              className="text-xs font-medium text-[#800020] hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {carregando ? (
              <p className="px-4 py-6 text-xs text-[#64748b] text-center" role="status">
                Carregando…
              </p>
            ) : erro ? (
              <div className="px-4 py-4 text-xs text-[#b91c1c]" role="alert">
                {erro}{" "}
                <button type="button" onClick={carregarLista} className="font-semibold underline cursor-pointer">
                  Tentar novamente
                </button>
              </div>
            ) : itens.length === 0 ? (
              <p className="px-4 py-6 text-xs text-[#64748b] text-center">Nenhuma notificação por enquanto.</p>
            ) : (
              <ul>
                {itens.map((n) => {
                  const tipo = TIPOS_NOTIFICACAO[n.tipo] || { icone: "🔔", rotulo: "Notificação" };
                  return (
                    <li key={n.id_notificacao} className="border-b border-slate-100 last:border-none">
                      <button
                        type="button"
                        onClick={() => abrirNotificacao(n)}
                        className="w-full text-left px-4 py-3 flex gap-2.5 items-start hover:bg-slate-50 cursor-pointer"
                      >
                        <span aria-hidden="true" className="text-base leading-none mt-0.5">
                          {tipo.icone}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="sr-only">{tipo.rotulo}: </span>
                          <span
                            className={`block text-xs text-[#334155] ${n.lida ? "font-normal" : "font-bold"}`}
                          >
                            {n.titulo}
                          </span>
                          <span className="block text-[11px] text-[#94a3b8] mt-0.5">
                            {tempoRelativo(n.data_criacao)}
                          </span>
                        </span>
                        {!n.lida && (
                          <span
                            aria-label="Não lida"
                            className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "var(--bordeaux)" }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="px-4 py-2.5 text-center" style={{ borderTop: "1px solid var(--color-border)" }}>
            <Link
              to="/notificacoes"
              onClick={() => setAberto(false)}
              className="text-xs font-semibold text-[#800020] hover:underline"
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificacoesSino;

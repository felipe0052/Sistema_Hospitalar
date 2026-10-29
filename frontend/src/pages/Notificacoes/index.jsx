import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TIPOS_NOTIFICACAO,
  conteudoDisponivel,
  listarNotificacoes,
  marcarNotificacaoLida,
  marcarTodasNotificacoesLidas,
} from "../../api/notificacoes";
import { Button, Card, EmptyState, ErrorBanner, Pagination, Skeleton, useToast } from "../../components/ui";
import { tempoRelativo } from "../../components/layout/NotificacoesSino";

const TAMANHO = 15;

export default function Notificacoes() {
  const navigate = useNavigate();
  const { sucesso, info: toastInfo, erro: toastErro } = useToast();
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      setDados(await listarNotificacoes({ pagina, tamanho: TAMANHO, apenasNaoLidas }));
    } catch (err) {
      setErro(err?.mensagem || "Não foi possível carregar as notificações.");
    } finally {
      setCarregando(false);
    }
  }, [pagina, apenasNaoLidas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function abrir(n) {
    if (!n.lida) {
      try {
        await marcarNotificacaoLida(n.id_notificacao);
      } catch {
        /* segue para o conteúdo mesmo se a marcação falhar */
      }
    }
    if (await conteudoDisponivel(n)) navigate(n.link);
    else {
      toastInfo("Este conteúdo não está mais disponível.");
      carregar();
    }
  }

  async function marcarTodas() {
    try {
      await marcarTodasNotificacoesLidas();
      sucesso("Todas as notificações foram marcadas como lidas.");
      carregar();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível marcar como lidas.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Notificações</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Novidades de notícias, eventos e reconhecimentos</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
            <input
              type="checkbox"
              checked={apenasNaoLidas}
              onChange={(e) => {
                setApenasNaoLidas(e.target.checked);
                setPagina(1);
              }}
            />
            Apenas não lidas
          </label>
          <Button variant="secondary" onClick={marcarTodas}>
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      {erro ? (
        <ErrorBanner message={erro} onRetry={carregar} />
      ) : carregando ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="64px" />
          ))}
        </div>
      ) : dados.itens.length === 0 ? (
        <Card>
          <EmptyState
            title={apenasNaoLidas ? "Nenhuma notificação não lida" : "Nenhuma notificação por enquanto"}
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {dados.itens.map((n) => {
            const tipo = TIPOS_NOTIFICACAO[n.tipo] || { icone: "🔔", rotulo: "Notificação" };
            return (
              <li key={n.id_notificacao}>
                <Card className="p-0">
                  <button
                    type="button"
                    onClick={() => abrir(n)}
                    className="w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 rounded-xl"
                  >
                    <span aria-hidden="true" className="text-xl leading-none mt-0.5">
                      {tipo.icone}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                        {tipo.rotulo}
                      </span>
                      <span className={`block text-sm text-[#1e293b] ${n.lida ? "" : "font-bold"}`}>{n.titulo}</span>
                      <span className="block text-xs text-[#94a3b8] mt-0.5">{tempoRelativo(n.data_criacao)}</span>
                    </span>
                    {!n.lida && (
                      <span
                        aria-label="Não lida"
                        className="mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: "var(--bordeaux)" }}
                      />
                    )}
                  </button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {dados.total > TAMANHO && (
        <div className="flex justify-center">
          <Pagination pagina={pagina} tamanho={TAMANHO} total={dados.total} onPageChange={setPagina} />
        </div>
      )}
    </div>
  );
}

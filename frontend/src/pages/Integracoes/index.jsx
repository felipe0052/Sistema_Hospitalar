import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  definirReceberTodosGoogle,
  desconectarGoogle,
  obterStatusGoogle,
  obterUrlConexaoGoogle,
  sincronizarEventosGoogle,
} from "../../api/googleAgenda";
import { Button, Card, ConfirmDialog, ErrorBanner, Skeleton, useToast } from "../../components/ui";

const MENSAGENS_RETORNO = {
  conectado: ["sucesso", "Google Agenda conectado com sucesso."],
  ok: ["sucesso", "Google Agenda conectado com sucesso."],
  negado: ["erro", "Conexão com o Google cancelada. Nada foi gravado."],
  cancelado: ["erro", "Conexão com o Google cancelada. Nada foi gravado."],
  erro: ["erro", "Não foi possível conectar ao Google. Tente novamente."],
};

export default function Integracoes() {
  const { sucesso, erro: toastErro } = useToast();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [problema, setProblema] = useState(""); // 409/ERRO: pede para reconectar
  const [confirmarDesconexao, setConfirmarDesconexao] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      setStatus(await obterStatusGoogle());
    } catch (err) {
      setErro(err?.mensagem || "Não foi possível carregar o status da integração.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Retorno do callback do OAuth: ?google=ok|conectado|cancelado|negado|erro
  useEffect(() => {
    const retorno = params.get("google");
    if (!retorno) return;
    const [tipo, mensagem] = MENSAGENS_RETORNO[retorno] || MENSAGENS_RETORNO.erro;
    if (tipo === "sucesso") sucesso(mensagem);
    else toastErro(mensagem);
    params.delete("google");
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function conectar() {
    setOcupado(true);
    try {
      window.location.href = await obterUrlConexaoGoogle();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível iniciar a conexão com o Google.");
      setOcupado(false);
    }
  }

  async function sincronizar() {
    setSincronizando(true);
    setProblema("");
    setResumo(null);
    try {
      setResumo(await sincronizarEventosGoogle());
      await carregar();
    } catch (err) {
      if (err?.status === 409 && /reconecte/i.test(err.mensagem || "")) {
        setProblema(err.mensagem);
        await carregar();
      } else {
        toastErro(err?.mensagem || "Não foi possível sincronizar agora. O calendário interno não foi afetado.");
      }
    } finally {
      setSincronizando(false);
    }
  }

  async function alternarReceberTodos(ativo) {
    setOcupado(true);
    try {
      await definirReceberTodosGoogle(ativo);
      sucesso(ativo ? "Os novos eventos serão enviados automaticamente." : "Envio automático desativado.");
      await carregar();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível alterar a preferência.");
    } finally {
      setOcupado(false);
    }
  }

  async function desconectar() {
    setOcupado(true);
    try {
      await desconectarGoogle();
      sucesso("Google Agenda desconectado.");
      setConfirmarDesconexao(false);
      setResumo(null);
      await carregar();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível desconectar.");
    } finally {
      setOcupado(false);
    }
  }

  const conectado = Boolean(status?.conectado);
  const indisponivel = status && !status.configurado;
  const adicionados = resumo ? resumo.criados + resumo.atualizados : 0;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-[#1e293b]">Integrações</h1>
        <p className="text-sm text-[#64748b] mt-0.5">Conexões opcionais da sua conta com serviços externos</p>
      </div>

      {erro ? (
        <ErrorBanner message={erro} onRetry={carregar} />
      ) : carregando && !status ? (
        <Skeleton height="180px" />
      ) : (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#1e293b]">📅 Google Agenda</h2>
            <span className={`text-xs font-semibold ${conectado ? "text-[#15803d]" : "text-[#64748b]"}`}>
              {conectado ? "Conectado" : "Não conectado"}
            </span>
          </div>

          <p className="text-sm text-[#475569]">
            Integração <strong>opcional</strong>. Conecte sua conta Google e sincronize os eventos da intranet com o seu
            Google Agenda. Os lembretes no celular dependem das configurações do app Google Agenda e do seu aparelho.
            Quem não conecta usa o calendário interno normalmente.
          </p>

          {indisponivel && (
            <p role="alert" className="rounded-lg border border-[#f1c5cf] bg-[#fff5f6] p-3 text-xs text-[#800020]">
              A integração ainda não foi configurada no servidor. Fale com a TI.
            </p>
          )}

          {problema && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <span>{problema}</span>
              <Button variant="primary" size="sm" onClick={conectar} loading={ocupado}>
                Reconectar
              </Button>
            </div>
          )}

          {!conectado && !indisponivel && (
            <Button variant="primary" onClick={conectar} loading={ocupado}>
              Conectar Google Agenda
            </Button>
          )}

          {conectado && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={sincronizar} loading={sincronizando} disabled={ocupado}>
                  {sincronizando ? "Sincronizando…" : "Sincronizar eventos"}
                </Button>
                <Button variant="danger" onClick={() => setConfirmarDesconexao(true)} disabled={sincronizando}>
                  Desconectar
                </Button>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(status?.receber_todos)}
                  disabled={ocupado || sincronizando}
                  onChange={(e) => alternarReceberTodos(e.target.checked)}
                />
                Enviar automaticamente os novos eventos
              </label>

              {resumo && (
                <div role="status" className="rounded-lg border border-[#86efac] bg-[#dcfce7] p-3 text-sm text-[#15803d]">
                  {adicionados === 0 && resumo.erros.length === 0
                    ? `Tudo em dia: ${resumo.sem_alteracao} evento(s) já estavam na sua agenda.`
                    : `${resumo.criados} ${resumo.criados === 1 ? "evento adicionado" : "eventos adicionados"}${
                        resumo.atualizados ? `, ${resumo.atualizados} atualizado(s)` : ""
                      }.`}
                </div>
              )}

              {resumo && resumo.erros.length > 0 && (
                <div role="alert" className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-sm text-[#b91c1c] space-y-2">
                  <p>Alguns eventos não puderam ser enviados:</p>
                  <ul className="list-disc pl-5">
                    {resumo.erros.map((e) => (
                      <li key={e.id_evento}>
                        Evento #{e.id_evento}: {e.mensagem}
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" size="sm" onClick={sincronizar} loading={sincronizando}>
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={confirmarDesconexao}
        title="Desconectar Google Agenda"
        message="Deseja desconectar? Os eventos já criados na sua agenda do Google permanecem lá."
        confirmLabel="Desconectar"
        variant="danger"
        loading={ocupado}
        onConfirm={desconectar}
        onCancel={() => setConfirmarDesconexao(false)}
      />
    </div>
  );
}

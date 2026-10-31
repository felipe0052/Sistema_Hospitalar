import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  definirReceberTodosGoogle,
  desconectarGoogle,
  obterStatusGoogle,
  obterUrlConexaoGoogle,
  sincronizarEventosGoogle,
} from "../../api/googleAgenda";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorBanner,
  Skeleton,
  useToast,
} from "../../components/ui";

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
        toastErro(
          err?.mensagem ||
            "Não foi possível sincronizar agora. O calendário interno não foi afetado.",
        );
      }
    } finally {
      setSincronizando(false);
    }
  }

  async function alternarReceberTodos(ativo) {
    setOcupado(true);
    try {
      await definirReceberTodosGoogle(ativo);
      sucesso(
        ativo
          ? "Os novos eventos serão enviados automaticamente."
          : "Envio automático desativado.",
      );
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
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho padronizado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Integrações</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Conexões opcionais da sua conta com serviços externos
          </p>
        </div>
        {!carregando && status && (
          <Badge variant={conectado ? "ativo" : "default"}>
            {conectado ? "1 integração ativa" : "Nenhuma integração ativa"}
          </Badge>
        )}
      </div>

      {erro ? (
        <ErrorBanner message={erro} onRetry={carregar} />
      ) : carregando && !status ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" aria-busy="true">
          <Card className="lg:col-span-7 xl:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton width="48px" height="48px" />
              <div className="flex-1 space-y-2">
                <Skeleton width="200px" height="20px" />
                <Skeleton width="280px" height="14px" />
              </div>
            </div>
            <Skeleton width="100%" height="60px" />
            <Skeleton width="180px" height="38px" />
          </Card>
          <Card className="lg:col-span-5 xl:col-span-4 space-y-3">
            <Skeleton width="160px" height="18px" />
            <Skeleton width="100%" height="120px" />
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Card Principal: Google Agenda */}
          <Card className="lg:col-span-7 xl:col-span-8 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Topo do Card: Ícone + Nome do Serviço + Badge de Status */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    aria-hidden="true"
                    className="w-12 h-12 rounded-xl bg-[#fff5f5] border border-[#f1c5cf] text-[#800020] flex items-center justify-center text-2xl shrink-0"
                  >
                    📅
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-[#1e293b]">Google Agenda</h2>
                    <p className="text-xs text-[#64748b] mt-0.5">
                      Sincronização de treinamentos, reuniões e eventos institucionais
                    </p>
                  </div>
                </div>
                <Badge variant={conectado ? "ativo" : "default"}>
                  {conectado ? "Conectado" : "Não conectado"}
                </Badge>
              </div>

              <p className="text-sm text-[#475569] leading-relaxed">
                Integração <strong>opcional</strong>. Conecte sua conta Google e sincronize os
                eventos da intranet com o seu Google Agenda. Os lembretes no celular dependem das
                configurações do app Google Agenda e do seu aparelho. Quem não conecta usa o
                calendário interno normalmente.
              </p>

              {indisponivel && (
                <p
                  role="alert"
                  className="rounded-lg border border-[#f1c5cf] bg-[#fff5f6] p-3.5 text-xs font-medium text-[#800020]"
                >
                  A integração ainda não foi configurada no servidor. Fale com a TI.
                </p>
              )}

              {problema && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900"
                >
                  <span>{problema}</span>
                  <Button variant="primary" size="sm" onClick={conectar} loading={ocupado}>
                    Reconectar
                  </Button>
                </div>
              )}

              {conectado && (
                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-[#1e293b] cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-slate-300"
                      checked={Boolean(status?.receber_todos)}
                      disabled={ocupado || sincronizando}
                      onChange={(e) => alternarReceberTodos(e.target.checked)}
                    />
                    <span className="space-y-0.5">
                      <span className="font-semibold block">
                        Enviar automaticamente os novos eventos
                      </span>
                      <span className="text-xs text-[#64748b] block">
                        Sempre que um novo evento corporativo for publicado na intranet, ele será
                        adicionado à sua agenda.
                      </span>
                    </span>
                  </label>

                  {resumo && (
                    <div
                      role="status"
                      className="rounded-lg border border-[#86efac] bg-[#dcfce7] p-3 text-sm text-[#15803d]"
                    >
                      {adicionados === 0 && resumo.erros.length === 0
                        ? `Tudo em dia: ${resumo.sem_alteracao} evento(s) já estavam na sua agenda.`
                        : `${resumo.criados} ${
                            resumo.criados === 1 ? "evento adicionado" : "eventos adicionados"
                          }${
                            resumo.atualizados ? `, ${resumo.atualizados} atualizado(s)` : ""
                          }.`}
                    </div>
                  )}

                  {resumo && resumo.erros.length > 0 && (
                    <div
                      role="alert"
                      className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-sm text-[#b91c1c] space-y-2"
                    >
                      <p>Alguns eventos não puderam ser enviados:</p>
                      <ul className="list-disc pl-5">
                        {resumo.erros.map((e) => (
                          <li key={e.id_evento}>
                            Evento #{e.id_evento}: {e.mensagem}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={sincronizar}
                        loading={sincronizando}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé de Ações */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#64748b]">
                {conectado
                  ? "Sua conta está vinculada via OAuth 2.0 seguro."
                  : "Você pode desconectar sua conta a qualquer momento."}
              </span>

              <div className="flex flex-wrap items-center gap-2.5">
                {!conectado && !indisponivel && (
                  <Button variant="primary" onClick={conectar} loading={ocupado}>
                    Conectar Google Agenda
                  </Button>
                )}

                {conectado && (
                  <>
                    <Button
                      variant="primary"
                      onClick={sincronizar}
                      loading={sincronizando}
                      disabled={ocupado}
                    >
                      {sincronizando ? "Sincronizando…" : "Sincronizar eventos"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setConfirmarDesconexao(true)}
                      disabled={sincronizando}
                    >
                      Desconectar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Card Lateral: Informações de Funcionamento e Privacidade */}
          <Card className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1e293b]">Como funciona a integração</h3>
              <ul className="space-y-3 text-xs text-[#475569] leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#fff5f5] text-[#800020] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    <strong>Autorização segura:</strong> o acesso utiliza OAuth 2.0 oficial do
                    Google restrito apenas à criação e atualização dos eventos corporativos.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#fff5f5] text-[#800020] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    <strong>Sem duplicidades:</strong> ao clicar em{" "}
                    <em>Sincronizar eventos</em>, apenas eventos futuros novos ou alterados são
                    enviados para sua agenda.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#fff5f5] text-[#800020] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    <strong>Controle total:</strong> caso desconecte sua conta, nenhuma nova
                    sincronização será feita e sua agenda interna continuará funcionando
                    normalmente.
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-[#64748b]">
              Dica: você também pode sincronizar eventos diretamente pela aba{" "}
              <strong>Calendário</strong> no Mural de Eventos.
            </div>
          </Card>
        </div>
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

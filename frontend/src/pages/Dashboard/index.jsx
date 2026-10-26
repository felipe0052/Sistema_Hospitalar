import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarAniversariantesMes } from "../../api/aniversariantes";
import { listarEventos } from "../../api/eventos";
import { obterDashboard } from "../../api/dashboard";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  MiniCalendario,
  Skeleton,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const CATEGORIA_AVISO_LABELS = {
  NOTICIA: "Notícia",
  COMUNICADO: "Comunicado",
  PROMOCAO: "Promoção",
  MUDANCA_SETOR: "Mudança de Setor",
  DESTAQUE_CORPORATIVO: "Destaque Corporativo",
};

const CATEGORIA_AVISO_BADGE_VARIANT = {
  NOTICIA: "primary",
  COMUNICADO: "info",
  PROMOCAO: "ativo",
  MUDANCA_SETOR: "warning",
  DESTAQUE_CORPORATIVO: "primary",
};

const CATEGORIA_EVENTO_LABELS = {
  TREINAMENTO: "Treinamento",
  ACAO_INTERNA: "Ação Interna",
  INSTITUCIONAL: "Institucional",
  OUTRO: "Outro",
};

function obterSaudacaoHorario(data = new Date()) {
  const hora = data.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function formatarDataExtenso(data = new Date()) {
  try {
    return data.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function useAniversariantesMes() {
  const hoje = new Date();
  const [lista, setLista] = useState([]);
  useEffect(() => {
    listarAniversariantesMes(hoje.getMonth() + 1)
      .then((l) => setLista(l || []))
      .catch(() => setLista([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return lista;
}

export default function Dashboard() {
  const { usuario, autenticado, temPerfil } = useAuth();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [indiceDestaque, setIndiceDestaque] = useState(0);
  const aniversariantesMes = useAniversariantesMes();
  const [diaAniv, setDiaAniv] = useState(null);
  const hojeCal = new Date();
  const diasComAniv = useMemo(() => new Set(aniversariantesMes.map((a) => a.dia)), [aniversariantesMes]);
  const aniversariantesDoDiaSel = aniversariantesMes.filter((a) => a.dia === diaAniv);
  const [eventosMes, setEventosMes] = useState([]);
  useEffect(() => {
    listarEventos({ mes: hojeCal.getMonth() + 1, ano: hojeCal.getFullYear() })
      .then((l) => setEventosMes(l || []))
      .catch(() => setEventosMes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const diasComEvento = useMemo(
    () => new Set(eventosMes.map((ev) => new Date(ev.data_inicio).getDate())),
    [eventosMes],
  );
  const eventosDoDiaSel = eventosMes.filter((ev) => new Date(ev.data_inicio).getDate() === diaAniv);

  const carregarDashboard = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await obterDashboard();
      setDados(resposta || {});
      setIndiceDestaque(0);
    } catch (err) {
      setErro(err?.mensagem || "Não foi possível carregar os dados do painel inicial.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const saudacao = useMemo(() => obterSaudacaoHorario(), []);
  const dataAtualExtenso = useMemo(() => formatarDataExtenso(), []);
  const primeiroNome = usuario?.nome?.split(" ")[0] || "Colaborador";

  const avisosDestaque = Array.isArray(dados?.avisos_destaque) ? dados.avisos_destaque : [];
  const ultimosAvisos = Array.isArray(dados?.ultimos_avisos) ? dados.ultimos_avisos : [];
  const proximosEventos = Array.isArray(dados?.proximos_eventos) ? dados.proximos_eventos : [];
  const aniversariantesHoje = Array.isArray(dados?.aniversariantes_hoje)
    ? dados.aniversariantes_hoje
    : [];
  const totalAniversariantesMes =
    typeof dados?.total_aniversariantes_mes === "number"
      ? dados.total_aniversariantes_mes
      : aniversariantesHoje.length;

  const destaqueAtual = avisosDestaque[indiceDestaque] || avisosDestaque[0] || null;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Cabeçalho com Saudação personalizada e Data atual */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">
            {saudacao}, {primeiroNome}
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5 capitalize">
            {dataAtualExtenso} · Intranet Corporativa do Hospital Decós
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {autenticado && temPerfil("ADMIN", "RH", "MARKETING") && (
            <Link to="/avisos">
              <Button variant="secondary" size="sm">
                Gerenciar Avisos
              </Button>
            </Link>
          )}
          {autenticado && temPerfil("ADMIN", "RH") && (
            <Link to="/admin/usuarios">
              <Button variant="primary" size="sm">
                Gerenciar Usuários e Acesso
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Banner de Erro com botão Tentar novamente */}
      {erro && <ErrorBanner message={erro} onRetry={carregarDashboard} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Coluna Esquerda: Bloco de Destaques + Feed de Notícias Recentes */}
        <div className="space-y-6">
          {/* Bloco de Destaques */}
          <section aria-label="Destaques corporativos" className="space-y-2.5">
            {carregando ? (
              <Card className="space-y-3">
                <Skeleton width="160px" height="1.25rem" />
                <Skeleton width="80%" height="1.75rem" />
                <Skeleton width="100%" height="3rem" />
              </Card>
            ) : destaqueAtual ? (
              <Card className="destaque-banner space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full destaque-banner__pill">
                      ★ Destaque Corporativo
                    </span>
                    <span className="text-xs text-[#64748b] font-medium">
                      {CATEGORIA_AVISO_LABELS[destaqueAtual.categoria] || destaqueAtual.categoria}
                    </span>
                  </div>
                  {avisosDestaque.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {avisosDestaque.map((item, idx) => (
                        <button
                          key={item.id_aviso}
                          type="button"
                          onClick={() => setIndiceDestaque(idx)}
                          aria-label={`Ver destaque ${idx + 1}`}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            idx === indiceDestaque ? "bg-[#800020] scale-110" : "bg-[#800020]/25"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <h2 className="text-lg font-bold text-[#1e293b] leading-snug">
                  <Link
                    to={`/avisos/${destaqueAtual.id_aviso}`}
                    className="hover:underline text-[#1e293b]"
                  >
                    {destaqueAtual.titulo}
                  </Link>
                </h2>

                <p className="text-sm text-[#475569] leading-relaxed">{destaqueAtual.resumo}</p>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748b]">
                  <span>Por {destaqueAtual.autor?.nome || "Comunicação Institucional"}</span>
                  <Link
                    to={`/avisos/${destaqueAtual.id_aviso}`}
                    className="inline-flex items-center gap-1 destaque-banner__cta"
                  >
                    Ler comunicado completo →
                  </Link>
                </div>
              </Card>
            ) : null}
          </section>

          {/* Feed de Notícias Recentes */}
          <section aria-label="Notícias e comunicados recentes" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1e293b]">
                Últimos Avisos e Comunicados
              </h2>
              <Link
                to="/avisos"
                className="text-xs font-semibold text-[#800020] hover:underline"
              >
                Ver todas as notícias →
              </Link>
            </div>

            {carregando ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <Card key={n} className="space-y-2">
                    <Skeleton width="110px" height="1.25rem" />
                    <Skeleton width="75%" height="1.5rem" />
                    <Skeleton width="100%" height="2.25rem" />
                  </Card>
                ))}
              </div>
            ) : ultimosAvisos.length === 0 ? (
              <Card>
                <EmptyState title="Não há avisos no momento" />
              </Card>
            ) : (
              <div className="space-y-3">
                {ultimosAvisos.map((aviso) => (
                  <Card
                    key={aviso.id_aviso}
                    className="space-y-1.5 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={CATEGORIA_AVISO_BADGE_VARIANT[aviso.categoria] || "default"}>
                          {CATEGORIA_AVISO_LABELS[aviso.categoria] || aviso.categoria}
                        </Badge>
                        {aviso.destaque && <Badge variant="primary">Destaque</Badge>}
                      </div>
                      <span className="text-xs text-[#64748b]">
                        {new Date(aviso.data_publicacao).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#1e293b]">
                      <Link
                        to={`/avisos/${aviso.id_aviso}`}
                        className="hover:text-[#800020] transition-colors"
                      >
                        {aviso.titulo}
                      </Link>
                    </h3>

                    <p className="text-xs text-[#64748b] leading-relaxed">{aviso.resumo}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Coluna Direita: Próximos Eventos + Aniversariantes do Dia */}
        <div className="space-y-6">
          {/* Widget Próximos Eventos */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1e293b]">Próximos Eventos</h2>
              <Link
                to="/eventos"
                className="text-xs font-semibold text-[#800020] hover:underline"
              >
                Ver calendário →
              </Link>
            </div>

            {carregando ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <Skeleton width="44px" height="44px" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton width="90%" height="1rem" />
                      <Skeleton width="60%" height="0.75rem" />
                    </div>
                  </div>
                ))}
              </div>
            ) : proximosEventos.length === 0 ? (
              <p className="text-xs text-[#64748b] py-2">Não há eventos programados</p>
            ) : (
              <div className="space-y-3">
                {proximosEventos.map((ev) => {
                  const dt = new Date(ev.data_inicio);
                  return (
                    <div
                      key={ev.id_evento}
                      className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-none last:pb-0"
                    >
                      <div className="w-11 py-1.5 rounded-lg bg-[#fff5f5] border border-[#f1c5cf] text-[#800020] text-center flex-shrink-0">
                        <div className="text-base font-black leading-none">
                          {String(dt.getDate()).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] font-bold uppercase mt-0.5">
                          {dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold uppercase text-[#800020]">
                            {CATEGORIA_EVENTO_LABELS[ev.categoria] || ev.categoria}
                          </span>
                        </div>
                        <Link
                          to="/eventos"
                          className="text-xs font-semibold text-[#1e293b] hover:text-[#800020] leading-snug block"
                        >
                          {ev.titulo}
                        </Link>
                        <div className="text-[11px] text-[#64748b] mt-0.5">
                          {ev.local || "Local a definir"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Widget Aniversariantes do Dia */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1e293b]">🎂 Aniversariantes do Dia</h2>
              <Link
                to="/aniversariantes"
                className="text-xs font-semibold text-[#800020] hover:underline"
              >
                Ver mês ({totalAniversariantesMes}) →
              </Link>
            </div>

            {carregando ? (
              <div className="space-y-2.5">
                <Skeleton width="100%" height="3.25rem" />
                <Skeleton width="100%" height="3.25rem" />
              </div>
            ) : aniversariantesHoje.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 text-xs text-[#64748b]">
                Nenhum colaborador aniversariando hoje. Confira os{" "}
                <Link to="/aniversariantes" className="font-semibold text-[#800020] hover:underline">
                  {totalAniversariantesMes} aniversariantes deste mês
                </Link>
                .
              </div>
            ) : (
              <div className="space-y-2.5">
                {aniversariantesHoje.map((aniv) => (
                  <div
                    key={aniv.id_usuario}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-r from-[#fff5f6] to-white border border-[#f1c5cf]"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1e293b]">{aniv.nome}</div>
                      <div className="text-[11px] text-[#64748b]">
                        {aniv.cargo || "Colaborador"} ·{" "}
                        {aniv.setor?.nome || "Setor não informado"}
                      </div>
                      <div className="text-[11px] font-medium text-[#800020] mt-0.5">
                        Parabéns pelo seu dia! 🎉
                      </div>
                    </div>
                    <Badge variant="primary">Hoje</Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <MiniCalendario
                ano={hojeCal.getFullYear()}
                mes={hojeCal.getMonth() + 1}
                marcados={diasComAniv}
                marcadosEventos={diasComEvento}
                diaSelecionado={diaAniv}
                onSelecionarDia={setDiaAniv}
              />
              {diaAniv && (
                <ul className="text-xs text-[#475569] space-y-1">
                  {eventosDoDiaSel.map((ev) => (
                    <li key={`ev-${ev.id_evento}`}>
                      📅 <strong>{ev.titulo}</strong>
                      {ev.local ? ` · ${ev.local}` : ""} ·{" "}
                      {new Date(ev.data_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </li>
                  ))}
                  {aniversariantesDoDiaSel.map((a) => (
                    <li key={a.id_usuario}>
                      🎂 <strong>{a.nome}</strong> · {a.setor?.nome || "Setor não informado"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

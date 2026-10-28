import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  atualizarEvento,
  criarEvento,
  excluirEvento,
  listarEventos,
} from "../../api/eventos";
import { listarAniversariantesMes } from "../../api/aniversariantes";
import { listarSetores } from "../../api/setores";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  Modal,
  SearchInput,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { formatarData } from "../../utils/date";

const CATEGORIAS_EVENTO_CHIPS = [
  { value: "", label: "Todas" },
  { value: "TREINAMENTO", label: "Treinamento" },
  { value: "ACAO_INTERNA", label: "Ação Interna" },
  { value: "INSTITUCIONAL", label: "Institucional" },
  { value: "OUTRO", label: "Outro" },
];

const OPCOES_CATEGORIA_SELECT = [
  { value: "TREINAMENTO", label: "Treinamento" },
  { value: "ACAO_INTERNA", label: "Ação Interna" },
  { value: "INSTITUCIONAL", label: "Institucional" },
  { value: "OUTRO", label: "Outro" },
];

export const CATEGORIA_EVENTO_LABELS = {
  TREINAMENTO: "Treinamento",
  ACAO_INTERNA: "Ação Interna",
  INSTITUCIONAL: "Institucional",
  OUTRO: "Outro",
};

const CATEGORIA_BADGE_VARIANT = {
  TREINAMENTO: "primary",
  ACAO_INTERNA: "ativo",
  INSTITUCIONAL: "info",
  OUTRO: "default",
};

const NOMES_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatarHorarioIntervalo(inicioIso, fimIso) {
  if (!inicioIso) return "—";
  try {
    const dtIni = new Date(inicioIso);
    const iniStr = dtIni.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!fimIso) return `Às ${iniStr}`;
    const dtFim = new Date(fimIso);
    const fimStr = dtFim.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${iniStr} às ${fimStr}`;
  } catch {
    return String(inicioIso);
  }
}

function formatarDataCompleta(iso) {
  return formatarData(iso);
}

function paraInputDateTimeLocal(iso) {
  if (!iso) return "";
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  } catch {
    return "";
  }
}

function chaveDataLocal(isoOuDate) {
  const dt = isoOuDate instanceof Date ? isoOuDate : new Date(isoOuDate);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export default function Eventos() {
  const { autenticado, temPerfil } = useAuth();
  const podeGerir = autenticado && temPerfil("ADMIN", "MARKETING");
  const { sucesso, erro: toastErro } = useToast();

  // Modo de visualização: "lista" (padrão) ou "calendario"
  const [abaAtiva, setAbaAtiva] = useState("lista");

  // Filtros
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [setorFiltro, setSetorFiltro] = useState("");
  const [busca, setBusca] = useState("");

  // Estado do Calendário (mês 1–12 e ano)
  const hoje = useMemo(() => new Date(), []);
  const [mesCalendario, setMesCalendario] = useState(hoje.getMonth() + 1);
  const [anoCalendario, setAnoCalendario] = useState(hoje.getFullYear());
  const [diaSelecionado, setDiaSelecionado] = useState(null); // string "YYYY-MM-DD" ou null

  // Dados carregados
  const [eventos, setEventos] = useState([]);
  const [setores, setSetores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  // Modal de Detalhe do Evento
  const [eventoDetalhe, setEventoDetalhe] = useState(null);

  // Modal de Cadastro / Edição
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [formDados, setFormDados] = useState({
    titulo: "",
    categoria: "TREINAMENTO",
    data_inicio: "",
    data_fim: "",
    local: "",
    id_setor: "",
    descricao: "",
  });
  const [errosForm, setErrosForm] = useState({});
  const [salvandoForm, setSalvandoForm] = useState(false);

  // Confirmação de Exclusão
  const [eventoExcluindo, setEventoExcluindo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    listarSetores()
      .then((lista) => setSetores(lista || []))
      .catch(() => {});
  }, []);

  const carregarEventos = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const params = {
        categoria: categoriaFiltro || undefined,
        id_setor: setorFiltro ? Number(setorFiltro) : undefined,
        busca: busca || undefined,
      };
      if (abaAtiva === "calendario") {
        params.mes = mesCalendario;
        params.ano = anoCalendario;
      }
      const lista = await listarEventos(params);
      setEventos(lista || []);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os eventos.");
    } finally {
      setCarregando(false);
    }
  }, [abaAtiva, anoCalendario, busca, categoriaFiltro, mesCalendario, setorFiltro]);

  useEffect(() => {
    carregarEventos();
  }, [carregarEventos]);

  // Aniversariantes do mês exibido no calendário
  const [aniversariantes, setAniversariantes] = useState([]);
  useEffect(() => {
    if (abaAtiva !== "calendario") return;
    let cancelado = false;
    listarAniversariantesMes(mesCalendario)
      .then((l) => !cancelado && setAniversariantes(l || []))
      .catch(() => !cancelado && setAniversariantes([]));
    return () => {
      cancelado = true;
    };
  }, [abaAtiva, mesCalendario]);

  const handleBusca = useCallback((termo) => {
    setBusca(termo);
  }, []);

  // Mapa de eventos por dia "YYYY-MM-DD" para o Calendário
  const eventosPorDia = useMemo(() => {
    const mapa = {};
    for (const ev of eventos) {
      const chave = chaveDataLocal(ev.data_inicio);
      if (!mapa[chave]) mapa[chave] = [];
      mapa[chave].push(ev);
    }
    return mapa;
  }, [eventos]);

  // Grade de dias do mês selecionado no calendário
  const celulasCalendario = useMemo(() => {
    const primeiroDiaSemana = new Date(anoCalendario, mesCalendario - 1, 1).getDay();
    const totalDiasMes = new Date(anoCalendario, mesCalendario, 0).getDate();
    const celulas = [];
    for (let i = 0; i < primeiroDiaSemana; i += 1) {
      celulas.push(null);
    }
    const pad = (n) => String(n).padStart(2, "0");
    for (let dia = 1; dia <= totalDiasMes; dia += 1) {
      const chave = `${anoCalendario}-${pad(mesCalendario)}-${pad(dia)}`;
      celulas.push({
        dia,
        chave,
        eventos: eventosPorDia[chave] || [],
        aniversariantes: aniversariantes.filter((a) => a.dia === dia),
      });
    }
    return celulas;
  }, [anoCalendario, mesCalendario, eventosPorDia, aniversariantes]);

  const eventosLateralCalendario = useMemo(() => {
    if (!diaSelecionado) return eventos;
    return eventosPorDia[diaSelecionado] || [];
  }, [diaSelecionado, eventos, eventosPorDia]);

  const aniversariantesLateral = useMemo(() => {
    if (!diaSelecionado) return aniversariantes;
    const dia = Number(diaSelecionado.slice(8, 10));
    return aniversariantes.filter((a) => a.dia === dia);
  }, [aniversariantes, diaSelecionado]);

  function irParaMesAnterior() {
    setDiaSelecionado(null);
    if (mesCalendario === 1) {
      setMesCalendario(12);
      setAnoCalendario((a) => a - 1);
    } else {
      setMesCalendario((m) => m - 1);
    }
  }

  function irParaProximoMes() {
    setDiaSelecionado(null);
    if (mesCalendario === 12) {
      setMesCalendario(1);
      setAnoCalendario((a) => a + 1);
    } else {
      setMesCalendario((m) => m + 1);
    }
  }

  function abrirModalNovo() {
    setEventoEditando(null);
    setFormDados({
      titulo: "",
      categoria: "TREINAMENTO",
      data_inicio: "",
      data_fim: "",
      local: "",
      id_setor: "",
      descricao: "",
    });
    setErrosForm({});
    setModalFormOpen(true);
  }

  function abrirModalEditar(ev) {
    setEventoDetalhe(null);
    setEventoEditando(ev);
    setFormDados({
      titulo: ev.titulo || "",
      categoria: ev.categoria || "OUTRO",
      data_inicio: paraInputDateTimeLocal(ev.data_inicio),
      data_fim: paraInputDateTimeLocal(ev.data_fim),
      local: ev.local || "",
      id_setor: ev.setor?.id_setor ? String(ev.setor.id_setor) : "",
      descricao: ev.descricao || "",
    });
    setErrosForm({});
    setModalFormOpen(true);
  }

  async function salvarEvento(e) {
    if (e) e.preventDefault();
    const problemas = {};
    const tituloLimpo = formDados.titulo.trim();

    if (!tituloLimpo || tituloLimpo.length < 3) {
      problemas.titulo = "Informe o título do evento (mínimo de 3 caracteres).";
    } else if (tituloLimpo.length > 200) {
      problemas.titulo = "O título deve ter no máximo 200 caracteres.";
    }

    if (!formDados.data_inicio) {
      problemas.data_inicio = "Informe a data e horário de início do evento.";
    } else {
      const dtIni = new Date(formDados.data_inicio);
      const hojeZero = new Date();
      hojeZero.setHours(0, 0, 0, 0);
      if (dtIni < hojeZero) {
        problemas.data_inicio = "A data de início do evento não pode ser anterior à data atual";
      }
    }

    if (formDados.data_inicio && formDados.data_fim) {
      const dtIni = new Date(formDados.data_inicio);
      const dtFim = new Date(formDados.data_fim);
      if (dtFim < dtIni) {
        problemas.data_fim =
          "A data e hora de término não pode ser anterior ao início do evento.";
      }
    }

    if (Object.keys(problemas).length > 0) {
      setErrosForm(problemas);
      return;
    }

    setSalvandoForm(true);
    setErrosForm({});
    try {
      const payload = {
        titulo: tituloLimpo,
        categoria: formDados.categoria,
        data_inicio: formDados.data_inicio,
        data_fim: formDados.data_fim || null,
        local: formDados.local.trim() || null,
        id_setor: formDados.id_setor ? Number(formDados.id_setor) : null,
        descricao: formDados.descricao.trim() || null,
      };

      if (eventoEditando) {
        await atualizarEvento(eventoEditando.id_evento, payload);
        sucesso("Evento atualizado com sucesso!");
      } else {
        await criarEvento(payload);
        sucesso("Evento cadastrado com sucesso!");
      }

      setModalFormOpen(false);
      await carregarEventos();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      } else {
        setErrosForm({ geral: err?.mensagem || "Não foi possível salvar o evento." });
      }
    } finally {
      setSalvandoForm(false);
    }
  }

  async function confirmarExclusao() {
    if (!eventoExcluindo) return;
    setExcluindo(true);
    try {
      await excluirEvento(eventoExcluindo.id_evento);
      sucesso("Evento excluído da agenda com sucesso!");
      setEventoExcluindo(null);
      setEventoDetalhe(null);
      await carregarEventos();
    } catch (err) {
      toastErro(err?.mensagem || "Erro ao excluir o evento.");
    } finally {
      setExcluindo(false);
    }
  }

  const opcoesSetores = setores.map((s) => ({
    value: String(s.id_setor),
    label: s.andar ? `${s.nome} (${s.andar})` : s.nome,
  }));

  function renderCardEvento(ev) {
    const dt = new Date(ev.data_inicio);
    const dia = String(dt.getDate()).padStart(2, "0");
    const mesCurto = dt
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .toUpperCase();

    return (
      <Card
        key={ev.id_evento}
        className="flex flex-col justify-between gap-3 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          {/* Bloco destacado de Dia/Mês */}
          <div className="w-14 py-2 rounded-xl bg-[#fff5f6] border border-[#f1c5cf] text-[#800020] text-center flex-shrink-0">
            <div className="text-xl font-black leading-none">{dia}</div>
            <div className="text-[11px] font-bold uppercase mt-1">{mesCurto}</div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant={CATEGORIA_BADGE_VARIANT[ev.categoria] || "default"}>
                {CATEGORIA_EVENTO_LABELS[ev.categoria] || ev.categoria}
              </Badge>
              <span className="text-xs font-semibold text-[#64748b]">
                {formatarData(ev.data_inicio)} · {formatarHorarioIntervalo(ev.data_inicio, ev.data_fim)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setEventoDetalhe(ev)}
              className="text-left text-base font-bold text-[#1e293b] hover:text-[#800020] transition-colors leading-snug block"
            >
              {ev.titulo}
            </button>

            {ev.descricao && (
              <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed">
                {ev.descricao}
              </p>
            )}
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748b]">
          <div className="flex flex-wrap items-center gap-3">
            <span>📍 {ev.local || "Local a definir"}</span>
            {ev.setor?.nome && <span>🏥 Setor: {ev.setor.nome}</span>}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => setEventoDetalhe(ev)}
            >
              Detalhes
            </Button>
            {podeGerir && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Editar evento ${ev.titulo}`}
                  onClick={() => abrirModalEditar(ev)}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Excluir evento ${ev.titulo}`}
                  onClick={() => setEventoExcluindo(ev)}
                >
                  Excluir
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Topo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Mural de Eventos</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Próximos treinamentos, ações internas e eventos institucionais do Hospital Decós
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Alternância de visualização Lista / Calendário */}
          <div
            role="tablist"
            aria-label="Alternar modo de visualização de eventos"
            className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={abaAtiva === "lista"}
              onClick={() => setAbaAtiva("lista")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                abaAtiva === "lista"
                  ? "bg-[#800020] text-white"
                  : "text-[#475569] hover:bg-slate-100"
              }`}
            >
              Lista
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={abaAtiva === "calendario"}
              onClick={() => setAbaAtiva("calendario")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                abaAtiva === "calendario"
                  ? "bg-[#800020] text-white"
                  : "text-[#475569] hover:bg-slate-100"
              }`}
            >
              Calendário
            </button>
          </div>

          {podeGerir && (
            <Button variant="primary" onClick={abrirModalNovo}>
              + Adicionar Novo
            </Button>
          )}
        </div>
      </div>

      {/* Filtros rápidos por categoria, setor e busca */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoria">
          {CATEGORIAS_EVENTO_CHIPS.map((chip) => {
            const ativo = categoriaFiltro === chip.value;
            return (
              <button
                key={chip.value || "TODAS"}
                type="button"
                onClick={() => setCategoriaFiltro(chip.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  ativo
                    ? "bg-[#800020] text-white shadow-sm"
                    : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
          <SearchInput
            value={busca}
            onChange={handleBusca}
            onSearch={handleBusca}
            placeholder="Buscar evento por título ou local..."
            ariaLabel="Buscar eventos por palavra-chave"
          />
          <Select
            value={setorFiltro}
            onChange={(e) => setSetorFiltro(e.target.value)}
            placeholder="Todos os setores organizadores"
            options={opcoesSetores}
            aria-label="Filtrar por setor organizador"
          />
        </div>
      </Card>

      {/* Banner de Erro */}
      {erroLista && <ErrorBanner message={erroLista} onRetry={carregarEventos} />}

      {/* Estado Carregando (Skeleton) */}
      {!erroLista && carregando && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="space-y-3">
              <div className="flex items-start gap-4">
                <Skeleton width="56px" height="56px" />
                <div className="flex-1 space-y-2">
                  <Skeleton width="120px" height="1.25rem" />
                  <Skeleton width="80%" height="1.5rem" />
                  <Skeleton width="100%" height="2rem" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── ABA 1: LISTA DE PRÓXIMOS EVENTOS (PADRÃO) ── */}
      {!erroLista && !carregando && abaAtiva === "lista" && (
        <>
          {eventos.length === 0 ? (
            <Card>
              <EmptyState
                title="Não há eventos programados"
                description="Novos treinamentos, palestras e ações internas aparecerão nesta agenda."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventos.map((ev) => renderCardEvento(ev))}
            </div>
          )}
        </>
      )}

      {/* ── ABA 2: CALENDÁRIO MENSAL ── */}
      {!erroLista && !carregando && abaAtiva === "calendario" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
          {/* Grade Mensal */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-[#1e293b]">
                {NOMES_MESES[mesCalendario - 1]} de {anoCalendario}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={irParaMesAnterior}
                  aria-label="Mês anterior"
                >
                  ← Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMesCalendario(hoje.getMonth() + 1);
                    setAnoCalendario(hoje.getFullYear());
                    setDiaSelecionado(null);
                  }}
                >
                  Mês atual
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={irParaProximoMes}
                  aria-label="Próximo mês"
                >
                  Próximo →
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="text-xs font-bold uppercase text-[#64748b] py-1.5"
                >
                  {d}
                </div>
              ))}

              {celulasCalendario.map((celula, idx) => {
                if (!celula) {
                  return <div key={`vazio-${idx}`} className="h-20 rounded-lg bg-slate-50/50" />;
                }
                const selecionado = diaSelecionado === celula.chave;
                const temEventos = celula.eventos.length > 0;
                const temAniv = celula.aniversariantes.length > 0;
                const ehHoje = celula.chave === chaveDataLocal(hoje);

                return (
                  <button
                    key={celula.chave}
                    type="button"
                    onClick={() =>
                      setDiaSelecionado((atual) =>
                        atual === celula.chave ? null : celula.chave,
                      )
                    }
                    aria-label={`Dia ${celula.dia}, ${celula.eventos.length} evento(s), ${celula.aniversariantes.length} aniversariante(s)`}
                    className={`h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      selecionado
                        ? "border-[#800020] bg-[#fff5f6] ring-2 ring-[#800020]/20"
                        : temEventos || temAniv
                          ? "border-[#f1c5cf] bg-white hover:border-[#800020]"
                          : "border-slate-200/80 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold ${
                          ehHoje
                            ? "w-6 h-6 rounded-full bg-[#800020] text-white inline-flex items-center justify-center"
                            : "text-[#1e293b]"
                        }`}
                      >
                        {celula.dia}
                      </span>
                      {temEventos && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#800020] text-white">
                          {celula.eventos.length}
                        </span>
                      )}
                    </div>

                    {temAniv && (
                      <div className="text-[10px] font-semibold truncate px-1 rounded bg-amber-50 text-amber-700">
                        🎂 {celula.aniversariantes.length === 1
                          ? celula.aniversariantes[0].nome.split(" ")[0]
                          : `${celula.aniversariantes.length} aniversários`}
                      </div>
                    )}
                    {temEventos && (
                      <div className="space-y-0.5 overflow-hidden w-full">
                        {celula.eventos.slice(0, temAniv ? 1 : 2).map((ev) => (
                          <div
                            key={ev.id_evento}
                            className="text-[10px] font-semibold truncate px-1 rounded bg-[#fff5f6] text-[#800020]"
                          >
                            {ev.titulo}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Painel Lateral de Eventos do Dia ou do Mês */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1e293b]">
                {diaSelecionado
                  ? `Eventos em ${formatarData(diaSelecionado)}`
                  : `Eventos do mês (${eventos.length})`}
              </h3>
              {diaSelecionado && (
                <button
                  type="button"
                  onClick={() => setDiaSelecionado(null)}
                  className="text-xs font-semibold text-[#800020] hover:underline"
                >
                  Ver todos do mês
                </button>
              )}
            </div>

            {aniversariantesLateral.length > 0 && (
              <Card className="space-y-2">
                <h4 className="text-xs font-bold text-amber-700">
                  🎂 Aniversariantes {diaSelecionado ? "do dia" : `de ${NOMES_MESES[mesCalendario - 1]}`}
                </h4>
                <ul className="text-xs text-[#475569] space-y-1">
                  {aniversariantesLateral.map((a) => (
                    <li key={a.id_usuario}>
                      <strong>{String(a.dia).padStart(2, "0")}/{String(a.mes).padStart(2, "0")}/{anoCalendario}</strong>{" "}
                      {a.nome} · {a.setor?.nome || "Setor não informado"}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {eventosLateralCalendario.length === 0 ? (
              <Card>
                <EmptyState
                  title="Não há eventos programados"
                  description={
                    diaSelecionado
                      ? "Nenhum evento agendado para a data selecionada."
                      : "Nenhum evento registrado para este mês."
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {eventosLateralCalendario.map((ev) => renderCardEvento(ev))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL DE DETALHES DO EVENTO ── */}
      <Modal
        open={Boolean(eventoDetalhe)}
        onClose={() => setEventoDetalhe(null)}
        title={eventoDetalhe?.titulo || "Detalhes do Evento"}
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {podeGerir && eventoDetalhe && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => abrirModalEditar(eventoDetalhe)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setEventoExcluindo(eventoDetalhe)}
                  >
                    Excluir
                  </Button>
                </div>
              )}
            </div>
            <Button variant="primary" onClick={() => setEventoDetalhe(null)}>
              Fechar
            </Button>
          </div>
        }
      >
        {eventoDetalhe && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={CATEGORIA_BADGE_VARIANT[eventoDetalhe.categoria] || "default"}>
                {CATEGORIA_EVENTO_LABELS[eventoDetalhe.categoria] || eventoDetalhe.categoria}
              </Badge>
              {eventoDetalhe.setor?.nome && (
                <Badge variant="default">Setor: {eventoDetalhe.setor.nome}</Badge>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-[#334155]">
              <div>
                <strong>Data:</strong> {formatarDataCompleta(eventoDetalhe.data_inicio)}
              </div>
              <div>
                <strong>Horário:</strong>{" "}
                {formatarHorarioIntervalo(eventoDetalhe.data_inicio, eventoDetalhe.data_fim)}
              </div>
              <div>
                <strong>Local:</strong> {eventoDetalhe.local || "A definir"}
              </div>
              {eventoDetalhe.setor?.nome && (
                <div>
                  <strong>Setor organizador:</strong> {eventoDetalhe.setor.nome}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase text-[#64748b]">
                Descrição e orientações de participação
              </h4>
              <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-line">
                {eventoDetalhe.descricao ||
                  "Compareça ao local indicado com antecedência portando seu crachá funcional."}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL DE CADASTRO / EDIÇÃO DE EVENTO ── */}
      <Modal
        open={modalFormOpen}
        onClose={salvandoForm ? undefined : () => setModalFormOpen(false)}
        title={eventoEditando ? "Editar evento" : "+ Adicionar Novo Evento"}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalFormOpen(false)}
              disabled={salvandoForm}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarEvento} loading={salvandoForm}>
              {eventoEditando ? "Salvar alterações" : "Cadastrar evento"}
            </Button>
          </>
        }
      >
        <form onSubmit={salvarEvento} noValidate className="space-y-4">
          {errosForm.geral && (
            <div
              role="alert"
              className="p-3 rounded-lg text-xs font-medium bg-[#fff3f4] text-[#b4233e] border border-[#f1c5cf]"
            >
              {errosForm.geral}
            </div>
          )}

          <Input
            label="Título"
            required
            placeholder="Ex.: Treinamento Prático de Suporte Básico de Vida (BLS)"
            value={formDados.titulo}
            error={errosForm.titulo}
            onChange={(e) => {
              setFormDados((prev) => ({ ...prev, titulo: e.target.value }));
              setErrosForm((prev) => ({ ...prev, titulo: undefined, geral: undefined }));
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Categoria"
              required
              value={formDados.categoria}
              error={errosForm.categoria}
              options={OPCOES_CATEGORIA_SELECT}
              onChange={(e) =>
                setFormDados((prev) => ({ ...prev, categoria: e.target.value }))
              }
            />

            <Select
              label="Setor organizador"
              placeholder="Selecione um setor (opcional)"
              value={formDados.id_setor}
              error={errosForm.id_setor}
              options={opcoesSetores}
              onChange={(e) =>
                setFormDados((prev) => ({ ...prev, id_setor: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Início"
              type="datetime-local"
              required
              value={formDados.data_inicio}
              error={errosForm.data_inicio}
              onChange={(e) => {
                setFormDados((prev) => ({ ...prev, data_inicio: e.target.value }));
                setErrosForm((prev) => ({ ...prev, data_inicio: undefined, geral: undefined }));
              }}
            />

            <Input
              label="Fim (opcional)"
              type="datetime-local"
              value={formDados.data_fim}
              error={errosForm.data_fim}
              onChange={(e) => {
                setFormDados((prev) => ({ ...prev, data_fim: e.target.value }));
                setErrosForm((prev) => ({ ...prev, data_fim: undefined, geral: undefined }));
              }}
            />
          </div>

          <Input
            label="Local"
            placeholder="Ex.: Auditório Principal — 4º andar"
            value={formDados.local}
            error={errosForm.local}
            onChange={(e) => {
              setFormDados((prev) => ({ ...prev, local: e.target.value }));
              setErrosForm((prev) => ({ ...prev, local: undefined }));
            }}
          />

          <Textarea
            label="Descrição e orientações"
            rows={4}
            placeholder="Descreva o público-alvo, pauta e orientações de participação..."
            value={formDados.descricao}
            error={errosForm.descricao}
            onChange={(e) => {
              setFormDados((prev) => ({ ...prev, descricao: e.target.value }));
              setErrosForm((prev) => ({ ...prev, descricao: undefined }));
            }}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(eventoExcluindo)}
        title="Cancelar e excluir evento"
        message={`Confirma a exclusão do evento "${eventoExcluindo?.titulo || ""}" da agenda corporativa?`}
        confirmLabel="Excluir evento"
        variant="danger"
        loading={excluindo}
        onCancel={() => setEventoExcluindo(null)}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listarAniversariantes } from "../../api/aniversariantes";
import { listarSetores } from "../../api/setores";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  SearchInput,
  Select,
  Skeleton,
} from "../../components/ui";

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

const OPCOES_DIA = [
  { value: "", label: "Todos os dias" },
  ...Array.from({ length: 31 }, (_, idx) => {
    const d = idx + 1;
    return {
      value: String(d),
      label: `Dia ${String(d).padStart(2, "0")}`,
    };
  }),
];

function obterIniciais(nome = "") {
  return String(nome)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function Aniversariantes() {
  const hoje = useMemo(() => new Date(), []);
  const mesAtualSistema = hoje.getMonth() + 1;
  const diaAtualSistema = hoje.getDate();

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualSistema);
  const [diaSelecionado, setDiaSelecionado] = useState("");
  const [setorSelecionado, setSetorSelecionado] = useState("");
  const [busca, setBusca] = useState("");

  const [setores, setSetores] = useState([]);
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarSetores()
      .then((res) => setSetores(Array.isArray(res) ? res : []))
      .catch(() => setSetores([]));
  }, []);

  const carregarAniversariantes = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const dados = await listarAniversariantes({
        mes: mesSelecionado,
        dia: diaSelecionado ? Number(diaSelecionado) : undefined,
        id_setor: setorSelecionado ? Number(setorSelecionado) : undefined,
        busca: busca.trim() || undefined,
      });
      setLista(Array.isArray(dados) ? dados : []);
    } catch (err) {
      setErro(err?.mensagem || "Não foi possível carregar os aniversariantes do mês.");
    } finally {
      setCarregando(false);
    }
  }, [mesSelecionado, diaSelecionado, setorSelecionado, busca]);

  useEffect(() => {
    carregarAniversariantes();
  }, [carregarAniversariantes]);

  const opcoesSetor = useMemo(
    () => [
      { value: "", label: "Todos os setores" },
      ...setores.map((s) => ({
        value: String(s.id_setor),
        label: s.nome,
      })),
    ],
    [setores],
  );

  function irMesAnterior() {
    setDiaSelecionado("");
    setMesSelecionado((m) => (m <= 1 ? 12 : m - 1));
  }

  function irProximoMes() {
    setDiaSelecionado("");
    setMesSelecionado((m) => (m >= 12 ? 1 : m + 1));
  }

  function focarAniversariantesHoje() {
    setMesSelecionado(mesAtualSistema);
    setDiaSelecionado(String(diaAtualSistema));
  }

  function limparFiltros() {
    setDiaSelecionado("");
    setSetorSelecionado("");
    setBusca("");
    setMesSelecionado(mesAtualSistema);
  }

  const nomeMes = NOMES_MESES[mesSelecionado - 1] || "Mês";
  const filtroHojeAtivo =
    mesSelecionado === mesAtualSistema && Number(diaSelecionado) === diaAtualSistema;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho com navegação entre meses (S4-T5) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">
            Aniversariantes de {nomeMes}
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Celebre os colaboradores ativos que comemoram aniversário neste mês (UC11)
          </p>
        </div>

        <div className="inline-flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={irMesAnterior}
            aria-label="Mês anterior"
            className="whitespace-nowrap font-bold px-3 py-1.5 shrink-0"
          >
            ← Mês anterior
          </Button>

          <span className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-extrabold text-[#800020] min-w-[110px] text-center shadow-xs whitespace-nowrap shrink-0 select-none">
            {nomeMes}
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={irProximoMes}
            aria-label="Próximo mês"
            className="whitespace-nowrap font-bold px-3 py-1.5 shrink-0"
          >
            Próximo mês →
          </Button>
        </div>
      </div>

      {/* Filtros superiores: Busca por nome, Dia específico, Setor e Atalho "Hoje" */}
      <Card className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_220px_auto] gap-3 items-center">
          <SearchInput
            value={busca}
            onChange={setBusca}
            placeholder="Buscar aniversariante por nome..."
            ariaLabel="Buscar aniversariante por nome"
          />
          <Select
            aria-label="Filtrar por dia do mês"
            value={diaSelecionado}
            onChange={(e) => setDiaSelecionado(e.target.value)}
            options={OPCOES_DIA}
          />
          <Select
            aria-label="Filtrar por setor"
            value={setorSelecionado}
            onChange={(e) => setSetorSelecionado(e.target.value)}
            options={opcoesSetor}
          />
          <div className="flex items-center gap-2">
            <Button
              variant={filtroHojeAtivo ? "primary" : "secondary"}
              size="sm"
              onClick={focarAniversariantesHoje}
            >
              🎂 Hoje ({String(diaAtualSistema).padStart(2, "0")}/
              {String(mesAtualSistema).padStart(2, "0")})
            </Button>
            {(diaSelecionado || setorSelecionado || busca || mesSelecionado !== mesAtualSistema) && (
              <Button variant="secondary" size="sm" onClick={limparFiltros}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Estados de carregamento, erro, vazio e Grade de Cards */}
      {erro ? (
        <ErrorBanner message={erro} onRetry={carregarAniversariantes} />
      ) : carregando ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton width="44px" height="44px" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="75%" height="16px" />
                  <Skeleton width="55%" height="12px" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : lista.length === 0 ? (
        <Card>
          <EmptyState title="Não há aniversariantes neste mês" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((aniv) => {
            const diaFormatado = String(aniv.dia).padStart(2, "0");
            const mesFormatado = String(aniv.mes).padStart(2, "0");
            const ehHoje =
              Boolean(aniv.aniversario_hoje) ||
              (Number(aniv.dia) === diaAtualSistema && Number(aniv.mes) === mesAtualSistema);

            return (
              <Card
                key={aniv.id_usuario}
                className={`flex items-center justify-between gap-3 transition-shadow ${
                  ehHoje
                    ? "border-2 border-[#800020] bg-gradient-to-r from-[#fff5f6] to-white shadow-sm"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    aria-hidden="true"
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      ehHoje
                        ? "bg-[#800020] text-white"
                        : "bg-[#fff5f5] text-[#800020] border border-[#f1c5cf]"
                    }`}
                  >
                    {ehHoje ? "🎂" : obterIniciais(aniv.nome)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#1e293b] truncate">
                      {aniv.nome}
                    </div>
                    <div className="text-xs text-[#64748b] mt-0.5 truncate">
                      {aniv.cargo || "Colaborador"} ·{" "}
                      {aniv.setor?.nome || "Setor não informado"}
                    </div>
                    {ehHoje && (
                      <div className="mt-1">
                        <Badge variant="primary">🎉 Aniversariante do dia!</Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* UC11 Privacidade: exibe apenas Dia DD/MM — nunca ano de nascimento nem idade */}
                <div className="text-right flex-shrink-0">
                  <Badge variant={ehHoje ? "primary" : "default"}>
                    Dia {diaFormatado}/{mesFormatado}
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

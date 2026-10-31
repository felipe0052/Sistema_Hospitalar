import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listarDiretorio } from "../../api/diretorio";
import {
  ROTULO_STATUS_INDICACAO,
  ROTULO_TIPO_RECONHECIMENTO,
  TIPOS_RECONHECIMENTO,
  atualizarReconhecimento,
  criarIndicacao,
  criarReconhecimento,
  excluirReconhecimento,
  listarIndicacoes,
  listarMinhasIndicacoes,
  listarReconhecimentos,
  obterReconhecimento,
  recusarIndicacao,
} from "../../api/reconhecimentos";
import { listarSetores } from "../../api/setores";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Input,
  Textarea,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { formatarData } from "../../utils/date";

const TAMANHO = 9;
const VARIANTE_TIPO = {
  PROMOCAO: "primary",
  DESTAQUE: "ativo",
  TEMPO_DE_CASA: "info",
  AGRADECIMENTO: "default",
};
const VARIANTE_STATUS = { PENDENTE: "warning", APROVADA: "ativo", RECUSADA: "inativo" };

function iniciais(nome = "") {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** Campo de busca de colega (usa o diretório) com lista de resultados selecionável. */
function SeletorColega({ selecionado, onSelecionar, erro }) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (termo.trim().length < 2) {
      setResultados([]);
      return undefined;
    }
    let cancelado = false;
    setBuscando(true);
    listarDiretorio({ busca: termo.trim(), tamanho: 8 })
      .then((dados) => !cancelado && setResultados(dados?.itens || []))
      .catch(() => !cancelado && setResultados([]))
      .finally(() => !cancelado && setBuscando(false));
    return () => {
      cancelado = true;
    };
  }, [termo]);

  if (selecionado) {
    return (
      <div className="ui-field">
        <span className="ui-field__label">Colega</span>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#fff5f5] text-[#800020] border border-[#f1c5cf] shrink-0"
            >
              {iniciais(selecionado.nome)}
            </div>
            <span className="truncate text-[#1e293b]">
              <strong>{selecionado.nome}</strong>
              {selecionado.cargo ? (
                <span className="text-xs text-[#64748b]"> · {selecionado.cargo}</span>
              ) : (
                ""
              )}
            </span>
          </div>
          {onSelecionar && (
            <button
              type="button"
              onClick={() => onSelecionar(null)}
              className="text-xs font-semibold text-[#800020] underline cursor-pointer shrink-0"
            >
              Trocar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ui-field">
      <label htmlFor="busca-colega" className="ui-field__label">
        <span>Buscar colega pelo nome</span>
        <span className="ui-field__required" aria-hidden="true">
          *
        </span>
      </label>
      <input
        id="busca-colega"
        type="search"
        className={`ui-input ${erro ? "ui-input--error" : ""}`}
        placeholder="Digite ao menos 2 letras do nome"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        aria-invalid={Boolean(erro)}
      />
      {erro && (
        <p className="ui-field__error" role="alert">
          <span>{erro}</span>
        </p>
      )}
      {buscando && <p className="text-xs text-[#64748b] mt-1">Buscando…</p>}
      {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
        <p className="text-xs text-[#64748b] mt-1">Nenhum funcionário encontrado</p>
      )}
      {resultados.length > 0 && (
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white">
          {resultados.map((u) => (
            <li key={u.id_usuario}>
              <button
                type="button"
                onClick={() => onSelecionar(u)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer flex items-center gap-2.5"
              >
                <span
                  aria-hidden="true"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold bg-[#fff5f5] text-[#800020] border border-[#f1c5cf] shrink-0"
                >
                  {iniciais(u.nome)}
                </span>
                <span className="min-w-0 truncate">
                  <strong className="text-[#1e293b]">{u.nome}</strong>
                  <span className="text-xs text-[#64748b]">
                    {" "}
                    · {u.cargo || "Cargo não informado"} · {u.setor?.nome || "Setor não informado"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Reconhecimentos() {
  const { temPerfil } = useAuth();
  const podeGerir = temPerfil("ADMIN", "RH");
  const { sucesso, erro: toastErro } = useToast();
  const [params, setParams] = useSearchParams();
  const idDestaque = Number(params.get("reconhecimento")) || null;

  const [aba, setAba] = useState("mural");

  // Mural
  const [tipo, setTipo] = useState("");
  const [setor, setSetor] = useState("");
  const [setores, setSetores] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [lista, setLista] = useState({ itens: [], total: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [destacado, setDestacado] = useState(null);
  const refDestaque = useRef(null);

  // Indicações
  const [minhas, setMinhas] = useState([]);
  const [recebidas, setRecebidas] = useState({ itens: [], total: 0 });
  const [carregandoInd, setCarregandoInd] = useState(false);
  const [erroInd, setErroInd] = useState("");

  // Modal de indicar colega
  const [indicarAberto, setIndicarAberto] = useState(false);
  const [colegaIndicado, setColegaIndicado] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [errosIndicar, setErrosIndicar] = useState({});
  const [enviandoIndicacao, setEnviandoIndicacao] = useState(false);

  // Modal de reconhecimento (RH/Admin)
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [colaborador, setColaborador] = useState(null);
  const [formTipo, setFormTipo] = useState("DESTAQUE");
  const [formTitulo, setFormTitulo] = useState("");
  const [formMensagem, setFormMensagem] = useState("");
  const [idIndicacao, setIdIndicacao] = useState(null);
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const [excluindo, setExcluindo] = useState(null);
  const [recusando, setRecusando] = useState(null);
  const [processando, setProcessando] = useState(false);

  const carregarMural = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const dados = await listarReconhecimentos({
        tipo: tipo || undefined,
        id_setor: setor || undefined,
        pagina,
        tamanho: TAMANHO,
      });
      setLista(dados);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os reconhecimentos.");
    } finally {
      setCarregando(false);
    }
  }, [tipo, setor, pagina]);

  const carregarIndicacoes = useCallback(async () => {
    setCarregandoInd(true);
    setErroInd("");
    try {
      setMinhas(await listarMinhasIndicacoes());
      if (podeGerir) setRecebidas(await listarIndicacoes({ status: "PENDENTE", tamanho: 50 }));
    } catch (err) {
      setErroInd(err?.mensagem || "Não foi possível carregar as indicações.");
    } finally {
      setCarregandoInd(false);
    }
  }, [podeGerir]);

  useEffect(() => {
    carregarMural();
  }, [carregarMural]);

  useEffect(() => {
    listarSetores()
      .then((dados) => setSetores(Array.isArray(dados) ? dados : dados?.itens || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (aba !== "mural") carregarIndicacoes();
  }, [aba, carregarIndicacoes]);

  // Destino da notificação: ?reconhecimento=ID realça o card (busca o item se não estiver na página)
  useEffect(() => {
    if (!idDestaque) return;
    obterReconhecimento(idDestaque)
      .then(setDestacado)
      .catch(() => toastErro("Este conteúdo não está mais disponível."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDestaque]);

  useEffect(() => {
    if (destacado && refDestaque.current) refDestaque.current.scrollIntoView({ block: "center" });
  }, [destacado]);

  function abrirIndicar() {
    setColegaIndicado(null);
    setMotivo("");
    setErrosIndicar({});
    setIndicarAberto(true);
  }

  async function enviarIndicacao() {
    const erros = {};
    if (!colegaIndicado) erros.id_indicado = "Selecione o colega que deseja indicar.";
    if (motivo.trim().length < 3) erros.motivo = "Conte o motivo da indicação.";
    setErrosIndicar(erros);
    if (Object.keys(erros).length) return;
    setEnviandoIndicacao(true);
    try {
      await criarIndicacao({ id_indicado: colegaIndicado.id_usuario, motivo: motivo.trim() });
      sucesso("Indicação enviada ao RH.");
      setIndicarAberto(false);
      if (aba === "minhas") carregarIndicacoes();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length) setErrosIndicar(err.erros);
      toastErro(err?.mensagem || "Não foi possível enviar a indicação.");
    } finally {
      setEnviandoIndicacao(false);
    }
  }

  function abrirNovoReconhecimento(indicacao = null) {
    setEditando(null);
    setColaborador(indicacao ? indicacao.indicado : null);
    setFormTipo("DESTAQUE");
    setFormTitulo("");
    setFormMensagem(indicacao ? indicacao.motivo : "");
    setIdIndicacao(indicacao ? indicacao.id_indicacao : null);
    setErrosForm({});
    setFormAberto(true);
  }

  function abrirEdicao(r) {
    setEditando(r);
    setColaborador(r.colaborador);
    setFormTipo(r.tipo);
    setFormTitulo(r.titulo);
    setFormMensagem(r.mensagem);
    setIdIndicacao(null);
    setErrosForm({});
    setFormAberto(true);
  }

  async function salvarReconhecimento() {
    const erros = {};
    if (!colaborador) erros.id_colaborador = "Selecione o colaborador.";
    if (formTitulo.trim().length < 3) erros.titulo = "Informe o título (mín. 3 caracteres).";
    if (formMensagem.trim().length < 3) erros.mensagem = "Escreva a mensagem do reconhecimento.";
    setErrosForm(erros);
    if (Object.keys(erros).length) return;

    setSalvando(true);
    try {
      if (editando) {
        await atualizarReconhecimento(editando.id_reconhecimento, {
          tipo: formTipo,
          titulo: formTitulo.trim(),
          mensagem: formMensagem.trim(),
        });
        sucesso("Reconhecimento atualizado.");
      } else {
        await criarReconhecimento({
          id_colaborador: colaborador.id_usuario,
          tipo: formTipo,
          titulo: formTitulo.trim(),
          mensagem: formMensagem.trim(),
          id_indicacao: idIndicacao || undefined,
        });
        sucesso("Reconhecimento publicado.");
      }
      setFormAberto(false);
      await carregarMural();
      if (aba === "recebidas") await carregarIndicacoes();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length) setErrosForm(err.erros);
      toastErro(err?.mensagem || "Não foi possível salvar o reconhecimento.");
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    setProcessando(true);
    try {
      await excluirReconhecimento(excluindo.id_reconhecimento);
      sucesso("Reconhecimento excluído.");
      setExcluindo(null);
      await carregarMural();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível excluir.");
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarRecusa() {
    setProcessando(true);
    try {
      await recusarIndicacao(recusando.id_indicacao);
      sucesso("Indicação recusada.");
      setRecusando(null);
      await carregarIndicacoes();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível recusar a indicação.");
    } finally {
      setProcessando(false);
    }
  }

  function limparDestaque() {
    setDestacado(null);
    const novos = new URLSearchParams(params);
    novos.delete("reconhecimento");
    setParams(novos, { replace: true });
  }

  function limparFiltrosMural() {
    setTipo("");
    setSetor("");
    setPagina(1);
  }

  function CartaoReconhecimento({ r, realce = false }) {
    const c = r.colaborador || {};
    return (
      <Card
        ref={realce ? refDestaque : undefined}
        className={`flex flex-col justify-between h-full transition-shadow hover:shadow-md ${
          realce ? "ring-2 ring-[#800020] bg-gradient-to-b from-[#fff5f6] to-white" : ""
        }`}
        aria-label={`Reconhecimento: ${r.titulo}`}
      >
        <div className="space-y-3">
          {/* Topo: Avatar + Dados do colaborador + Badge de Tipo */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                aria-hidden="true"
                className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold bg-[#fff5f5] text-[#800020] border border-[#f1c5cf] shrink-0"
              >
                {iniciais(c.nome)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1e293b] truncate">{c.nome}</p>
                <p className="text-xs text-[#64748b] mt-0.5 truncate">
                  {c.cargo || "Cargo não informado"} · {c.setor?.nome || "Setor não informado"}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Badge variant={VARIANTE_TIPO[r.tipo] || "default"}>
                {ROTULO_TIPO_RECONHECIMENTO[r.tipo] || r.tipo}
              </Badge>
            </div>
          </div>

          {/* Corpo: Título + Mensagem de elogio */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <h2 className="text-base font-bold text-[#1e293b] leading-snug">🏆 {r.titulo}</h2>
            <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line">
              {r.mensagem}
            </p>
          </div>
        </div>

        {/* Rodapé fixo na base do card: Data + Ações administrativas */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-4 border-t border-slate-100">
          <span className="text-xs font-medium text-[#64748b]">
            Publicado em {formatarData(r.data_criacao)}
          </span>
          {podeGerir && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => abrirEdicao(r)}>
                Editar
              </Button>
              <Button variant="danger" size="sm" onClick={() => setExcluindo(r)}>
                Excluir
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  const abas = [
    { id: "mural", rotulo: "Mural" },
    { id: "minhas", rotulo: "Minhas indicações" },
    ...(podeGerir
      ? [
          {
            id: "recebidas",
            rotulo: `Indicações recebidas${recebidas.total ? ` (${recebidas.total})` : ""}`,
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho padronizado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Reconhecimentos</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Celebre as conquistas de quem faz o Hospital Decós acontecer
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" onClick={abrirIndicar}>
            Indicar um colega
          </Button>
          {podeGerir && (
            <Button variant="primary" onClick={() => abrirNovoReconhecimento()}>
              + Adicionar Reconhecimento
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Abas padronizada */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Seções de reconhecimentos"
          className="inline-flex flex-wrap p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1"
        >
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                aba === a.id
                  ? "bg-[#800020] text-white shadow-sm"
                  : "text-[#475569] hover:text-[#1e293b]"
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        {aba === "mural" && !carregando && (
          <Badge variant="default">
            {lista.total}{" "}
            {lista.total === 1 ? "reconhecimento publicado" : "reconhecimentos publicados"}
          </Badge>
        )}
      </div>

      {aba === "mural" && (
        <section className="space-y-4" aria-label="Mural de reconhecimentos">
          {/* Card de Filtros padronizado */}
          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[260px_280px_auto] gap-3 items-end">
              <Select
                label="Tipo"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value);
                  setPagina(1);
                }}
                placeholder="Todos os tipos"
                options={TIPOS_RECONHECIMENTO}
              />
              <Select
                label="Setor"
                value={setor}
                onChange={(e) => {
                  setSetor(e.target.value);
                  setPagina(1);
                }}
                placeholder="Todos os setores"
                options={setores.map((s) => ({ value: s.id_setor, label: s.nome }))}
              />
              {(tipo || setor) && (
                <div className="flex items-center">
                  <Button variant="secondary" size="sm" onClick={limparFiltrosMural}>
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {destacado && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#800020]">
                  Reconhecimento da notificação
                </p>
                <button
                  type="button"
                  onClick={limparDestaque}
                  className="text-xs font-semibold text-[#800020] underline cursor-pointer"
                >
                  Dispensar
                </button>
              </div>
              <CartaoReconhecimento r={destacado} realce />
            </div>
          )}

          {erroLista ? (
            <ErrorBanner message={erroLista} onRetry={carregarMural} />
          ) : carregando ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton width="44px" height="44px" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton width="70%" height="16px" />
                      <Skeleton width="50%" height="12px" />
                    </div>
                  </div>
                  <Skeleton width="85%" height="20px" />
                  <Skeleton width="100%" height="64px" />
                </Card>
              ))}
            </div>
          ) : lista.itens.length === 0 ? (
            <Card>
              <EmptyState title="Nenhum reconhecimento publicado ainda" />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
              {lista.itens.map((r) => (
                <CartaoReconhecimento key={r.id_reconhecimento} r={r} />
              ))}
            </div>
          )}

          {lista.total > TAMANHO && (
            <div className="flex justify-center pt-2">
              <Pagination
                pagina={pagina}
                tamanho={TAMANHO}
                total={lista.total}
                onPageChange={setPagina}
              />
            </div>
          )}
        </section>
      )}

      {aba === "minhas" && (
        <section className="space-y-4" aria-label="Minhas indicações">
          {erroInd ? (
            <ErrorBanner message={erroInd} onRetry={carregarIndicacoes} />
          ) : carregandoInd ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="space-y-3">
                  <Skeleton width="60%" height="18px" />
                  <Skeleton width="100%" height="48px" />
                </Card>
              ))}
            </div>
          ) : minhas.length === 0 ? (
            <Card>
              <EmptyState
                title="Você ainda não indicou ninguém"
                description="Use “Indicar um colega” para sugerir um reconhecimento ao RH."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {minhas.map((i) => (
                <Card
                  key={i.id_indicacao}
                  className="flex flex-col justify-between h-full space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          aria-hidden="true"
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-[#fff5f5] text-[#800020] border border-[#f1c5cf] shrink-0"
                        >
                          {iniciais(i.indicado?.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1e293b] truncate">
                            {i.indicado?.nome}
                          </p>
                          <p className="text-xs text-[#64748b]">
                            Enviada em {formatarData(i.data_indicacao)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={VARIANTE_STATUS[i.status] || "default"}>
                        {ROTULO_STATUS_INDICACAO[i.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#475569] leading-relaxed rounded-lg bg-slate-50 border border-slate-100 p-3 whitespace-pre-line">
                      {i.motivo}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {aba === "recebidas" && podeGerir && (
        <section className="space-y-4" aria-label="Indicações recebidas">
          {erroInd ? (
            <ErrorBanner message={erroInd} onRetry={carregarIndicacoes} />
          ) : carregandoInd ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="space-y-3">
                  <Skeleton width="60%" height="18px" />
                  <Skeleton width="100%" height="48px" />
                </Card>
              ))}
            </div>
          ) : recebidas.itens.length === 0 ? (
            <Card>
              <EmptyState title="Nenhuma indicação pendente" />
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {recebidas.itens.map((i) => (
                <Card
                  key={i.id_indicacao}
                  className="flex flex-col justify-between h-full space-y-3"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          aria-hidden="true"
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-[#fff5f5] text-[#800020] border border-[#f1c5cf] shrink-0"
                        >
                          {iniciais(i.indicado?.nome)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1e293b] truncate">
                            {i.indicado?.nome}
                          </p>
                          <p className="text-xs text-[#64748b] truncate">
                            Indicado por {i.indicante?.nome} · {formatarData(i.data_indicacao)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="warning">Pendente</Badge>
                    </div>

                    <p className="text-sm text-[#475569] leading-relaxed rounded-lg bg-slate-50 border border-slate-100 p-3 whitespace-pre-line">
                      {i.motivo}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => abrirNovoReconhecimento(i)}
                    >
                      Criar reconhecimento
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setRecusando(i)}>
                      Recusar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Indicar um colega */}
      <Modal
        open={indicarAberto}
        onClose={enviandoIndicacao ? undefined : () => setIndicarAberto(false)}
        title="Indicar um colega"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIndicarAberto(false)}
              disabled={enviandoIndicacao}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={enviarIndicacao} loading={enviandoIndicacao}>
              Enviar indicação
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#475569]">
            Sua indicação não é publicada: ela vai para análise do RH.
          </p>
          <SeletorColega
            selecionado={colegaIndicado}
            onSelecionar={setColegaIndicado}
            erro={errosIndicar.id_indicado}
          />
          <Textarea
            label="Motivo"
            required
            rows={4}
            maxLength={2000}
            value={motivo}
            error={errosIndicar.motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Por que esse colega merece ser reconhecido?"
          />
        </div>
      </Modal>

      {/* Criar / editar reconhecimento (RH e Admin) */}
      <Modal
        open={formAberto}
        onClose={salvando ? undefined : () => setFormAberto(false)}
        title={editando ? "Editar reconhecimento" : "Adicionar reconhecimento"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarReconhecimento} loading={salvando}>
              {editando ? "Salvar alterações" : "Publicar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <SeletorColega
            selecionado={colaborador}
            onSelecionar={editando || idIndicacao ? undefined : setColaborador}
            erro={errosForm.id_colaborador}
          />
          <Select
            label="Tipo"
            required
            value={formTipo}
            onChange={(e) => setFormTipo(e.target.value)}
            options={TIPOS_RECONHECIMENTO}
          />
          <Input
            label="Título"
            required
            maxLength={200}
            value={formTitulo}
            error={errosForm.titulo}
            onChange={(e) => setFormTitulo(e.target.value)}
            placeholder="Ex.: Profissional destaque do mês"
          />
          <Textarea
            label="Mensagem"
            required
            rows={4}
            maxLength={2000}
            value={formMensagem}
            error={errosForm.mensagem}
            onChange={(e) => setFormMensagem(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(excluindo)}
        title="Excluir reconhecimento"
        message={`Excluir o reconhecimento "${excluindo?.titulo}"? A notificação correspondente também será removida.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={processando}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluindo(null)}
      />
      <ConfirmDialog
        open={Boolean(recusando)}
        title="Recusar indicação"
        message={`Recusar a indicação de ${recusando?.indicado?.nome}? O indicante verá o status "Recusada".`}
        confirmLabel="Recusar"
        variant="danger"
        loading={processando}
        onConfirm={confirmarRecusa}
        onCancel={() => setRecusando(null)}
      />
    </div>
  );
}

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
  SearchInput,
  Select,
  Skeleton,
  Input,
  Textarea,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { formatarData } from "../../utils/date";

const TAMANHO = 9;
const VARIANTE_TIPO = { PROMOCAO: "primary", DESTAQUE: "ativo", TEMPO_DE_CASA: "info", AGRADECIMENTO: "default" };
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
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <span>
            <strong>{selecionado.nome}</strong>
            {selecionado.cargo ? ` · ${selecionado.cargo}` : ""}
          </span>
          {onSelecionar && (
            <button
              type="button"
              onClick={() => onSelecionar(null)}
              className="text-xs font-semibold text-[#800020] underline cursor-pointer"
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
        <ul className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {resultados.map((u) => (
            <li key={u.id_usuario}>
              <button
                type="button"
                onClick={() => onSelecionar(u)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
              >
                <strong>{u.nome}</strong>
                <span className="text-xs text-[#64748b]">
                  {" "}
                  · {u.cargo || "Cargo não informado"} · {u.setor?.nome || "Setor não informado"}
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

  function CartaoReconhecimento({ r, realce = false }) {
    const c = r.colaborador;
    return (
      <Card
        ref={realce ? refDestaque : undefined}
        className={`space-y-3 ${realce ? "ring-2 ring-[#800020]" : ""}`}
        aria-label={`Reconhecimento: ${r.titulo}`}
      >
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold bg-[#fff5f5] text-[#800020] border border-[#f3dfe5] shrink-0"
          >
            {iniciais(c.nome)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#1e293b] truncate">{c.nome}</p>
            <p className="text-xs text-[#64748b]">
              {c.cargo || "Cargo não informado"} · {c.setor?.nome || "Setor não informado"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={VARIANTE_TIPO[r.tipo] || "default"}>{ROTULO_TIPO_RECONHECIMENTO[r.tipo] || r.tipo}</Badge>
          <span className="text-xs text-[#64748b]">{formatarData(r.data_criacao)}</span>
        </div>
        <h2 className="text-base font-bold text-[#1e293b]">🏆 {r.titulo}</h2>
        <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-line">{r.mensagem}</p>
        {podeGerir && (
          <div className="flex gap-2 pt-1 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => abrirEdicao(r)}>
              Editar
            </Button>
            <Button variant="danger" size="sm" onClick={() => setExcluindo(r)}>
              Excluir
            </Button>
          </div>
        )}
      </Card>
    );
  }

  const abas = [
    { id: "mural", rotulo: "Mural" },
    { id: "minhas", rotulo: "Minhas indicações" },
    ...(podeGerir ? [{ id: "recebidas", rotulo: `Indicações recebidas${recebidas.total ? ` (${recebidas.total})` : ""}` }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Reconhecimentos</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Celebre as conquistas de quem faz o Hospital Decós acontecer
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <div role="tablist" aria-label="Seções de reconhecimentos" className="flex gap-2 border-b border-slate-200">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`px-3 py-2 text-sm font-semibold cursor-pointer border-b-2 -mb-px ${
              aba === a.id ? "border-[#800020] text-[#800020]" : "border-transparent text-[#64748b]"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "mural" && (
        <section className="space-y-4" aria-label="Mural de reconhecimentos">
          <div className="flex flex-wrap gap-3">
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
          </div>

          {destacado && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#800020]">Reconhecimento da notificação</p>
                <button type="button" onClick={limparDestaque} className="text-xs underline cursor-pointer">
                  Dispensar
                </button>
              </div>
              <CartaoReconhecimento r={destacado} realce />
            </div>
          )}

          {erroLista ? (
            <ErrorBanner message={erroLista} onRetry={carregarMural} />
          ) : carregando ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height="200px" />
              ))}
            </div>
          ) : lista.itens.length === 0 ? (
            <Card>
              <EmptyState title="Nenhum reconhecimento publicado ainda" />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {lista.itens.map((r) => (
                <CartaoReconhecimento key={r.id_reconhecimento} r={r} />
              ))}
            </div>
          )}

          {lista.total > TAMANHO && (
            <div className="flex justify-center">
              <Pagination pagina={pagina} tamanho={TAMANHO} total={lista.total} onPageChange={setPagina} />
            </div>
          )}
        </section>
      )}

      {aba === "minhas" && (
        <section className="space-y-3" aria-label="Minhas indicações">
          {erroInd ? (
            <ErrorBanner message={erroInd} onRetry={carregarIndicacoes} />
          ) : carregandoInd ? (
            <Skeleton height="80px" />
          ) : minhas.length === 0 ? (
            <Card>
              <EmptyState
                title="Você ainda não indicou ninguém"
                description="Use “Indicar um colega” para sugerir um reconhecimento ao RH."
              />
            </Card>
          ) : (
            minhas.map((i) => (
              <Card key={i.id_indicacao} className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-[#1e293b]">{i.indicado.nome}</p>
                  <p className="text-sm text-[#475569]">{i.motivo}</p>
                  <p className="text-xs text-[#64748b]">Enviada em {formatarData(i.data_indicacao)}</p>
                </div>
                <Badge variant={VARIANTE_STATUS[i.status] || "default"}>{ROTULO_STATUS_INDICACAO[i.status]}</Badge>
              </Card>
            ))
          )}
        </section>
      )}

      {aba === "recebidas" && podeGerir && (
        <section className="space-y-3" aria-label="Indicações recebidas">
          {erroInd ? (
            <ErrorBanner message={erroInd} onRetry={carregarIndicacoes} />
          ) : carregandoInd ? (
            <Skeleton height="80px" />
          ) : recebidas.itens.length === 0 ? (
            <Card>
              <EmptyState title="Nenhuma indicação pendente" />
            </Card>
          ) : (
            recebidas.itens.map((i) => (
              <Card key={i.id_indicacao} className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-[#1e293b]">
                    {i.indicado.nome}
                    <span className="text-xs font-normal text-[#64748b]"> · indicado por {i.indicante.nome}</span>
                  </p>
                  <p className="text-sm text-[#475569]">{i.motivo}</p>
                  <p className="text-xs text-[#64748b]">Enviada em {formatarData(i.data_indicacao)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => abrirNovoReconhecimento(i)}>
                    Criar reconhecimento
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setRecusando(i)}>
                    Recusar
                  </Button>
                </div>
              </Card>
            ))
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
            <Button variant="secondary" onClick={() => setIndicarAberto(false)} disabled={enviandoIndicacao}>
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
          <SeletorColega selecionado={colegaIndicado} onSelecionar={setColegaIndicado} erro={errosIndicar.id_indicado} />
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
            <Button variant="secondary" onClick={() => setFormAberto(false)} disabled={salvando}>
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

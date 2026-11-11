import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listarRamaisPorAndar } from "../../api/diretorio";
import {
  atualizarContatoOnboarding,
  atualizarItemOnboarding,
  criarContatoOnboarding,
  criarItemOnboarding,
  excluirContatoOnboarding,
  excluirItemOnboarding,
  marcarItemOnboarding,
  obterOnboarding,
} from "../../api/onboarding";
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
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const ABAS = [
  { id: "checklist", label: "✅ Checklist" },
  { id: "mapa", label: "🗺️ Mapa do Hospital" },
  { id: "contatos", label: "📞 Quem Procurar" },
  { id: "atendimentos", label: "🩺 Primeiros Atendimentos" },
];

const ITEM_VAZIO = { tipo: "CHECKLIST", titulo: "", descricao: "", ordem: "1" };
const CONTATO_VAZIO = {
  situacao: "",
  responsavel: "",
  id_setor: "",
  ramal: "",
  observacao: "",
  ordem: "1",
};

function InfoColaborador({ rotulo, valor }) {
  return (
    <div className="py-2 px-3 rounded-lg bg-slate-50 border border-slate-100 min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">{rotulo}</div>
      <div className="text-sm font-semibold text-[#1e293b] truncate">{valor || "Não informado"}</div>
    </div>
  );
}

function ItemMarcavel({ item, numero, podeGerir, marcando, onAlternar, onEditar, onExcluir }) {
  return (
    <div
      className={`rounded-xl border transition ${
        item.concluido
          ? "bg-white border-[#800020]/30 shadow-xs"
          : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2 p-3.5">
        <label className="flex-1 flex items-start gap-3 cursor-pointer min-w-0">
          <input
            type="checkbox"
            checked={item.concluido}
            disabled={marcando}
            onChange={() => onAlternar(item)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#800020] cursor-pointer"
            aria-label={`Marcar "${item.titulo}" como ${item.concluido ? "não concluído" : "concluído"}`}
          />
          <span className="min-w-0">
            <span
              className={`block text-sm font-semibold ${
                item.concluido ? "text-[#64748b] line-through" : "text-[#1e293b]"
              }`}
            >
              {numero ? `${numero}. ` : ""}
              {item.titulo}
            </span>
            {item.descricao && (
              <span className="block text-xs text-[#475569] leading-relaxed mt-1 whitespace-pre-line">
                {item.descricao}
              </span>
            )}
          </span>
        </label>

        {podeGerir && (
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditar(item)}
              aria-label={`Editar item: ${item.titulo}`}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onExcluir(item)}
              aria-label={`Excluir item: ${item.titulo}`}
            >
              Excluir
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { autenticado, temPerfil } = useAuth();
  const podeGerir = autenticado && temPerfil("ADMIN", "RH");
  const { sucesso, erro: toastErro } = useToast();

  const [abaAtiva, setAbaAtiva] = useState("checklist");

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [marcandoId, setMarcandoId] = useState(null);

  const [andares, setAndares] = useState([]);
  const [carregandoMapa, setCarregandoMapa] = useState(false);
  const [erroMapa, setErroMapa] = useState("");

  const [setores, setSetores] = useState([]);

  // Modal de item (checklist / primeiros atendimentos)
  const [modalItemOpen, setModalItemOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [formItem, setFormItem] = useState(ITEM_VAZIO);
  const [errosItem, setErrosItem] = useState({});
  const [salvandoItem, setSalvandoItem] = useState(false);

  // Modal de contato ("quem procurar")
  const [modalContatoOpen, setModalContatoOpen] = useState(false);
  const [contatoEditando, setContatoEditando] = useState(null);
  const [formContato, setFormContato] = useState(CONTATO_VAZIO);
  const [errosContato, setErrosContato] = useState({});
  const [salvandoContato, setSalvandoContato] = useState(false);

  // Exclusão (item ou contato)
  const [excluindoAlvo, setExcluindoAlvo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarga("");
    try {
      setDados(await obterOnboarding());
    } catch (err) {
      setErroCarga(err?.mensagem || "Não foi possível carregar o onboarding.");
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarMapa = useCallback(async () => {
    setCarregandoMapa(true);
    setErroMapa("");
    try {
      const lista = await listarRamaisPorAndar();
      setAndares(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setErroMapa(err?.mensagem || "Não foi possível carregar o mapa do hospital.");
    } finally {
      setCarregandoMapa(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (abaAtiva === "mapa" && andares.length === 0 && !erroMapa) {
      carregarMapa();
    }
  }, [abaAtiva, andares.length, erroMapa, carregarMapa]);

  useEffect(() => {
    if (!podeGerir) return;
    listarSetores()
      .then((lista) => setSetores(Array.isArray(lista) ? lista : []))
      .catch(() => setSetores([]));
  }, [podeGerir]);

  const opcoesSetores = useMemo(
    () =>
      setores.map((s) => ({
        value: String(s.id_setor),
        label: s.andar ? `${s.nome} (${s.andar})` : s.nome,
      })),
    [setores],
  );

  const colaborador = dados?.colaborador;
  const progresso = dados?.progresso || { total: 0, concluidos: 0, percentual: 0 };
  const idSetorUsuario = colaborador?.setor?.id_setor;

  async function alternarItem(item) {
    setMarcandoId(item.id_item);
    try {
      await marcarItemOnboarding(item.id_item, !item.concluido);
      await carregar();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível atualizar o item.");
    } finally {
      setMarcandoId(null);
    }
  }

  // ------------------------------------------------------------- Itens

  function abrirNovoItem(tipo) {
    setItemEditando(null);
    const lista = tipo === "ATENDIMENTO" ? dados?.atendimentos : dados?.checklist;
    setFormItem({ ...ITEM_VAZIO, tipo, ordem: String((lista?.length || 0) + 1) });
    setErrosItem({});
    setModalItemOpen(true);
  }

  function abrirEditarItem(item) {
    setItemEditando(item);
    setFormItem({
      tipo: item.tipo,
      titulo: item.titulo || "",
      descricao: item.descricao || "",
      ordem: String(item.ordem ?? 0),
    });
    setErrosItem({});
    setModalItemOpen(true);
  }

  async function salvarItem(e) {
    e?.preventDefault?.();
    const erros = {};
    if (formItem.titulo.trim().length < 3) erros.titulo = "Informe um título com pelo menos 3 caracteres.";
    const ordemNum = Number(formItem.ordem);
    if (Number.isNaN(ordemNum) || ordemNum < 0) erros.ordem = "Informe uma ordem válida (0 ou maior).";
    setErrosItem(erros);
    if (Object.keys(erros).length > 0) return;

    setSalvandoItem(true);
    try {
      const payload = {
        tipo: formItem.tipo,
        titulo: formItem.titulo.trim(),
        descricao: formItem.descricao.trim() || null,
        ordem: ordemNum || 0,
      };
      if (itemEditando) {
        await atualizarItemOnboarding(itemEditando.id_item, payload);
        sucesso("Item atualizado com sucesso.");
      } else {
        await criarItemOnboarding(payload);
        sucesso("Item adicionado ao onboarding.");
      }
      setModalItemOpen(false);
      await carregar();
    } catch (err) {
      if (err?.erros) setErrosItem(err.erros);
      toastErro(err?.mensagem || "Não foi possível salvar o item.");
    } finally {
      setSalvandoItem(false);
    }
  }

  // ------------------------------------------------------------- Contatos

  function abrirNovoContato() {
    setContatoEditando(null);
    setFormContato({ ...CONTATO_VAZIO, ordem: String((dados?.contatos?.length || 0) + 1) });
    setErrosContato({});
    setModalContatoOpen(true);
  }

  function abrirEditarContato(contato) {
    setContatoEditando(contato);
    setFormContato({
      situacao: contato.situacao || "",
      responsavel: contato.responsavel || "",
      id_setor: contato.setor ? String(contato.setor.id_setor) : "",
      ramal: contato.ramal || "",
      observacao: contato.observacao || "",
      ordem: String(contato.ordem ?? 0),
    });
    setErrosContato({});
    setModalContatoOpen(true);
  }

  async function salvarContato(e) {
    e?.preventDefault?.();
    const erros = {};
    if (formContato.situacao.trim().length < 3) erros.situacao = "Descreva a situação (mínimo 3 caracteres).";
    if (formContato.responsavel.trim().length < 2) erros.responsavel = "Informe quem procurar.";
    const ordemNum = Number(formContato.ordem);
    if (Number.isNaN(ordemNum) || ordemNum < 0) erros.ordem = "Informe uma ordem válida (0 ou maior).";
    setErrosContato(erros);
    if (Object.keys(erros).length > 0) return;

    setSalvandoContato(true);
    try {
      const payload = {
        situacao: formContato.situacao.trim(),
        responsavel: formContato.responsavel.trim(),
        id_setor: formContato.id_setor ? Number(formContato.id_setor) : null,
        ramal: formContato.ramal.trim() || null,
        observacao: formContato.observacao.trim() || null,
        ordem: ordemNum || 0,
      };
      if (contatoEditando) {
        await atualizarContatoOnboarding(contatoEditando.id_contato, payload);
        sucesso("Contato atualizado com sucesso.");
      } else {
        await criarContatoOnboarding(payload);
        sucesso("Contato adicionado ao guia.");
      }
      setModalContatoOpen(false);
      await carregar();
    } catch (err) {
      if (err?.erros) setErrosContato(err.erros);
      toastErro(err?.mensagem || "Não foi possível salvar o contato.");
    } finally {
      setSalvandoContato(false);
    }
  }

  // ------------------------------------------------------------- Exclusão

  async function confirmarExclusao() {
    if (!excluindoAlvo) return;
    setExcluindo(true);
    try {
      if (excluindoAlvo.tipo === "contato") {
        await excluirContatoOnboarding(excluindoAlvo.registro.id_contato);
      } else {
        await excluirItemOnboarding(excluindoAlvo.registro.id_item);
      }
      sucesso("Registro excluído com sucesso.");
      setExcluindoAlvo(null);
      await carregar();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  // ------------------------------------------------------------- Render

  function renderListaItens(lista, tipo) {
    const ehAtendimento = tipo === "ATENDIMENTO";
    return (
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-base font-bold text-[#800020]">
              {ehAtendimento ? "Primeiros Atendimentos" : "Checklist do Novo Colaborador"}
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              {ehAtendimento
                ? "Passo a passo para os seus primeiros atendimentos. Marque cada orientação depois de ler."
                : "Marque cada etapa conforme for concluindo sua integração."}
            </p>
          </div>
          {podeGerir && (
            <Button variant="primary" size="sm" onClick={() => abrirNovoItem(tipo)}>
              + Adicionar {ehAtendimento ? "Orientação" : "Item"}
            </Button>
          )}
        </div>

        {lista.length === 0 ? (
          <EmptyState
            title={ehAtendimento ? "Nenhuma orientação cadastrada" : "Nenhum item no checklist"}
            description="O RH ainda não cadastrou conteúdo para esta etapa."
          />
        ) : (
          <div className="space-y-2.5">
            {lista.map((item, idx) => (
              <ItemMarcavel
                key={item.id_item}
                item={item}
                numero={ehAtendimento ? idx + 1 : null}
                podeGerir={podeGerir}
                marcando={marcandoId === item.id_item}
                onAlternar={alternarItem}
                onEditar={abrirEditarItem}
                onExcluir={(registro) => setExcluindoAlvo({ tipo: "item", registro })}
              />
            ))}
          </div>
        )}
      </Card>
    );
  }

  function renderMapa() {
    if (erroMapa) return <ErrorBanner message={erroMapa} onRetry={carregarMapa} />;
    if (carregandoMapa) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="space-y-3">
              <Skeleton height="20px" width="40%" />
              <Skeleton height="44px" width="100%" />
            </Card>
          ))}
        </div>
      );
    }
    if (andares.length === 0) {
      return (
        <Card>
          <EmptyState
            title="Nenhum setor cadastrado"
            description="Os setores e andares aparecem aqui assim que forem cadastrados."
          />
        </Card>
      );
    }
    return (
      <div className="space-y-6">
        <p className="text-xs text-[#64748b]">
          Setores organizados por andar. Para buscar colaboradores e copiar ramais, use o{" "}
          <Link to="/diretorio" className="font-semibold text-[#800020] hover:underline">
            Diretório e Ramais
          </Link>
          .
        </p>
        {andares.map((grupo) => (
          <section key={grupo.andar} aria-label={`Setores do ${grupo.andar}`} className="space-y-3">
            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2">
              <span className="px-3 py-1 rounded-lg bg-[#800020] text-white text-xs font-bold uppercase tracking-wide">
                {grupo.andar}
              </span>
              <span className="text-xs text-[#64748b] font-medium">
                {grupo.setores.length} {grupo.setores.length === 1 ? "setor" : "setores"} neste andar
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grupo.setores.map((setor) => {
                const ehMeuSetor = setor.id_setor === idSetorUsuario;
                return (
                  <Card
                    key={setor.id_setor}
                    className={`space-y-2 ${ehMeuSetor ? "ring-2 ring-[#800020]/40" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-[#1e293b]">{setor.nome}</h3>
                      {ehMeuSetor ? (
                        <Badge variant="primary">Seu setor</Badge>
                      ) : (
                        <Badge variant="default">{grupo.andar}</Badge>
                      )}
                    </div>
                    {(setor.ramais || []).length > 0 && (
                      <div className="text-xs text-[#475569]">
                        Ramais:{" "}
                        <span className="font-bold text-[#800020]">
                          {setor.ramais.map((r) => r.numero).join(", ")}
                        </span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderContatos() {
    const contatos = dados?.contatos || [];
    return (
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-base font-bold text-[#800020]">Quem Procurar em Cada Situação</h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              Saiba a quem recorrer, em qual setor e por qual ramal.
            </p>
          </div>
          {podeGerir && (
            <Button variant="primary" size="sm" onClick={abrirNovoContato}>
              + Adicionar Situação
            </Button>
          )}
        </div>

        {contatos.length === 0 ? (
          <EmptyState
            title="Nenhuma situação cadastrada"
            description="O RH ainda não cadastrou os contatos de referência."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contatos.map((c) => (
              <div
                key={c.id_contato}
                className="rounded-xl border bg-slate-50 border-slate-200 p-3.5 space-y-2"
              >
                <div className="text-sm font-semibold text-[#1e293b]">{c.situacao}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[#475569]">
                    Procure: <span className="font-bold text-[#1e293b]">{c.responsavel}</span>
                  </span>
                  {c.setor && (
                    <Badge variant="default">
                      {c.setor.nome}
                      {c.setor.andar ? ` · ${c.setor.andar}` : ""}
                    </Badge>
                  )}
                  {c.ramal && <span className="text-xs font-bold text-[#800020]">Ramal {c.ramal}</span>}
                </div>
                {c.observacao && <div className="text-xs text-[#64748b]">{c.observacao}</div>}
                {podeGerir && (
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirEditarContato(c)}
                      aria-label={`Editar situação: ${c.situacao}`}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setExcluindoAlvo({ tipo: "contato", registro: c })}
                      aria-label={`Excluir situação: ${c.situacao}`}
                    >
                      Excluir
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Onboarding do Colaborador</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Seu guia de integração: checklist, mapa do hospital, contatos de referência e primeiros atendimentos
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Etapas do onboarding"
          className="inline-flex flex-wrap p-1 rounded-xl bg-slate-100 border border-slate-200"
        >
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={abaAtiva === aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                abaAtiva === aba.id
                  ? "bg-[#800020] text-white shadow-sm"
                  : "text-[#475569] hover:text-[#1e293b]"
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>
      </div>

      {erroCarga ? (
        <ErrorBanner message={erroCarga} onRetry={carregar} />
      ) : carregando && !dados ? (
        <div className="space-y-4" aria-busy="true">
          <Card className="space-y-3">
            <Skeleton height="20px" width="30%" />
            <Skeleton height="44px" width="100%" />
          </Card>
          <Card className="space-y-3">
            <Skeleton height="44px" width="100%" />
            <Skeleton height="44px" width="100%" />
          </Card>
        </div>
      ) : (
        <>
          {/* Identificação do colaborador + progresso */}
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[#800020]">
                Boas-vindas, {colaborador?.nome?.split(" ")[0] || "colaborador"}!
              </h2>
              <Badge variant={progresso.percentual === 100 ? "success" : "default"}>
                {progresso.concluidos} de {progresso.total} concluídos
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <InfoColaborador rotulo="Nome" valor={colaborador?.nome} />
              <InfoColaborador rotulo="Função" valor={colaborador?.cargo} />
              <InfoColaborador
                rotulo="Setor"
                valor={
                  colaborador?.setor
                    ? `${colaborador.setor.nome}${colaborador.setor.andar ? ` · ${colaborador.setor.andar}` : ""}`
                    : null
                }
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#64748b] mb-1.5">
                <span>Progresso da integração</span>
                <span className="text-[#800020]">{progresso.percentual}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-slate-100 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progresso.percentual}
                aria-label="Progresso da integração"
              >
                <div
                  className="h-full rounded-full bg-[#800020] transition-all"
                  style={{ width: `${progresso.percentual}%` }}
                />
              </div>
            </div>
          </Card>

          {abaAtiva === "checklist" && renderListaItens(dados?.checklist || [], "CHECKLIST")}
          {abaAtiva === "mapa" && renderMapa()}
          {abaAtiva === "contatos" && renderContatos()}
          {abaAtiva === "atendimentos" && renderListaItens(dados?.atendimentos || [], "ATENDIMENTO")}
        </>
      )}

      {/* Modal Item */}
      <Modal
        open={modalItemOpen}
        onClose={salvandoItem ? undefined : () => setModalItemOpen(false)}
        title={itemEditando ? "Editar Item do Onboarding" : "Adicionar Item ao Onboarding"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalItemOpen(false)} disabled={salvandoItem}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarItem} loading={salvandoItem}>
              {itemEditando ? "Salvar Alterações" : "Adicionar"}
            </Button>
          </>
        }
      >
        <form onSubmit={salvarItem} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Select
                label="Etapa"
                required
                value={formItem.tipo}
                onChange={(e) => setFormItem((f) => ({ ...f, tipo: e.target.value }))}
                options={[
                  { value: "CHECKLIST", label: "Checklist do novo colaborador" },
                  { value: "ATENDIMENTO", label: "Primeiros atendimentos" },
                ]}
              />
            </div>
            <Input
              label="Ordem de Exibição"
              type="number"
              min="0"
              value={formItem.ordem}
              onChange={(e) => setFormItem((f) => ({ ...f, ordem: e.target.value }))}
              error={errosItem.ordem}
            />
          </div>
          <Input
            label="Título"
            required
            value={formItem.titulo}
            onChange={(e) => {
              setFormItem((f) => ({ ...f, titulo: e.target.value }));
              if (errosItem.titulo) setErrosItem((p) => ({ ...p, titulo: "" }));
            }}
            placeholder="Ex.: Retirar crachá e uniforme"
            error={errosItem.titulo}
          />
          <Textarea
            label="Orientação"
            rows={4}
            value={formItem.descricao}
            onChange={(e) => setFormItem((f) => ({ ...f, descricao: e.target.value }))}
            placeholder="Explique como e onde realizar esta etapa..."
            error={errosItem.descricao}
          />
        </form>
      </Modal>

      {/* Modal Contato */}
      <Modal
        open={modalContatoOpen}
        onClose={salvandoContato ? undefined : () => setModalContatoOpen(false)}
        title={contatoEditando ? "Editar Situação" : "Adicionar Situação"}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalContatoOpen(false)}
              disabled={salvandoContato}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarContato} loading={salvandoContato}>
              {contatoEditando ? "Salvar Alterações" : "Adicionar"}
            </Button>
          </>
        }
      >
        <form onSubmit={salvarContato} className="space-y-4" noValidate>
          <Input
            label="Situação"
            required
            value={formContato.situacao}
            onChange={(e) => {
              setFormContato((f) => ({ ...f, situacao: e.target.value }));
              if (errosContato.situacao) setErrosContato((p) => ({ ...p, situacao: "" }));
            }}
            placeholder="Ex.: Problema com login ou senha"
            error={errosContato.situacao}
          />
          <Input
            label="Quem procurar"
            required
            value={formContato.responsavel}
            onChange={(e) => {
              setFormContato((f) => ({ ...f, responsavel: e.target.value }));
              if (errosContato.responsavel) setErrosContato((p) => ({ ...p, responsavel: "" }));
            }}
            placeholder="Ex.: Service Desk"
            error={errosContato.responsavel}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Select
                label="Setor"
                value={formContato.id_setor}
                onChange={(e) => setFormContato((f) => ({ ...f, id_setor: e.target.value }))}
                placeholder="Sem setor específico"
                options={opcoesSetores}
                error={errosContato.id_setor}
              />
            </div>
            <Input
              label="Ramal"
              value={formContato.ramal}
              onChange={(e) => setFormContato((f) => ({ ...f, ramal: e.target.value }))}
              placeholder="Ex.: 4201"
              error={errosContato.ramal}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Observação"
                value={formContato.observacao}
                onChange={(e) => setFormContato((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Informação extra (opcional)"
                error={errosContato.observacao}
              />
            </div>
            <Input
              label="Ordem de Exibição"
              type="number"
              min="0"
              value={formContato.ordem}
              onChange={(e) => setFormContato((f) => ({ ...f, ordem: e.target.value }))}
              error={errosContato.ordem}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(excluindoAlvo)}
        title={excluindoAlvo?.tipo === "contato" ? "Excluir Situação" : "Excluir Item"}
        message={`Deseja realmente excluir "${
          excluindoAlvo?.registro?.titulo || excluindoAlvo?.registro?.situacao || ""
        }" do onboarding?`}
        confirmLabel="Excluir"
        variant="danger"
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluindoAlvo(null)}
      />
    </div>
  );
}

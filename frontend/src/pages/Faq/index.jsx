import React, { useCallback, useEffect, useState } from "react";
import {
  atualizarFaq,
  criarFaq,
  excluirFaq,
  listarCategoriasFaq,
  listarFaqs,
} from "../../api/faq";
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
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const CATEGORIAS_PADRAO_FAQ = [
  "Benefícios",
  "Escalas",
  "Férias",
  "Normas Hospitalares",
];

function semAcentos(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function destacarTermoTexto(texto = "", termo = "") {
  const textoStr = String(texto || "");
  const termoLimpo = String(termo || "").trim();
  if (!termoLimpo) return textoStr;

  const textoNorm = semAcentos(textoStr);
  const termoNorm = semAcentos(termoLimpo);
  if (!termoNorm) return textoStr;

  const partes = [];
  let cursor = 0;
  let pos = textoNorm.indexOf(termoNorm, cursor);
  let keyIdx = 0;

  while (pos !== -1) {
    if (pos > cursor) {
      partes.push(textoStr.slice(cursor, pos));
    }
    partes.push(
      <mark
        key={`mark-${keyIdx++}`}
        className="bg-amber-200 text-[#1e293b] px-0.5 rounded-xs font-medium"
      >
        {textoStr.slice(pos, pos + termoNorm.length)}
      </mark>,
    );
    cursor = pos + termoNorm.length;
    pos = textoNorm.indexOf(termoNorm, cursor);
  }

  if (cursor < textoStr.length) {
    partes.push(textoStr.slice(cursor));
  }

  return partes;
}

export default function Faq() {
  const { autenticado, temPerfil } = useAuth();
  const podeGerir = autenticado && temPerfil("ADMIN", "RH");
  const { sucesso, erro: toastErro } = useToast();

  // Busca e filtro de categoria
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("");

  // Dados da listagem e categorias
  const [grupos, setGrupos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  // Controle de acordeão (IDs expandidos)
  const [abertos, setAbertos] = useState(() => new Set());

  // Modal de Criação / Edição de Pergunta
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [faqEditando, setFaqEditando] = useState(null);
  const [formPergunta, setFormPergunta] = useState("");
  const [formResposta, setFormResposta] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formOrdem, setFormOrdem] = useState("1");
  const [errosForm, setErrosForm] = useState({});
  const [salvandoForm, setSalvandoForm] = useState(false);

  // Confirmação de Exclusão
  const [faqExcluindo, setFaqExcluindo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarCategorias = useCallback(async () => {
    try {
      const lista = await listarCategoriasFaq();
      setCategorias(Array.isArray(lista) ? lista : []);
    } catch {
      /* Mantém lista atual */
    }
  }, []);

  const carregarFaqs = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const resp = await listarFaqs({
        busca: busca.trim() || undefined,
        categoria: categoriaAtiva || undefined,
      });
      const listaGrupos = Array.isArray(resp) ? resp : [];
      setGrupos(listaGrupos);

      // Quando há busca ativa, expande automaticamente as perguntas encontradas
      if (busca.trim()) {
        const idsEncontrados = new Set();
        listaGrupos.forEach((g) => {
          (g.perguntas || []).forEach((p) => idsEncontrados.add(p.id_faq));
        });
        setAbertos(idsEncontrados);
      }
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar as perguntas frequentes.");
    } finally {
      setCarregando(false);
    }
  }, [busca, categoriaAtiva]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarFaqs();
  }, [carregarFaqs]);

  function alternarAcordeao(idFaq) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(idFaq)) {
        novo.delete(idFaq);
      } else {
        novo.add(idFaq);
      }
      return novo;
    });
  }

  function abrirModalNova() {
    setFaqEditando(null);
    setFormPergunta("");
    setFormResposta("");
    setFormCategoria(categoriaAtiva || "");
    setFormOrdem("1");
    setErrosForm({});
    setModalFormOpen(true);
  }

  function abrirModalEditar(item) {
    setFaqEditando(item);
    setFormPergunta(item.pergunta || "");
    setFormResposta(item.resposta || "");
    setFormCategoria(item.categoria || "");
    setFormOrdem(String(item.ordem ?? 0));
    setErrosForm({});
    setModalFormOpen(true);
  }

  function validarFormulario() {
    const erros = {};
    const p = formPergunta.trim();
    const r = formResposta.trim();
    const c = formCategoria.trim();

    if (!p) {
      erros.pergunta = "Este campo é obrigatório.";
    } else if (p.length < 5) {
      erros.pergunta = "A pergunta deve ter pelo menos 5 caracteres.";
    }

    if (!r) {
      erros.resposta = "Este campo é obrigatório.";
    }

    if (!c) {
      erros.categoria = "Informe a categoria da pergunta.";
    }

    const ordemNum = Number(formOrdem);
    if (Number.isNaN(ordemNum) || ordemNum < 0) {
      erros.ordem = "Informe uma ordem válida (0 ou maior).";
    }

    setErrosForm(erros);
    return Object.keys(erros).length === 0;
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    setSalvandoForm(true);
    try {
      const payload = {
        pergunta: formPergunta.trim(),
        resposta: formResposta.trim(),
        categoria: formCategoria.trim(),
        ordem: Number(formOrdem) || 0,
      };

      if (faqEditando) {
        await atualizarFaq(faqEditando.id_faq, payload);
        sucesso("Pergunta frequente atualizada com sucesso.");
      } else {
        const criada = await criarFaq(payload);
        sucesso("Pergunta frequente adicionada à Central de Ajuda.");
        if (criada?.id_faq) {
          setAbertos((prev) => new Set(prev).add(criada.id_faq));
        }
      }

      setModalFormOpen(false);
      await Promise.all([carregarFaqs(), carregarCategorias()]);
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      }
      toastErro(err?.mensagem || "Não foi possível salvar a pergunta.");
    } finally {
      setSalvandoForm(false);
    }
  }

  async function handleConfirmarExclusao() {
    if (!faqExcluindo) return;
    setExcluindo(true);
    try {
      await excluirFaq(faqExcluindo.id_faq);
      sucesso("Pergunta excluída com sucesso.");
      setFaqExcluindo(null);
      await Promise.all([carregarFaqs(), carregarCategorias()]);
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível excluir a pergunta.");
    } finally {
      setExcluindo(false);
    }
  }

  const temFiltroAtivo = Boolean(busca.trim() || categoriaAtiva);
  const opcoesChipsCategorias = Array.from(
    new Set([...CATEGORIAS_PADRAO_FAQ, ...categorias]),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Central de Ajuda (FAQ)</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Perguntas frequentes sobre férias, benefícios, escalas de plantão e normas hospitalares
          </p>
        </div>
        {podeGerir && (
          <Button variant="primary" onClick={abrirModalNova}>
            + Adicionar Pergunta
          </Button>
        )}
      </div>

      {/* Busca Instantânea + Chips de Categoria (UC09) */}
      <Card className="space-y-4">
        <div className="max-w-xl">
          <SearchInput
            value={busca}
            onChange={setBusca}
            placeholder="Pesquisar dúvida frequente em perguntas ou respostas..."
            ariaLabel="Pesquisar perguntas frequentes"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-[#64748b] mr-1">Categorias:</span>
          <button
            type="button"
            onClick={() => setCategoriaAtiva("")}
            className={`faq-chip px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
              !categoriaAtiva
                ? "faq-chip--active bg-[#800020] text-white shadow-xs"
                : "faq-chip--inactive bg-slate-100 text-[#475569] hover:bg-slate-200"
            }`}
          >
            Todas
          </button>
          {opcoesChipsCategorias.map((cat) => {
            const ativa = categoriaAtiva === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaAtiva(ativa ? "" : cat)}
                className={`faq-chip px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  ativa
                    ? "faq-chip--active bg-[#800020] text-white shadow-xs"
                    : "faq-chip--inactive bg-slate-100 text-[#475569] hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            );
          })}
          {temFiltroAtivo && (
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setCategoriaAtiva("");
              }}
              className="ml-auto text-xs font-semibold text-[#800020] hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Estados da listagem: Erro, Carregando, Vazio ou Acordeão */}
      {erroLista ? (
        <ErrorBanner message={erroLista} onRetry={carregarFaqs} />
      ) : carregando ? (
        <div className="space-y-4" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="space-y-3">
              <Skeleton height="20px" width="25%" />
              <Skeleton height="44px" width="100%" />
              <Skeleton height="44px" width="100%" />
            </Card>
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <Card>
          <EmptyState
            title={
              temFiltroAtivo
                ? "Nenhuma pergunta encontrada"
                : "Nenhuma pergunta frequente disponível"
            }
            description={
              temFiltroAtivo
                ? "Revise os termos informados ou selecione outra categoria."
                : "Ainda não há perguntas cadastradas na Central de Ajuda."
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <Card key={grupo.categoria} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-[#800020]">{grupo.categoria}</h2>
                <Badge variant="default">
                  {(grupo.perguntas || []).length}{" "}
                  {(grupo.perguntas || []).length === 1 ? "pergunta" : "perguntas"}
                </Badge>
              </div>

              <div className="space-y-2.5">
                {(grupo.perguntas || []).map((item) => {
                  const expandido = abertos.has(item.id_faq);
                  const painelId = `faq-painel-${item.id_faq}`;
                  const botaoId = `faq-botao-${item.id_faq}`;
                  return (
                    <div
                      key={item.id_faq}
                      className={`faq-item rounded-xl border transition ${
                        expandido
                          ? "faq-item--expanded bg-white border-[#800020]/30 shadow-xs"
                          : "faq-item--collapsed bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 p-3.5">
                        <button
                          id={botaoId}
                          type="button"
                          aria-expanded={expandido}
                          aria-controls={painelId}
                          onClick={() => alternarAcordeao(item.id_faq)}
                          className="faq-item__trigger flex-1 flex items-center justify-between gap-3 text-left text-sm font-semibold text-[#1e293b] cursor-pointer focus:outline-none"
                        >
                          <span className="faq-item__question">
                            {destacarTermoTexto(item.pergunta, busca)}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`faq-item__chevron text-xs text-[#64748b] transition-transform duration-200 shrink-0 ${
                              expandido ? "rotate-180 text-[#800020]" : ""
                            }`}
                          >
                            ▼
                          </span>
                        </button>

                        {podeGerir && (
                          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirModalEditar(item)}
                              aria-label={`Editar pergunta: ${item.pergunta}`}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setFaqExcluindo(item)}
                              aria-label={`Excluir pergunta: ${item.pergunta}`}
                            >
                              Excluir
                            </Button>
                          </div>
                        )}
                      </div>

                      {expandido && (
                        <div
                          id={painelId}
                          role="region"
                          aria-labelledby={botaoId}
                          className="faq-item__body px-4 pb-4 pt-2.5 text-xs text-[#475569] leading-relaxed border-t border-slate-100 whitespace-pre-line"
                        >
                          {destacarTermoTexto(item.resposta, busca)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Pergunta Frequente */}
      <Modal
        open={modalFormOpen}
        onClose={salvandoForm ? undefined : () => setModalFormOpen(false)}
        title={faqEditando ? "Editar Pergunta Frequente" : "Adicionar Pergunta Frequente"}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalFormOpen(false)}
              disabled={salvandoForm}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitForm}
              loading={salvandoForm}
            >
              {faqEditando ? "Salvar Alterações" : "Cadastrar Pergunta"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4" noValidate>
          <Input
            label="Pergunta"
            required
            value={formPergunta}
            onChange={(e) => {
              setFormPergunta(e.target.value);
              if (errosForm.pergunta) setErrosForm((p) => ({ ...p, pergunta: "" }));
            }}
            placeholder="Ex.: Qual o procedimento para solicitar troca de plantão?"
            error={errosForm.pergunta}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Categoria"
                required
                list="datalist-categorias-faq"
                value={formCategoria}
                onChange={(e) => {
                  setFormCategoria(e.target.value);
                  if (errosForm.categoria) setErrosForm((p) => ({ ...p, categoria: "" }));
                }}
                placeholder="Ex.: Férias, Benefícios, Escalas..."
                error={errosForm.categoria}
              />
              <datalist id="datalist-categorias-faq">
                {opcoesChipsCategorias.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <Input
              label="Ordem de Exibição"
              type="number"
              min="0"
              value={formOrdem}
              onChange={(e) => setFormOrdem(e.target.value)}
              error={errosForm.ordem}
            />
          </div>

          <Textarea
            label="Resposta"
            required
            rows={5}
            value={formResposta}
            onChange={(e) => {
              setFormResposta(e.target.value);
              if (errosForm.resposta) setErrosForm((p) => ({ ...p, resposta: "" }));
            }}
            placeholder="Descreva a orientação completa e clara para o colaborador..."
            error={errosForm.resposta}
          />
        </form>
      </Modal>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={Boolean(faqExcluindo)}
        title="Excluir Pergunta Frequente"
        message={`Deseja realmente excluir a pergunta "${faqExcluindo?.pergunta}" da Central de Ajuda?`}
        confirmLabel="Excluir Pergunta"
        variant="danger"
        loading={excluindo}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setFaqExcluindo(null)}
      />
    </div>
  );
}

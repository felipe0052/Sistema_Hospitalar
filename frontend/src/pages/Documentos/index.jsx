import React, { useCallback, useEffect, useState } from "react";
import {
  DOCUMENTO_MAX_MB,
  baixarDocumento,
  enviarDocumento,
  excluirDocumento,
  listarCategoriasDocumentos,
  listarDocumentos,
  listarVersoesDocumento,
} from "../../api/documentos";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import useDebounce from "../../hooks/useDebounce";

const TAMANHO_PAGINA = 100;
const SEM_CATEGORIA = "Sem categoria";
const FORM_VAZIO = {
  titulo: "",
  tipo: "POP",
  categoria: "",
  palavras_chave: "",
  descricao: "",
  arquivo: null,
};

function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatarData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function validarArquivo(arquivo) {
  if (!arquivo) return "Selecione um arquivo PDF ou DOCX.";
  if (!/\.(pdf|docx)$/i.test(arquivo.name)) return "Formato inválido. Envie um arquivo PDF ou DOCX.";
  if (arquivo.size > DOCUMENTO_MAX_MB * 1024 * 1024)
    return `O arquivo excede o limite de ${DOCUMENTO_MAX_MB} MB.`;
  return "";
}

function agruparPorCategoria(itens) {
  const grupos = new Map();
  for (const doc of itens) {
    const chave = doc.categoria || SEM_CATEGORIA;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(doc);
  }
  return [...grupos.entries()].sort(([a], [b]) => {
    if (a === SEM_CATEGORIA) return 1;
    if (b === SEM_CATEGORIA) return -1;
    return a.localeCompare(b, "pt-BR");
  });
}

export default function Documentos() {
  const { temPerfil } = useAuth();
  const toast = useToast();
  const podeGerir = temPerfil("ADMIN", "RH");

  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounce(busca, 300);
  const [categoria, setCategoria] = useState("");
  const [pagina, setPagina] = useState(1);
  const [verInativas, setVerInativas] = useState(false);
  const [dados, setDados] = useState({ itens: [], total: 0 });
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [errosForm, setErrosForm] = useState({});
  const [enviando, setEnviando] = useState(false);

  const [versoesDoc, setVersoesDoc] = useState(null);
  const [versoes, setVersoes] = useState([]);
  const [excluir, setExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resp = await listarDocumentos({
        busca: buscaDebounced,
        categoria,
        incluir_inativas: podeGerir && verInativas,
        pagina,
        tamanho: TAMANHO_PAGINA,
      });
      setDados(resp);
    } catch (e) {
      setErro(e.mensagem || "Não foi possível carregar os documentos.");
    } finally {
      setCarregando(false);
    }
  }, [buscaDebounced, categoria, pagina, podeGerir, verInativas]);

  const carregarCategorias = useCallback(() => {
    listarCategoriasDocumentos()
      .then(setCategorias)
      .catch(() => setCategorias([]));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  function atualizarCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrosForm((e) => ({ ...e, [campo]: "" }));
  }

  function fecharModal() {
    if (enviando) return;
    setModalAberto(false);
    setForm(FORM_VAZIO);
    setErrosForm({});
  }

  async function submeter(e) {
    e.preventDefault();
    const novosErros = {};
    if (!form.titulo.trim()) novosErros.titulo = "Este campo é obrigatório.";
    const erroArquivo = validarArquivo(form.arquivo);
    if (erroArquivo) novosErros.arquivo = erroArquivo;
    if (Object.keys(novosErros).length) {
      setErrosForm(novosErros);
      return;
    }

    setEnviando(true);
    try {
      const criado = await enviarDocumento({ ...form, titulo: form.titulo.trim() });
      toast.sucesso(
        criado.versao > 1
          ? `Nova versão (v${criado.versao}) publicada. A anterior foi arquivada.`
          : "Documento publicado com sucesso.",
      );
      setModalAberto(false);
      setForm(FORM_VAZIO);
      setErrosForm({});
      setPagina(1);
      await Promise.all([carregar(), carregarCategorias()]);
    } catch (err) {
      setErrosForm(err.erros || {});
      toast.erro(err.mensagem || "Não foi possível enviar o documento.");
    } finally {
      setEnviando(false);
    }
  }

  async function abrirVersoes(doc) {
    setVersoesDoc(doc);
    setVersoes([]);
    try {
      setVersoes(await listarVersoesDocumento(doc.id_doc));
    } catch (err) {
      toast.erro(err.mensagem || "Não foi possível carregar o histórico.");
    }
  }

  async function baixar(doc) {
    try {
      await baixarDocumento(doc);
    } catch (err) {
      toast.erro(err.mensagem || "Não foi possível baixar o arquivo.");
    }
  }

  async function confirmarExclusao() {
    setExcluindo(true);
    try {
      await excluirDocumento(excluir.id_doc);
      toast.sucesso("Versão excluída.");
      setExcluir(null);
      setVersoesDoc(null);
      await Promise.all([carregar(), carregarCategorias()]);
    } catch (err) {
      toast.erro(err.mensagem || "Não foi possível excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  const itens = dados.itens || [];
  const grupos = agruparPorCategoria(itens);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Documentos (POPs)</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Repositório central de Procedimentos Operacionais Padrão e normas institucionais
          </p>
        </div>
        {podeGerir && (
          <Button variant="primary" onClick={() => setModalAberto(true)}>
            + Adicionar Novo
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-md">
          <SearchInput
            value={busca}
            onChange={(v) => {
              setBusca(v);
              setPagina(1);
            }}
            placeholder="Buscar por título, categoria ou palavra-chave..."
          />
        </div>
        <div className="w-56">
          <Select
            aria-label="Filtrar por categoria"
            placeholder="Todas as categorias"
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setPagina(1);
            }}
            options={categorias.map((c) => ({ value: c, label: c }))}
          />
        </div>
        {podeGerir && (
          <label className="flex items-center gap-2 text-sm text-[#475569] pb-2">
            <input
              type="checkbox"
              checked={verInativas}
              onChange={(e) => {
                setVerInativas(e.target.checked);
                setPagina(1);
              }}
            />
            Exibir versões antigas
          </label>
        )}
      </div>

      {erro && <ErrorBanner message={erro} onRetry={carregar} />}

      {carregando ? (
        <div className="space-y-3">
          <Skeleton height="72px" />
          <Skeleton height="72px" />
          <Skeleton height="72px" />
        </div>
      ) : itens.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum documento encontrado. Revise os termos da pesquisa." />
        </Card>
      ) : (
        <div className="space-y-6">
          {grupos.map(([nomeCategoria, docs]) => (
            <section key={nomeCategoria} aria-label={nomeCategoria} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#475569] border-b border-[#e2e8f0] pb-1">
                {nomeCategoria}
                <span className="text-xs font-normal text-[#94a3b8]">({docs.length})</span>
              </h2>
              {docs.map((doc) => (
            <Card key={doc.id_doc} className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary">{doc.tipo}</Badge>
                  {doc.categoria && <Badge variant="default">{doc.categoria}</Badge>}
                  <Badge variant={doc.ativo ? "ativo" : "warning"}>
                    v{doc.versao}
                    {doc.ativo ? " • vigente" : " • arquivada"}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-[#1e293b]">{doc.titulo}</h3>
                {doc.descricao && <p className="text-xs text-[#64748b]">{doc.descricao}</p>}
                {doc.palavras_chave.length > 0 && (
                  <p className="text-xs text-[#94a3b8]">
                    {doc.palavras_chave.map((p) => `#${p}`).join("  ")}
                  </p>
                )}
                <p className="text-xs text-[#94a3b8]">
                  {doc.nome_arquivo} · {formatarTamanho(doc.tamanho_bytes)} · {formatarData(doc.data_upload)}
                </p>
              </div>
              <div className="flex gap-2">
                {podeGerir && (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => abrirVersoes(doc)}>
                      Versões
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setExcluir(doc)}>
                      Excluir
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="sm" onClick={() => baixar(doc)}>
                  Visualizar / Baixar
                </Button>
              </div>
            </Card>
          ))}
            </section>
          ))}
          <Pagination
            pagina={pagina}
            tamanho={TAMANHO_PAGINA}
            total={dados.total}
            onPageChange={setPagina}
          />
        </div>
      )}

      <Modal
        open={modalAberto}
        onClose={fecharModal}
        title="Adicionar documento"
        footer={
          <>
            <Button variant="secondary" onClick={fecharModal} disabled={enviando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submeter} loading={enviando}>
              Publicar
            </Button>
          </>
        }
      >
        <form onSubmit={submeter} className="space-y-4" noValidate>
          <Input
            label="Título"
            required
            value={form.titulo}
            maxLength={200}
            error={errosForm.titulo}
            helperText="Reenviar com o mesmo título e tipo cria uma nova versão e arquiva a anterior."
            onChange={(e) => atualizarCampo("titulo", e.target.value)}
          />
          <Select
            label="Tipo"
            value={form.tipo}
            error={errosForm.tipo}
            onChange={(e) => atualizarCampo("tipo", e.target.value)}
            options={[
              { value: "POP", label: "POP" },
              { value: "DOCUMENTO", label: "Documento" },
            ]}
          />
          <Input
            label="Palavras-chave"
            value={form.palavras_chave}
            error={errosForm.palavras_chave}
            helperText="Separadas por vírgula. Se a categoria ficar em branco, ela é sugerida pelas palavras-chave."
            onChange={(e) => atualizarCampo("palavras_chave", e.target.value)}
          />
          <Input
            label="Categoria"
            value={form.categoria}
            maxLength={100}
            error={errosForm.categoria}
            list="categorias-documentos"
            onChange={(e) => atualizarCampo("categoria", e.target.value)}
          />
          <datalist id="categorias-documentos">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Textarea
            label="Descrição"
            rows={3}
            maxLength={1000}
            value={form.descricao}
            error={errosForm.descricao}
            onChange={(e) => atualizarCampo("descricao", e.target.value)}
          />
          <Input
            label="Arquivo (PDF ou DOCX)"
            type="file"
            required
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            error={errosForm.arquivo}
            helperText={`Tamanho máximo: ${DOCUMENTO_MAX_MB} MB.`}
            onChange={(e) => atualizarCampo("arquivo", e.target.files?.[0] || null)}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(versoesDoc)}
        onClose={() => setVersoesDoc(null)}
        title={versoesDoc ? `Histórico — ${versoesDoc.titulo}` : ""}
      >
        <ul className="space-y-2">
          {versoes.map((v) => (
            <li key={v.id_doc} className="flex items-center justify-between gap-3 text-sm">
              <span>
                <strong>v{v.versao}</strong> · {formatarData(v.data_upload)} · {v.autor?.nome || "—"} ·{" "}
                {v.ativo ? "vigente" : "arquivada"}
              </span>
              <span className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => baixar(v)}>
                  Baixar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setExcluir(v)}>
                  Excluir
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </Modal>

      <ConfirmDialog
        open={Boolean(excluir)}
        title="Excluir versão"
        message={
          excluir?.ativo
            ? `Excluir a versão vigente (v${excluir?.versao}) de "${excluir?.titulo}"? A versão anterior voltará a ser a vigente.`
            : `Excluir a versão v${excluir?.versao} de "${excluir?.titulo}"?`
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onCancel={() => setExcluir(null)}
      />
    </div>
  );
}

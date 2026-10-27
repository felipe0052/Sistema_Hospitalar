import React, { useCallback, useEffect, useState } from "react";
import {
  atualizarSetor,
  criarSetor,
  excluirSetor,
  listarSetores,
} from "../../api/setores";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorBanner,
  Input,
  Modal,
  SearchInput,
  Select,
  Skeleton,
  Table,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const OPCOES_ANDAR = [
  { value: "", label: "Selecione o andar (opcional)" },
  { value: "Térreo", label: "Térreo" },
  { value: "1º andar", label: "1º andar" },
  { value: "2º andar", label: "2º andar" },
  { value: "3º andar", label: "3º andar" },
  { value: "4º andar", label: "4º andar" },
  { value: "5º andar", label: "5º andar" },
];

const FILTROS_ANDAR = [
  { value: "", label: "Todos os andares" },
  { value: "Térreo", label: "Térreo" },
  { value: "1º andar", label: "1º andar" },
  { value: "2º andar", label: "2º andar" },
  { value: "3º andar", label: "3º andar" },
  { value: "4º andar", label: "4º andar" },
  { value: "5º andar", label: "5º andar" },
];

export default function AdminSetores() {
  const { autenticado, isAdmin } = useAuth();
  const podeGerir = autenticado && isAdmin;
  const { sucesso, erro: toastErro, aviso: toastAviso } = useToast();

  // Busca e filtro por andar
  const [busca, setBusca] = useState("");
  const [filtroAndar, setFiltroAndar] = useState("");

  // Dados da listagem
  const [setores, setSetores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  // Modal Novo / Editar Setor (UC08)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [setorEditando, setSetorEditando] = useState(null);
  const [formNome, setFormNome] = useState("");
  const [formAndar, setFormAndar] = useState("");
  const [formRamais, setFormRamais] = useState([{ numero: "", descricao: "" }]);
  const [errosForm, setErrosForm] = useState({});
  const [errosRamais, setErrosRamais] = useState({});
  const [salvandoForm, setSalvandoForm] = useState(false);

  // Modal de Confirmação de Exclusão
  const [setorExcluindo, setSetorExcluindo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarSetores = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const lista = await listarSetores({
        busca: busca.trim() || undefined,
        andar: filtroAndar || undefined,
      });
      setSetores(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os setores e ramais.");
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroAndar]);

  useEffect(() => {
    carregarSetores();
  }, [carregarSetores]);

  function abrirModalNovo() {
    setSetorEditando(null);
    setFormNome("");
    setFormAndar("Térreo");
    setFormRamais([{ numero: "", descricao: "" }]);
    setErrosForm({});
    setErrosRamais({});
    setModalFormOpen(true);
  }

  function abrirModalEditar(setor) {
    setSetorEditando(setor);
    setFormNome(setor.nome || "");
    setFormAndar(setor.andar || "");
    const ramaisIniciais =
      Array.isArray(setor.ramais) && setor.ramais.length > 0
        ? setor.ramais.map((r) => ({
            numero: r.numero || "",
            descricao: r.descricao || "",
          }))
        : [{ numero: "", descricao: "" }];
    setFormRamais(ramaisIniciais);
    setErrosForm({});
    setErrosRamais({});
    setModalFormOpen(true);
  }

  function adicionarLinhaRamal() {
    setFormRamais((atuais) => [...atuais, { numero: "", descricao: "" }]);
  }

  function removerLinhaRamal(index) {
    if (formRamais.length <= 1) return;
    setFormRamais((atuais) => atuais.filter((_, idx) => idx !== index));
    setErrosRamais((prev) => {
      const novo = { ...prev };
      delete novo[index];
      return novo;
    });
  }

  function atualizarCampoRamal(index, campo, valor) {
    setFormRamais((atuais) =>
      atuais.map((item, idx) => (idx === index ? { ...item, [campo]: valor } : item)),
    );
    if (campo === "numero") {
      setErrosRamais((prev) => ({ ...prev, [index]: "" }));
      if (errosForm.ramais) setErrosForm((p) => ({ ...p, ramais: "" }));
    }
  }

  function validarFormulario() {
    const novosErros = {};
    const novosErrosRamais = {};

    const nomeLimpo = formNome.trim();
    if (!nomeLimpo) {
      novosErros.nome = "O nome do setor é obrigatório.";
    }

    if (!formRamais || formRamais.length === 0) {
      novosErros.ramais = "Informe pelo menos 1 ramal para o setor.";
    } else {
      const vistos = new Map();
      formRamais.forEach((r, idx) => {
        const num = String(r.numero || "").trim();
        if (!num) {
          novosErrosRamais[idx] = "Informe o número do ramal.";
        } else if (!/^[0-9]{3,10}$/.test(num)) {
          novosErrosRamais[idx] = "Apenas dígitos numéricos (3 a 10 dígitos).";
        } else if (vistos.has(num)) {
          novosErrosRamais[idx] = `Ramal ${num} repetido neste setor.`;
          novosErrosRamais[vistos.get(num)] = `Ramal ${num} repetido neste setor.`;
        } else {
          vistos.set(num, idx);
        }
      });
    }

    setErrosForm(novosErros);
    setErrosRamais(novosErrosRamais);
    return (
      Object.keys(novosErros).length === 0 && Object.keys(novosErrosRamais).length === 0
    );
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    setSalvandoForm(true);
    try {
      const payload = {
        nome: formNome.trim(),
        andar: formAndar.trim() || null,
        ramais: formRamais.map((r) => ({
          numero: String(r.numero).trim(),
          descricao: String(r.descricao || "").trim() || null,
        })),
      };

      if (setorEditando) {
        await atualizarSetor(setorEditando.id_setor, payload);
        sucesso(`Setor "${payload.nome}" atualizado com sucesso.`);
      } else {
        await criarSetor(payload);
        sucesso(`Setor "${payload.nome}" cadastrado com sucesso.`);
      }

      setModalFormOpen(false);
      await carregarSetores();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      }
      toastErro(err?.mensagem || "Não foi possível salvar o setor.");
    } finally {
      setSalvandoForm(false);
    }
  }

  async function handleConfirmarExclusao() {
    if (!setorExcluindo) return;
    setExcluindo(true);
    try {
      await excluirSetor(setorExcluindo.id_setor);
      sucesso(`Setor "${setorExcluindo.nome}" excluído com sucesso.`);
      setSetorExcluindo(null);
      await carregarSetores();
    } catch (err) {
      if (err?.status === 409) {
        toastAviso(err?.mensagem || "Existem usuários vinculados a este setor");
      } else {
        toastErro(err?.mensagem || "Não foi possível excluir o setor.");
      }
      setSetorExcluindo(null);
    } finally {
      setExcluindo(false);
    }
  }

  const colunas = [
    {
      key: "nome",
      header: "Nome do Setor",
      render: (s) => <span className="font-semibold text-[#1e293b]">{s.nome}</span>,
    },
    {
      key: "andar",
      header: "Andar",
      render: (s) => <span className="text-[#475569]">{s.andar || "—"}</span>,
    },
    {
      key: "ramais",
      header: "Ramais Vinculados",
      render: (s) => (
        <div className="flex flex-wrap gap-1.5">
          {(s.ramais || []).map((r) => (
            <Badge key={r.id_ramal || r.numero} variant="default">
              {r.numero}
              {r.descricao ? ` (${r.descricao})` : ""}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "total_usuarios",
      header: "Total de Colaboradores Alocados",
      render: (s) => (
        <Badge variant={s.total_usuarios > 0 ? "info" : "default"}>
          {s.total_usuarios} {s.total_usuarios === 1 ? "colaborador" : "colaboradores"}
        </Badge>
      ),
    },
    ...(podeGerir
      ? [
          {
            key: "acoes",
            header: "Ações",
            render: (s) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => abrirModalEditar(s)}
                  aria-label={`Editar setor ${s.nome}`}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setSetorExcluindo(s)}
                  aria-label={`Excluir setor ${s.nome}`}
                >
                  Excluir
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Setores e Ramais</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Gestão administrativa de setores hospitalares, localização por andar e ramais telefônicos internos (UC08)
          </p>
        </div>
        {podeGerir ? (
          <Button variant="primary" onClick={abrirModalNovo}>
            + Novo Setor
          </Button>
        ) : (
          <Badge variant="leitura">Modo Somente Visualização</Badge>
        )}
      </div>

      {/* Filtros: Busca por nome/ramal e Select por Andar */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[260px]">
          <SearchInput
            value={busca}
            onChange={setBusca}
            placeholder="Buscar por nome do setor, número do ramal ou descrição..."
            ariaLabel="Buscar setores e ramais"
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            aria-label="Filtrar por andar"
            value={filtroAndar}
            onChange={(e) => setFiltroAndar(e.target.value)}
            options={FILTROS_ANDAR}
          />
        </div>
      </Card>

      {/* Tabela administrativa */}
      {erroLista ? (
        <ErrorBanner message={erroLista} onRetry={carregarSetores} />
      ) : carregando ? (
        <Card className="space-y-3" aria-busy="true">
          <Skeleton height="36px" width="100%" />
          <Skeleton height="44px" width="100%" />
          <Skeleton height="44px" width="100%" />
          <Skeleton height="44px" width="100%" />
        </Card>
      ) : (
        <Table
          columns={colunas}
          data={setores}
          rowKey="id_setor"
          emptyMessage="Nenhum setor encontrado para os filtros selecionados."
        />
      )}

      {/* Modal Novo / Editar Setor (UC08) */}
      <Modal
        open={modalFormOpen}
        onClose={salvandoForm ? undefined : () => setModalFormOpen(false)}
        title={setorEditando ? `Editar Setor — ${setorEditando.nome}` : "Cadastrar Novo Setor"}
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
            <Button
              variant="primary"
              onClick={handleSubmitForm}
              loading={salvandoForm}
            >
              {setorEditando ? "Salvar Alterações" : "Cadastrar Setor"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Setor"
              required
              value={formNome}
              onChange={(e) => {
                setFormNome(e.target.value);
                if (errosForm.nome) setErrosForm((p) => ({ ...p, nome: "" }));
              }}
              placeholder="Ex.: Unidade Coronariana, Pediatria..."
              error={errosForm.nome}
            />

            <Select
              label="Andar"
              value={formAndar}
              onChange={(e) => setFormAndar(e.target.value)}
              options={OPCOES_ANDAR}
              error={errosForm.andar}
            />
          </div>

          {/* Lista dinâmica de ramais */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1e293b]">
                  Ramais Telefônicos do Setor *
                </h3>
                <p className="text-xs text-[#64748b]">
                  Adicione um ou mais ramais exclusivos (apenas números de 3 a 10 dígitos)
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={adicionarLinhaRamal}
              >
                + Adicionar Ramal
              </Button>
            </div>

            {errosForm.ramais && (
              <p className="text-xs text-red-600 font-medium" role="alert">
                ⚠ {errosForm.ramais}
              </p>
            )}

            <div className="space-y-3">
              {formRamais.map((ramal, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start gap-3"
                >
                  <div className="w-full sm:w-44">
                    <Input
                      label={`Número do Ramal #${idx + 1}`}
                      required
                      value={ramal.numero}
                      onChange={(e) => atualizarCampoRamal(idx, "numero", e.target.value)}
                      placeholder="Ex.: 2101"
                      error={errosRamais[idx]}
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <Input
                      label="Descrição (opcional)"
                      value={ramal.descricao}
                      onChange={(e) => atualizarCampoRamal(idx, "descricao", e.target.value)}
                      placeholder="Ex.: Posto de Enfermagem / Coordenação"
                    />
                  </div>
                  <div className="pt-6 shrink-0">
                    <button
                      type="button"
                      disabled={formRamais.length <= 1}
                      onClick={() => removerLinhaRamal(idx)}
                      aria-label={`Remover ramal ${idx + 1}`}
                      title={
                        formRamais.length <= 1
                          ? "O setor deve possuir no mínimo 1 ramal"
                          : "Remover este ramal"
                      }
                      className={`p-2 rounded-lg border transition ${
                        formRamais.length <= 1
                          ? "border-slate-200 text-slate-300 cursor-not-allowed"
                          : "border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                      }`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão de Setor */}
      <ConfirmDialog
        open={Boolean(setorExcluindo)}
        title="Excluir Setor"
        message={
          setorExcluindo?.total_usuarios > 0
            ? `Atenção: o setor "${setorExcluindo?.nome}" possui ${setorExcluindo?.total_usuarios} colaborador(es) vinculado(s). Deseja tentar excluir mesmo assim?`
            : `Confirma a exclusão do setor "${setorExcluindo?.nome}" e de todos os seus ramais vinculados?`
        }
        confirmLabel="Excluir Setor"
        variant="danger"
        loading={excluindo}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setSetorExcluindo(null)}
      />
    </div>
  );
}

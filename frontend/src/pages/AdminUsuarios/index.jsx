import React, { useCallback, useEffect, useState } from "react";
import { listarSetores } from "../../api/setores";
import {
  alterarAcesso,
  atualizarUsuario,
  criarUsuario,
  listarHistoricoAcesso,
  listarUsuarios,
  redefinirSenha,
} from "../../api/usuarios";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorBanner,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Table,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const OPCOES_PERFIL = [
  { value: "COLABORADOR", label: "Colaborador" },
  { value: "RH", label: "RH" },
  { value: "MARKETING", label: "Marketing" },
  { value: "ADMIN", label: "Administrador" },
];

const OPCOES_STATUS = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
];

function formatarDataHora(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function validarSenhaForte(senha) {
  if (!senha || senha.length < 8) {
    return "A senha deve ter no mínimo 8 caracteres.";
  }
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(senha) || !/\d/.test(senha)) {
    return "A senha deve conter pelo menos 1 letra e 1 número.";
  }
  return "";
}

export default function AdminUsuarios() {
  const { usuario: usuarioLogado, isAdmin } = useAuth();
  const { sucesso, erro: toastErro } = useToast();

  // Filtros e paginação
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [pagina, setPagina] = useState(1);
  const tamanho = 20;

  // Dados da listagem
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [setores, setSetores] = useState([]);

  // Modal Novo/Editar Usuário (UC02)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formDados, setFormDados] = useState({
    nome: "",
    email: "",
    senha: "",
    data_nascimento: "",
    cargo: "",
    id_setor: "",
    perfil: "COLABORADOR",
  });
  const [errosForm, setErrosForm] = useState({});
  const [salvandoForm, setSalvandoForm] = useState(false);

  // Modal Controle de Acesso (UC03)
  const [modalAcessoOpen, setModalAcessoOpen] = useState(false);
  const [usuarioAcesso, setUsuarioAcesso] = useState(null);
  const [acessoForm, setAcessoForm] = useState({ perfil: "COLABORADOR", status: "ATIVO" });
  const [erroAcesso, setErroAcesso] = useState("");
  const [confirmAcessoOpen, setConfirmAcessoOpen] = useState(false);
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  // Modal Redefinir Senha
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false);
  const [usuarioSenha, setUsuarioSenha] = useState(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [errosSenha, setErrosSenha] = useState({});
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    listarSetores()
      .then((lista) => setSetores(lista || []))
      .catch(() => {});
  }, []);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const resposta = await listarUsuarios({
        busca: busca || undefined,
        id_setor: filtroSetor || undefined,
        perfil: filtroPerfil || undefined,
        status: filtroStatus || undefined,
        pagina,
        tamanho,
      });
      setUsuarios(resposta.itens || []);
      setTotal(resposta.total || 0);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar a lista de usuários.");
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroSetor, filtroPerfil, filtroStatus, pagina, tamanho]);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const handleBuscaDebounced = useCallback((termo) => {
    setBusca((atual) => {
      if (atual !== termo) setPagina(1);
      return termo;
    });
  }, []);

  // ─── Abrir Modal Novo / Editar (UC02) ─────────────────────────────────────
  function abrirModalNovo() {
    setUsuarioEditando(null);
    setFormDados({
      nome: "",
      email: "",
      senha: "",
      data_nascimento: "",
      cargo: "",
      id_setor: "",
      perfil: "COLABORADOR",
    });
    setErrosForm({});
    setModalFormOpen(true);
  }

  function abrirModalEditar(u) {
    setUsuarioEditando(u);
    setFormDados({
      nome: u.nome || "",
      email: u.email || "",
      senha: "",
      data_nascimento: u.data_nascimento || "",
      cargo: u.cargo || "",
      id_setor: u.setor?.id_setor ? String(u.setor.id_setor) : "",
      perfil: u.perfil || "COLABORADOR",
    });
    setErrosForm({});
    setModalFormOpen(true);
  }

  async function salvarUsuario(e) {
    if (e) e.preventDefault();
    const problemas = {};
    const nomeLimpo = formDados.nome.trim();
    const emailLimpo = formDados.email.trim().toLowerCase();

    if (!nomeLimpo || nomeLimpo.length < 3) {
      problemas.nome = "Informe o nome completo (mínimo 3 caracteres).";
    }
    if (!emailLimpo) {
      problemas.email = "Informe o e-mail corporativo.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      problemas.email = "Informe um e-mail corporativo válido.";
    }

    if (!usuarioEditando) {
      const erroValSenha = validarSenhaForte(formDados.senha);
      if (erroValSenha) problemas.senha = erroValSenha;
    }

    if (formDados.data_nascimento) {
      const hojeIso = new Date().toISOString().slice(0, 10);
      if (formDados.data_nascimento > hojeIso) {
        problemas.data_nascimento = "A data de nascimento não pode ser no futuro.";
      }
    }

    if (Object.keys(problemas).length > 0) {
      setErrosForm(problemas);
      return;
    }

    setSalvandoForm(true);
    setErrosForm({});
    try {
      const payloadBase = {
        nome: nomeLimpo,
        email: emailLimpo,
        data_nascimento: formDados.data_nascimento || null,
        cargo: formDados.cargo.trim() || null,
        id_setor: formDados.id_setor ? Number(formDados.id_setor) : null,
      };

      if (usuarioEditando) {
        await atualizarUsuario(usuarioEditando.id_usuario, payloadBase);
        sucesso("Dados do usuário atualizados com sucesso!");
      } else {
        await criarUsuario({
          ...payloadBase,
          senha: formDados.senha,
          perfil: isAdmin ? formDados.perfil : "COLABORADOR",
        });
        sucesso("Usuário cadastrado com sucesso!");
      }
      setModalFormOpen(false);
      await carregarUsuarios();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      } else {
        setErrosForm({ geral: err?.mensagem || "Erro ao salvar usuário." });
      }
    } finally {
      setSalvandoForm(false);
    }
  }

  // ─── Abrir Modal Controle de Acesso (UC03) ────────────────────────────────
  async function abrirModalAcesso(u) {
    setUsuarioAcesso(u);
    setAcessoForm({ perfil: u.perfil, status: u.status });
    setErroAcesso("");
    setModalAcessoOpen(true);
    setCarregandoHistorico(true);
    try {
      const lista = await listarHistoricoAcesso(u.id_usuario);
      setHistorico(lista || []);
    } catch {
      setHistorico([]);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  function solicitarConfirmacaoAcesso() {
    if (!usuarioAcesso) return;
    if (
      acessoForm.perfil === usuarioAcesso.perfil &&
      acessoForm.status === usuarioAcesso.status
    ) {
      setErroAcesso("Altere o perfil ou o status antes de salvar.");
      return;
    }
    setErroAcesso("");
    setConfirmAcessoOpen(true);
  }

  async function confirmarAlteracaoAcesso() {
    if (!usuarioAcesso) return;
    setSalvandoAcesso(true);
    setErroAcesso("");
    try {
      const atualizado = await alterarAcesso(usuarioAcesso.id_usuario, {
        perfil: acessoForm.perfil,
        status: acessoForm.status,
      });
      setConfirmAcessoOpen(false);
      setUsuarioAcesso(atualizado);
      sucesso("Permissões e status atualizados com sucesso!");
      const novoHistorico = await listarHistoricoAcesso(usuarioAcesso.id_usuario);
      setHistorico(novoHistorico || []);
      await carregarUsuarios();
    } catch (err) {
      setConfirmAcessoOpen(false);
      setErroAcesso(err?.mensagem || "Não foi possível alterar o acesso.");
      toastErro(err?.mensagem || "Não foi possível alterar o acesso.");
    } finally {
      setSalvandoAcesso(false);
    }
  }

  // ─── Abrir Modal Redefinir Senha ──────────────────────────────────────────
  function abrirModalSenha(u) {
    setUsuarioSenha(u);
    setNovaSenha("");
    setConfirmarSenha("");
    setErrosSenha({});
    setModalSenhaOpen(true);
  }

  async function salvarNovaSenha(e) {
    if (e) e.preventDefault();
    const problemas = {};
    const erroForca = validarSenhaForte(novaSenha);
    if (erroForca) {
      problemas.nova_senha = erroForca;
    }
    if (!confirmarSenha) {
      problemas.confirmar = "Confirme a nova senha.";
    } else if (novaSenha !== confirmarSenha) {
      problemas.confirmar = "As senhas informadas não conferem.";
    }

    if (Object.keys(problemas).length > 0) {
      setErrosSenha(problemas);
      return;
    }

    setSalvandoSenha(true);
    setErrosSenha({});
    try {
      await redefinirSenha(usuarioSenha.id_usuario, novaSenha);
      sucesso(`Senha de ${usuarioSenha.nome} redefinida com sucesso!`);
      setModalSenhaOpen(false);
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosSenha(err.erros);
      } else {
        setErrosSenha({ geral: err?.mensagem || "Erro ao redefinir a senha." });
      }
    } finally {
      setSalvandoSenha(false);
    }
  }

  const ehPropriaConta =
    Boolean(usuarioAcesso && usuarioLogado) &&
    usuarioAcesso.id_usuario === usuarioLogado.id_usuario;

  const opcoesSetores = setores.map((s) => ({
    value: String(s.id_setor),
    label: s.andar ? `${s.nome} (${s.andar})` : s.nome,
  }));

  const colunas = [
    {
      key: "nome",
      header: "Nome",
      render: (u) => <span className="font-semibold text-[#1e293b]">{u.nome}</span>,
    },
    {
      key: "email",
      header: "E-mail",
      render: (u) => <span className="text-[#475569]">{u.email}</span>,
    },
    {
      key: "cargo",
      header: "Cargo",
      render: (u) => <span>{u.cargo || "—"}</span>,
    },
    {
      key: "setor",
      header: "Setor",
      render: (u) =>
        u.setor?.nome ? (
          <span>{u.setor.nome}</span>
        ) : (
          <span className="text-[#94a3b8] italic">Setor não informado</span>
        ),
    },
    {
      key: "perfil",
      header: "Perfil",
      render: (u) => <Badge tipo="perfil" valor={u.perfil} />,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <Badge tipo="status" valor={u.status} />,
    },
    {
      key: "acoes",
      header: "Ações",
      render: (u) => {
        const podeEditarLinha = isAdmin || u.perfil !== "ADMIN";
        return (
          <div className="flex items-center gap-2">
            {podeEditarLinha && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => abrirModalEditar(u)}
              >
                Editar
              </Button>
            )}
            {isAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => abrirModalAcesso(u)}
                >
                  Acesso
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => abrirModalSenha(u)}
                >
                  Redefinir senha
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const colunasHistorico = [
    {
      key: "data_hora",
      header: "Data/Hora",
      render: (h) => <span className="text-xs">{formatarDataHora(h.data_hora)}</span>,
    },
    {
      key: "campo",
      header: "Campo alterado",
      render: (h) => <span className="font-semibold text-xs">{h.campo}</span>,
    },
    {
      key: "transicao",
      header: "Alteração",
      render: (h) => (
        <span className="text-xs">
          <strong>{h.valor_anterior || "—"}</strong> → <strong>{h.valor_novo}</strong>
        </span>
      ),
    },
    {
      key: "admin",
      header: "Admin responsável",
      render: (h) => <span className="text-xs">{h.admin?.nome || "Administrador"}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Usuários</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Gerenciamento de colaboradores, perfis de acesso e status da conta (UC02, UC03)
          </p>
        </div>
        <Button variant="primary" onClick={abrirModalNovo}>
          + Novo usuário
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <span className="block text-xs font-semibold text-[#334155] mb-1.5">
              Buscar por nome ou e-mail
            </span>
            <SearchInput
              value={busca}
              onSearch={handleBuscaDebounced}
              placeholder="Ex.: Ana Souza ou @decos.com.br"
              ariaLabel="Buscar usuário por nome ou e-mail"
            />
          </div>
          <Select
            label="Setor"
            value={filtroSetor}
            onChange={(e) => {
              setFiltroSetor(e.target.value);
              setPagina(1);
            }}
            placeholder="Todos os setores"
            options={opcoesSetores}
          />
          <Select
            label="Perfil"
            value={filtroPerfil}
            onChange={(e) => {
              setFiltroPerfil(e.target.value);
              setPagina(1);
            }}
            placeholder="Todos os perfis"
            options={OPCOES_PERFIL}
          />
          <Select
            label="Status"
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPagina(1);
            }}
            placeholder="Todos os status"
            options={OPCOES_STATUS}
          />
        </div>
      </Card>

      {/* Banner de erro com botão Tentar novamente */}
      {erroLista && <ErrorBanner message={erroLista} onRetry={carregarUsuarios} />}

      {/* Tabela de Usuários */}
      {!erroLista && (
        <div className="space-y-3">
          <Table
            columns={colunas}
            data={usuarios}
            rowKey="id_usuario"
            loading={carregando}
            emptyMessage="Nenhum usuário encontrado"
            emptyDescription="Verifique os filtros selecionados ou cadastre um novo colaborador."
          />
          <Pagination
            pagina={pagina}
            tamanho={tamanho}
            total={total}
            onPageChange={setPagina}
          />
        </div>
      )}

      {/* ── MODAL NOVO / EDITAR USUÁRIO (UC02) ── */}
      <Modal
        open={modalFormOpen}
        onClose={salvandoForm ? undefined : () => setModalFormOpen(false)}
        title={usuarioEditando ? "Editar usuário" : "Novo usuário"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalFormOpen(false)}
              disabled={salvandoForm}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarUsuario} loading={salvandoForm}>
              Salvar
            </Button>
          </>
        }
      >
        <form onSubmit={salvarUsuario} noValidate className="space-y-4">
          {errosForm.geral && (
            <div
              role="alert"
              className="p-3 rounded-lg text-xs font-medium bg-[#fff3f4] text-[#b4233e] border border-[#f1c5cf]"
            >
              {errosForm.geral}
            </div>
          )}

          <Input
            label="Nome completo"
            required
            placeholder="Ex.: Ana Beatriz Souza"
            value={formDados.nome}
            error={errosForm.nome}
            onChange={(e) => {
              setFormDados((prev) => ({ ...prev, nome: e.target.value }));
              setErrosForm((prev) => ({ ...prev, nome: undefined, geral: undefined }));
            }}
          />

          <Input
            label="E-mail corporativo"
            type="email"
            required
            placeholder="ana.souza@decos.com.br"
            value={formDados.email}
            error={errosForm.email}
            onChange={(e) => {
              setFormDados((prev) => ({ ...prev, email: e.target.value }));
              setErrosForm((prev) => ({ ...prev, email: undefined, geral: undefined }));
            }}
          />

          {!usuarioEditando && (
            <Input
              label="Senha inicial"
              type="password"
              required
              placeholder="Mínimo 8 caracteres (letras e números)"
              helperText="Regra: mínimo de 8 caracteres, contendo pelo menos 1 letra e 1 número."
              value={formDados.senha}
              error={errosForm.senha}
              onChange={(e) => {
                setFormDados((prev) => ({ ...prev, senha: e.target.value }));
                setErrosForm((prev) => ({ ...prev, senha: undefined, geral: undefined }));
              }}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data de nascimento"
              type="date"
              value={formDados.data_nascimento}
              error={errosForm.data_nascimento}
              onChange={(e) => {
                setFormDados((prev) => ({ ...prev, data_nascimento: e.target.value }));
                setErrosForm((prev) => ({ ...prev, data_nascimento: undefined }));
              }}
            />

            <Input
              label="Cargo"
              placeholder="Ex.: Enfermeira Assistencial"
              value={formDados.cargo}
              error={errosForm.cargo}
              onChange={(e) => {
                setFormDados((prev) => ({ ...prev, cargo: e.target.value }));
                setErrosForm((prev) => ({ ...prev, cargo: undefined }));
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Setor"
              placeholder="Sem setor vinculado"
              value={formDados.id_setor}
              error={errosForm.id_setor}
              options={opcoesSetores}
              onChange={(e) =>
                setFormDados((prev) => ({ ...prev, id_setor: e.target.value }))
              }
            />

            {!usuarioEditando && isAdmin && (
              <Select
                label="Perfil de acesso"
                value={formDados.perfil}
                options={OPCOES_PERFIL}
                onChange={(e) =>
                  setFormDados((prev) => ({ ...prev, perfil: e.target.value }))
                }
              />
            )}
          </div>
        </form>
      </Modal>

      {/* ── MODAL CONTROLE DE ACESSO (UC03) ── */}
      <Modal
        open={modalAcessoOpen}
        onClose={salvandoAcesso ? undefined : () => setModalAcessoOpen(false)}
        title={`Controle de acesso — ${usuarioAcesso?.nome || ""}`}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalAcessoOpen(false)}
              disabled={salvandoAcesso}
            >
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={solicitarConfirmacaoAcesso}
              disabled={ehPropriaConta || salvandoAcesso}
              loading={salvandoAcesso}
            >
              Aplicar alterações
            </Button>
          </>
        }
      >
        {usuarioAcesso && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="text-sm font-bold text-[#1e293b]">{usuarioAcesso.nome}</div>
                <div className="text-xs text-[#64748b]">{usuarioAcesso.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tipo="perfil" valor={usuarioAcesso.perfil} />
                <Badge tipo="status" valor={usuarioAcesso.status} />
              </div>
            </div>

            {ehPropriaConta && (
              <div
                role="alert"
                className="p-3 rounded-lg text-xs font-medium bg-[#fef3c7] text-[#b45309] border border-[#fcd34d]"
              >
                Você não pode remover seu próprio perfil de administrador ou inativar sua própria conta.
              </div>
            )}

            {erroAcesso && (
              <div
                role="alert"
                className="p-3 rounded-lg text-xs font-medium bg-[#fff3f4] text-[#b4233e] border border-[#f1c5cf]"
              >
                {erroAcesso}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Perfil de acesso"
                value={acessoForm.perfil}
                disabled={ehPropriaConta}
                options={OPCOES_PERFIL}
                onChange={(e) =>
                  setAcessoForm((prev) => ({ ...prev, perfil: e.target.value }))
                }
              />
              <Select
                label="Status da conta"
                value={acessoForm.status}
                disabled={ehPropriaConta}
                options={OPCOES_STATUS}
                onChange={(e) =>
                  setAcessoForm((prev) => ({ ...prev, status: e.target.value }))
                }
              />
            </div>

            {/* Histórico de Auditoria */}
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold text-[#1e293b]">
                Histórico de alterações de acesso
              </h3>
              <Table
                columns={colunasHistorico}
                data={historico}
                rowKey={(h) => `${h.data_hora}-${h.campo}`}
                loading={carregandoHistorico}
                skeletonRows={3}
                emptyMessage="Nenhuma alteração de perfil ou status registrada até o momento."
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmAcessoOpen}
        title="Confirmar alteração de acesso"
        message={`Confirma a atualização de acesso de "${usuarioAcesso?.nome}" para Perfil ${acessoForm.perfil} e Status ${acessoForm.status}? Caso o usuário esteja com sessão ativa, ela será encerrada imediatamente.`}
        confirmLabel="Confirmar e salvar"
        variant={acessoForm.status === "INATIVO" ? "danger" : "primary"}
        loading={salvandoAcesso}
        onCancel={() => setConfirmAcessoOpen(false)}
        onConfirm={confirmarAlteracaoAcesso}
      />

      {/* ── MODAL REDEFINIR SENHA ── */}
      <Modal
        open={modalSenhaOpen}
        onClose={salvandoSenha ? undefined : () => setModalSenhaOpen(false)}
        title={`Redefinir senha — ${usuarioSenha?.nome || ""}`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalSenhaOpen(false)}
              disabled={salvandoSenha}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarNovaSenha} loading={salvandoSenha}>
              Redefinir senha
            </Button>
          </>
        }
      >
        <form onSubmit={salvarNovaSenha} noValidate className="space-y-4">
          <p className="text-xs text-[#64748b] leading-relaxed">
            A nova senha deve conter <strong>no mínimo 8 caracteres</strong>, com pelo menos{" "}
            <strong>1 letra e 1 número</strong>. Ao redefinir a senha, qualquer sessão aberta deste
            usuário será encerrada.
          </p>
          {errosSenha.geral && (
            <div
              role="alert"
              className="p-3 rounded-lg text-xs font-medium bg-[#fff3f4] text-[#b4233e] border border-[#f1c5cf]"
            >
              {errosSenha.geral}
            </div>
          )}
          <Input
            label="Nova senha"
            type="password"
            required
            value={novaSenha}
            error={errosSenha.nova_senha}
            placeholder="Digite a nova senha"
            onChange={(e) => {
              setNovaSenha(e.target.value);
              setErrosSenha((prev) => ({ ...prev, nova_senha: undefined, geral: undefined }));
            }}
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            required
            value={confirmarSenha}
            error={errosSenha.confirmar}
            placeholder="Repita a nova senha"
            onChange={(e) => {
              setConfirmarSenha(e.target.value);
              setErrosSenha((prev) => ({ ...prev, confirmar: undefined, geral: undefined }));
            }}
          />
        </form>
      </Modal>
    </div>
  );
}

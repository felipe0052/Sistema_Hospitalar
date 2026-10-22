import React, { useState } from "react";
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
  Table,
  Textarea,
  useToast,
} from "../../components/ui";

const DEMO_COLUMNS = [
  { key: "nome", header: "Nome" },
  { key: "setor", header: "Setor" },
  {
    key: "perfil",
    header: "Perfil",
    render: (row) => <Badge tipo="perfil" valor={row.perfil} />,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge tipo="status" valor={row.status} />,
  },
];

const DEMO_DATA = [
  { id: 1, nome: "André Luiz", setor: "Tecnologia", perfil: "ADMIN", status: "ATIVO" },
  { id: 2, nome: "Carlos Menezes", setor: "UTI", perfil: "COLABORADOR", status: "ATIVO" },
  { id: 3, nome: "Patrícia Nunes", setor: "RH", perfil: "RH", status: "ATIVO" },
  { id: 4, nome: "Maria Silva", setor: "Administração", perfil: "MARKETING", status: "INATIVO" },
];

export default function ComponentesDemo() {
  const { sucesso, erro, info } = useToast();
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#1e293b]">
          Biblioteca de Componentes de UI (S1-T7)
        </h1>
        <p className="text-sm text-[#64748b] mt-1">
          Catálogo interativo dos componentes padronizados do Hospital Decós com suporte a teclado e contraste WCAG AA.
        </p>
      </div>

      {/* 1. Botões */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#1e293b]">1. Button (Variantes e Estados)</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="danger">Perigo (Danger)</Button>
          <Button variant="link">Botão Link</Button>
          <Button variant="primary" loading>
            Salvando...
          </Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
        </div>
      </Card>

      {/* 2. Inputs, Select, Textarea e SearchInput */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#1e293b]">
          2. Formulários (Input, Select, Textarea, SearchInput)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome completo (Padrão)"
            required
            placeholder="Ex.: Ana Souza"
            helperText="Informe o nome completo conforme registro no RH."
          />
          <Input
            label="E-mail corporativo (Com Erro)"
            required
            defaultValue="email-invalido"
            error="Este e-mail já pertence a outro usuário"
          />
          <Input
            label="Campo Desabilitado"
            disabled
            defaultValue="Somente leitura"
          />
          <Select
            label="Setor Hospitalar"
            required
            placeholder="Selecione um setor..."
            options={[
              { value: "1", label: "UTI (2º andar)" },
              { value: "2", label: "Pronto-Socorro (Térreo)" },
              { value: "5", label: "Farmácia (Térreo)" },
            ]}
          />
          <Select
            label="Select com Erro"
            required
            placeholder="Selecione..."
            error="Selecione uma opção obrigatória."
            options={[{ value: "1", label: "Opção 1" }]}
          />
          <div>
            <span className="block text-xs font-semibold text-[#334155] mb-1.5">
              SearchInput (Debounce 400ms)
            </span>
            <SearchInput
              value={busca}
              onChange={setBusca}
              placeholder="Digite para testar o debounce..."
            />
            {busca && (
              <p className="text-xs text-[#64748b] mt-1">Termo atual: &ldquo;{busca}&rdquo;</p>
            )}
          </div>
        </div>
        <Textarea
          label="Observações / Conteúdo"
          placeholder="Digite um texto..."
          helperText="Suporta redimensionamento vertical."
        />
      </Card>

      {/* 3. Badges */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#1e293b]">3. Badges (Perfis e Status)</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tipo="perfil" valor="ADMIN" />
          <Badge tipo="perfil" valor="COLABORADOR" />
          <Badge tipo="perfil" valor="RH" />
          <Badge tipo="perfil" valor="MARKETING" />
          <Badge tipo="status" valor="ATIVO" />
          <Badge tipo="status" valor="INATIVO" />
          <Badge variant="default">Categoria Geral</Badge>
        </div>
      </Card>

      {/* 4. Modais, ConfirmDialog e Toasts */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#1e293b]">
          4. Modal, ConfirmDialog e Toast
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Abrir Modal (Foco Preso + Esc)
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Abrir ConfirmDialog
          </Button>
          <Button
            variant="secondary"
            onClick={() => sucesso("Operação realizada com sucesso!")}
          >
            Disparar Toast Sucesso
          </Button>
          <Button
            variant="secondary"
            onClick={() => erro("Falha ao salvar registro.")}
          >
            Disparar Toast Erro
          </Button>
          <Button
            variant="secondary"
            onClick={() => info("Aviso informativo do sistema.")}
          >
            Disparar Toast Info
          </Button>
        </div>
      </Card>

      {/* 5. Table, Pagination e Skeleton */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1e293b]">
            5. Table, Pagination e Skeleton
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTableLoading((v) => !v)}
          >
            {tableLoading ? "Mostrar Dados" : "Simular Carregamento (Skeleton)"}
          </Button>
        </div>
        <Table
          columns={DEMO_COLUMNS}
          data={DEMO_DATA}
          loading={tableLoading}
          rowKey="id"
        />
        <Pagination
          pagina={pagina}
          tamanho={2}
          total={4}
          onPageChange={setPagina}
        />
      </Card>

      {/* 6. EmptyState e ErrorBanner */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-[#1e293b]">
          6. EmptyState e ErrorBanner
        </h2>
        <ErrorBanner
          message="Não foi possível carregar os dados do servidor."
          onRetry={() => info("Tentando novamente...")}
        />
        <EmptyState
          title="Nenhum usuário encontrado"
          description="Tente ajustar os filtros de pesquisa ou cadastre um novo registro."
        />
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#64748b]">Skeleton avulso:</span>
          <Skeleton height="1.5rem" width="60%" />
          <Skeleton height="1rem" width="40%" />
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Exemplo de Modal Acessível"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false);
                sucesso("Confirmado pelo modal!");
              }}
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#334155]">
            Este modal mantém o foco preso (Tab / Shift+Tab) e pode ser fechado com a tecla{" "}
            <strong>Esc</strong> ou clicando fora.
          </p>
          <Input label="Campo de teste dentro do modal" placeholder="Digite algo..." />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar alteração de acesso"
        message="Tem certeza de que deseja aplicar esta alteração crítica de permissão?"
        confirmLabel="Sim, confirmar"
        variant="danger"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          sucesso("Ação confirmada!");
        }}
      />
    </div>
  );
}

import React from "react";
import { Badge, Button, Table } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { SETORES_MOCK } from "../../mocks/setores";

export default function AdminSetores() {
  const { autenticado, isAdmin } = useAuth();
  const podeGerir = autenticado && isAdmin;

  const colunas = [
    {
      key: "nome",
      header: "Setor",
      render: (s) => <span className="font-semibold text-[#1e293b]">{s.nome}</span>,
    },
    {
      key: "andar",
      header: "Andar",
      render: (s) => <span>{s.andar || "—"}</span>,
    },
    {
      key: "ramais",
      header: "Ramais vinculados",
      render: (s) => (
        <div className="flex flex-wrap gap-1.5">
          {s.ramais.map((r) => (
            <Badge key={r.id_ramal} variant="default">
              {r.numero} ({r.descricao})
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "total_usuarios",
      header: "Colaboradores",
      render: (s) => <span>{s.total_usuarios}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Setores e Ramais</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Estrutura hospitalar cadastrada no banco de dados (Edição completa prevista na Semana 3 — UC08)
          </p>
        </div>
        {podeGerir ? (
          <Button variant="primary" disabled>
            + Novo setor
          </Button>
        ) : (
          <Badge variant="leitura">Modo Somente Visualização</Badge>
        )}
      </div>
      <Table columns={colunas} data={SETORES_MOCK} rowKey="id_setor" />
    </div>
  );
}

import React, { useState } from "react";
import { Badge, Button, Card, EmptyState, SearchInput } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { MOCK_DOCUMENTOS } from "../../mocks/portal";

export default function Documentos() {
  const { autenticado, isAdmin } = useAuth();
  const [busca, setBusca] = useState("");
  const podeAdicionar = autenticado && isAdmin;

  const filtrados = MOCK_DOCUMENTOS.filter(
    (d) =>
      !busca ||
      d.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (d.categoria || "").toLowerCase().includes(busca.toLowerCase()) ||
      (d.descricao || "").toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Documentos (POPs)</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Repositório central de Procedimentos Operacionais Padrão e normas institucionais
          </p>
        </div>
        {podeAdicionar && <Button variant="primary">+ Adicionar Novo</Button>}
      </div>

      <div className="max-w-md">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por título, categoria ou palavra-chave..."
        />
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum documento encontrado. Revise os termos da pesquisa." />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((doc) => (
            <Card
              key={doc.id_doc}
              className="flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{doc.tipo}</Badge>
                  <Badge variant="default">{doc.categoria}</Badge>
                </div>
                <h2 className="text-sm font-bold text-[#1e293b]">{doc.titulo}</h2>
                <p className="text-xs text-[#64748b]">{doc.descricao}</p>
              </div>
              <Button variant="secondary" size="sm">
                Visualizar / Baixar
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

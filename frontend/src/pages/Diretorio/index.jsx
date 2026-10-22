import React, { useState } from "react";
import { Badge, Card, EmptyState, SearchInput } from "../../components/ui";
import { SETORES_MOCK } from "../../mocks/setores";

export default function Diretorio() {
  const [busca, setBusca] = useState("");
  const filtrados = SETORES_MOCK.filter(
    (s) =>
      !busca ||
      s.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (s.andar || "").toLowerCase().includes(busca.toLowerCase()) ||
      s.ramais.some(
        (r) =>
          r.numero.includes(busca) ||
          (r.descricao || "").toLowerCase().includes(busca.toLowerCase()),
      ),
  );

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#1e293b]">Diretório e Ramais</h1>
        <p className="text-sm text-[#64748b] mt-0.5">
          Guia de contatos e ramais telefônicos organizados por setor e andar
        </p>
      </div>

      <div className="max-w-md">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por setor, andar ou número de ramal..."
        />
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum funcionário encontrado" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtrados.map((setor) => (
            <Card key={setor.id_setor} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1e293b]">{setor.nome}</h2>
                <Badge variant="default">{setor.andar || "Setor não informado"}</Badge>
              </div>
              <div className="space-y-1.5">
                {setor.ramais.map((r) => (
                  <div
                    key={r.id_ramal}
                    className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-50"
                  >
                    <span className="text-[#334155]">{r.descricao}</span>
                    <span className="font-bold text-[#800020]">Ramal {r.numero}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

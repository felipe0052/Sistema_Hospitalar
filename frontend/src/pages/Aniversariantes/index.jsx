import React, { useEffect, useState } from "react";
import { listarAniversariantesMes } from "../../api/aniversariantes";
import { Badge, Card, EmptyState, SearchInput } from "../../components/ui";

export default function Aniversariantes() {
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState([]);
  useEffect(() => {
    listarAniversariantesMes(new Date().getMonth() + 1)
      .then(setLista)
      .catch(() => setLista([]));
  }, []);
  const filtrados = lista.filter(
    (a) =>
      !busca ||
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (a.setor?.nome || "").toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#1e293b]">Aniversariantes do Mês</h1>
        <p className="text-sm text-[#64748b] mt-0.5">
          Celebre os colaboradores ativos que comemoram aniversário neste mês
        </p>
      </div>

      <div className="max-w-md">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar por nome ou setor..."
        />
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState title="Não há aniversariantes neste mês" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((aniv) => (
            <Card key={aniv.id_usuario} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#1e293b]">{aniv.nome}</div>
                <div className="text-xs text-[#64748b] mt-0.5">
                  {aniv.cargo} · {aniv.setor?.nome || "Setor não informado"}
                </div>
              </div>
              <div className="text-right">
                <Badge variant={aniv.aniversario_hoje ? "primary" : "default"}>
                  {aniv.aniversario_hoje
                    ? `🎂 Hoje (${String(aniv.dia).padStart(2, "0")}/${String(aniv.mes).padStart(2, "0")}/${new Date().getFullYear()})`
                    : `${String(aniv.dia).padStart(2, "0")}/${String(aniv.mes).padStart(2, "0")}/${new Date().getFullYear()}`}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

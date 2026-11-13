import React, { useEffect, useState } from "react";
import { listarLinksAniversario } from "../../api/linksAniversario";
import { useAuth } from "../../contexts/AuthContext";
import { Button, Modal } from "../ui";

export const MENSAGEM_ANIVERSARIO_PADRAO =
  "O Hospital Decós parabeniza você pelo seu aniversário! Agradecemos por sua dedicação diária no cuidado aos pacientes e no fortalecimento da nossa equipe. Desejamos um novo ciclo repleto de saúde, conquistas e alegrias!";

function obterDataIsoLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function AniversarioPopup() {
  const { autenticado, usuario } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [links, setLinks] = useState([]);

  const idUsuario = usuario?.id_usuario ?? usuario?.id;
  const aniversarioHoje = Boolean(autenticado && usuario?.aniversario_hoje && idUsuario);

  useEffect(() => {
    if (!aniversarioHoje) {
      setAberto(false);
      return;
    }

    const chave = `aniv_popup_${idUsuario}`;
    const hojeIso = obterDataIsoLocal();
    try {
      const ultimoExibido = localStorage.getItem(chave);
      if (ultimoExibido !== hojeIso) {
        setAberto(true);
      } else {
        setAberto(false);
      }
    } catch {
      setAberto(true);
    }
  }, [aniversarioHoje, idUsuario]);

  useEffect(() => {
    if (!aberto) return;
    listarLinksAniversario()
      .then((lista) => setLinks(Array.isArray(lista) ? lista : []))
      .catch(() => setLinks([]));
  }, [aberto]);

  function handleFechar() {
    if (idUsuario) {
      const chave = `aniv_popup_${idUsuario}`;
      const hojeIso = obterDataIsoLocal();
      try {
        localStorage.setItem(chave, hojeIso);
      } catch {
        /* storage indisponível */
      }
    }
    setAberto(false);
  }

  if (!aniversarioHoje || !aberto) {
    return null;
  }

  const primeiroNome = String(usuario?.nome || "Colaborador")
    .trim()
    .split(/\s+/)[0];

  return (
    <Modal
      open={aberto}
      onClose={handleFechar}
      title={`🎉 Feliz aniversário, ${primeiroNome}!`}
      size="md"
      footer={
        <Button variant="primary" onClick={handleFechar}>
          Obrigado!
        </Button>
      }
    >
      <div className="space-y-3 py-1">
        <p className="text-sm leading-relaxed text-[#334155]">
          {MENSAGEM_ANIVERSARIO_PADRAO}
        </p>
        <p className="text-xs font-semibold text-[#0d9488]">
          — Equipe de Gestão de Pessoas • Hospital Decós
        </p>
        {links.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-[#334155]">Preparamos algo para você:</p>
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleFechar}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#800020] text-white hover:bg-[#600018] no-underline"
                >
                  {link.titulo} ↗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AniversarioPopup;

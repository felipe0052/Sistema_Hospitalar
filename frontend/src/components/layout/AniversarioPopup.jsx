import React, { useEffect, useState } from "react";
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
      </div>
    </Modal>
  );
}

export default AniversarioPopup;

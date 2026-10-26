import React, { useState } from "react";
import { desconectarGoogle, obterUrlConexaoGoogle } from "../../api/googleAgenda";
import { Button, Modal, useToast } from "../../components/ui";

export default function GoogleAgendaModal({ open, onClose, autenticado, status, onAlterado }) {
  const toast = useToast();
  const [carregando, setCarregando] = useState(false);

  async function conectar() {
    setCarregando(true);
    try {
      window.location.href = await obterUrlConexaoGoogle();
    } catch (err) {
      toast.erro(err.mensagem || "Não foi possível iniciar a conexão com o Google.");
      setCarregando(false);
    }
  }

  async function desconectar() {
    setCarregando(true);
    try {
      await desconectarGoogle();
      toast.sucesso("Google Agenda desconectado.");
      await onAlterado?.();
    } catch (err) {
      toast.erro(err.mensagem || "Não foi possível desconectar.");
    } finally {
      setCarregando(false);
    }
  }

  const conectado = Boolean(status?.conectado);
  const indisponivel = autenticado && status && !status.configurado;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Integração com o Google Agenda"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          {autenticado && !indisponivel && !conectado && (
            <Button variant="primary" onClick={conectar} loading={carregando}>
              Conectar com o Google
            </Button>
          )}
          {autenticado && conectado && (
            <Button variant="danger" onClick={desconectar} loading={carregando}>
              Desconectar
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm text-[#475569]">
        {!autenticado && (
          <p className="rounded-lg border border-[#f1c5cf] bg-[#fff5f6] p-3 text-xs text-[#800020]">
            Faça login na Intranet para conectar sua conta do Google Agenda.
          </p>
        )}
        {indisponivel && (
          <p className="rounded-lg border border-[#f1c5cf] bg-[#fff5f6] p-3 text-xs text-[#800020]">
            A integração ainda não foi configurada no servidor. Fale com a TI.
          </p>
        )}
        {autenticado && conectado && (
          <p className="rounded-lg border border-[#86efac] bg-[#dcfce7] p-3 text-xs text-[#15803d]">
            ✓ Sua conta do Google está conectada. Abra um evento e use "Adicionar à minha agenda".
          </p>
        )}

        <p>
          Conecte sua conta do Google, se quiser, para levar eventos da Intranet para o seu Google
          Agenda. A conexão é opcional e individual.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Você pode adicionar eventos um a um no detalhe de cada evento, ou marcar "Receber todos os eventos" ao lado do botão para receber todos os futuros e os novos automaticamente.</li>
          <li>
            Se o evento for alterado ou excluído na Intranet, a cópia na sua agenda é atualizada ou
            removida.
          </li>
          <li>
            A Intranet só cria, atualiza e remove os eventos que ela mesma adicionou. Ela não lê a
            sua agenda pessoal, e-mails ou arquivos.
          </li>
          <li>
            Você pode desconectar a qualquer momento aqui, ou em myaccount.google.com/permissions.
          </li>
        </ul>
      </div>
    </Modal>
  );
}

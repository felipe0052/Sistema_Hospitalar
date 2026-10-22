import React from "react";
import Button from "./Button";
import "./ConfirmDialog.css";
import Modal from "./Modal";

export function ConfirmDialog({
  open,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="ui-confirm__message">{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;

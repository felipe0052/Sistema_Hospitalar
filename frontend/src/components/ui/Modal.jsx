import React, { useEffect, useId, useRef } from "react";
import "./Modal.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  size = "md",
  footer,
  children,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Foco inicial ao abrir o modal (executa apenas na transição de open)
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const dialogEl = dialogRef.current;
    if (dialogEl) {
      // Prioriza o primeiro campo interativo no corpo do modal
      const bodyInput = dialogEl.querySelector(
        ".ui-modal__body input:not([disabled]), .ui-modal__body select:not([disabled]), .ui-modal__body textarea:not([disabled])",
      );
      const focusables = dialogEl.querySelectorAll(FOCUSABLE_SELECTOR);
      if (bodyInput) {
        bodyInput.focus();
      } else if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogEl.focus();
      }
    }

    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  // Trap de foco acessível (Tab / Shift+Tab) e fechamento por Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (onCloseRef.current) onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="ui-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`ui-modal ui-modal--${size}`}
      >
        <div className="ui-modal__header">
          <h2 id={titleId} className="ui-modal__title">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="ui-modal__close"
          >
            ✕
          </button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;

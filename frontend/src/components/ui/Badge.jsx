import React from "react";
import "./Badge.css";

const PERFIL_LABELS = {
  ADMIN: "Administrador",
  COLABORADOR: "Colaborador",
  RH: "RH",
  MARKETING: "Marketing",
};

const STATUS_LABELS = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
};

export function Badge({ variant = "default", tipo, valor, children, className = "" }) {
  let resolvedVariant = variant;
  let content = children;

  if (tipo === "perfil" && valor) {
    const key = String(valor).toUpperCase();
    resolvedVariant = key.toLowerCase();
    content = content || PERFIL_LABELS[key] || valor;
  } else if (tipo === "status" && valor) {
    const key = String(valor).toUpperCase();
    resolvedVariant = key === "ATIVO" ? "ativo" : "inativo";
    content = content || STATUS_LABELS[key] || valor;
  }

  return (
    <span className={`ui-badge ui-badge--${resolvedVariant} ${className}`.trim()}>
      {content}
    </span>
  );
}

export default Badge;

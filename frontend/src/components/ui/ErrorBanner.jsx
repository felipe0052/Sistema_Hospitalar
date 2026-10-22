import React from "react";
import Button from "./Button";
import "./ErrorBanner.css";

export function ErrorBanner({
  message = "Ocorreu um erro ao carregar as informações.",
  onRetry,
  className = "",
}) {
  return (
    <div className={`ui-error-banner ${className}`.trim()} role="alert">
      <div className="ui-error-banner__content">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export default ErrorBanner;

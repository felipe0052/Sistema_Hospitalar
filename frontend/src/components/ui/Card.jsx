import React from "react";
import "./Card.css";

export function Card({ children, noPadding = false, className = "", ...rest }) {
  return (
    <div
      className={`ui-card ${noPadding ? "ui-card--no-padding" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;

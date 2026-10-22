import React from "react";
import "./Skeleton.css";

export function Skeleton({ width = "100%", height = "1.25rem", className = "", style = {} }) {
  return (
    <span
      aria-hidden="true"
      className={`ui-skeleton ${className}`.trim()}
      style={{ width, height, ...style }}
    />
  );
}

export default Skeleton;

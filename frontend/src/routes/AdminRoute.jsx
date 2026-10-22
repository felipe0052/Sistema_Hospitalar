import React from "react";
import PermissaoRoute from "./PermissaoRoute";

export function AdminRoute({ children }) {
  return <PermissaoRoute perfis={["ADMIN"]}>{children}</PermissaoRoute>;
}

export default AdminRoute;

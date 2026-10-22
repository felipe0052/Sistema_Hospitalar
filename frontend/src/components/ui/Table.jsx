import React from "react";
import EmptyState from "./EmptyState";
import Skeleton from "./Skeleton";
import "./Table.css";

export function Table({
  columns = [],
  data = [],
  rowKey = "id",
  loading = false,
  skeletonRows = 5,
  emptyMessage = "Nenhum registro encontrado",
  emptyDescription = "",
}) {
  return (
    <div className="ui-table-wrapper">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={`skeleton-${rowIdx}`}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <Skeleton height="1.1rem" width={col.skeletonWidth || "85%"} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length || 1}>
                <EmptyState title={emptyMessage} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const keyVal = typeof rowKey === "function" ? rowKey(row) : row[rowKey] ?? idx;
              return (
                <tr key={keyVal}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;

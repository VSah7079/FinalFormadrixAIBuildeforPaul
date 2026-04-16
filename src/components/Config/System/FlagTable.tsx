// This file is intentionally a thin re-export.
// All flag logic lives in FlagConfigPage.tsx (same folder).
// Import shim kept for backward compat with any cross-tab references.
import React from "react";
import { FlagDefinition } from "../../types/FlagDefinition";

interface Props {
  flags: FlagDefinition[];
  loading: boolean;
  onEdit: (flag: FlagDefinition) => void;
  onDelete: (id: string) => void;
}

const FlagTable: React.FC<Props> = ({ flags, loading, onEdit, onDelete }) => {
  if (loading) return <div>Loading flags…</div>;

  return (
    <table className="config-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Level</th>
          <th>LIS Code</th>
          <th>Description</th>
          <th>Status</th>
          <th>Auto‑Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {flags.map(flag => (
          <tr key={flag.id}>
            <td>{flag.name}</td>
            <td>{flag.level}</td>
            <td>{flag.lisCode}</td>
            <td>{flag.description}</td>
            <td>{flag.active ? "Active" : "Inactive"}</td>
            <td>{flag.autoCreated ? "Yes" : "No"}</td>
            <td className="actions">
              <button onClick={() => onEdit(flag)}>Edit</button>
              <button className="danger" onClick={() => onDelete(flag.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FlagTable;

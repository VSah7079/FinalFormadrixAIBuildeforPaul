/**
 * ClientTable.tsx
 * Located at: src/pages/system/ClientTable.tsx
 *
 * Displays the list of clients in the Client Dictionary config page.
 * Includes inline search + status filter so ClientDictionaryPage stays lean.
 *
 * Props:
 *   clients   — Client[]
 *   onEdit    — (clientId: string) => void
 *   onDelete  — (clientId: string) => void
 */

import { useState, useMemo } from "react";
import '../../../pathscribe.css';
import { Client } from "../../../contexts/useClientDictionary";

interface ClientTableProps {
  clients: Client[];
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | "internal" | "external";

export const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "inactive" && c.active) return false;
      if (typeFilter !== "all" && c.clientType !== typeFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q) ||
        (c.hl7.receivingFacility ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search, statusFilter, typeFilter]);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const handleDeleteClick = (id: string) => setConfirmDeleteId(id);
  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const filterTabBase: React.CSSProperties = {
    padding: "5px 14px",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.15s",
  };

  const filterTab = (active: boolean): React.CSSProperties => ({
    ...filterTabBase,
    background: active ? "#0891b2" : "transparent",
    color: active ? "#fff" : "#64748b",
    borderColor: active ? "#0891b2" : "#e2e8f0",
  });

  // ── Empty state ────────────────────────────────────────────────────────────
  if (clients.length === 0) {
    return (
      <div style={{
        padding: "48px 24px",
        textAlign: "center",
        color: "#94a3b8",
        border: "2px dashed #e2e8f0",
        borderRadius: "12px",
        fontSize: "14px",
      }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏥</div>
        <div style={{ fontWeight: 600, marginBottom: "6px", color: "#64748b" }}>No clients yet</div>
        <div>Click <strong>+ Add Client</strong> to define your first client.</div>
      </div>
    );
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "14px",
        flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <span style={{
            position: "absolute", left: "10px", top: "50%",
            transform: "translateY(-50%)", color: "#94a3b8", fontSize: "14px",
            pointerEvents: "none",
          }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, code, contact, facility…"
            style={{
              width: "100%",
              padding: "7px 10px 7px 32px",
              fontSize: "13px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              outline: "none",
              color: "#1e293b",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0891b2")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute", right: "8px", top: "50%",
                transform: "translateY(-50%)", background: "none",
                border: "none", cursor: "pointer", color: "#94a3b8",
                fontSize: "14px", lineHeight: 1, padding: "2px",
              }}
            >✕</button>
          )}
        </div>

        {/* Status filter tabs */}
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              style={filterTab(statusFilter === f)}
              onClick={() => setStatusFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Type filter tabs */}
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "internal", "external"] as TypeFilter[]).map((f) => (
            <button
              key={f}
              style={filterTab(typeFilter === f)}
              onClick={() => setTypeFilter(f)}
            >
              {f === "all" ? "All Types" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Result count */}
        <span style={{ fontSize: "12px", color: "#94a3b8", whiteSpace: "nowrap" }}>
          {filtered.length} of {clients.length}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "32px",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "13px",
            border: "1px solid #f1f5f9",
            borderRadius: "8px",
          }}>
            No clients match your search.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                {["Type", "Client", "Code", "Contact", "HL7", "Reporting", "Status", "Actions"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontWeight: 700,
                    color: "#475569",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => (
                <tr
                  key={client.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#ffffff" : "#fafafa",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = i % 2 === 0 ? "#ffffff" : "#fafafa")
                  }
                >
                  {/* Type */}
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "10px",
                      ...(client.clientType === "internal"
                        ? { background: "#ede9fe", color: "#5b21b6" }
                        : { background: "#e0f2fe", color: "#0369a1" }),
                    }}>
                      {client.clientType === "internal" ? "Internal" : "External"}
                    </span>
                    {client.parentId && (
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>
                        ↳ affiliate
                      </div>
                    )}
                  </td>

                  {/* Client name + address */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#1e293b" }}>{client.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                      {client.address}
                    </div>
                  </td>

                  {/* Code */}
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "12px",
                      background: "#f1f5f9",
                      color: "#0891b2",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}>{client.code}</span>
                  </td>

                  {/* Contact */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ color: "#1e293b" }}>{client.contactName}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{client.contactEmail}</div>
                  </td>

                  {/* HL7 */}
                  <td style={{ padding: "12px 14px" }}>
                    {client.hl7.enabled ? (
                      <span style={{
                        fontSize: "11px", fontWeight: 700,
                        padding: "2px 8px", borderRadius: "10px",
                        background: "#d1fae5", color: "#065f46",
                      }}>✓ {client.hl7.hl7Version}</span>
                    ) : (
                      <span style={{
                        fontSize: "11px", fontWeight: 600,
                        padding: "2px 8px", borderRadius: "10px",
                        background: "#f1f5f9", color: "#94a3b8",
                      }}>Disabled</span>
                    )}
                  </td>

                  {/* Reporting */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      {client.reporting.reportFormat}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {client.reporting.deliveryMethod}
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "12px 14px" }}>
                    {client.active ? (
                      <span style={{
                        fontSize: "11px", fontWeight: 700,
                        padding: "2px 10px", borderRadius: "10px",
                        background: "#d1fae5", color: "#065f46",
                      }}>Active</span>
                    ) : (
                      <span style={{
                        fontSize: "11px", fontWeight: 700,
                        padding: "2px 10px", borderRadius: "10px",
                        background: "#fee2e2", color: "#991b1b",
                      }}>Inactive</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => onEdit(client.id)}
                        style={{
                          padding: "5px 12px", borderRadius: "6px",
                          fontSize: "12px", fontWeight: 600,
                          border: "1px solid #0891b2",
                          background: "transparent", color: "#0891b2",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#0891b2";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#0891b2";
                        }}
                      >Edit</button>
                      <button
                        onClick={() => handleDeleteClick(client.id)}
                        style={{
                          padding: "5px 12px", borderRadius: "6px",
                          fontSize: "12px", fontWeight: 600,
                          border: "1px solid #ef4444",
                          background: "transparent", color: "#ef4444",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#ef4444";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#ef4444";
                        }}
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: "16px", padding: "32px",
              width: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "32px", textAlign: "center", marginBottom: "16px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", textAlign: "center", color: "#1e293b" }}>
              Delete Client?
            </h3>
            <p style={{
              textAlign: "center", color: "#64748b",
              fontSize: "14px", marginBottom: "24px",
            }}>
              This will permanently remove{" "}
              <strong>{clients.find((c) => c.id === confirmDeleteId)?.name}</strong>{" "}
              and all its settings.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  border: "1px solid #e2e8f0", background: "transparent",
                  color: "#64748b", fontWeight: 600, cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  border: "none", background: "#ef4444",
                  color: "#fff", fontWeight: 700, cursor: "pointer",
                }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * ClientEditorModal.tsx
 * Located at: src/pages/system/ClientEditorModal.tsx
 *
 * Add / Edit modal for a single client.
 * Props match exactly what ClientDictionaryPage passes:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   clientId     — string | null  (null = add mode, string = edit mode)
 *   addClient    — (input: ClientInput) => Client
 *   updateClient — (id: string, input: Partial<ClientInput>) => void
 */

import React, { useState, useEffect } from "react";
import '../../pathscribe.css';
import {
  Client,
  ClientInput,
  useClientDictionary,
} from "../../contexts/useClientDictionary";

interface ClientEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  addClient: (input: ClientInput) => Client;
  updateClient: (id: string, input: Partial<ClientInput>) => void;
}

// ─── Blank form state ─────────────────────────────────────────────────────────

const blank = (): ClientInput => ({
  name: "",
  clientType: "external" as const,
  code: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  active: true,
  hl7: {
    sendingFacility: "pathscribe",
    receivingFacility: "",
    hl7Version: "2.5.1",
    enabled: false,
  },
  reporting: {
    reportFormat: "PDF",
    deliveryMethod: "Portal",
    autoRelease: false,
    copyToReferring: false,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "13px",
  border: "1px solid #e2e8f0",
  borderRadius: "7px",
  outline: "none",
  boxSizing: "border-box",
  color: "#1e293b",
  background: "#fff",
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  color: "#475569",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const SECTION: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#0891b2",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: "12px",
  paddingBottom: "6px",
  borderBottom: "1px solid #e2e8f0",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const Field: React.FC<{ label: string; children: React.ReactNode; span?: boolean }> = ({
  label,
  children,
  span,
}) => (
  <div style={span ? { gridColumn: "1 / -1" } : {}}>
    <label style={LABEL}>{label}</label>
    {children}
  </div>
);

const onF = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
) => (e.currentTarget.style.borderColor = "#0891b2");

const onB = (
  e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
) => (e.currentTarget.style.borderColor = "#e2e8f0");

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "general" | "hl7" | "reporting";

// ─── Component ────────────────────────────────────────────────────────────────

export const ClientEditorModal: React.FC<ClientEditorModalProps> = ({
  isOpen,
  onClose,
  clientId,
  addClient,
  updateClient,
}) => {
  const { getClient } = useClientDictionary();
  const isEdit = clientId !== null;

  const [form, setForm] = useState<ClientInput>(blank);
  const [tab, setTab] = useState<Tab>("general");
  const [errors, setErrors] = useState<Partial<Record<keyof ClientInput, string>>>({});
  const [saved, setSaved] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && clientId) {
      const existing = getClient(clientId);
      if (existing) {
        const { id, createdAt, updatedAt, ...input } = existing;
        setForm(input);
      }
    } else {
      setForm(blank());
    }
    setTab("general");
    setErrors({});
    setSaved(false);
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  // ── Field helpers ──────────────────────────────────────────────────────────
  const set = (key: keyof ClientInput, val: unknown) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setHL7 = (key: keyof Client["hl7"], val: unknown) =>
    setForm((f) => ({ ...f, hl7: { ...f.hl7, [key]: val } }));

  const setReporting = (key: keyof Client["reporting"], val: unknown) =>
    setForm((f) => ({ ...f, reporting: { ...f.reporting, [key]: val } }));

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Client name is required";
    if (!form.code.trim()) e.code = "Client code is required";
    if (!form.contactEmail.trim() || !form.contactEmail.includes("@"))
      e.contactEmail = "Valid email required";
    if (form.hl7.enabled && !form.hl7.receivingFacility.trim())
      (e as Record<string, string>).hl7 =
        "Receiving facility is required when HL7 is enabled";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validate()) return;
    if (isEdit && clientId) {
      updateClient(clientId, form);
    } else {
      addClient(form);
    }
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "transparent",
    borderBottom: tab === t ? "2px solid #0891b2" : "2px solid transparent",
    color: tab === t ? "#0891b2" : "#64748b",
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          width: "600px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 0",
          borderBottom: "1px solid #f1f5f9",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1e293b" }}>
              {isEdit ? "Edit Client" : "Add Client"}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", fontSize: "18px",
                color: "#94a3b8", cursor: "pointer", lineHeight: 1, padding: "2px",
              }}
            >✕</button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0" }}>
            <button style={tabStyle("general")} onClick={() => setTab("general")}>General</button>
            <button style={tabStyle("hl7")} onClick={() => setTab("hl7")}>HL7 Integration</button>
            <button style={tabStyle("reporting")} onClick={() => setTab("reporting")}>Reporting</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── General tab ── */}
          {tab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={SECTION}>Client Details</div>
              <div style={grid2}>
                <Field label="Client Name *" span>
                  <input
                    style={{ ...INPUT, borderColor: errors.name ? "#ef4444" : "#e2e8f0" }}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    onFocus={onF} onBlur={onB}
                    placeholder="e.g. Northwest Oncology Group"
                  />
                  {errors.name && (
                    <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "3px" }}>
                      {errors.name}
                    </div>
                  )}
                </Field>
                <Field label="Client Code *">
                  <input
                    style={{
                      ...INPUT,
                      borderColor: errors.code ? "#ef4444" : "#e2e8f0",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                    }}
                    value={form.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    onFocus={onF} onBlur={onB}
                    placeholder="e.g. NWOG"
                    maxLength={10}
                  />
                  {errors.code && (
                    <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "3px" }}>
                      {errors.code}
                    </div>
                  )}
                </Field>
                <Field label="Status">
                  <select
                    style={INPUT}
                    value={form.active ? "active" : "inactive"}
                    onChange={(e) => set("active", e.target.value === "active")}
                    onFocus={onF} onBlur={onB}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <div style={SECTION}>Contact</div>
              <div style={grid2}>
                <Field label="Contact Name">
                  <input
                    style={INPUT}
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    onFocus={onF} onBlur={onB}
                    placeholder="Dr. Jane Smith"
                  />
                </Field>
                <Field label="Contact Email *">
                  <input
                    style={{ ...INPUT, borderColor: errors.contactEmail ? "#ef4444" : "#e2e8f0" }}
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                    onFocus={onF} onBlur={onB}
                    placeholder="contact@client.com"
                    type="email"
                  />
                  {errors.contactEmail && (
                    <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "3px" }}>
                      {errors.contactEmail}
                    </div>
                  )}
                </Field>
                <Field label="Phone">
                  <input
                    style={INPUT}
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                    onFocus={onF} onBlur={onB}
                    placeholder="555-000-0000"
                  />
                </Field>
                <Field label="Address" span>
                  <input
                    style={INPUT}
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    onFocus={onF} onBlur={onB}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ── HL7 tab ── */}
          {tab === "hl7" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={SECTION}>HL7 Integration</div>

              {/* Enable toggle */}
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px", background: "#f8fafc",
                borderRadius: "8px", border: "1px solid #e2e8f0",
              }}>
                <input
                  type="checkbox"
                  id="hl7-enabled"
                  checked={form.hl7.enabled}
                  onChange={(e) => setHL7("enabled", e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#0891b2", cursor: "pointer" }}
                />
                <label
                  htmlFor="hl7-enabled"
                  style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", cursor: "pointer" }}
                >
                  Enable HL7 integration for this client
                </label>
              </div>

              <div style={{
                opacity: form.hl7.enabled ? 1 : 0.45,
                pointerEvents: form.hl7.enabled ? "auto" : "none",
              }}>
                <div style={{ ...grid2, marginBottom: "12px" }}>
                  <Field label="Sending Facility (MSH-4)">
                    <input
                      style={INPUT}
                      value={form.hl7.sendingFacility}
                      onChange={(e) => setHL7("sendingFacility", e.target.value)}
                      onFocus={onF} onBlur={onB}
                      placeholder="pathscribe"
                    />
                  </Field>
                  <Field label="Receiving Facility (MSH-6)">
                    <input
                      style={{
                        ...INPUT,
                        borderColor: (errors as Record<string, string>).hl7
                          ? "#ef4444"
                          : "#e2e8f0",
                      }}
                      value={form.hl7.receivingFacility}
                      onChange={(e) => setHL7("receivingFacility", e.target.value)}
                      onFocus={onF} onBlur={onB}
                      placeholder="CLIENT_CODE"
                    />
                    {(errors as Record<string, string>).hl7 && (
                      <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "3px" }}>
                        {(errors as Record<string, string>).hl7}
                      </div>
                    )}
                  </Field>
                  <Field label="HL7 Version">
                    <select
                      style={INPUT}
                      value={form.hl7.hl7Version}
                      onChange={(e) => setHL7("hl7Version", e.target.value)}
                      onFocus={onF} onBlur={onB}
                    >
                      <option value="2.3">2.3</option>
                      <option value="2.4">2.4</option>
                      <option value="2.5">2.5</option>
                      <option value="2.5.1">2.5.1</option>
                      <option value="2.6">2.6</option>
                    </select>
                  </Field>
                </div>
              </div>

              {!form.hl7.enabled && (
                <div style={{
                  padding: "12px 14px",
                  background: "#fffbeb",
                  border: "1px solid #fde047",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#92400e",
                }}>
                  ⚠️ HL7 integration is disabled. Enable the toggle above to configure the
                  connection settings.
                </div>
              )}
            </div>
          )}

          {/* ── Reporting tab ── */}
          {tab === "reporting" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={SECTION}>Reporting Preferences</div>
              <div style={grid2}>
                <Field label="Report Format">
                  <select
                    style={INPUT}
                    value={form.reporting.reportFormat}
                    onChange={(e) => setReporting("reportFormat", e.target.value)}
                    onFocus={onF} onBlur={onB}
                  >
                    <option value="PDF">PDF</option>
                    <option value="HL7">HL7</option>
                    <option value="Both">Both (PDF + HL7)</option>
                  </select>
                </Field>
                <Field label="Delivery Method">
                  <select
                    style={INPUT}
                    value={form.reporting.deliveryMethod}
                    onChange={(e) => setReporting("deliveryMethod", e.target.value)}
                    onFocus={onF} onBlur={onB}
                  >
                    <option value="Email">Email</option>
                    <option value="Fax">Fax</option>
                    <option value="Portal">Portal</option>
                    <option value="HL7">HL7</option>
                  </select>
                </Field>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                {(
                  [
                    ["autoRelease", "Auto-release reports on finalization"],
                    ["copyToReferring", "Send copy to referring physician"],
                  ] as [keyof Client["reporting"], string][]
                ).map(([key, label]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 14px", background: "#f8fafc",
                      borderRadius: "8px", border: "1px solid #e2e8f0",
                    }}
                  >
                    <input
                      type="checkbox"
                      id={key}
                      checked={form.reporting[key] as boolean}
                      onChange={(e) => setReporting(key, e.target.checked)}
                      style={{ width: "16px", height: "16px", accentColor: "#0891b2", cursor: "pointer" }}
                    />
                    <label
                      htmlFor={key}
                      style={{ fontSize: "13px", fontWeight: 500, color: "#1e293b", cursor: "pointer" }}
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: "8px",
              border: "1px solid #e2e8f0", background: "transparent",
              color: "#64748b", fontWeight: 600, fontSize: "13px", cursor: "pointer",
            }}
          >Cancel</button>
          <button
            onClick={handleSubmit}
            style={{
              padding: "9px 24px", borderRadius: "8px",
              border: "none",
              background: saved ? "#10b981" : "#0891b2",
              color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            {saved ? "✓ Saved" : isEdit ? "Save Changes" : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
};

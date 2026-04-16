import React, { useEffect, useState } from "react";
import '../../../pathscribe.css';
import { FlagDefinition } from "../../../types/FlagDefinition";
import { flagService } from "../../../services";

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 8px", fontSize: "11px", fontWeight: 600,
  color: "#9AA0A6", borderBottom: "1px solid rgba(255,255,255,0.08)",
  textTransform: "uppercase", letterSpacing: "0.06em",
};
const tdStyle: React.CSSProperties = {
  padding: "12px 8px", fontSize: "14px", color: "#DEE4E7",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const primaryBtn: React.CSSProperties = {
  background: "#8AB4F8", color: "#0d1117", padding: "8px 16px",
  borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700,
};
const smallBtn: React.CSSProperties = {
  padding: "5px 12px", fontSize: "12px", fontWeight: 600, borderRadius: "6px",
  cursor: "pointer", border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.07)", color: "#DEE4E7",
};
const modalBackdrop: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
  background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
  display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
};
const modalCard: React.CSSProperties = {
  background: "#1a2332", padding: "28px", borderRadius: "14px", width: "460px",
  border: "1px solid rgba(255,255,255,0.12)", color: "#DEE4E7",
  boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", marginBottom: "16px", borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.15)", fontSize: "14px",
  background: "rgba(255,255,255,0.07)", color: "#DEE4E7", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block", color: "#9AA0A6",
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
    <div
      onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0, background: value ? "#22c55e" : "#374151", boxShadow: value ? "0 0 8px #22c55e55" : "none" }}
    >
      <div style={{ position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: value ? 23 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: value ? "#22c55e" : "#6b7280" }}>
      {value ? "Active" : "Inactive"}
    </span>
  </div>
);

const FlagConfigPage: React.FC = () => {
  const [flags,       setFlags]       = useState<FlagDefinition[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FlagDefinition | null>(null);
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [level,       setLevel]       = useState<"case" | "specimen">("case");
  const [lisCode,     setLisCode]     = useState("");
  const [active,      setActive]      = useState(true);
  const [severity,    setSeverity]    = useState<1 | 2 | 3 | 4 | 5>(1);
  const [errors,      setErrors]      = useState<{ name?: string }>({});
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [levelFilter,  setLevelFilter]  = useState<"All" | "case" | "specimen">("All");

  useEffect(() => { loadFlags(); }, []);

  const loadFlags = async () => {
    setLoading(true);
    const res = await flagService.getAll();
    if (res.ok) setFlags(res.data as unknown as FlagDefinition[]);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingFlag(null); setName(""); setDescription("");
    setLevel("case"); setLisCode(""); setActive(true); setSeverity(1); setErrors({}); setShowModal(true);
  };

  const openEditModal = (flag: FlagDefinition) => {
    setEditingFlag(flag); setName(flag.name); setDescription(flag.description ?? "");
    setLevel(flag.level); setLisCode(flag.lisCode); setActive(flag.active); setSeverity(flag.severity);
    setErrors({}); setShowModal(true);
  };

  const requestSave = () => {
    const e: { name?: string } = {};
    if (!name.trim()) e.name = "Name is required";
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setShowModal(false); setShowConfirm(true);
  };

  const confirmSave = async () => {
    const payload = { name, description, level, lisCode, active, severity,
      code: lisCode, autoCreated: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (editingFlag) {
      const res = await flagService.update(editingFlag.id, { name, description, level: (level === "case" ? "Case" : "Specimen") as "Case" | "Specimen", lisCode, severity });
      if (res.ok) setFlags(prev => prev.map(f => f.id === res.data.id ? res.data as unknown as FlagDefinition : f));
    } else {
      const res = await flagService.add({ ...payload, level: (payload.level === "case" ? "Case" : "Specimen") as "Case" | "Specimen", status: "Active" as const });
      if (res.ok) setFlags(prev => [...prev, res.data as unknown as FlagDefinition]);
    }
    setShowConfirm(false);
  };

  const filtered = flags.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || (f.lisCode || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || (statusFilter === "Active" ? f.active : !f.active);
    const matchLevel  = levelFilter === "All" || f.level === levelFilter;
    return matchSearch && matchStatus && matchLevel;
  });

  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`;
  const selectStyle2: React.CSSProperties = { padding: "9px 36px 9px 14px", fontSize: 13, fontWeight: 600, color: "#d1d5db", background: "#0f0f0f", border: "1px solid #1f2937", borderRadius: 8, outline: "none", cursor: "pointer", appearance: "none", backgroundImage: chevron, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#FFFFFF" }}>Case & Specimen Flags</h3>
          <p style={{ fontSize: "14px", color: "#9AA0A6", marginTop: "4px", marginBottom: 0 }}>Manage flags used in case workflows and synoptic reporting</p>
        </div>
        <button style={primaryBtn} onClick={openAddModal}
          onMouseEnter={e => e.currentTarget.style.background = "#6a9de0"}
          onMouseLeave={e => e.currentTarget.style.background = "#8AB4F8"}
        >+ Add Flag</button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input type="text" placeholder="Search flags..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: "9px 16px", fontSize: 13, color: "#d1d5db", background: "#0f0f0f", border: "1px solid #1f2937", borderRadius: 8, outline: "none" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={selectStyle2}>
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as any)} style={selectStyle2}>
          <option value="All">All Levels</option>
          <option value="case">Case</option>
          <option value="specimen">Specimen</option>
        </select>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Level</th>
            <th style={thStyle}>LIS Code</th>
            <th style={thStyle}>Severity</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(flag => (
            <tr key={flag.id}>
              <td style={tdStyle}>{flag.name}</td>
              <td style={{ ...tdStyle, color: "#9AA0A6" }}>{flag.level === "case" ? "Case" : "Specimen"}</td>
              <td style={{ ...tdStyle, color: "#9AA0A6" }}>{flag.lisCode}</td>
              <td style={{ ...tdStyle, color: "#9AA0A6" }}>
                {["","Informational","Low","Medium","High","Critical"][flag.severity]} ({flag.severity})
              </td>
              <td style={tdStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", flexShrink: 0, background: flag.active ? "#22c55e" : "#4b5563", boxShadow: flag.active ? "0 0 6px #22c55e99" : "none" }} />
                  <span style={{ fontSize: 13, color: flag.active ? "#d1d5db" : "#6b7280" }}>
                    {flag.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </td>
              <td style={tdStyle}>
                <button style={smallBtn} onClick={() => openEditModal(flag)}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                >Edit</button>
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <tr><td style={{ ...tdStyle, color: "#9AA0A6" }} colSpan={6}>No flags created yet.</td></tr>
          )}
        </tbody>
      </table>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <h3 style={{ marginTop: 0, fontSize: "18px", fontWeight: 700, color: "#FFFFFF", marginBottom: "20px" }}>
              {editingFlag ? "Edit Flag" : "Create Flag"}
            </h3>

            <label style={labelStyle}>Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input value={name} onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })); }} style={{ ...inputStyle, borderColor: errors.name ? "#ef4444" : "rgba(255,255,255,0.15)" }} />
            {errors.name && <div style={{ fontSize: 11, color: "#ef4444", marginTop: -12, marginBottom: 12 }}>{errors.name}</div>}

            <label style={labelStyle}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, height: "70px", resize: "vertical" }} />

            <label style={labelStyle}>Level</label>
            <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
              {(["case", "specimen"] as const).map(l => (
                <label key={l} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#DEE4E7", cursor: "pointer", fontSize: "14px" }}>
                  <input type="radio" checked={level === l} onChange={() => setLevel(l)} style={{ accentColor: "#8AB4F8" }} />
                  {l === "case" ? "Case Level" : "Specimen Level"}
                </label>
              ))}
            </div>

            <label style={labelStyle}>Severity</label>
            <select style={inputStyle} value={severity} onChange={e => setSeverity(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
              <option value={1} style={{ background: "#1a2332", color: "#DEE4E7" }}>1 – Informational</option>
              <option value={2} style={{ background: "#1a2332", color: "#DEE4E7" }}>2 – Low</option>
              <option value={3} style={{ background: "#1a2332", color: "#DEE4E7" }}>3 – Medium</option>
              <option value={4} style={{ background: "#1a2332", color: "#DEE4E7" }}>4 – High</option>
              <option value={5} style={{ background: "#1a2332", color: "#DEE4E7" }}>5 – Critical</option>
            </select>

            <label style={labelStyle}>LIS Code</label>
            <input value={lisCode} onChange={e => setLisCode(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Status</label>
            <Toggle value={active} onChange={setActive} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px", gap: "10px" }}>
              <button style={smallBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={primaryBtn} onClick={requestSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Save Modal ── */}
      {showConfirm && (
        <div style={modalBackdrop}>
          <div style={{ ...modalCard, width: "420px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              {editingFlag ? "Save Changes" : "Create Flag"}
            </h2>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "16px" }} />
            <p style={{ marginBottom: "24px", color: "#9AA0A6", fontSize: "14px" }}>
              Are you sure you want to apply these changes?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button style={smallBtn} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button style={primaryBtn} onClick={confirmSave}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlagConfigPage;

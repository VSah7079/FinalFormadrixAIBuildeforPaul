import React, { useEffect, useState } from "react";
import '../../../pathscribe.css';
import { FlagDefinition } from "../../../types/FlagDefinition";
import { flagService } from "../../../services";

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: "pointer",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
        background: value ? "var(--ps-conf-green)" : "var(--ps-conf-text-dim)",
      }}
    >
      <div style={{
        position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        left: value ? 23 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: value ? "var(--ps-conf-green)" : "var(--ps-conf-text-3)" }}>
      {value ? "Active" : "Inactive"}
    </span>
  </div>
);

const FlagConfigPage: React.FC = () => {
  const [flags,        setFlags]        = useState<FlagDefinition[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [editingFlag,  setEditingFlag]  = useState<FlagDefinition | null>(null);
  const [name,         setName]         = useState("");
  const [description,  setDescription]  = useState("");
  const [level,        setLevel]        = useState<"case" | "specimen">("case");
  const [lisCode,      setLisCode]      = useState("");
  const [active,       setActive]       = useState(true);
  const [severity,     setSeverity]     = useState<1|2|3|4|5>(1);
  const [errors,       setErrors]       = useState<{ name?: string }>({});
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"All"|"Active"|"Inactive">("All");
  const [levelFilter,  setLevelFilter]  = useState<"All"|"case"|"specimen">("All");

  useEffect(() => { loadFlags(); }, []);

  const loadFlags = async () => {
    setLoading(true);
    const res = await flagService.getAll();
    if (res.ok) setFlags(res.data as unknown as FlagDefinition[]);
    setLoading(false);
  };

  const openAddModal = () => {
    setEditingFlag(null); setName(""); setDescription("");
    setLevel("case"); setLisCode(""); setActive(true); setSeverity(1);
    setErrors({}); setShowModal(true);
  };

  const openEditModal = (flag: FlagDefinition) => {
    setEditingFlag(flag); setName(flag.name); setDescription(flag.description ?? "");
    setLevel(flag.level); setLisCode(flag.lisCode); setActive(flag.active);
    setSeverity(flag.severity); setErrors({}); setShowModal(true);
  };

  const requestSave = () => {
    const e: { name?: string } = {};
    if (!name.trim()) e.name = "Name is required";
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setShowModal(false); setShowConfirm(true);
  };

  const confirmSave = async () => {
    const payload = {
      name, description, level, lisCode, active, severity,
      code: lisCode, autoCreated: false,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    if (editingFlag) {
      const res = await flagService.update(editingFlag.id, {
        name, description,
        level: (level === "case" ? "Case" : "Specimen") as "Case" | "Specimen",
        lisCode, severity,
      });
      if (res.ok) setFlags(prev => prev.map(f => f.id === res.data.id ? res.data as unknown as FlagDefinition : f));
    } else {
      const res = await flagService.add({
        ...payload,
        level: (payload.level === "case" ? "Case" : "Specimen") as "Case" | "Specimen",
        status: "Active" as const,
      });
      if (res.ok) setFlags(prev => [...prev, res.data as unknown as FlagDefinition]);
    }
    setShowConfirm(false);
  };

  const filtered = flags.filter(f => {
    const matchSearch = !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.lisCode || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || (statusFilter === "Active" ? f.active : !f.active);
    const matchLevel  = levelFilter  === "All" || f.level === levelFilter;
    return matchSearch && matchStatus && matchLevel;
  });

  return (
    <>
      {/* ── Header ── */}
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">Case & Specimen Flags</h3>
          <p className="ps-conf-section-subtitle">Manage flags used in case workflows and synoptic reporting</p>
        </div>
        <button className="ps-conf-btn-primary" onClick={openAddModal}>+ Add Flag</button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search flags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ps-conf-search"
          style={{ flex: 1 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="ps-conf-select">
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as any)} className="ps-conf-select">
          <option value="All">All Levels</option>
          <option value="case">Case</option>
          <option value="specimen">Specimen</option>
        </select>
      </div>

      {/* ── Table ── */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th className="ps-conf-th">Name</th>
            <th className="ps-conf-th">Level</th>
            <th className="ps-conf-th">LIS Code</th>
            <th className="ps-conf-th">Severity</th>
            <th className="ps-conf-th">Status</th>
            <th className="ps-conf-th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(flag => (
            <tr key={flag.id}>
              <td className="ps-conf-td">{flag.name}</td>
              <td className="ps-conf-td" style={{ color: "var(--ps-conf-text-3)" }}>
                {flag.level === "case" ? "Case" : "Specimen"}
              </td>
              <td className="ps-conf-td" style={{ color: "var(--ps-conf-text-3)" }}>{flag.lisCode}</td>
              <td className="ps-conf-td" style={{ color: "var(--ps-conf-text-3)" }}>
                {["","Informational","Low","Medium","High","Critical"][flag.severity]} ({flag.severity})
              </td>
              <td className="ps-conf-td">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: "50%", display: "inline-block", flexShrink: 0,
                    background: flag.active ? "var(--ps-conf-green)" : "var(--ps-conf-text-dim)",
                  }} />
                  <span style={{ fontSize: 13, color: flag.active ? "var(--ps-conf-text)" : "var(--ps-conf-text-3)" }}>
                    {flag.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </td>
              <td className="ps-conf-td">
                <button className="ps-conf-btn-row" onClick={() => openEditModal(flag)}>Edit</button>
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <tr>
              <td className="ps-conf-td" style={{ color: "var(--ps-conf-text-3)" }} colSpan={6}>
                No flags created yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="ps-conf-backdrop">
          <div className="ps-conf-modal">
            <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {editingFlag ? "Edit Flag" : "Create Flag"}
            </h3>

            <label className="ps-conf-label">Name <span style={{ color: "var(--ps-conf-red)" }}>*</span></label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })); }}
              className="ps-conf-input"
              style={{ marginBottom: errors.name ? 4 : 16, borderColor: errors.name ? "var(--ps-conf-red)" : undefined }}
            />
            {errors.name && <div style={{ fontSize: 11, color: "var(--ps-conf-red)", marginBottom: 12 }}>{errors.name}</div>}

            <label className="ps-conf-label">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="ps-conf-input"
              style={{ height: 70, resize: "vertical", marginBottom: 16 }}
            />

            <label className="ps-conf-label">Level</label>
            <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
              {(["case", "specimen"] as const).map(l => (
                <label key={l} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ps-conf-text)", cursor: "pointer", fontSize: 14 }}>
                  <input type="radio" checked={level === l} onChange={() => setLevel(l)}
                    style={{ accentColor: "var(--ps-conf-teal)" }} />
                  {l === "case" ? "Case Level" : "Specimen Level"}
                </label>
              ))}
            </div>

            <label className="ps-conf-label">Severity</label>
            <select className="ps-conf-input" style={{ marginBottom: 16 }} value={severity}
              onChange={e => setSeverity(Number(e.target.value) as 1|2|3|4|5)}>
              <option value={1}>1 – Informational</option>
              <option value={2}>2 – Low</option>
              <option value={3}>3 – Medium</option>
              <option value={4}>4 – High</option>
              <option value={5}>5 – Critical</option>
            </select>

            <label className="ps-conf-label">LIS Code</label>
            <input value={lisCode} onChange={e => setLisCode(e.target.value)}
              className="ps-conf-input" style={{ marginBottom: 16 }} />

            <label className="ps-conf-label">Status</label>
            <Toggle value={active} onChange={setActive} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, gap: 10 }}>
              <button className="ps-conf-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="ps-conf-btn-primary" onClick={requestSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <div className="ps-conf-backdrop">
          <div className="ps-conf-modal" style={{ width: 420 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>
              {editingFlag ? "Save Changes" : "Create Flag"}
            </h2>
            <div style={{ height: 1, background: "var(--ps-conf-border)", marginBottom: 16 }} />
            <p style={{ marginBottom: 24, color: "var(--ps-conf-text-3)", fontSize: 14 }}>
              Are you sure you want to apply these changes?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="ps-conf-btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="ps-conf-btn-primary" onClick={confirmSave}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlagConfigPage;

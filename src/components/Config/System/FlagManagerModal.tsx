// src/components/FlagManagerModal.tsx
//
// Layout:
//   LEFT (280px) — target pills (Case, All Specimens, Sp.1…) stacked vertically.
//                  Each selected pill expands to show its applied flags with 🗑 to remove.
//   RIGHT        — search + flag catalog filtered by selected target level.
//                  Click a row to apply to all selected targets.
//   FOOTER       — Cancel (reverts all changes) | Save (commits + closes)

import React, { useState, useMemo, useCallback, useEffect } from "react";
import "../../../formedrix.css";
import { FlagDefinition } from "../../../types/FlagDefinition";
import { CaseWithFlags, FlagInstance } from "../../../types/flagsRuntime";
import { ApplyFlagPayload, DeleteFlagPayload } from "../../../api/caseFlagsApi";

interface Props {
  onClose: () => void;
  caseData: CaseWithFlags;
  flagDefinitions: FlagDefinition[];
  onApplyFlags: (payload: ApplyFlagPayload) => Promise<void>;
  onRemoveFlag:  (payload: DeleteFlagPayload) => Promise<void>;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const activeInst = (flags: FlagInstance[]) => flags.filter(f => !f.deletedAt);
const defById    = (defs: FlagDefinition[], id: string) => defs.find(d => d.id === id);

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

// ── sub-components ────────────────────────────────────────────────────────────


const ConfirmDialog: React.FC<{
  flagName: string; targetLabel: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}> = ({ flagName, targetLabel, onConfirm, onCancel, loading }) => (
  <div data-capture-hide="true" className="ps-overlay" style={{ zIndex: 11000 }}>
    <div className="ps-modal-dark" style={{ padding: "32px 36px", width: "400px", textAlign: "center" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px", textAlign: "center" }}>🗑️</div>
      <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#f1f5f9", textAlign: "center" }}>Remove Flag?</h3>
      <p style={{ color: "#94a3b8", fontSize: "14px", margin: "0 0 4px", lineHeight: 1.6, textAlign: "center" }}>
        Remove <strong style={{ color: "#e2e8f0" }}>{flagName}</strong> from{" "}
        <strong style={{ color: "#e2e8f0" }}>{targetLabel}</strong>?
      </p>
      <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 24px", textAlign: "center" }}>This will be recorded in the audit trail.</p>
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={onCancel} className="ps-btn-secondary-dark" style={{ flex: 1 }}
        >
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className="ps-btn-danger" style={{ flex: 1, opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer" }}
        >
          {loading ? "Removing…" : "Yes, Remove"}
        </button>
      </div>
    </div>
  </div>
);

// ── main ──────────────────────────────────────────────────────────────────────

const FlagManagerModal: React.FC<Props> = ({
  onClose, caseData: initialCaseData, flagDefinitions, onApplyFlags, onRemoveFlag,
}) => {
  // Local copy of caseData — all edits happen here; Cancel reverts, Save commits
  const [localCase, setLocalCase]       = useState<CaseWithFlags>(() => deepClone(initialCaseData));

  // Left panel selection — "case" | specimenId(s)
  const [caseOn, setCaseOn]             = useState(true);
  const [spIds, setSpIds]               = useState<Set<string>>(new Set());

  // Right panel
  const [query, setQuery]               = useState("");

  // Pending apply/remove ops to flush on Save
  type PendingOp =
    | { type: "apply";  payload: ApplyFlagPayload }
    | { type: "remove"; payload: DeleteFlagPayload };
  const [pendingOps, setPendingOps]     = useState<PendingOp[]>([]);

  // Confirm dialog state
  const [confirmPending, setConfirmPending] = useState<{
    flagName: string; targetLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  // Scope choice: when removing a specimen flag that exists on other specimens
  const [scopeDialog, setScopeDialog] = useState<{
    flagName: string;
    defId: string;
    specimenId: string;
    otherSpecimenIds: string[];
    onConfirm: (removeAll: boolean) => void;
  } | null>(null);

  // Saving state
  const [saving, setSaving]             = useState(false);

  const allIds   = localCase.specimens.map(s => s.id);
  const allOn    = allIds.length > 0 && allIds.every(id => spIds.has(id));
  const invalid  = caseOn && spIds.size > 0;

  const targetLevel: "case" | "specimen" | "none" =
    caseOn ? "case" : spIds.size > 0 ? "specimen" : "none";
  const hasTarget = targetLevel !== "none" && !invalid;

  // ── pill toggles ────────────────────────────────────────────────────────────

  const toggleCase = () => { setCaseOn(v => !v); setSpIds(new Set()); };
  const toggleAll  = () => {
    setCaseOn(false);
    setSpIds(allOn ? new Set() : new Set(allIds));
  };
  const toggleSp = (id: string) => {
    setCaseOn(false);
    setSpIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // ── local state helpers ─────────────────────────────────────────────────────

  const addFlagLocally = useCallback((defId: string, specimenId?: string) => {
    const inst: FlagInstance = {
      id: `local-${Date.now()}-${Math.random()}`,
      flagDefinitionId: defId,
      appliedAt: new Date().toISOString(),
      appliedBy: "current-user",
      source: "product",
      deletedAt: null,
      deletedBy: null,
    };
    setLocalCase(prev => {
      const next = deepClone(prev);
      if (!specimenId) {
        const alreadyActive = next.flags.filter(f => !f.deletedAt).some(f => f.flagDefinitionId === defId);
        if (!alreadyActive) next.flags.push(inst);
      } else {
        const sp = next.specimens.find(s => s.id === specimenId);
        if (sp) {
          const alreadyActive = sp.flags.filter(f => !f.deletedAt).some(f => f.flagDefinitionId === defId);
          if (!alreadyActive) sp.flags.push({ ...inst, id: `local-${Date.now()}-${Math.random()}` });
        }
      }
      return next;
    });
  }, []);

  const removeFlagLocally = useCallback((instanceId: string, specimenId?: string) => {
    const now = new Date().toISOString();
    setLocalCase(prev => {
      const next = deepClone(prev);
      if (!specimenId) {
        const f = next.flags.find(f => f.id === instanceId);
        if (f) { f.deletedAt = now; f.deletedBy = "current-user"; }
      } else {
        const sp = next.specimens.find(s => s.id === specimenId);
        const f  = sp?.flags.find(f => f.id === instanceId);
        if (f) { f.deletedAt = now; f.deletedBy = "current-user"; }
      }
      return next;
    });
  }, []);

  // ── apply flag ──────────────────────────────────────────────────────────────

  const handleApply = async (def: FlagDefinition) => {
    if (!hasTarget) return;
    if (caseOn) {
      addFlagLocally(def.id);
      setPendingOps(ops => [...ops, { type: "apply", payload: { caseId: localCase.id, flagDefinitionId: def.id } }]);
    } else {
      for (const spId of Array.from(spIds)) {
        const sp = localCase.specimens.find(s => s.id === spId);
        const alreadyOn = activeInst(sp?.flags ?? []).some(f => f.flagDefinitionId === def.id);
        if (!alreadyOn) {
          addFlagLocally(def.id, spId);
          setPendingOps(ops => [...ops, { type: "apply", payload: { caseId: localCase.id, flagDefinitionId: def.id, specimenId: spId } }]);
        }
      }
    }
  };

  // ── remove flag (with confirm) ──────────────────────────────────────────────

  const doRemoveSingle = (inst: FlagInstance, specimenId: string | undefined) => {
    removeFlagLocally(inst.id, specimenId);
    if (inst.id.startsWith("local-")) {
      setPendingOps(ops => ops.filter(op =>
        !(op.type === "apply" && op.payload.flagDefinitionId === inst.flagDefinitionId &&
          op.payload.specimenId === specimenId)
      ));
    } else {
      setPendingOps(ops => [...ops, { type: "remove", payload: { caseId: localCase.id, flagInstanceId: inst.id, specimenId } }]);
    }
  };

  const doRemoveAll = (defId: string, specimenIds: string[]) => {
    for (const spId of specimenIds) {
      const sp = localCase.specimens.find(s => s.id === spId);
      const inst = sp ? activeInst(sp.flags).find(f => f.flagDefinitionId === defId) : undefined;
      if (inst) doRemoveSingle(inst, spId);
    }
  };

  const requestRemove = (inst: FlagInstance, specimenId: string | undefined, targetLabel: string) => {
    const def = defById(flagDefinitions, inst.flagDefinitionId);
    const flagName = def?.name ?? inst.flagDefinitionId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Check if this flag exists on other specimens too
    if (specimenId) {
      const otherSpecimenIds = localCase.specimens
        .filter(sp => sp.id !== specimenId && activeInst(sp.flags).some(f => f.flagDefinitionId === inst.flagDefinitionId))
        .map(sp => sp.id);

      if (otherSpecimenIds.length > 0) {
        setScopeDialog({
          flagName,
          defId: inst.flagDefinitionId,
          specimenId,
          otherSpecimenIds,
          onConfirm: (removeAll) => {
            if (removeAll) {
              doRemoveAll(inst.flagDefinitionId, [specimenId, ...otherSpecimenIds]);
            } else {
              doRemoveSingle(inst, specimenId);
            }
            setScopeDialog(null);
          },
        });
        return;
      }
    }

    // Single target — standard confirm
    setConfirmPending({
      flagName,
      targetLabel,
      onConfirm: () => {
        setConfirmLoading(true);
        doRemoveSingle(inst, specimenId);
        setConfirmLoading(false);
        setConfirmPending(null);
      },
    });
  };

  // ── save — flush all pending ops ────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const op of pendingOps) {
        if (op.type === "apply")  await onApplyFlags(op.payload);
        if (op.type === "remove") await onRemoveFlag(op.payload);
      }
    } finally {
      setSaving(false);
      onClose();
    }
  };

  // ── cancel — discard local state ─────────────────────────────────────────────

  const handleCancel = () => {
    setLocalCase(deepClone(initialCaseData));
    setPendingOps([]);
    onClose();
  };

  // ── catalog ─────────────────────────────────────────────────────────────────

  const catalog = useMemo(() => {
    let pool = flagDefinitions.filter(d => d.active);
    if (hasTarget) pool = pool.filter(d => d.level === targetLevel);
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        d.lisCode.toLowerCase().includes(q)
      );
    }
    return pool;
  }, [flagDefinitions, hasTarget, targetLevel, query]);

  // Is def already applied to ALL selected targets?
  const isAppliedAll = (defId: string): boolean => {
    if (caseOn) return activeInst(localCase.flags).some(f => f.flagDefinitionId === defId);
    return Array.from(spIds).every(spId => {
      const sp = localCase.specimens.find(s => s.id === spId);
      return activeInst(sp?.flags ?? []).some(f => f.flagDefinitionId === defId);
    });
  };

  const isDirty = pendingOps.length > 0;

  // ── Voice command listeners ─────────────────────────────────────────
  useEffect(() => {
    const selectCase    = () => toggleCase();
    const selectAllSpec = () => toggleAll();
    const deselectAll   = () => { setCaseOn(false); setSpIds(new Set()); };
    const saveFlags     = () => { if (isDirty) void handleSave(); };
    const cancelFlags   = () => handleCancel();

    window.addEventListener('ForMedrix_FLAG_SELECT_CASE',           selectCase);
    window.addEventListener('ForMedrix_FLAG_SELECT_ALL_SPECIMENS',  selectAllSpec);
    window.addEventListener('ForMedrix_FLAG_DESELECT_ALL',          deselectAll);
    window.addEventListener('ForMedrix_FLAG_SAVE',                  saveFlags);
    window.addEventListener('ForMedrix_FLAG_CANCEL',                cancelFlags);

    return () => {
      window.removeEventListener('ForMedrix_FLAG_SELECT_CASE',           selectCase);
      window.removeEventListener('ForMedrix_FLAG_SELECT_ALL_SPECIMENS',  selectAllSpec);
      window.removeEventListener('ForMedrix_FLAG_DESELECT_ALL',          deselectAll);
      window.removeEventListener('ForMedrix_FLAG_SAVE',                  saveFlags);
      window.removeEventListener('ForMedrix_FLAG_CANCEL',                cancelFlags);
    };
  }, [isDirty, toggleCase, toggleAll, handleSave, handleCancel]);

  // ── pill style ──────────────────────────────────────────────────────────────

  // Pill className helper — uses ps-pill-dark CSS class
  const pillCls = (on: boolean) => `ps-pill-dark${on ? ' active' : ''}`;

  // ── applied flag chip in left panel ─────────────────────────────────────────

  const FlagChip: React.FC<{
    inst: FlagInstance; specimenId?: string; targetLabel: string;
  }> = ({ inst, specimenId, targetLabel }) => {
    const def = defById(flagDefinitions, inst.flagDefinitionId);
    const isLis = inst.source === "lis";
    return (
      <div className="ps-flag-chip-dark">
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {def?.name ?? inst.flagDefinitionId.replace(/-/g, " ").replace(/\w/g, c => c.toUpperCase())}
        </span>
        {isLis
          ? <span title="Applied by LIS — cannot be removed" style={{ color: "#cbd5e1", fontSize: "12px", flexShrink: 0 }}>🔒</span>
          : (
            <button
              onClick={() => requestRemove(inst, specimenId, targetLabel)}
              title="Remove flag"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px", lineHeight: 1, padding: "3px 4px", flexShrink: 0, borderRadius: "4px" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "#fee2e2"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "none"; }}
            >🗑</button>
          )
        }
      </div>
    );
  };

  // ── render ───────────────────────────────────────────────────────────────────

  const totalFlags =
    activeInst(localCase.flags).length +
    localCase.specimens.reduce((n, sp) => n + activeInst(sp.flags).length, 0);

  return (
    <>
      <div data-capture-hide="true" onClick={handleCancel} className="ps-overlay" style={{ zIndex: 10000 }}>
        <div onClick={e => e.stopPropagation()} className="ps-modal-dark ps-modal-xl" style={{ height: "740px" }}>

          {/* ── HEADER ── */}
          <div className="ps-modal-header">
            <div>
              <h2 className="ps-modal-title">🚩 Flag Manager</h2>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                Case {localCase.accession}
                {totalFlags > 0 && <span style={{ marginLeft: "8px", background: "#fef3c7", color: "#b45309", fontWeight: 700, fontSize: "11px", padding: "1px 7px", borderRadius: "99px" }}>{totalFlags} active</span>}
              </div>
            </div>
            <button onClick={handleCancel} className="ps-modal-close">✕</button>
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* ═══ LEFT — pills + applied flags ═══ */}
            <div className="ps-modal-dark-left">
              <div className="ps-modal-dark-label">
                Apply to
              </div>
              <div className="ps-modal-dark-scroll">

                {/* Case pill */}
                <button className={pillCls(caseOn)} onClick={toggleCase}>
                  <span>📋</span>
                  <span style={{ flex: 1 }}>Case {localCase.accession}</span>
                  {activeInst(localCase.flags).length > 0 && (
                    <span style={{ fontSize: "10px", background: "#f59e0b", color: "white", borderRadius: "99px", padding: "1px 6px", fontWeight: 800 }}>
                      {activeInst(localCase.flags).length}
                    </span>
                  )}
                </button>
                {/* Case flags */}
                {activeInst(localCase.flags).map(inst => (
                  <FlagChip key={inst.id} inst={inst} targetLabel={`Case ${localCase.accession}`} />
                ))}
                {activeInst(localCase.flags).length === 0 && (
                  <div style={{ fontSize: "11px", color: "#475569", fontStyle: "italic", padding: "3px 10px 6px" }}>No case flags applied</div>
                )}

                <div className="ps-divider" />

                {/* All Specimens pill */}
                {allIds.length > 1 && (
                  <>
                    <button className={pillCls(allOn)} style={{ marginBottom: "4px" }} onClick={toggleAll}>
                      <span>🔬</span>
                      <span style={{ flex: 1 }}>All Specimens</span>
                    </button>
                    <div className="ps-divider" />
                  </>
                )}

                {/* Individual specimen pills */}
                {localCase.specimens.map((sp, i) => (
                  <div key={sp.id} style={{ marginBottom: "6px" }}>
                    <button className={pillCls(spIds.has(sp.id))} onClick={() => toggleSp(sp.id)}>
                      <span>🔬</span>
                      <span style={{ flex: 1 }}>Sp. {i + 1}</span><span style={{ fontSize: "13px", color: spIds.has(sp.id) ? "#0369a1" : "#64748b", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 2 }}>{sp.label.replace(/^Specimen \d+ — /, "")}</span>
                      {activeInst(sp.flags).length > 0 && (
                        <span style={{ fontSize: "10px", background: "#f59e0b", color: "white", borderRadius: "99px", padding: "1px 6px", fontWeight: 800, flexShrink: 0 }}>
                          {activeInst(sp.flags).length}
                        </span>
                      )}
                    </button>
                    {/* Applied flags for this specimen */}
                    {activeInst(sp.flags).map(inst => (
                      <FlagChip key={inst.id} inst={inst} specimenId={sp.id} targetLabel={sp.label} />
                    ))}
                    {activeInst(sp.flags).length === 0 && (
                      <div style={{ fontSize: "11px", color: "#475569", fontStyle: "italic", padding: "2px 10px 2px" }}>No flags applied</div>
                    )}
                  </div>
                ))}

                {/* Invalid combo warning */}
                {invalid && (
                  <div style={{ marginTop: "8px", className: "" }}>
                    ⚠️ Case and specimens can't be selected together
                  </div>
                )}
              </div>
            </div>

            {/* ═══ RIGHT — search + catalog ═══ */}
            <div className="ps-modal-dark-right">

              {/* Search */}
              <div className="ps-modal-dark-search">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8", pointerEvents: "none" }}>🔍</span>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search flags by name, code, or description…"
                    className="ps-input-dark-search"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px", padding: 0, lineHeight: 1 }}>✕</button>
                  )}
                </div>
              </div>

              {/* Column headers */}
              <div className="ps-modal-dark-col-header">
                <span style={{ width: "58px", fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>Code</span>
                <span style={{ flex: 1, fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Flag
                  {hasTarget && <span style={{ fontWeight: 400, textTransform: "none", color: "#cbd5e1", marginLeft: "6px" }}>· {targetLevel}-level</span>}
                </span>
                <span style={{ width: "80px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", textAlign: "right" }}>Action</span>
              </div>

              {/* Flag rows */}
              <div className="ps-modal-dark-list">
                {!hasTarget && !invalid ? (
                  <div className="ps-modal-dark-empty">
                    <div style={{ fontSize: "26px", marginBottom: "10px" }}>☝️</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>Select a target on the left</div>
                    <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>Choose the case or one or more specimens, then click a flag to apply it</div>
                  </div>
                ) : invalid ? (
                  <div style={{ padding: "52px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: "26px", marginBottom: "10px" }}>⚠️</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#ef4444" }}>Invalid selection</div>
                    <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>Deselect either the case or the specimens</div>
                  </div>
                ) : catalog.length === 0 ? (
                  <div style={{ padding: "52px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: "26px", marginBottom: "10px" }}>🔍</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>
                      {query ? `No flags match "${query}"` : `No ${targetLevel}-level flags defined`}
                    </div>
                    {!query && <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>Go to Configuration → System → Flags to add some</div>}
                  </div>
                ) : catalog.map(def => {
                  const applied = isAppliedAll(def.id);
                  return (
                    <div
                      key={def.id}
                      onClick={() => !applied && handleApply(def)}
                      style={{
                        display: "flex", alignItems: "center", padding: "12px 20px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        cursor: applied ? "default" : "pointer",
                      }}
                      onMouseEnter={e => { if (!applied) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = applied ? "rgba(16,185,129,0.1)" : "transparent"; }}
                    >
                      <div style={{ width: "58px", flexShrink: 0 }}>
                        <span className="ps-code-badge">
                          {def.lisCode}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "inherit" }}>{def.name}</div>
                        {def.description && <div style={{ fontSize: "12px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</div>}
                      </div>
                      <div style={{ width: "80px", textAlign: "right", flexShrink: 0 }}>
                        {applied
                          ? <span className="ps-badge ps-badge-green">✓ Applied</span>
                          : <span style={{ fontSize: "12px", fontWeight: 600, color: "#0891B2" }}>+ Apply</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div className="ps-modal-footer" style={{ justifyContent: "space-between" }}>
            <div style={{ fontSize: "12px", color: isDirty ? "#b45309" : "#94a3b8", fontWeight: isDirty ? 600 : 400 }}>
              {isDirty ? `${pendingOps.length} unsaved change${pendingOps.length !== 1 ? "s" : ""}` : "No changes"}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCancel}
                className="ps-btn-secondary-dark"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="ps-btn-primary"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scope dialog — flag exists on multiple specimens */}
      {scopeDialog && (
        <div data-capture-hide="true" className="ps-overlay" style={{ zIndex: 11000 }}>
          <div className="ps-modal-dark" style={{ padding: "32px 36px", width: "440px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px", textAlign: "center" }}>🔬</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "#f1f5f9", textAlign: "center" }}>Remove from multiple specimens?</h3>
            <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 6px", lineHeight: 1.6, textAlign: "center" }}>
              <strong style={{ color: "#e2e8f0" }}>{scopeDialog.flagName}</strong> is also applied to{" "}
              <strong style={{ color: "#e2e8f0" }}>{scopeDialog.otherSpecimenIds.length} other specimen{scopeDialog.otherSpecimenIds.length !== 1 ? "s" : ""}</strong>.
              How would you like to proceed?
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 24px", textAlign: "center" }}>All removals will be recorded in the audit trail.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={() => scopeDialog.onConfirm(false)}
                style={{ padding: "11px 16px", border: "2px solid #e2e8f0", borderRadius: "10px", background: "white", color: "#e2e8f0", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                Remove from this specimen only
              </button>
              <button
                onClick={() => scopeDialog.onConfirm(true)}
                style={{ padding: "11px 16px", border: "2px solid #fca5a5", borderRadius: "10px", background: "#fef2f2", color: "#dc2626", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fef2f2"; }}
              >
                Remove from all {scopeDialog.otherSpecimenIds.length + 1} specimens
              </button>
              <button
                onClick={() => setScopeDialog(null)}
                style={{ padding: "10px 16px", border: "none", borderRadius: "10px", background: "none", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "center", marginTop: "4px" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#64748b"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm remove dialog */}
      {confirmPending && (
        <ConfirmDialog
          flagName={confirmPending.flagName}
          targetLabel={confirmPending.targetLabel}
          onConfirm={confirmPending.onConfirm}
          onCancel={() => setConfirmPending(null)}
          loading={confirmLoading}
        />
      )}
    </>
  );
};

export default FlagManagerModal;

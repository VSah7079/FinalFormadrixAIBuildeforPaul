// src/components/FlagManagerModal.tsx
//
// Layout:
//   LEFT (280px) — target pills (Case, All Specimens, Sp.1…) stacked vertically.
//                  Each selected pill expands to show its applied flags with 🗑 to remove.
//   RIGHT        — search + flag catalog filtered by selected target level.
//                  Click a row to apply to all selected targets.
//   FOOTER       — Cancel (reverts all changes) | Save (commits + closes)

import React, { useState, useMemo, useCallback } from "react";
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
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 11000, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ background: "white", borderRadius: "14px", padding: "28px", width: "380px", boxShadow: "0 24px 56px rgba(0,0,0,0.28)" }}>
      <div style={{ fontSize: "22px", marginBottom: "10px" }}>🗑️</div>
      <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Remove Flag?</h3>
      <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 4px", lineHeight: 1.6 }}>
        Remove <strong style={{ color: "#0f172a" }}>{flagName}</strong> from{" "}
        <strong style={{ color: "#0f172a" }}>{targetLabel}</strong>?
      </p>
      <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 22px" }}>This will be recorded in the audit trail.</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button onClick={onCancel} style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", color: "#64748b", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} style={{ padding: "8px 18px", border: "none", borderRadius: "8px", background: "#1e293b", color: "white", fontSize: "13px", fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
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

  // ── pill style ──────────────────────────────────────────────────────────────

  const pillStyle = (on: boolean): React.CSSProperties => ({
    width: "100%", textAlign: "left", padding: "8px 12px",
    borderRadius: "8px", fontSize: "13px", fontWeight: 600,
    border: `1.5px solid ${on ? "#0891B2" : "#e2e8f0"}`,
    background: on ? "#e0f2fe" : "white",
    color: on ? "#0369a1" : "#475569",
    cursor: "pointer", transition: "all 0.12s",
    display: "flex", alignItems: "center", gap: "7px",
  });

  // ── applied flag chip in left panel ─────────────────────────────────────────

  const FlagChip: React.FC<{
    inst: FlagInstance; specimenId?: string; targetLabel: string;
  }> = ({ inst, specimenId, targetLabel }) => {
    const def = defById(flagDefinitions, inst.flagDefinitionId);
    const isLis = inst.source === "lis";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px 5px 10px", marginBottom: "3px", borderRadius: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", marginLeft: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
      <div onClick={handleCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "960px", height: "740px", background: "white", borderRadius: "16px", boxShadow: "0 28px 70px rgba(0,0,0,0.24)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ── HEADER ── */}
          <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>🚩 Flag Manager</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                Case {localCase.accession}
                {totalFlags > 0 && <span style={{ marginLeft: "8px", background: "#fef3c7", color: "#b45309", fontWeight: 700, fontSize: "11px", padding: "1px 7px", borderRadius: "99px" }}>{totalFlags} active</span>}
              </div>
            </div>
            <button onClick={handleCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "20px", lineHeight: 1, padding: 0 }}>✕</button>
          </div>

          {/* ── BODY ── */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* ═══ LEFT — pills + applied flags ═══ */}
            <div style={{ width: "320px", flexShrink: 0, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", background: "#fafafa", overflow: "hidden" }}>
              <div style={{ padding: "12px 14px 6px", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>
                Apply to
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 16px" }}>

                {/* Case pill */}
                <button style={pillStyle(caseOn)} onClick={toggleCase}>
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
                  <div style={{ fontSize: "11px", color: "#cbd5e1", fontStyle: "italic", padding: "3px 10px 6px" }}>No case flags applied</div>
                )}

                <div style={{ height: "1px", background: "#e2e8f0", margin: "10px 0 6px" }} />

                {/* All Specimens pill */}
                {allIds.length > 1 && (
                  <>
                    <button style={{ ...pillStyle(allOn), marginBottom: "4px" }} onClick={toggleAll}>
                      <span>🔬</span>
                      <span style={{ flex: 1 }}>All Specimens</span>
                    </button>
                    <div style={{ height: "1px", background: "#f1f5f9", margin: "4px 0 6px" }} />
                  </>
                )}

                {/* Individual specimen pills */}
                {localCase.specimens.map((sp, i) => (
                  <div key={sp.id} style={{ marginBottom: "6px" }}>
                    <button style={pillStyle(spIds.has(sp.id))} onClick={() => toggleSp(sp.id)}>
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
                      <div style={{ fontSize: "11px", color: "#cbd5e1", fontStyle: "italic", padding: "2px 10px 2px" }}>No flags applied</div>
                    )}
                  </div>
                ))}

                {/* Invalid combo warning */}
                {invalid && (
                  <div style={{ marginTop: "8px", padding: "8px 10px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "7px", fontSize: "11px", color: "#dc2626", fontWeight: 600 }}>
                    ⚠️ Case and specimens can't be selected together
                  </div>
                )}
              </div>
            </div>

            {/* ═══ RIGHT — search + catalog ═══ */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* Search */}
              <div style={{ padding: "12px 20px 8px", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8", pointerEvents: "none" }}>🔍</span>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search flags by name, code, or description…"
                    style={{ width: "100%", padding: "9px 30px 9px 34px", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#0891B2")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  />
                  {query && (
                    <button onClick={() => setQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "14px", padding: 0, lineHeight: 1 }}>✕</button>
                  )}
                </div>
              </div>

              {/* Column headers */}
              <div style={{ display: "flex", padding: "6px 20px", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", flexShrink: 0 }}>
                <span style={{ width: "58px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>Code</span>
                <span style={{ flex: 1, fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Flag
                  {hasTarget && <span style={{ fontWeight: 400, textTransform: "none", color: "#cbd5e1", marginLeft: "6px" }}>· {targetLevel}-level</span>}
                </span>
                <span style={{ width: "80px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.4px", textAlign: "right" }}>Action</span>
              </div>

              {/* Flag rows */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {!hasTarget && !invalid ? (
                  <div style={{ padding: "52px 24px", textAlign: "center" }}>
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
                        borderBottom: "1px solid #f8fafc",
                        background: applied ? "#f0fdf4" : "white",
                        cursor: applied ? "default" : "pointer",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (!applied) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = applied ? "#f0fdf4" : "white"; }}
                    >
                      <div style={{ width: "58px", flexShrink: 0 }}>
                        <span style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: 800, color: "#0891B2", background: "#e0f2fe", padding: "2px 6px", borderRadius: "4px" }}>
                          {def.lisCode}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{def.name}</div>
                        {def.description && <div style={{ fontSize: "12px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</div>}
                      </div>
                      <div style={{ width: "80px", textAlign: "right", flexShrink: 0 }}>
                        {applied
                          ? <span style={{ fontSize: "11px", fontWeight: 700, color: "#059669", background: "#dcfce7", padding: "2px 8px", borderRadius: "99px" }}>✓ Applied</span>
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
          <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", flexShrink: 0 }}>
            <div style={{ fontSize: "12px", color: isDirty ? "#b45309" : "#94a3b8", fontWeight: isDirty ? 600 : 400 }}>
              {isDirty ? `${pendingOps.length} unsaved change${pendingOps.length !== 1 ? "s" : ""}` : "No changes"}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCancel}
                style={{ padding: "9px 20px", background: "white", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: "9px 24px", background: isDirty ? "#0891B2" : "#94a3b8", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: saving || !isDirty ? "default" : "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => { if (isDirty && !saving) e.currentTarget.style.background = "#0e7490"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isDirty ? "#0891B2" : "#94a3b8"; }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scope dialog — flag exists on multiple specimens */}
      {scopeDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 11000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "28px", width: "420px", boxShadow: "0 24px 56px rgba(0,0,0,0.28)" }}>
            <div style={{ fontSize: "22px", marginBottom: "10px" }}>🔬</div>
            <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Remove from multiple specimens?</h3>
            <p style={{ color: "#64748b", fontSize: "14px", margin: "0 0 6px", lineHeight: 1.6 }}>
              <strong style={{ color: "#0f172a" }}>{scopeDialog.flagName}</strong> is also applied to{" "}
              <strong style={{ color: "#0f172a" }}>{scopeDialog.otherSpecimenIds.length} other specimen{scopeDialog.otherSpecimenIds.length !== 1 ? "s" : ""}</strong>.
              How would you like to proceed?
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 22px" }}>All removals will be recorded in the audit trail.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={() => scopeDialog.onConfirm(false)}
                style={{ padding: "10px 16px", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", color: "#0f172a", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                Remove from this specimen only
              </button>
              <button
                onClick={() => scopeDialog.onConfirm(true)}
                style={{ padding: "10px 16px", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", color: "#0f172a", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}
              >
                Remove from all {scopeDialog.otherSpecimenIds.length + 1} specimens
              </button>
              <button
                onClick={() => setScopeDialog(null)}
                style={{ padding: "10px 16px", border: "none", borderRadius: "8px", background: "none", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer", textAlign: "left", marginTop: "4px" }}
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

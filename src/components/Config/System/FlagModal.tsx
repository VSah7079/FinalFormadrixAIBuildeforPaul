import { useState, useMemo, useRef } from "react";
import { applyFlags } from "../../api/caseFlagsApi";
import { FlagDefinition } from "../../types/FlagDefinition";
import { CaseWithFlags, SpecimenWithFlags } from "../../types/flagsRuntime";

interface FlagManagerModalProps {
  caseData: CaseWithFlags;
  flagDefinitions: FlagDefinition[];
  onClose: () => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:           "#0f1923",
  surface:      "#131e2b",
  panel:        "#162132",
  card:         "#1a2a3a",
  cardHover:    "#1f3347",
  border:       "#2a3f55",
  borderSub:    "#1e2d40",
  accent:       "#38bdf8",
  accentDim:    "rgba(56,189,248,0.12)",
  accentFocus:  "rgba(56,189,248,0.18)",
  textPrimary:  "#e2eaf3",
  textSub:      "#7a9ab8",
  textMuted:    "#4a6680",
  labelCaps:    "#3d5870",
  danger:       "#ef4444",
  dangerDim:    "rgba(239,68,68,0.12)",
  amber:        "#f59e0b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const levelIs = (flag: FlagDefinition, level: "case" | "specimen") =>
  (flag.level as string).toLowerCase() === level;

const getCode = (flag: FlagDefinition) =>
  (flag as any).lisCode ?? (flag as any).code ?? "—";

const severityColor = (sev?: number): string => {
  if (!sev) return C.textMuted;
  if (sev >= 5) return C.danger;
  if (sev >= 4) return C.amber;
  if (sev >= 3) return C.accent;
  return C.textMuted;
};

// ─── Tiny icon components (no emoji, no external deps) ───────────────────────
const IconDoc = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4.5 5.5h7M4.5 8h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconDot = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
  </svg>
);
const IconSearch = ({ color }: { color: string }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="4.5" stroke={color} strokeWidth="1.4"/>
    <path d="M10.5 10.5L14 14" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function FlagManagerModal({
  caseData,
  flagDefinitions,
  onClose,
}: FlagManagerModalProps) {
  const specimens = caseData.specimens as SpecimenWithFlags[];

  const [selectedTarget,  setSelectedTarget]  = useState<string>("case");
  const [search,          setSearch]          = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [dragFlag,        setDragFlag]        = useState<{ flagId: string; fromTarget: string } | null>(null);
  const [dragOverTarget,  setDragOverTarget]  = useState<string | null>(null);
  const [contextMenu,     setContextMenu]     = useState<{ flagId: string; fromTarget: string; x: number; y: number } | null>(null);

  // pendingApplied: targetId → Set of applied flagDefinitionIds
  const [pendingApplied, setPendingApplied] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {
      case: new Set(caseData.flags?.map((fl: any) => fl.definitionId) ?? []),
    };
    specimens.forEach((sp) => {
      map[sp.id] = new Set(sp.flags?.map((fl: any) => fl.definitionId) ?? []);
    });
    return map;
  });

  const isCase = selectedTarget === "case";
  const isAll  = selectedTarget === "all";
  const eligibleLevel: "case" | "specimen" = isCase ? "case" : "specimen";
  const applyTargets = isAll ? specimens.map((sp) => sp.id) : [selectedTarget];

  const filteredFlags = useMemo(() => {
    const base = flagDefinitions.filter((fl) => levelIs(fl, eligibleLevel));
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (fl) =>
        fl.name.toLowerCase().includes(q) ||
        getCode(fl).toLowerCase().includes(q) ||
        fl.description?.toLowerCase().includes(q)
    );
  }, [flagDefinitions, eligibleLevel, search]);

  const isFlagApplied = (id: string) => {
    if (isAll) return specimens.every((sp) => pendingApplied[sp.id]?.has(id));
    return pendingApplied[selectedTarget]?.has(id) ?? false;
  };

  const toggleFlag = async (flagDefId: string) => {
    const already = isFlagApplied(flagDefId);
    setPendingApplied((prev) => {
      const next = { ...prev };
      applyTargets.forEach((tgt) => {
        const s = new Set(next[tgt] ?? []);
        already ? s.delete(flagDefId) : s.add(flagDefId);
        next[tgt] = s;
      });
      return next;
    });
    if (!already) {
      for (const tgt of applyTargets) {
        await applyFlags({
          caseId: caseData.id,
          flagDefinitionId: flagDefId,
          ...(tgt !== "case" ? { specimenId: tgt } : {}),
        });
      }
    }
  };

  // Move a flag from one target to another (removes from source, adds to dest)
  const moveFlag = (flagId: string, fromTarget: string, toTarget: string) => {
    if (fromTarget === toTarget) return;
    setPendingApplied(prev => {
      const next = { ...prev };
      const from = new Set(next[fromTarget] ?? []);
      const to   = new Set(next[toTarget]   ?? []);
      from.delete(flagId);
      to.add(flagId);
      next[fromTarget] = from;
      next[toTarget]   = to;
      return next;
    });
    setContextMenu(null);
  };

  const totalApplied = Object.values(pendingApplied).reduce((n, s) => n + s.size, 0);
  const hasApplied   = (tgt: string) => (pendingApplied[tgt]?.size ?? 0) > 0;

  const appliedLabel = (tgt: string): string => {
    const ids = Array.from(pendingApplied[tgt] ?? []);
    if (!ids.length) return "No flags applied";
    const names = ids
      .slice(0, 2)
      .map((id) => flagDefinitions.find((f) => f.id === id)?.name ?? id)
      .join(", ");
    return ids.length > 2 ? `${names} +${ids.length - 2} more` : names;
  };

  const noFlagsForLevel = flagDefinitions.filter((fl) => levelIs(fl, eligibleLevel)).length === 0;

  // ── Style helpers (kept inline to avoid className coupling) ──────
  const targetRow = (id: string): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    gap: 3,
    padding: "9px 16px",
    cursor: "pointer",
    borderLeft: `2px solid ${selectedTarget === id ? C.accent : "transparent"}`,
    background: selectedTarget === id ? "rgba(56,189,248,0.05)" : "transparent",
    transition: "background 0.1s",
    userSelect: "none",
  });

  const targetName = (id: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 13,
    fontWeight: 500,
    color: selectedTarget === id ? C.textPrimary : C.textSub,
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(4,10,18,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        width: "min(940px, 95vw)",
        maxHeight: "88vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 28px 72px rgba(0,0,0,0.72)",
      }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{
          background: C.panel,
          borderBottom: `1px solid ${C.borderSub}`,
          padding: "14px 20px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
              textTransform: "uppercase", color: C.labelCaps, marginBottom: 3,
            }}>
              Flag Manager
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 19, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>
                Case
              </span>
              <span style={{ fontSize: 14, color: C.textSub, fontWeight: 400 }} data-phi="accession">
                · {caseData.accession}
              </span>
              {totalApplied > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: C.accent,
                  background: C.accentDim,
                  border: "1px solid rgba(56,189,248,0.18)",
                  padding: "2px 9px", borderRadius: 20,
                }}>
                  {totalApplied} active
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none", border: "none",
              color: C.textMuted, cursor: "pointer",
              fontSize: 22, lineHeight: 1, padding: "2px 6px",
            }}
          >
            ×
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* Left: target list */}
          <div style={{
            width: 250, flexShrink: 0,
            borderRight: `1px solid ${C.borderSub}`,
            background: C.panel,
            overflowY: "auto",
            padding: "14px 0 12px",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
              textTransform: "uppercase", color: C.labelCaps,
              padding: "0 16px 10px",
            }}>
              Apply to
            </div>

            {/* Case — drop target */}
            <div
              style={{
                ...targetRow("case"),
                border: dragFlag && dragOverTarget === "case" && dragFlag.fromTarget !== "case"
                  ? `1px dashed ${C.accent}` : "1px solid transparent",
                background: dragFlag && dragOverTarget === "case" && dragFlag.fromTarget !== "case"
                  ? C.accentDim : selectedTarget === "case" ? "rgba(56,189,248,0.05)" : "transparent",
                borderRadius: 6, transition: "all 0.12s",
              }}
              onClick={() => setSelectedTarget("case")}
              onDragOver={e => { e.preventDefault(); setDragOverTarget("case"); }}
              onDragLeave={() => setDragOverTarget(null)}
              onDrop={e => {
                e.preventDefault();
                if (dragFlag && dragFlag.fromTarget !== "case") moveFlag(dragFlag.flagId, dragFlag.fromTarget, "case");
                setDragOverTarget(null); setDragFlag(null);
              }}
            >
              <div style={targetName("case")}>
                <IconDoc />
                Case {caseData.accession}
                {hasApplied("case") && (
                  <span style={{
                    marginLeft: "auto", background: C.accent, color: "#03111e",
                    fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 9, padding: "0 5px",
                  }}>
                    {pendingApplied["case"]!.size}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: hasApplied("case") ? C.amber : C.textMuted, paddingLeft: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {appliedLabel("case")}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: C.borderSub, margin: "8px 16px" }} />

            {/* All specimens */}
            <div style={targetRow("all")} onClick={() => setSelectedTarget("all")}>
              <div style={targetName("all")}>
                <IconDot />
                All Specimens
              </div>
            </div>

            {/* Individual specimens — drop targets */}
            {specimens.map((sp) => (
              <div
                key={sp.id}
                style={{
                  ...targetRow(sp.id),
                  border: dragFlag && dragOverTarget === sp.id && dragFlag.fromTarget !== sp.id
                    ? `1px dashed ${C.accent}` : "1px solid transparent",
                  background: dragFlag && dragOverTarget === sp.id && dragFlag.fromTarget !== sp.id
                    ? C.accentDim : selectedTarget === sp.id ? "rgba(56,189,248,0.05)" : "transparent",
                  borderRadius: 6, transition: "all 0.12s",
                }}
                onClick={() => setSelectedTarget(sp.id)}
                onDragOver={e => { e.preventDefault(); setDragOverTarget(sp.id); }}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={e => {
                  e.preventDefault();
                  if (dragFlag && dragFlag.fromTarget !== sp.id) moveFlag(dragFlag.flagId, dragFlag.fromTarget, sp.id);
                  setDragOverTarget(null); setDragFlag(null);
                }}
              >
                <div style={targetName(sp.id)}>
                  <IconDot />
                  {sp.label}
                  {hasApplied(sp.id) && (
                    <span style={{
                      marginLeft: "auto", background: C.accent, color: "#03111e",
                      fontSize: 10, fontWeight: 700, minWidth: 18, height: 18,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 9, padding: "0 5px",
                    }}>
                      {pendingApplied[sp.id]!.size}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: hasApplied(sp.id) ? C.amber : C.textMuted, paddingLeft: 20, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {appliedLabel(sp.id)}
                </div>
              </div>
            ))}
          </div>

          {/* Right: flag list */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            overflow: "hidden", minWidth: 0, background: C.surface,
          }}>

            {/* Search */}
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${C.borderSub}`, flexShrink: 0, position: "relative" }}>
              <span style={{
                position: "absolute", left: 26, top: "50%", transform: "translateY(-50%)",
                pointerEvents: "none", display: "flex",
              }}>
                <IconSearch color={C.textMuted} />
              </span>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flags by name, code, or description..."
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: "8px 12px 8px 32px",
                  fontSize: 13, color: C.textPrimary,
                  outline: "none",
                }}
              />
            </div>

            {/* Column header row */}
            <div style={{
              display: "grid", gridTemplateColumns: "76px 1fr 96px",
              gap: 12, padding: "7px 14px",
              borderBottom: `1px solid ${C.borderSub}`, flexShrink: 0,
            }}>
              {["Code", "Flag", "Action"].map((h, i) => (
                <span key={h} style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                  textTransform: "uppercase", color: C.labelCaps,
                  textAlign: i === 2 ? "right" : "left",
                }}>
                  {h === "Flag"
                    ? <>{h} <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: C.textMuted }}>· {isCase ? "case-level" : "specimen-level"}</span></>
                    : h}
                </span>
              ))}
            </div>

            {/* Flags */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              {noFlagsForLevel ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8, color: C.textMuted, padding: "48px 24px", textAlign: "center" }}>
                  <IconSearch color={C.textMuted} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.textSub }}>No {eligibleLevel}-level flags defined</div>
                  <div style={{ fontSize: 12 }}>Go to Configuration → System → Flags to add some</div>
                </div>
              ) : filteredFlags.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 8, color: C.textMuted, padding: "48px 24px", textAlign: "center" }}>
                  <IconSearch color={C.textMuted} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.textSub }}>No flags match "{search}"</div>
                  <div style={{ fontSize: 12 }}>Try a different search term</div>
                </div>
              ) : filteredFlags.map((flag) => {
                const applied = isFlagApplied(flag.id);
                const sev     = (flag as any).severity as number | undefined;
                return (
                  <div
                    key={flag.id}
                    draggable={applied}
                    onDragStart={e => {
                      if (!applied) { e.preventDefault(); return; }
                      setDragFlag({ flagId: flag.id, fromTarget: selectedTarget });
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => { setDragFlag(null); setDragOverTarget(null); }}
                    onContextMenu={e => {
                      e.preventDefault();
                      if (applied) setContextMenu({ flagId: flag.id, fromTarget: selectedTarget, x: e.clientX, y: e.clientY });
                    }}
                    style={{
                      display: "grid", gridTemplateColumns: "76px 1fr 96px",
                      gap: 12, padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${applied ? "rgba(56,189,248,0.28)" : C.borderSub}`,
                      background: applied ? C.accentFocus : C.card,
                      alignItems: "center",
                      transition: "background 0.1s, border-color 0.1s",
                      cursor: applied ? "grab" : "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      if (!applied) el.style.background = C.cardHover;
                      el.style.borderColor = applied ? "rgba(56,189,248,0.45)" : C.border;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = applied ? C.accentFocus : C.card;
                      el.style.borderColor = applied ? "rgba(56,189,248,0.28)" : C.borderSub;
                    }}
                  >
                    {/* Code chip */}
                    <div>
                      <span style={{
                        display: "inline-block",
                        background: applied ? C.accentDim : "rgba(255,255,255,0.05)",
                        color: applied ? C.accent : C.textSub,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
                        padding: "3px 7px", borderRadius: 4, fontFamily: "monospace",
                      }}>
                        {getCode(flag)}
                      </span>
                    </div>

                    {/* Name + desc */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {sev && (
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: severityColor(sev), flexShrink: 0,
                          }} title={`Severity ${sev}`} />
                        )}
                        <span style={{
                          fontSize: 13, fontWeight: 500, color: C.textPrimary,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {flag.name}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11, color: C.textMuted,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {flag.description}
                      </span>
                    </div>

                    {/* Action */}
                    <div style={{ textAlign: "right" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFlag(flag.id); }}
                        style={{
                          background: "none",
                          border: `1px solid ${applied ? "rgba(239,68,68,0.3)" : "rgba(56,189,248,0.4)"}`,
                          borderRadius: 20,
                          color: applied ? "#f87171" : C.accent,
                          fontSize: 12, fontWeight: 600,
                          padding: "4px 12px", cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {applied ? "Remove" : "+ Apply"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Context Menu ───────────────────────────────────── */}
        {contextMenu && (
          <div onClick={() => setContextMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "fixed",
                left: Math.min(contextMenu.x, window.innerWidth - 230),
                top:  Math.min(contextMenu.y, window.innerHeight - 200),
                width: 220,
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                overflow: "hidden",
                zIndex: 100000,
              }}
            >
              <div style={{ padding: "8px 12px 6px", fontSize: 10, fontWeight: 700, color: C.labelCaps, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Move to
              </div>
              {/* Case level */}
              {contextMenu.fromTarget !== "case" && (
                <button
                  onClick={() => moveFlag(contextMenu.flagId, contextMenu.fromTarget, "case")}
                  style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", color: C.textPrimary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.accentDim)}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}
                >
                  <IconDoc /> Case Level
                </button>
              )}
              {/* Specimens */}
              {specimens
                .filter(sp => sp.id !== contextMenu.fromTarget)
                .map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => moveFlag(contextMenu.flagId, contextMenu.fromTarget, sp.id)}
                    style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: "none", border: "none", color: C.textPrimary, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.accentDim)}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <IconDot />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: C.accent, fontWeight: 600 }}>{sp.label}:</span> {(sp as any).description ?? sp.label}
                    </span>
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────── */}
        <div style={{
          padding: "12px 20px",
          borderTop: `1px solid ${C.borderSub}`,
          background: C.panel,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: C.textMuted }}>
            {totalApplied === 0
              ? "No changes"
              : `${totalApplied} flag${totalApplied !== 1 ? "s" : ""} applied`}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                background: "none", border: `1px solid ${C.border}`,
                borderRadius: 7, color: C.textSub,
                fontSize: 13, fontWeight: 500, padding: "7px 16px", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              style={{
                background: C.accent, border: "none",
                borderRadius: 7, color: "#03111e",
                fontSize: 13, fontWeight: 700, padding: "7px 20px", cursor: "pointer",
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

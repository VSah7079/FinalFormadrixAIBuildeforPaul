import { useState, useMemo } from "react";
import { applyFlags } from "../../api/caseFlagsApi";
import { FlagDefinition } from "../../types/FlagDefinition";
import { CaseWithFlags, SpecimenWithFlags } from "../../types/flagsRuntime";

interface FlagManagerModalProps {
  caseData: CaseWithFlags;
  flagDefinitions: FlagDefinition[];
  onClose: () => void;
}

export default function FlagManagerModal({
  caseData,
  flagDefinitions,
  onClose
}: FlagManagerModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  const specimens = caseData.specimens;

  // ────────────────────────────────────────────────────────────────
  // 1. TARGET SELECTION LOGIC (Case + All Specimens + Individual)
  // ────────────────────────────────────────────────────────────────

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const selectAllSpecimens = () => {
    const allIds = specimens.map((sp: SpecimenWithFlags) => sp.id);
    setSelectedTargets(allIds);
  };

  const isCaseSelected = selectedTargets.includes("case");
  const isAllSelected =
    selectedTargets.length === specimens.length &&
    specimens.every((sp: SpecimenWithFlags) => selectedTargets.includes(sp.id));

  // ────────────────────────────────────────────────────────────────
  // 2. FILTER FLAGS BASED ON SELECTED TARGETS
  // ────────────────────────────────────────────────────────────────

  const filteredFlags = useMemo(() => {
    if (selectedTargets.length === 0) return [];

    // Case only → show case-level flags
    if (isCaseSelected && selectedTargets.length === 1) {
      return flagDefinitions.filter(f => f.level === "case");
    }

    // Case + specimens → invalid combination
    if (isCaseSelected && selectedTargets.length > 1) {
      return [];
    }

    // One or more specimens → specimen-level flags
    return flagDefinitions.filter(f => f.level === "specimen");
  }, [selectedTargets, flagDefinitions, isCaseSelected]);

  // ────────────────────────────────────────────────────────────────
  // 3. APPLY FLAG TO ALL SELECTED TARGETS
  // ────────────────────────────────────────────────────────────────

  const handleApplyFlag = async (flagDefinitionId: string) => {
    for (const target of selectedTargets) {
      if (target === "case") {
        await applyFlags({ caseId: caseData.id, flagDefinitionId });
      } else {
        await applyFlags({
          caseId: caseData.id,
          flagDefinitionId,
          specimenId: target
        });
      }
    }
  };

  // ────────────────────────────────────────────────────────────────
  // 4. RENDER
  // ────────────────────────────────────────────────────────────────

  return (
    <div className="modal">
      <div className="modal-header">
        <h2>Flag Manager — Case <span data-phi="accession">{caseData.accession}</span></h2>
      </div>

      <div className="modal-body">

        {/* ─── LEFT PANEL: PILL TARGET SELECTOR ───────────────────── */}
        <div className="left-panel">
          <h3>Select targets:</h3>

          <div className="pill-row">

            {/* Case pill */}
            <button
              className={`pill ${isCaseSelected ? "selected" : ""}`}
              onClick={() => toggleTarget("case")}
            >
              Case
            </button>

            {/* All Specimens pill */}
            <button
              className={`pill ${isAllSelected ? "selected" : ""}`}
              onClick={selectAllSpecimens}
            >
              All Specimens
            </button>

            {/* Individual specimen pills */}
            {specimens.map((sp: SpecimenWithFlags) => (
              <button
                key={sp.id}
                className={`pill ${
                  selectedTargets.includes(sp.id) ? "selected" : ""
                }`}
                onClick={() => toggleTarget(sp.id)}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── RIGHT PANEL: FLAG LIST ─────────────────────────────── */}
        <div className="right-panel">
          <h3>
            {selectedTargets.length === 0 && "Select a target"}
            {isCaseSelected && selectedTargets.length === 1 && "Applying to: Case"}
            {!isCaseSelected && selectedTargets.length === 1 &&
              `Applying to: ${specimens.find((sp: SpecimenWithFlags) => sp.id === selectedTargets[0])?.label}`}
            {!isCaseSelected && selectedTargets.length > 1 &&
              `Applying to: ${selectedTargets.length} specimens`}
          </h3>

          {isCaseSelected && selectedTargets.length > 1 && (
            <div className="warning">
              Cannot apply flags to Case + Specimens at the same time.
            </div>
          )}

          <div className="flag-list">
            {filteredFlags.length === 0 && (
              <div className="empty-state">No flags available for this selection.</div>
            )}

            {filteredFlags.map(flag => (
              <div
                key={flag.id}
                className="flag-item"
                onClick={() => handleApplyFlag(flag.id)}
              >
                <span className="flag-code">{flag.code}</span>
                <span className="flag-name">{flag.name}</span>
                <span className="flag-desc">{flag.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <div className="modal-footer">
        <button className="save-btn" onClick={onClose}>
          Save
        </button>
      </div>
    </div>
  );
}

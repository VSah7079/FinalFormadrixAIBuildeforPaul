/**
 * FlagRow.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A single quality-flag row for the Quality Flags panel on the
 * Contribution Dashboard.
 *
 * Extracted from ContributionDashboardPage.tsx (Pass 8 props work).
 * Import path: src/components/FlagRow.tsx
 *
 * Usage:
 *   <FlagRow
 *     id="PSA-2024-1182"
 *     label="PSA-2024-1182"
 *     value="Missing margin comment"
 *     severity="low"
 *     onClick={() => navigate(`/cases/PSA-2024-1182`)}
 *   />
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from "react";
import '../../formedrix.css';
import { ForMedrixTheme } from "@theme/ForMedrixTheme";
import type { ContributionFlag, Severity } from "../../types/ContributionDashboard";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
export interface FlagRowProps extends ContributionFlag {}

// ─────────────────────────────────────────────────────────────────────────────
// Severity token maps
// Kept local to this component — the dashboard page no longer needs them.
// ─────────────────────────────────────────────────────────────────────────────
const SEVERITY_BG: Record<Severity, string> = {
  high:   "rgba(249,115,22,0.12)",   // semantic.warning tint
  medium: "rgba(56,189,248,0.12)",   // semantic.info tint
  low:    "rgba(34,197,94,0.12)",    // semantic.success tint
};

const SEVERITY_COLOR: Record<Severity, string> = {
  high:   ForMedrixTheme.colors.semantic.warning,
  medium: ForMedrixTheme.colors.semantic.info,
  low:    ForMedrixTheme.colors.semantic.success,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const FlagRow: React.FC<FlagRowProps> = ({
  label,
  value,
  severity = "low",
  onClick,
}) => {
  const bg    = SEVERITY_BG[severity];
  const color = SEVERITY_COLOR[severity];

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: "10px",
        background: ForMedrixTheme.colors.surfaceSubtle,
        border: `1px solid ${ForMedrixTheme.colors.border.subtle}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* Left: case ID + issue description */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <span style={{ fontWeight: 600, color: ForMedrixTheme.colors.text.primary }}>
          {label}
        </span>
        <span style={{ color: ForMedrixTheme.colors.text.muted }}>
          {value}
        </span>
      </div>

      {/* Right: severity badge */}
      <span
        style={{
          padding: "4px 10px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          background: bg,
          color,
          whiteSpace: "nowrap",
        }}
      >
        {severity}
      </span>
    </div>
  );
};

export default FlagRow;

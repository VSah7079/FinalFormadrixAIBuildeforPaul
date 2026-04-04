// src/types/case/CaseStatus.ts
// ─────────────────────────────────────────────────────────────
// Clinical-grade case lifecycle states.
// Aligned with:
//   • FHIR DiagnosticReport.status
//   • LIS case lifecycle
//   • PathScribe synoptic workflow
//   • Shared case + amendment workflows
// ─────────────────────────────────────────────────────────────

export type CaseStatus =
  /** Case created but not yet started */
  | "draft"

  /** Case is actively being worked on */
  | "in-progress"

  /** Awaiting review, QA, or sign-out */
  | "pending-review"

  /** Fully finalized (no changes pending) */
  | "finalized"

  /** Case has been amended after finalization */
  | "amended"

  /** Case is closed (no further changes allowed) */
  | "closed"

  /** Case returned to pathologist (shared workflow) */
  | "returned"

  /** Case accepted by another pathologist (shared workflow) */
  | "accepted"

  /** Case is awaiting addendum */
  | "addendum-pending"

  /** Case is in AI-assisted drafting mode */
  | "ai-assisted";
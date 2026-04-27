// src/services/cases/ICaseService.ts
// -------------------------------------------------------------
// Contract for all Case service implementations.
// The UI depends ONLY on this interface.
// -------------------------------------------------------------

import { Case } from "../../types/case/Case";

// Re-export types for convenience
export type { Case as PathologyCase } from "../../types/case/Case";
export type { CaseStatus } from "../../types/case/CaseStatus";

// Legacy type exports for backwards compatibility
export type CasePriority = "Routine" | "STAT" | "ASAP" | "Critical";
export type AIStatus = "pending" | "running" | "completed" | "failed";
export type CaseFilterParams = Record<string, any>;
export type CaseGender = "M" | "F" | "Other";
export type FlagColor = "red" | "yellow" | "green" | "blue";

export interface Flag {
  id: string;
  caseId: string;
  color: FlagColor;
  description?: string;
}

export interface ICaseService {
  /**
   * Fetch a single case by ID.
   * May return undefined if the case does not exist.
   */
  getCase(caseId: string): Promise<Case | undefined>;

  /**
   * List all cases visible to a given user.
   * Pediatric access is evaluated by the worklist using client authorization lists.
   */
  listCasesForUser(userId: string): Promise<Case[]>;

  /**
   * Update a case with partial fields.
   */
  updateCase(caseId: string, updates: Partial<Case>): Promise<void>;
}

// src/services/cases/ICaseService.ts
// -------------------------------------------------------------
// Contract for all Case service implementations.
// The UI depends ONLY on this interface.
// -------------------------------------------------------------

import { Case } from "../../types/case/Case";

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

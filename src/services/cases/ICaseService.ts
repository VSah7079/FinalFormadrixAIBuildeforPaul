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
   * This matches real-world LIS/FHIR behavior.
   */
  getCase(caseId: string): Promise<Case | undefined>;

  /**
   * List all cases visible to a given user.
   * Used by WorklistPage and any dashboard views.
   */
  listCasesForUser(userId: string): Promise<Case[]>;

  /**
   * Update a case with partial fields.
   * Firestore implementation will persist.
   * Mock implementation will update in-memory.
   */
  updateCase(caseId: string, updates: Partial<Case>): Promise<void>;
}
// firestoreCaseService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Firestore implementation stub — Phase 2.
//
// TODO: Implement using Firestore collection 'cases'.
// Cases are written by the LIS sync Cloud Function, not by the client directly.
// This service is read-only from the client perspective.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { PathologyCase, CaseFilterParams, ICaseService } from './ICaseService';

export const firestoreCaseService: ICaseService = {
  async getAll(_filters?: CaseFilterParams): Promise<ServiceResult<PathologyCase[]>> {
    throw new Error('firestoreCaseService.getAll — not yet implemented');
  },

  async getById(_id: ID): Promise<ServiceResult<PathologyCase>> {
    throw new Error('firestoreCaseService.getById — not yet implemented');
  },
};

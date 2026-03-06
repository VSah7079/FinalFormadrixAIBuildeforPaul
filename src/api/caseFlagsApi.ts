// src/api/caseFlagsApi.ts
// In-memory mock for case + specimen flag operations.
// Replace with real API calls when the backend is ready.

import { CaseWithFlags, FlagInstance } from "../../types/flagsRuntime";

// ─── Seed data ────────────────────────────────────────────────────────────────

let cases: CaseWithFlags[] = [
  {
    id: "S25-12345",
    accession: "S25-12345",
    flags: [
      // Rush case pre-applied at case level (came from LIS)
      { id: "inst-case-1", flagDefinitionId: "rush", appliedAt: new Date().toISOString(), appliedBy: "LIS", source: "lis", deletedAt: null, deletedBy: null },
    ],
    specimens: [
      {
        id: "sp-1",
        label: "Specimen 1 — Left Breast Mastectomy",
        flags: [
          // Frozen section applied to Sp1 by product
          { id: "inst-sp1-1", flagDefinitionId: "frozen-section", appliedAt: new Date().toISOString(), appliedBy: "Dr. Johnson", source: "product", deletedAt: null, deletedBy: null },
        ],
      },
      { id: "sp-2", label: "Specimen 2 — Sentinel Lymph Nodes",   flags: [] },
      { id: "sp-3", label: "Specimen 3 — Additional Margins",     flags: [] },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInstance(flagDefinitionId: string): FlagInstance {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    flagDefinitionId,
    appliedAt: new Date().toISOString(),
    appliedBy: "current-user",
    source: "product",
    deletedAt: null,
    deletedBy: null,
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function getCaseWithFlags(caseId: string): Promise<CaseWithFlags> {
  let c = cases.find(c => c.id === caseId || c.accession === caseId);
  if (!c) {
    // Clone the seed template with the real caseId so specimens are always present
    const template = cases[0];
    c = {
      ...JSON.parse(JSON.stringify(template)),
      id: caseId,
      accession: caseId,
    };
    cases.push(c);
  }
  // Return a deep clone so mutations don't bleed through
  return Promise.resolve(JSON.parse(JSON.stringify(c)));
}

export interface ApplyFlagPayload {
  caseId: string;
  flagDefinitionId: string;
  /** If omitted, applies the flag at the case level */
  specimenId?: string;
}

export async function applyFlags(payload: ApplyFlagPayload): Promise<void> {
  cases = cases.map(c => {
    if (c.id !== payload.caseId && c.accession !== payload.caseId) return c;

    if (payload.specimenId) {
      // Specimen-level flag
      return {
        ...c,
        specimens: c.specimens.map(sp => {
          if (sp.id !== payload.specimenId) return sp;
          // Don't duplicate active flags
          const alreadyActive = sp.flags.some(
            f => f.flagDefinitionId === payload.flagDefinitionId && !f.deletedAt
          );
          if (alreadyActive) return sp;
          return { ...sp, flags: [...sp.flags, makeInstance(payload.flagDefinitionId)] };
        }),
      };
    } else {
      // Case-level flag
      const alreadyActive = c.flags.some(
        f => f.flagDefinitionId === payload.flagDefinitionId && !f.deletedAt
      );
      if (alreadyActive) return c;
      return { ...c, flags: [...c.flags, makeInstance(payload.flagDefinitionId)] };
    }
  });
  return Promise.resolve();
}

export interface DeleteFlagPayload {
  caseId: string;
  flagInstanceId: string;
  /** If omitted, soft-deletes from the case flags */
  specimenId?: string;
}

export async function deleteFlags(payload: DeleteFlagPayload): Promise<void> {
  const now = new Date().toISOString();
  cases = cases.map(c => {
    if (c.id !== payload.caseId && c.accession !== payload.caseId) return c;

    if (payload.specimenId) {
      return {
        ...c,
        specimens: c.specimens.map(sp => {
          if (sp.id !== payload.specimenId) return sp;
          return {
            ...sp,
            flags: sp.flags.map(f =>
              f.id === payload.flagInstanceId
                ? { ...f, deletedAt: now, deletedBy: "current-user" }
                : f
            ),
          };
        }),
      };
    } else {
      return {
        ...c,
        flags: c.flags.map(f =>
          f.id === payload.flagInstanceId
            ? { ...f, deletedAt: now, deletedBy: "current-user" }
            : f
        ),
      };
    }
  });
  return Promise.resolve();
}

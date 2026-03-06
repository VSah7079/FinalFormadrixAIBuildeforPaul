// src/api/flagsApi.ts
// In-memory mock flag definitions. Replace with real API when backend is ready.
// src/api/flagsApi.ts
// Simple in-memory mock API for flags used by ***REMOVED*** UI and worklist.
// Supports: getFlags, createFlag, updateFlag, deleteFlag
// Returns objects matching src/types/FlagDefinition.ts and provides helpers
// to produce case/specimen flag instances with severity and specimen metadata.

import { v4 as uuidv4 } from "uuid";
import type { FlagDefinition } from "../types/FlagDefinition";

/**
 * Internal in-memory store for flag definitions (***REMOVED***-managed).
 * Fields: id, code, name, description?, level, lisCode, severity, active,
 *         autoCreated, createdAt, updatedAt
 */
let flagsStore: FlagDefinition[] = [
  {
    id: uuidv4(),
    code: "FS",
    name: "Frozen Section",
    description: "Requires frozen section processing",
    level: "case",
    lisCode: "FS",
    severity: 4,
    active: true,
    autoCreated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    code: "QA",
    name: "Quality Alert",
    description: "QA review required",
    level: "specimen",
    lisCode: "QA",
    severity: 3,
    active: true,
    autoCreated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Utility: clone to simulate network transfer
 */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * Admin API: list all flag definitions
 */
export const getFlags = async (): Promise<FlagDefinition[]> => {
  // Simulate latency
  await new Promise((r) => setTimeout(r, 80));
  return clone(flagsStore);
};

/**
 * Admin API: create a new flag definition
 * Accepts partials but enforces canonical fields.
 */
export const createFlag = async (payload: {
  code?: string;
  name: string;
  description?: string;
  level: "case" | "specimen";
  lisCode?: string;
  severity?: 1 | 2 | 3 | 4 | 5;
  active?: boolean;
}): Promise<FlagDefinition> => {
  const now = new Date().toISOString();
  const newFlag: FlagDefinition = {
    id: uuidv4(),
    code: payload.code ?? payload.name.slice(0, 3).toUpperCase(),
    name: payload.name,
    description: payload.description,
    level: payload.level,
    lisCode: payload.lisCode ?? payload.code ?? payload.name.slice(0, 3).toUpperCase(),
    severity: payload.severity ?? 1,
    active: payload.active ?? true,
    autoCreated: false,
    createdAt: now,
    updatedAt: now,
  };

  flagsStore = [newFlag, ...flagsStore];
  await new Promise((r) => setTimeout(r, 80));
  return clone(newFlag);
};

/**
 * Admin API: update an existing flag definition
 */
export const updateFlag = async (id: string, updates: Partial<FlagDefinition>): Promise<FlagDefinition> => {
  const idx = flagsStore.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error("Flag not found");
  const now = new Date().toISOString();
  const updated: FlagDefinition = {
    ...flagsStore[idx],
    ...updates,
    id: flagsStore[idx].id, // never change id
    updatedAt: now,
  };
  flagsStore[idx] = updated;
  await new Promise((r) => setTimeout(r, 80));
  return clone(updated);
};

/**
 * Admin API: delete a flag definition
 */
export const deleteFlag = async (id: string): Promise<void> => {
  flagsStore = flagsStore.filter((f) => f.id !== id);
  await new Promise((r) => setTimeout(r, 60));
};

/**
 * Helper: produce a flag *instance* for a case or specimen.
 * - For case-level flags: returns { id, name, severity, level: "case", ... }
 * - For specimen-level flags: include specimenId and specimenLabel
 *
 * This is useful for case endpoints that need to return caseFlags/specimenFlags.
 */
export const makeFlagInstance = (flagDef: FlagDefinition, opts?: { specimenId?: string; specimenLabel?: string }) => {
  const base = {
    id: uuidv4(),
    definitionId: flagDef.id,
    name: flagDef.name,
    code: flagDef.code,
    lisCode: flagDef.lisCode,
    level: flagDef.level,
    severity: flagDef.severity,
    active: flagDef.active,
    createdAt: new Date().toISOString(),
  };

  if (flagDef.level === "specimen") {
    return {
      ...base,
      specimenId: opts?.specimenId ?? null,
      specimenLabel: opts?.specimenLabel ?? null,
    };
  }

  return base;
};

/**
 * Helper: attach flags to a case object for worklist mocks.
 * Example usage in your case mock endpoints:
 *
 * const caseFlags = [ makeFlagInstance(flagsStore[0]) ];
 * const specimenFlags = [ makeFlagInstance(flagsStore[1], { specimenId: 'S1', specimenLabel: 'Specimen A' }) ];
 */
export const attachFlagsToCase = (caseObj: any, opts?: { caseFlagIds?: string[]; specimenFlagIds?: { id: string; specimenId?: string; specimenLabel?: string }[] }) => {
  const caseFlags = (opts?.caseFlagIds ?? [])
    .map((fid) => flagsStore.find((f) => f.id === fid))
    .filter(Boolean)
    .map((f) => makeFlagInstance(f as FlagDefinition));

  const specimenFlags = (opts?.specimenFlagIds ?? [])
    .map((entry) => {
      const f = flagsStore.find((ff) => ff.id === entry.id);
      if (!f) return null;
      return makeFlagInstance(f, { specimenId: entry.specimenId, specimenLabel: entry.specimenLabel });
    })
    .filter(Boolean);

  return {
    ...caseObj,
    caseFlags,
    specimenFlags,
  };
};

/**
 * Utility: reset store (useful for tests)
 */
export const _resetFlagsStore = (seed?: FlagDefinition[]) => {
  flagsStore = seed ? clone(seed) : [];
};
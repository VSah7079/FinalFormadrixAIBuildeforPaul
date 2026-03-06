import { ServiceResult, ID } from '../types';

// ─── Core Case type ───────────────────────────────────────────────────────────
// Mirrors PathologyCase from Worklist/types — single source of truth lives here.
// Worklist/types.ts should eventually re-export from here.

export type CaseStatus   = 'Grossed' | 'Awaiting Micro' | 'Finalizing' | 'Completed';
export type CasePriority = 'Routine' | 'STAT';
export type AIStatus     = 'Draft Ready' | 'Syncing Micro' | 'Finalized' | 'Pending';

export interface PathologyCase {
  id:         string;       // Accession number e.g. S26-4401
  patient:    string;       // PHI: "Last, First" — replaced with MRN in production
  protocol:   string;       // CAP protocol name
  specimen:   string;       // Specimen description
  status:     CaseStatus;
  aiStatus:   AIStatus;
  confidence: number;       // AI confidence % (0 if Pending)
  time:       string;       // Relative display string e.g. "2h ago"
  priority:   CasePriority;
}

// ─── Filter params (matches SearchPage FilterState) ───────────────────────────

export interface CaseFilterParams {
  patientName?:    string;
  hospitalId?:     string;
  accessionNo?:    string;
  diagnosisList?:  string[];
  specimenList?:   string[];
  snomedCodes?:    string[];   // display strings for mock matching
  icdCodes?:       string[];   // display strings for mock matching
  synopticIds?:    string[];
  flagsList?:      string[];
  pathologistIds?: string[];
  attendingIds?:   string[];
  statusList?:     CaseStatus[];
  priorityList?:   CasePriority[];
  dateFrom?:       string;     // YYYY-MM-DD
  dateTo?:         string;     // YYYY-MM-DD
}

// ─── Service interface ────────────────────────────────────────────────────────

export interface ICaseService {
  getAll(filters?: CaseFilterParams): Promise<ServiceResult<PathologyCase[]>>;
  getById(id: ID):                    Promise<ServiceResult<PathologyCase>>;
}

import { ServiceResult, ID } from '../types';

// ─── Core Case type ───────────────────────────────────────────────────────────
// Mirrors PathologyCase from Worklist/types — single source of truth lives here.
// Worklist/types.ts should eventually re-export from here.

export type CaseStatus   = 'Grossed' | 'Awaiting Micro' | 'Finalizing' | 'Completed';
export type CasePriority = 'Routine' | 'STAT';
export type AIStatus     = 'Draft Ready' | 'Syncing Micro' | 'Finalized' | 'Pending';

export type FlagColor = 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple';

export interface Flag {
  id:       string;
  name:     string;
  color:    FlagColor;
  severity: 1 | 2 | 3 | 4 | 5;
}

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
  // ── Extended fields (used by WorklistPage / WorklistTable) ─────────────────
  isCritical?:           boolean;
  isHighPriority?:       boolean;
  accessionDate?:        string;   // e.g. "02/24/2026"
  submittingPhysician?:  string;
  caseFlags?:            Flag[];
  specimenFlags?:        Flag[];
}

// ─── Filter params (matches SearchPage FilterState) ───────────────────────────

export type CaseGender = 'Male' | 'Female' | 'Other' | 'Unknown';

export interface CaseFilterParams {
  patientName?:      string;
  hospitalId?:       string;
  accessionNo?:      string;
  diagnosisList?:    string[];
  specimenList?:     string[];
  snomedCodes?:      string[];   // display strings for mock matching
  icdCodes?:         string[];   // display strings for mock matching
  synopticIds?:      string[];
  flagsList?:        string[];
  pathologistIds?:   string[];
  attendingIds?:     string[];
  submittingNames?:  string[];
  statusList?:       CaseStatus[];
  priorityList?:     CasePriority[];
  dateFrom?:         string;     // YYYY-MM-DD
  dateTo?:           string;     // YYYY-MM-DD
  // ── Demographic filters ────────────────────────────────────────────────────
  genderList?:       CaseGender[];
  dobFrom?:          string;     // YYYY-MM-DD
  dobTo?:            string;     // YYYY-MM-DD
  ageMin?:           number;
  ageMax?:           number;
}

// ─── Service interface ────────────────────────────────────────────────────────

export interface ICaseService {
  getAll(filters?: CaseFilterParams): Promise<ServiceResult<PathologyCase[]>>;
  getById(id: ID):                    Promise<ServiceResult<PathologyCase>>;
}

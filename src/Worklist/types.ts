export type CaseStatus = 'Grossed' | 'Awaiting Micro' | 'Finalizing' | 'Completed';
export type Priority = 'STAT' | 'Routine';
export type FlagColor = 'red' | 'yellow' | 'blue' | 'green' | 'orange' | 'purple';

export interface Flag {
  id: string;
  name: string;
  color: FlagColor;

  // NEW: severity rating (1–5)
  severity: 1 | 2 | 3 | 4 | 5;
}

export interface FlagDefinition {
  id: string;
  name: string;
  description?: string;
  level: 'case' | 'specimen';
  lisCode: string;

  // NEW: severity rating (1–5)
  severity: 1 | 2 | 3 | 4 | 5;

  active: boolean;
  autoCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PathologyCase {
  id: string;
  patient: string;
  protocol: string;
  specimen: string;
  status: CaseStatus;
  aiStatus: string;
  confidence: number; // AI confidence percentage (0-100)
  time: string;
  priority: Priority;
  isCritical?: boolean;           // NEW — shows red dot indicator
  isHighPriority?: boolean; //Used for sorting
  accessionDate?: string;         // NEW — e.g. "02/24/2026"
  submittingPhysician?: string;   // NEW — e.g. "Dr. Sarah Chen"
  caseFlags?: Flag[];
  specimenFlags?: Flag[];
}

// ─────────────────────────────────────────────────────────────────────────────
// IActionRegistryService.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemAction {
  id: string;
  label: string;
  category: string;
  shortcut: string;         // user-facing display string e.g. "Alt+W"
  internalKey: string;      // stable dispatch token e.g. "F13+PS002" — never changes
  voiceTriggers: string[];
  learnedTriggers: string[];
  requiredRole: string;
  isActive: boolean;
}

export interface PendingMiss {
  id: string;
  transcript: string;
  timestamp: number;
}

export interface LearnedMapping {
  transcript: string;
  actionId: string;
  confirmedAt: number;
  confirmationMethod: 'shortcut' | 'repeat' | 'manual';
  useCount: number;
}

export interface IActionRegistryService {
  getActions(): SystemAction[];
  getActionById(id: string): SystemAction | undefined;
  findActionByTrigger(transcript: string): SystemAction | undefined;
  updateAction(id: string, updates: Partial<SystemAction>): Promise<void>;
  setCurrentContext(context: string): void;
  executeAction(action: SystemAction, transcript?: string): void;

  recordMiss(transcript: string): PendingMiss;
  confirmMiss(missId: string, actionId: string, method: LearnedMapping['confirmationMethod']): LearnedMapping;
  dismissMiss(missId: string): void;
  getPendingMisses(): PendingMiss[];
  getLearnedMappings(): LearnedMapping[];
  removeLearnedMapping(transcript: string): void;

  onActionExecuted(callback: (action: SystemAction) => void): () => void;
  onActionFailed(callback: (transcript: string) => void): () => void;
  onMissRecorded(callback: (miss: PendingMiss, candidates: SystemAction[]) => void): () => void;
}

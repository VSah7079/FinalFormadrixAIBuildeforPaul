import { ServiceResult } from '../types';

export interface AIBehaviorConfig {
  grossEnabled: boolean;
  microscopicEnabled: boolean;
  confidenceThreshold: number;    // 0-100
  autoInsertSuggestions: boolean; // auto-insert when confidence >= threshold
  showConfidenceScores: boolean;  // display scores in editor UI
  macroSuggestions: boolean;      // suggest macros based on diagnosis context
  subspecialtyRouting: boolean;   // use subspecialty to filter AI suggestions
}

export interface IAIBehaviorService {
  get(): Promise<ServiceResult<AIBehaviorConfig>>;
  update(changes: Partial<AIBehaviorConfig>): Promise<ServiceResult<AIBehaviorConfig>>;
  reset(): Promise<ServiceResult<AIBehaviorConfig>>;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const AI_BEHAVIOR_DEFAULTS: AIBehaviorConfig = {
  grossEnabled: true,
  microscopicEnabled: true,
  confidenceThreshold: 75,
  autoInsertSuggestions: false,
  showConfidenceScores: true,
  macroSuggestions: true,
  subspecialtyRouting: true,
};

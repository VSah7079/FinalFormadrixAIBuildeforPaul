import { ServiceResult, VoiceMacro } from '../../types';

export interface AIProcessingOptions {
  context?: string;
  templateId?: string;
}

export interface IAIIntegrationService {
  /**
   * Refines a raw transcript into a professional pathology format.
   * Example: "Rose description" -> "Gross Description"
   */
  refineTranscript(
    text: string, 
    options?: AIProcessingOptions
  ): Promise<ServiceResult<string>>;

  /**
   * Analyzes text to suggest potential new macros or shortcuts.
   */
  suggestMacros(
    text: string
  ): Promise<ServiceResult<Partial<VoiceMacro>[]>>;
}

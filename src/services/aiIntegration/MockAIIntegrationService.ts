import { IAIIntegrationService, AIProcessingOptions } from './IAIIntegrationService';
import { ServiceResult, VoiceMacro } from '../../types';

export class MockAIIntegrationService implements IAIIntegrationService {
  /**
   * Mock implementation of transcript refinement.
   * Simulates AI logic using Regex to provide immediate feedback during dev.
   */
  async refineTranscript(
    text: string, 
    options?: AIProcessingOptions
  ): Promise<ServiceResult<string>> {
    // Simulate the "Thinking" time of a real LLM
    return new Promise((resolve) => {
      setTimeout(() => {
        let refined = text;

        // Mock "Intelligence": Fixes common phonetic/formatting errors
        refined = refined
          .replace(/^rose\b/i, "Gross")
          .replace(/\*/g, 'x')
          .replace(/\bpt(\d+)\b/gi, 'pT$1')
          .replace(/\bpn(\d+)\b/gi, 'pN$1')
          .replace(/and no carcinoma/gi, "adenocarcinoma");

        // Apply context-aware formatting
        if (options?.context === 'gross' && !refined.toLowerCase().startsWith('gross')) {
          refined = `Gross Description: ${refined}`;
        }

        resolve({
          success: true,
          data: refined.trim()
        });
      }, 600); 
    });
  }

  /**
   * Mock implementation of macro suggestions.
   * Matches the new Interface signature: Promise<ServiceResult<Partial<VoiceMacro>[]>>
   */
  async suggestMacros(text: string): Promise<ServiceResult<Partial<VoiceMacro>[]>> {
    // Log text so the compiler doesn't complain about unused variables
    console.log("Mock identifying macro suggestions for:", text);

    return { 
      success: true, 
      data: [
        { id: 'm1', keyword: 'GG', expansion: 'Gleason Grade' },
        { id: 'm2', keyword: 'LVI', expansion: 'Lymphovascular Invasion' },
        { id: 'm3', keyword: 'MS', expansion: 'Margin Status' }
      ] 
    };
  }
}

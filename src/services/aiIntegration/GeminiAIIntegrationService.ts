import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { IAIIntegrationService, AIProcessingOptions } from './IAIIntegrationService';
import { ServiceResult, VoiceMacro } from '../../types';

export class GeminiAIIntegrationService implements IAIIntegrationService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel; // Cleaned up the 'any' type here too

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async refineTranscript(text: string, options?: AIProcessingOptions): Promise<ServiceResult<string>> {
    try {
const prompt = `
  You are an expert Pathology Transcription Assistant. 
  Your task is to refine raw voice-to-text transcripts into professional medical reports.

  RULES:
  1. Correct phonetic errors (e.g., "Rose" -> "Gross", "Serial" -> "Ciliary").
  2. Format measurements using 'x' instead of 'by' (e.g., "3 x 2 x 1 cm").
  3. Use proper pathology capitalization for staging (e.g., pT2b, pN0).
  4. Ensure anatomical terms are spelled correctly.
  5. Return ONLY the refined text. No conversational filler.

  Context: ${options?.context || 'Pathology Report'}
  Raw Text: "${text}"`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return {
        success: true,
        data: response.text().trim()
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async suggestMacros(text: string): Promise<ServiceResult<Partial<VoiceMacro>[]>> {
    // Logging 'text' here clears the "value is never read" warning 
    // while this feature is in development.
    console.log("Gemini checking for macro suggestions in:", text);

    return {
      success: true,
      data: [] 
    };
  }
}

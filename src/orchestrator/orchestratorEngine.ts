// src/orchestrator/orchestratorEngine.ts
// ─────────────────────────────────────────────────────────────
// Orchestrator Engine — Layer 3 of the Orchestrator stack.
//
// Responsibilities:
//   1. Load narrativeTemplateConfig and determine enabled sections
//   2. For each enabled section (in order):
//        a. Build a section-specific prompt from StructuredContext
//        b. Call the AI model with streaming enabled
//        c. Forward tokens to StreamingWriter → PathScribeEditor
//        d. Handle errors, cancellation, and section isolation
//   3. Expose regenerate(sectionId) for individual section refresh
//   4. Expose cancel() to abort in-flight generation
//
// The engine is stateless between runs — each call to run() or
// regenerateSection() creates a fresh execution context.
// ─────────────────────────────────────────────────────────────

import type { Editor } from '@tiptap/react';
import type { StructuredContext } from './contextBuilder';
import { narrativeTemplateConfig } from '../components/Config/NarrativeTemplates/narrativeTemplateConfig';
import { StreamingWriter } from '../components/Editor/integration/streamingWriter';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const AI_MODEL   = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const API_URL    = 'https://api.anthropic.com/v1/messages';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type OrchestratorStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface SectionResult {
  sectionId: string;
  sectionTitle: string;
  status: 'completed' | 'skipped' | 'error' | 'cancelled';
  error?: string;
  tokensGenerated?: number;
}

export interface OrchestratorResult {
  status: OrchestratorStatus;
  sections: SectionResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

export interface OrchestratorCallbacks {
  /** Called when a section begins generating */
  onSectionStart?: (sectionId: string, title: string) => void;
  /** Called when a section finishes */
  onSectionComplete?: (sectionId: string, result: SectionResult) => void;
  /** Called when the entire run completes */
  onComplete?: (result: OrchestratorResult) => void;
  /** Called on any error */
  onError?: (sectionId: string | null, error: string) => void;
  /** Called with status updates */
  onStatusChange?: (status: OrchestratorStatus) => void;
}

// ─────────────────────────────────────────────────────────────
// Prompt builder
// Constructs a section-specific AI prompt using the
// StructuredContext and the section's AI instructions.
// ─────────────────────────────────────────────────────────────

function buildSectionPrompt(
  sectionId: string,
  sectionTitle: string,
  sectionInstruction: string,
  context: StructuredContext
): string {
  // Resolve synoptic answers into a readable list
  const synopticLines = context.synoptic.answers
    .map(a => `  • ${a.fieldLabel}: ${a.displayValue}`)
    .join('\n') || '  (no synoptic data recorded)';

  // Build specimen summary
  const specimenLines = context.specimens
    .map((s, i) =>
      `  Specimen ${i + 1}: ${s.label} | Type: ${s.type} | Site: ${s.site}`
    )
    .join('\n') || '  (no specimens recorded)';

  return [
    `You are generating the "${sectionTitle}" section of a pathology report.`,
    '',
    `Section instruction: ${sectionInstruction}`,
    '',
    '─── CASE CONTEXT ───',
    `Patient:         ${context.patient.fullName}`,
    `DOB:             ${context.patient.dateOfBirth}`,
    `Sex:             ${context.patient.sex}`,
    `Accession:       ${context.accession.fullAccession}`,
    `Priority:        ${context.order.priority}`,
    `Requesting MD:   ${context.order.requestingProvider}`,
    `Clinical Ind:    ${context.order.clinicalIndication}`,
    '',
    '─── SPECIMENS ───',
    specimenLines,
    '',
    '─── GROSS DESCRIPTION ───',
    context.diagnostic.grossDescription,
    '',
    '─── MICROSCOPIC DESCRIPTION ───',
    context.diagnostic.microscopicDescription,
    '',
    '─── ANCILLARY STUDIES ───',
    context.diagnostic.ancillaryStudies,
    '',
    '─── SYNOPTIC DATA ───',
    synopticLines,
    '',
    '─── CODING ───',
    context.coding.icd10.length  ? `ICD-10:  ${context.coding.icd10.join(', ')}`  : '',
    context.coding.snomed.length ? `SNOMED:  ${context.coding.snomed.join(', ')}` : '',
    '',
    '─── RULES ───',
    '• Write only this section. Do not include other section headings.',
    '• Do not invent measurements, findings, or diagnoses.',
    '• Do not restate the section title.',
    '• Use formal clinical prose. Be concise.',
    '• If data is marked "(not recorded)", do not fabricate a value.',
    '',
    `Generate the ${sectionTitle} section now:`,
  ]
    .filter(line => line !== undefined)
    .join('\n');
}

// ─────────────────────────────────────────────────────────────
// streamSection
// Makes a streaming API call for one section and pipes
// tokens into the StreamingWriter.
// ─────────────────────────────────────────────────────────────

async function streamSection(
  sectionId: string,
  sectionTitle: string,
  prompt: string,
  writer: StreamingWriter,
  abortSignal: AbortSignal
): Promise<{ tokensGenerated: number }> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortSignal,
    body: JSON.stringify({
      model:      AI_MODEL,
      max_tokens: MAX_TOKENS,
      stream:     true,
      system:
        'You are a board-certified pathologist assistant generating structured ' +
        'pathology report sections. Never invent clinical findings. Use formal ' +
        'medical prose. Generate only the requested section — no headers, no preamble.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as any)?.error?.message ?? `AI API error ${response.status}`
    );
  }

  if (!response.body) throw new Error('No response body from AI API');

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let tokensGenerated = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(l => l.trim());

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);

        // Anthropic SSE event types
        if (parsed.type === 'content_block_delta') {
          const token: string = parsed.delta?.text ?? '';
          if (token) {
            writer.appendToken(sectionId, token);
            tokensGenerated += token.length;
          }
        }

        if (parsed.type === 'message_stop') break;
      } catch {
        // Malformed SSE line — skip
      }
    }
  }

  return { tokensGenerated };
}

// ─────────────────────────────────────────────────────────────
// OrchestratorEngine class
// ─────────────────────────────────────────────────────────────

export class OrchestratorEngine {
  private editor: Editor;
  private context: StructuredContext;
  private callbacks: OrchestratorCallbacks;
  private abortController: AbortController | null = null;
  private status: OrchestratorStatus = 'idle';

  constructor(
    editor: Editor,
    context: StructuredContext,
    callbacks: OrchestratorCallbacks = {}
  ) {
    this.editor    = editor;
    this.context   = context;
    this.callbacks = callbacks;
  }

  // ── run ────────────────────────────────────────────────────
  // Full orchestration run. Processes all enabled sections
  // in order. Returns a result summary.

  async run(): Promise<OrchestratorResult> {
    const startedAt = new Date().toISOString();
    this.setStatus('running');

    this.abortController = new AbortController();
    const writer = new StreamingWriter(this.editor, {
      clearExisting:    true,
      respectUserEdits: true,
    });

    const enabledSections = narrativeTemplateConfig.sections
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);

    const results: SectionResult[] = [];

    for (const section of enabledSections) {
      if (this.abortController.signal.aborted) {
        results.push({
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'cancelled',
        });
        continue;
      }

      this.callbacks.onSectionStart?.(section.id, section.title);

      const started = writer.beginSection(section.id, section.title);

      if (!started) {
        const result: SectionResult = {
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'skipped',
          error:        'Section has user edits — skipped',
        };
        results.push(result);
        this.callbacks.onSectionComplete?.(section.id, result);
        continue;
      }

      try {
        const prompt = buildSectionPrompt(
          section.id,
          section.title,
          section.aiInstruction,
          this.context
        );

        const { tokensGenerated } = await streamSection(
          section.id,
          section.title,
          prompt,
          writer,
          this.abortController.signal
        );

        writer.completeSection(section.id);

        const result: SectionResult = {
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'completed',
          tokensGenerated,
        };
        results.push(result);
        this.callbacks.onSectionComplete?.(section.id, result);

      } catch (err: any) {
        if (err?.name === 'AbortError') {
          writer.cancelSection(section.id);
          const result: SectionResult = {
            sectionId:    section.id,
            sectionTitle: section.title,
            status:       'cancelled',
          };
          results.push(result);
          this.callbacks.onSectionComplete?.(section.id, result);
          break;
        }

        writer.cancelSection(section.id);
        const errorMsg = err?.message ?? 'Unknown error';
        const result: SectionResult = {
          sectionId:    section.id,
          sectionTitle: section.title,
          status:       'error',
          error:        errorMsg,
        };
        results.push(result);
        this.callbacks.onError?.(section.id, errorMsg);
        this.callbacks.onSectionComplete?.(section.id, result);
        // Continue to next section — section-level isolation
      }
    }

    const finalStatus: OrchestratorStatus =
      this.abortController.signal.aborted ? 'cancelled' : 'completed';

    this.setStatus(finalStatus);

    const result: OrchestratorResult = {
      status:      finalStatus,
      sections:    results,
      startedAt,
      completedAt: new Date().toISOString(),
    };

    this.callbacks.onComplete?.(result);
    return result;
  }

  // ── regenerateSection ──────────────────────────────────────
  // Regenerates a single section regardless of user-edit status.
  // Used when the pathologist clicks "Regenerate" on a section.

  async regenerateSection(sectionId: string): Promise<SectionResult> {
    const section = narrativeTemplateConfig.sections.find(s => s.id === sectionId);
    if (!section) {
      return { sectionId, sectionTitle: '(unknown)', status: 'error', error: 'Section not found in template' };
    }

    this.abortController = new AbortController();

    const writer = new StreamingWriter(this.editor, {
      clearExisting:    true,
      respectUserEdits: false, // override user edits for explicit regen
    });

    this.callbacks.onSectionStart?.(section.id, section.title);
    writer.beginSection(section.id, section.title);

    try {
      const prompt = buildSectionPrompt(
        section.id,
        section.title,
        section.aiInstruction,
        this.context
      );

      const { tokensGenerated } = await streamSection(
        section.id,
        section.title,
        prompt,
        writer,
        this.abortController.signal
      );

      writer.completeSection(section.id);

      const result: SectionResult = {
        sectionId:    section.id,
        sectionTitle: section.title,
        status:       'completed',
        tokensGenerated,
      };
      this.callbacks.onSectionComplete?.(section.id, result);
      return result;

    } catch (err: any) {
      writer.cancelSection(section.id);
      const errorMsg = err?.message ?? 'Unknown error';
      const result: SectionResult = {
        sectionId:    section.id,
        sectionTitle: section.title,
        status:       'error',
        error:        errorMsg,
      };
      this.callbacks.onError?.(section.id, errorMsg);
      return result;
    }
  }

  // ── cancel ─────────────────────────────────────────────────
  // Aborts the current in-flight run or section generation.

  cancel(): void {
    this.abortController?.abort();
    this.setStatus('cancelled');
  }

  // ── getStatus ──────────────────────────────────────────────
  getStatus(): OrchestratorStatus {
    return this.status;
  }

  private setStatus(status: OrchestratorStatus): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }
}

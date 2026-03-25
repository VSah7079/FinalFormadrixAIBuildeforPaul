/**
 * services/templateService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service layer for all synoptic template operations.
 *
 * MOCK PHASE (current):
 *   All functions return realistic mock data with simulated async latency.
 *   Components are fully wired — swap the implementations below when the
 *   backend is ready. Nothing in the UI layer needs to change.
 *
 * REAL PHASE (when backend is ready):
 *   Replace each function body with the corresponding fetch() call.
 *   API contracts are documented inline above each function.
 *   See also: /docs/api-contracts/templates.md (generate from this file)
 *
 * Used by:
 *   components/Config/Protocols/SynopticEditor.tsx
 *   components/Config/Templates/TemplateRenderer.tsx
 *
 * Drop-in path: src/services/templateService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EditorTemplate } from '../../components/Config/Protocols/SynopticEditor';
import { PROTOCOL_REGISTRY, Protocol, LifecycleState, notifyRegistryChanged, saveRegistryOverride } from '../../components/Config/Protocols/protocolShared';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type TemplateStatus = LifecycleState | 'deprecated';

export interface TemplateSummary {
  id:           string;
  name:         string;
  source:       string;
  version:      string;
  category:     string;
  status:       TemplateStatus;
  fields:       number;
  sections:     number;
  createdBy:    string;
  createdAt:    string;
  updatedAt:    string;
  submittedAt?: string;
  publishedAt?: string;
}

export interface TemplateDetail extends TemplateSummary {
  template:     EditorTemplate;
  reviewNote?:  string;
  reviewedBy?:  string;
}

export interface SaveDraftResult {
  id:        string;
  status:    'draft';
  updatedAt: string;
}

export interface SubmitResult {
  id:          string;
  status:      'in_review';
  submittedAt: string;
}

export interface TransitionResult {
  id:          string;
  status:      TemplateStatus;
  reviewNote?: string;
  updatedAt:   string;
}

export interface ServiceError {
  code:    string;
  message: string;
}

// ─── In-memory editor state ───────────────────────────────────────────────────
// Stores the full EditorTemplate structure keyed by id.
// PROTOCOL_REGISTRY holds the summary/status view; this holds the field data.
// Both are updated together on every write.

const editorStore = new Map<string, EditorTemplate>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const delay = (ms = 400) => new Promise(res => setTimeout(res, ms));

const now = () => new Date().toISOString();

function registryEntry(id: string): Protocol | undefined {
  return PROTOCOL_REGISTRY.find(p => p.id === id);
}

function upsertRegistry(patch: Partial<Protocol> & { id: string }): void {
  const idx = PROTOCOL_REGISTRY.findIndex(p => p.id === patch.id);
  if (idx >= 0) {
    PROTOCOL_REGISTRY[idx] = { ...PROTOCOL_REGISTRY[idx], ...patch };
  } else {
    // New entry — build a full Protocol from the patch
    PROTOCOL_REGISTRY.push({
      name:         patch.name         ?? 'Untitled',
      category:     patch.category     ?? 'OTHER',
      version:      patch.version      ?? '1.0.0',
      source:       (patch.source as Protocol['source']) ?? 'Custom',
      type:         patch.type         ?? 'Custom',
      status:       patch.status       ?? 'draft',
      fields:       patch.fields       ?? 0,
      snomedPct:    patch.snomedPct    ?? 0,
      icdPct:       patch.icdPct       ?? 0,
      lastModified: patch.lastModified ?? now().slice(0, 10),
      owner:        patch.owner        ?? 'Current User',
      ...patch,
    } as Protocol);
  }
  // Persist to localStorage so transitions survive page reloads (mock-phase bridge)
  saveRegistryOverride(patch);
  notifyRegistryChanged();
}

// ─── GET /api/templates ───────────────────────────────────────────────────────
export async function listTemplates(
  status?: TemplateStatus | TemplateStatus[]
): Promise<Protocol[]> {
  await delay(300);

  // ── MOCK ──
  const statuses = status ? (Array.isArray(status) ? status : [status]) : null;
  return PROTOCOL_REGISTRY.filter(p => !statuses || statuses.includes(p.status as TemplateStatus));

  // ── REAL ──
  // const q = status ? `?status=${Array.isArray(status) ? status.join(',') : status}` : '';
  // const res = await fetch(`/api/templates${q}`);
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── GET /api/templates/:id ───────────────────────────────────────────────────
export async function getTemplate(id: string): Promise<TemplateDetail> {
  await delay(350);

  // ── MOCK ──
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  const template = editorStore.get(id) ?? {
    id, name: entry.name, source: entry.source,
    version: entry.version, category: entry.category, sections: [],
  };
  return {
    id:          entry.id,
    name:        entry.name,
    source:      entry.source,
    version:     entry.version,
    category:    entry.category,
    status:      entry.status as TemplateStatus,
    fields:      entry.fields,
    sections:    0,
    createdBy:   entry.owner,
    createdAt:   entry.lastModified,
    updatedAt:   entry.lastModified,
    reviewNote:  entry.reviewNote,
    template,
  };

  // ── REAL ──
  // const res = await fetch(`/api/templates/${id}`);
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── POST /api/templates ──────────────────────────────────────────────────────
export async function saveDraft(template: EditorTemplate): Promise<SaveDraftResult> {
  await delay(400);

  // ── MOCK ──
  const ts = now();
  editorStore.set(template.id, template);
  upsertRegistry({
    id:           template.id,
    name:         template.name || 'Untitled',
    source:       template.source as Protocol['source'],
    version:      template.version,
    category:     template.category,
    status:       'draft',
    fields:       template.sections.reduce((n, s) => n + s.fields.length, 0),
    lastModified: ts.slice(0, 10),
    owner:        'Current User',  // TODO: replace with auth context
  });

  console.info(`[templateService] Draft saved: ${template.name} (${template.id})`);
  return { id: template.id, status: 'draft', updatedAt: ts };

  // ── REAL ──
  // const res = await fetch('/api/templates', {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ template }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── POST /api/templates/:id/submit ──────────────────────────────────────────
export async function submitForReview(id: string, note?: string): Promise<SubmitResult> {
  await delay(500);

  // ── MOCK ──
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  const ts = now();
  upsertRegistry({ id, status: 'in_review', lastModified: ts.slice(0, 10), reviewNote: note });

  console.info(`[templateService] Submitted for review: ${entry.name}`);
  return { id, status: 'in_review', submittedAt: ts };

  // ── REAL ──
  // const res = await fetch(`/api/templates/${id}/submit`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── POST /api/templates/:id/approve ─────────────────────────────────────────
export async function approveTemplate(id: string, note?: string, reviewedBy?: string): Promise<TransitionResult> {
  await delay(500);

  // ── MOCK ──
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  const ts = now();
  upsertRegistry({
    id, status: 'approved',
    reviewedBy: reviewedBy ?? 'Unknown User',
    reviewedAt: ts,
    lastModified: ts.slice(0, 10), reviewNote: note,
  });

  console.info(`[templateService] Approved: ${entry.name}`);
  return { id, status: 'approved', updatedAt: ts };

  // ── REAL ──
  // const res = await fetch(`/api/templates/${id}/approve`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── POST /api/templates/:id/publish ─────────────────────────────────────────
export async function publishTemplate(id: string, _note?: string): Promise<TransitionResult> {
  await delay(600);

  // ── MOCK ──
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  const ts = now();
  upsertRegistry({ id, status: 'published', reviewNote: undefined, lastModified: ts.slice(0, 10) });

  console.info(`[templateService] Published: ${entry.name}`);
  return { id, status: 'published', updatedAt: ts };

  // ── REAL ──
  // const res = await fetch(`/api/templates/${id}/publish`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── POST /api/templates/:id/request-changes ─────────────────────────────────
export async function requestChanges(id: string, note: string, reviewedBy?: string): Promise<TransitionResult> {
  await delay(500);

  // ── MOCK ──
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  const ts = now();
  upsertRegistry({
    id, status: 'needs_changes', reviewNote: note,
    reviewedBy: reviewedBy ?? 'Unknown User',
    reviewedAt: ts,
    lastModified: ts.slice(0, 10),
  });

  console.info(`[templateService] Changes requested: ${entry.name} — "${note}"`);
  return { id, status: 'needs_changes', reviewNote: note, updatedAt: ts };

  // ── REAL ──
  // const res = await fetch(`/api/templates/${id}/request-changes`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── POST /api/templates/:id/resubmit ────────────────────────────────────────
export async function resubmitForReview(id: string, _note?: string): Promise<SubmitResult> {
  await delay(500);

  // ── MOCK ──
  const entry = registryEntry(id);
  if (!entry) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;

  const ts = now();
  upsertRegistry({ id, status: 'in_review', reviewNote: undefined, lastModified: ts.slice(0, 10) });

  console.info(`[templateService] Resubmitted: ${entry.name}`);
  return { id, status: 'in_review', submittedAt: ts };

  // ── REAL ──
  // const res = await fetch(`/api/templates/${id}/resubmit`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ note }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── DELETE /api/templates/:id ───────────────────────────────────────────────
export async function deleteTemplate(id: string): Promise<{ deleted: true }> {
  await delay(300);

  // ── MOCK ──
  const idx = PROTOCOL_REGISTRY.findIndex(p => p.id === id);
  if (idx < 0) throw { code: 'NOT_FOUND', message: `Template ${id} not found` } as ServiceError;
  if (PROTOCOL_REGISTRY[idx].status !== 'draft') {
    throw { code: 'FORBIDDEN', message: 'Only draft templates can be deleted' } as ServiceError;
  }
  PROTOCOL_REGISTRY.splice(idx, 1);
  editorStore.delete(id);

  // Remove from localStorage persistence store
  try {
    const { loadRegistryOverrides } = await import('../../components/Config/Protocols/protocolShared');
    const overrides = loadRegistryOverrides();
    delete overrides[id];
    localStorage.setItem('ps_registry_overrides_v1', JSON.stringify(overrides));
  } catch { /* storage unavailable */ }

  console.info(`[templateService] Deleted draft: ${id}`);
  return { deleted: true };

  // ── REAL ──
  // const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

// ─── Convenience: lifecycle transition dispatcher ─────────────────────────────
export async function transitionTemplate(
  id:         string,
  target:     TemplateStatus,
  note?:      string,
  reviewedBy?: string
): Promise<TransitionResult | SubmitResult> {
  switch (target) {
    case 'in_review':     return resubmitForReview(id, note);
    case 'approved':      return approveTemplate(id, note, reviewedBy);
    case 'published':     return publishTemplate(id, note);
    case 'needs_changes': return requestChanges(id, note ?? '', reviewedBy);
    default:
      throw { code: 'INVALID_TRANSITION', message: `No handler for transition to ${target}` } as ServiceError;
  }
}

// ─── Terminology validation ───────────────────────────────────────────────────
// POST /api/v1/terminology/validate (see /docs/api/formedrix-api-contract.yaml)
//
// Mock phase: validates against MOCK_DEPRECATED_CODES.
// Real phase: replace function body with fetch() to the backend endpoint.

export interface TermCode {
  code:    string;
  system:  'snomed' | 'icd';
  display: string;
}

export interface TerminologyAlert {
  id:           string;    // stable key for dismiss tracking: `${system}:${code}:${fieldId}`
  severity:     'error' | 'warning';
  system:       'snomed' | 'icd';
  code:         string;
  message:      string;
  fieldId?:     string;
  fieldLabel?:  string;
  optionId?:    string;
  optionLabel?: string;
  replacements?: TermCode[];
}

// Known deprecated codes — mock registry.
// Format: code → { severity, message, replacements? }
// Replace with API call in real phase.
const MOCK_DEPRECATED_CODES: Record<string, {
  system:       'snomed' | 'icd';
  severity:     'error' | 'warning';
  message:      string;
  replacements?: TermCode[];
}> = {
  // SNOMED CT — retired concepts
  '363346000': {
    system: 'snomed', severity: 'error',
    message: 'SNOMED CT 363346000 (Malignant neoplastic disease) was retired on 2024-01-31.',
    replacements: [{ code: '363346001', system: 'snomed', display: 'Malignant neoplasm (disorder)' }],
  },
  '188340000': {
    system: 'snomed', severity: 'error',
    message: 'SNOMED CT 188340000 has been retired. Use the updated concept below.',
    replacements: [{ code: '254837009', system: 'snomed', display: 'Malignant neoplasm of breast (disorder)' }],
  },
  '413448000': {
    system: 'snomed', severity: 'warning',
    message: 'SNOMED CT 413448000 is flagged for deprecation in the next release (Jan 2026). Plan replacement.',
    replacements: [{ code: '413448001', system: 'snomed', display: 'Adenocarcinoma of colon (disorder)' }],
  },
  // ICD — retired codes
  'C18':  {
    system: 'icd', severity: 'warning',
    message: 'ICD-10 C18 (unspecified) — use a more specific 4th-character code (e.g. C18.0–C18.9) for CAP compliance.',
  },
  'D05.1': {
    system: 'icd', severity: 'error',
    message: 'ICD-10 D05.1 was retired in ICD-11. Use ICD-11 2E65.0 (Lobular carcinoma in situ of breast) instead.',
    replacements: [{ code: '2E65.0', system: 'icd', display: 'Lobular carcinoma in situ of breast' }],
  },
};

export async function validateTerminologyCodes(
  template: EditorTemplate
): Promise<TerminologyAlert[]> {
  await delay(300);

  // ── MOCK ──
  const alerts: TerminologyAlert[] = [];

  template.sections.forEach(section => {
    section.fields.forEach(field => {

      // Field-level SNOMED
      if (field.snomed) {
        const hit = MOCK_DEPRECATED_CODES[field.snomed];
        if (hit && hit.system === 'snomed') {
          alerts.push({
            id:           `snomed:${field.snomed}:${field.id}`,
            severity:     hit.severity,
            system:       'snomed',
            code:         field.snomed,
            message:      hit.message,
            fieldId:      field.id,
            fieldLabel:   field.label || '(unlabelled field)',
            replacements: hit.replacements,
          });
        }
      }

      // Field-level ICD
      if (field.icd) {
        const hit = MOCK_DEPRECATED_CODES[field.icd];
        if (hit && hit.system === 'icd') {
          alerts.push({
            id:           `icd:${field.icd}:${field.id}`,
            severity:     hit.severity,
            system:       'icd',
            code:         field.icd,
            message:      hit.message,
            fieldId:      field.id,
            fieldLabel:   field.label || '(unlabelled field)',
            replacements: hit.replacements,
          });
        }
      }

      // Option-level SNOMED + ICD
      field.options.forEach(option => {
        if (option.snomed) {
          const hit = MOCK_DEPRECATED_CODES[option.snomed];
          if (hit && hit.system === 'snomed') {
            alerts.push({
              id:           `snomed:${option.snomed}:${field.id}:${option.id}`,
              severity:     hit.severity,
              system:       'snomed',
              code:         option.snomed,
              message:      hit.message,
              fieldId:      field.id,
              fieldLabel:   field.label || '(unlabelled field)',
              optionId:     option.id,
              optionLabel:  option.label || '(unlabelled option)',
              replacements: hit.replacements,
            });
          }
        }
        if (option.icd) {
          const hit = MOCK_DEPRECATED_CODES[option.icd];
          if (hit && hit.system === 'icd') {
            alerts.push({
              id:           `icd:${option.icd}:${field.id}:${option.id}`,
              severity:     hit.severity,
              system:       'icd',
              code:         option.icd,
              message:      hit.message,
              fieldId:      field.id,
              fieldLabel:   field.label || '(unlabelled field)',
              optionId:     option.id,
              optionLabel:  option.label || '(unlabelled option)',
              replacements: hit.replacements,
            });
          }
        }
      });
    });
  });

  return alerts;

  // ── REAL ──
  // const res = await fetch('/api/v1/terminology/validate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ codes: extractCodes(template) }),
  // });
  // if (!res.ok) throw await res.json() as ServiceError;
  // return res.json();
}

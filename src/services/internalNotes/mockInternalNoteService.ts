import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { InternalNote, NewInternalNote, IInternalNoteService } from './IInternalNoteService';
import { mockAuditService } from '../auditLog/mockAuditService';

// ─── Audit Helper ─────────────────────────────────────────────────────────────

const audit = (
  event: string,
  detail: string,
  user: string,
  caseId: string | null = null
) => mockAuditService.logEvent({ type: 'user', event, detail, user, caseId, confidence: null });

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_NOTES: InternalNote[] = [
  {
    id: 'cn1',
    accession: 'S26-4401',
    authorId: 'u2',
    authorName: 'Lab Manager',
    type: 'informal_review',
    body: 'Reviewed Block A-4 with Dr. Johnson over the phone. Secondary morphology consistent with primary diagnosis. No formal addendum required at this time.',
    visibility: 'shared',
    messageThreadId: 'm1',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'cn2',
    accession: 'S26-4405',
    authorId: 'u5',
    authorName: 'Dr. Aristhone',
    type: 'consultation',
    body: 'Complex lung biopsy referred for second opinion. Pattern suspicious for adenocarcinoma vs. atypical carcinoid. Awaiting IHC panel results before finalising.',
    visibility: 'shared',
    messageThreadId: 'm4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
  },
  {
    id: 'cn3',
    accession: 'S26-4412',
    authorId: 'u1',
    authorName: 'Dr. Sarah Johnson',
    type: 'clinical_observation',
    body: 'IHC panel complete. ER/PR positive, HER2 equivocal — FISH recommended. Discussed with oncology team.',
    visibility: 'shared',
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
  },
  {
    id: 'cn4',
    accession: 'S26-4412',
    authorId: 'u1',
    authorName: 'Dr. Sarah Johnson',
    type: 'other',
    body: 'Personal reminder: confirm FISH lab turnaround with Dr. Nguyen before end of day.',
    visibility: 'private',
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
  },
];

// ─── Storage ──────────────────────────────────────────────────────────────────
// ⚠️  Internal notes are part of the clinical record but must never be included
//     in patient-facing report exports, PDF generation, or LIS transmissions.
//     Do not expose this collection through any report template or formatted output.
//     report exports, PDF generation, or LIS transmissions. Do not expose
//     this collection through any patient-facing API or report template.

const STORAGE_KEY = 'formedrix_internal_notes';
const load    = () => storageGet<InternalNote[]>(STORAGE_KEY, SEED_NOTES);
const persist = (data: InternalNote[]) => storageSet(STORAGE_KEY, data);

// Restore Date objects after JSON parse (storageGet returns plain objects)
const hydrate = (notes: InternalNote[]): InternalNote[] =>
  notes.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));

let MOCK_NOTES: InternalNote[] = hydrate(load());

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

// ─── Service ──────────────────────────────────────────────────────────────────

export const mockInternalNoteService: IInternalNoteService = {

  async getForCase(accession: string, userId: ID) {
    await delay();
    const notes = MOCK_NOTES.filter(
      n => n.accession === accession &&
           (n.visibility === 'shared' || n.authorId === userId)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return ok([...notes]);
  },

  async add(note: NewInternalNote) {
    await delay();
    const newNote: InternalNote = {
      ...note,
      id: 'cn' + Date.now(),
      timestamp: new Date(),
    };
    MOCK_NOTES = [...MOCK_NOTES, newNote];
    persist(MOCK_NOTES);
    await audit(
      'INTERNAL_NOTE_ADDED',
      `${note.type.replace('_', ' ')} note added to Case ${note.accession}${note.visibility === 'private' ? ' [private]' : ''}`,
      note.authorName,
      note.accession
    );
    return ok({ ...newNote });
  },

  async update(id: ID, authorId: ID, changes) {
    await delay();
    const idx = MOCK_NOTES.findIndex(n => n.id === id);
    if (idx === -1) return err(`Note ${id} not found`);
    if (MOCK_NOTES[idx].authorId !== authorId) return err('Not authorised to edit this note');
    MOCK_NOTES = MOCK_NOTES.map(n => n.id === id ? { ...n, ...changes } : n);
    persist(MOCK_NOTES);
    const updated = MOCK_NOTES[idx];
    await audit(
      'INTERNAL_NOTE_UPDATED',
      `Case note updated on Case ${updated.accession}`,
      updated.authorName,
      updated.accession
    );
    return ok({ ...MOCK_NOTES[idx], ...changes });
  },

  async remove(id: ID, authorId: ID) {
    await delay();
    const target = MOCK_NOTES.find(n => n.id === id);
    if (!target) return err(`Note ${id} not found`);
    if (target.authorId !== authorId) return err('Not authorised to delete this note');
    MOCK_NOTES = MOCK_NOTES.filter(n => n.id !== id);
    persist(MOCK_NOTES);
    await audit(
      'INTERNAL_NOTE_DELETED',
      `Case note deleted from Case ${target.accession}`,
      target.authorName,
      target.accession
    );
    return ok(undefined);
  },
};

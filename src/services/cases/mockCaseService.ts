import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { PathologyCase, CaseFilterParams, ICaseService } from './ICaseService';

// ─── Seed data ────────────────────────────────────────────────────────────────
// PHI note: patient field uses "Last, First" for ***REMOVED*** only.
// In production this will be MRN only — name resolved via patient service.

const PROTOCOLS = [
  'CAP Breast Invasive Carcinoma', 'CAP Colon Resection',      'CAP Prostatectomy',
  'CAP Lung Resection',            'CAP Thyroid',               'CAP Endometrium',
  'CAP Melanoma',                  'CAP Kidney Resection',      'CAP Bladder Resection',
  'CAP Cervix Resection',          'CAP Ovary',                 'CAP Lymph Node',
  'CAP Soft Tissue',               'CAP Prostate Biopsy',
];

const SPECIMENS = [
  'Left Breast Mastectomy',    'Right Breast Mastectomy',   'Right Breast Lumpectomy',
  'Left Breast Lumpectomy',    'Right Hemicolectomy',       'Left Hemicolectomy',
  'Radical Prostatectomy',     'Left Lower Lobe Lobectomy', 'Right Upper Lobe Lobectomy',
  'Total Thyroidectomy',       'Partial Thyroidectomy',     'Cholecystectomy',
  'Appendectomy',              'Partial Nephrectomy',       'Radical Nephrectomy',
  'Total Hysterectomy',        'Wide Local Excision',       'Axillary Node Dissection',
  'TURBT Specimen',            'Endocervical Curettage',    'Cervical Cone Biopsy',
  'Sentinel Lymph Node Biopsy','Core Needle Biopsy Breast', 'Prostate Biopsy Cores',
];

const STATUSES:    PathologyCase['status'][]   = ['Grossed', 'Awaiting Micro', 'Finalizing', 'Completed'];
const AI_STATUSES: PathologyCase['aiStatus'][] = ['Draft Ready', 'Syncing Micro', 'Finalized', 'Pending'];
const LAST_NAMES  = ['Miller','Smith','Johnson','Taylor','White','Brown','Davis','Wilson','Moore','Anderson','Thomas','Jackson','Harris','Martin','Thompson','Garcia','Martinez','Robinson','Clark','Rodriguez'];
const FIRST_NAMES = ['Jane','Alice','Michael','Charles','Susan','Robert','Linda','William','Barbara','Richard','Mary','James','Patricia','John','Jennifer','David','Margaret','Christopher','Lisa','Daniel'];

function generateSeedCases(n: number): PathologyCase[] {
  return Array.from({ length: n }, (_, i) => {
    const aiStatus = AI_STATUSES[i % AI_STATUSES.length];
    const hrs      = [30, 45, 60, 90, 120, 180, 240, 300][i % 8];
    return {
      id:         `S26-${4200 + i}`,
      patient:    `${LAST_NAMES[i % LAST_NAMES.length]}, ${FIRST_NAMES[i % FIRST_NAMES.length]}`,
      protocol:   PROTOCOLS[i % PROTOCOLS.length],
      specimen:   SPECIMENS[i % SPECIMENS.length],
      status:     STATUSES[i % STATUSES.length],
      aiStatus,
      confidence: aiStatus === 'Pending' ? 0 : 78 + (i % 20),
      time:       hrs < 60 ? `${hrs}m ago` : `${Math.round(hrs / 60)}h ago`,
      priority:   i % 7 === 0 ? 'STAT' : 'Routine',
    };
  });
}

const SEED_CASES: PathologyCase[] = generateSeedCases(60);

// ─── Storage ──────────────────────────────────────────────────────────────────

const load    = () => storageGet<PathologyCase[]>('pathscribe_cases', SEED_CASES);
const persist = (data: PathologyCase[]) => storageSet('pathscribe_cases', data);

// Cases are read-only from the client (written by LIS sync / AI engine),
// so we load once and do not expose a persist path in the service interface.
const MOCK_CASES: PathologyCase[] = load();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true,  data  });
const err   = <T>(e: string): ServiceResult<T> => ({ ok: false, error: e });
const delay = () => new Promise(r => setTimeout(r, 80));

function applyFilters(cases: PathologyCase[], f: CaseFilterParams = {}): PathologyCase[] {
  const nameQ = f.patientName?.trim().toLowerCase();
  const accQ  = f.accessionNo?.trim().toLowerCase();
  const idQ   = f.hospitalId?.trim().toLowerCase();

  return cases.filter(c => {
    if (nameQ && !c.patient.toLowerCase().includes(nameQ))  return false;
    if (accQ  && !c.id.toLowerCase().includes(accQ))        return false;
    if (idQ   && !c.id.toLowerCase().includes(idQ))         return false;

    if (f.diagnosisList?.length && !f.diagnosisList.some(d =>
      c.protocol.toLowerCase().includes(d.toLowerCase()) ||
      c.specimen.toLowerCase().includes(d.toLowerCase())
    )) return false;

    if (f.specimenList?.length && !f.specimenList.some(s =>
      c.specimen.toLowerCase().includes(s.toLowerCase())
    )) return false;

    if (f.snomedCodes?.length && !f.snomedCodes.some(s =>
      c.protocol.toLowerCase().includes(s.toLowerCase())
    )) return false;

    if (f.icdCodes?.length && !f.icdCodes.some(s =>
      c.protocol.toLowerCase().includes(s.toLowerCase())
    )) return false;

    if (f.statusList?.length   && !f.statusList.includes(c.status))     return false;
    if (f.priorityList?.length && !f.priorityList.includes(c.priority)) return false;

    return true;
  });
}

// ─── Mock service ─────────────────────────────────────────────────────────────
// TODO: Replace with firestoreCaseService when LIS integration is ready.

export const mockCaseService: ICaseService = {

  async getAll(filters) {
    await delay();
    return ok(applyFilters([...MOCK_CASES], filters));
  },

  async getById(id: ID) {
    await delay();
    const c = MOCK_CASES.find(c => c.id === id);
    return c ? ok({ ...c }) : err(`Case ${id} not found`);
  },
};

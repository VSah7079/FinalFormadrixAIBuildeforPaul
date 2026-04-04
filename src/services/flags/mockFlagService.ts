import { IFlagService, Flag } from './IFlagService';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

const SEED_FLAGS: Flag[] = [
  // ── Case-level flags ─────────────────────────────────────────────────────────
  { id: 'f1',  name: 'STAT — Rush Processing',      lisCode: 'STAT',   description: 'Rush processing required — prioritise above routine queue',       level: 'Case',     severity: 5, status: 'Active'   },
  { id: 'f2',  name: 'Malignant',                   lisCode: 'MAL',    description: 'Malignant diagnosis confirmed',                                    level: 'Case',     severity: 5, status: 'Active'   },
  { id: 'f3',  name: 'Second Opinion Requested',    lisCode: 'SOP',    description: 'External or internal second opinion has been requested',           level: 'Case',     severity: 3, status: 'Active'   },
  { id: 'f4',  name: 'Clinical Correlation',        lisCode: 'CORR',   description: 'Clinical correlation recommended before sign-out',                 level: 'Case',     severity: 2, status: 'Active'   },
  { id: 'f5',  name: 'Tumor Board Scheduled',       lisCode: 'TB',     description: 'Case scheduled for multidisciplinary tumor board review',          level: 'Case',     severity: 3, status: 'Active'   },
  { id: 'f6',  name: 'Amended',                     lisCode: 'AMD',    description: 'Report has been amended — review changes before sign-out',         level: 'Case',     severity: 3, status: 'Active'   },
  { id: 'f7',  name: 'QC Review',                   lisCode: 'QC',     description: 'Selected for quality control review',                              level: 'Case',     severity: 2, status: 'Active'   },
  { id: 'f8',  name: 'Hold — Pending Info',         lisCode: 'HOLD',   description: 'Case on hold pending additional clinical information',             level: 'Case',     severity: 2, status: 'Active'   },
  { id: 'f9',  name: 'Discordant',                  lisCode: 'DISC',   description: 'QC discordance noted between gross and microscopic findings',      level: 'Case',     severity: 4, status: 'Active'   },
  { id: 'f11', name: 'Neuro-Oncology Consult',      lisCode: 'NEURO',  description: 'Neuro-oncology team consultation requested',                       level: 'Case',     severity: 3, status: 'Active'   },
  { id: 'f12', name: 'Heme Oncology Notified',      lisCode: 'HEME',   description: 'Haematology oncology team has been notified',                      level: 'Case',     severity: 2, status: 'Active'   },
  { id: 'f13', name: 'Sarcoma Protocol',            lisCode: 'SARC',   description: 'Sarcoma multidisciplinary protocol initiated',                     level: 'Case',     severity: 3, status: 'Active'   },
  { id: 'f14', name: 'Pending Clinical Correlation',lisCode: 'PCC',    description: 'Awaiting clinical correlation from referring physician',           level: 'Case',     severity: 3, status: 'Active'   },
  { id: 'f15', name: 'Intraoperative Consult',      lisCode: 'INTRA',  description: 'Frozen section or intraoperative consultation performed',          level: 'Case',     severity: 4, status: 'Active'   },
  { id: 'f10', name: 'Legacy Urgent',               lisCode: 'URG',    description: 'Legacy urgent flag — replaced by STAT',                           level: 'Case',     severity: 4, status: 'Inactive' },

  // ── Specimen-level flags ──────────────────────────────────────────────────────
  { id: 'f20', name: 'Margins Involved',            lisCode: 'MARG',   description: 'Surgical margins involved by tumour — surgeon notification pending', level: 'Specimen', severity: 5, status: 'Active'   },
  { id: 'f21', name: 'Insufficient Specimen',       lisCode: 'INSUF',  description: 'Specimen insufficient for definitive diagnosis',                   level: 'Specimen', severity: 3, status: 'Active'   },
  { id: 'f22', name: 'Frozen Section Correlation',  lisCode: 'FSC',    description: 'Permanent section requires correlation with frozen section result', level: 'Specimen', severity: 2, status: 'Active'   },
  { id: 'f23', name: 'Additional Levels Requested', lisCode: 'ALR',    description: 'Deeper tissue levels requested for further evaluation',            level: 'Specimen', severity: 4, status: 'Active'   },
  { id: 'f24', name: 'IHC Ordered',                 lisCode: 'IHC',    description: 'Immunohistochemistry panel ordered — awaiting results',            level: 'Specimen', severity: 2, status: 'Active'   },
  { id: 'f25', name: 'ER/PR/HER2 Pending',          lisCode: 'ERH2',   description: 'Hormone receptor and HER2 testing in progress',                   level: 'Specimen', severity: 2, status: 'Active'   },
  { id: 'f26', name: 'Molecular Panel Ordered',     lisCode: 'MOL',    description: 'Molecular/genomic panel ordered — awaiting results',              level: 'Specimen', severity: 3, status: 'Active'   },
  { id: 'f27', name: 'Flow Cytometry Ordered',      lisCode: 'FLOW',   description: 'Flow cytometry requested for immunophenotyping',                  level: 'Specimen', severity: 2, status: 'Active'   },
  { id: 'f28', name: 'Cytogenetics Pending',        lisCode: 'CYTO',   description: 'Cytogenetics/FISH testing pending',                               level: 'Specimen', severity: 3, status: 'Active'   },
  { id: 'f29', name: 'Decal in Progress',           lisCode: 'DECAL',  description: 'Bone specimen undergoing decalcification — processing delayed',   level: 'Specimen', severity: 3, status: 'Active'   },
  { id: 'f30', name: 'HER2 Testing Ordered',        lisCode: 'HER2',   description: 'HER2 FISH or ISH testing ordered',                               level: 'Specimen', severity: 2, status: 'Active'   },
  { id: 'f31', name: 'Rejection Rule-Out',          lisCode: 'REJ',    description: 'Pathological evaluation for transplant rejection initiated',      level: 'Specimen', severity: 4, status: 'Active'   },
  { id: 'f32', name: 'Trichrome Pending',           lisCode: 'TRICH',  description: 'Masson trichrome stain ordered for fibrosis assessment',          level: 'Specimen', severity: 2, status: 'Active'   },
  { id: 'f33', name: 'Calcifications Noted',        lisCode: 'CALC',   description: 'Microcalcifications identified — radiological correlation advised', level: 'Specimen', severity: 3, status: 'Active'   },
  { id: 'f34', name: 'Tumour Markers Ordered',      lisCode: 'TM',     description: 'Serum or tissue tumour markers requested',                        level: 'Specimen', severity: 2, status: 'Active'   },
  { id: 'f35', name: 'Molecular Profiling Pending', lisCode: 'MPROF',  description: 'Comprehensive molecular profiling panel in progress',             level: 'Specimen', severity: 3, status: 'Active'   },
];

const load = () => storageGet<Flag[]>('pathscribe_flags', SEED_FLAGS);
const persist = (data: Flag[]) => storageSet('pathscribe_flags', data);
let MOCK_FLAGS: Flag[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockFlagService: IFlagService = {
  async getAll() {
    await delay();
    return ok([...MOCK_FLAGS]);
  },

  async getById(id: ID) {
    await delay();
    const f = MOCK_FLAGS.find(f => f.id === id);
    return f ? ok({ ...f }) : err(`Flag ${id} not found`);
  },

  async add(flag) {
    await delay();
    const newFlag: Flag = { ...flag, id: 'f' + Date.now() };
    MOCK_FLAGS = [...MOCK_FLAGS, newFlag];
    persist(MOCK_FLAGS);
    return ok({ ...newFlag });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_FLAGS.findIndex(f => f.id === id);
    if (idx === -1) return err(`Flag ${id} not found`);
    MOCK_FLAGS = MOCK_FLAGS.map(f => f.id === id ? { ...f, ...changes } : f);
    persist(MOCK_FLAGS);
    return ok({ ...MOCK_FLAGS[idx], ...changes });
  },

  async deactivate(id) {
    return mockFlagService.update(id, { status: 'Inactive' });
  },

  async reactivate(id) {
    return mockFlagService.update(id, { status: 'Active' });
  },
};

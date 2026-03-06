import { IFlagService, Flag } from './IFlagService';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

const SEED_FLAGS: Flag[] = [
  { id: 'f1', name: 'STAT',              lisCode: 'STAT',   description: 'Rush processing required',              level: 'Case',     severity: 4, status: 'Active'   },
  { id: 'f2', name: 'Malignant',         lisCode: 'MAL',    description: 'Malignant diagnosis confirmed',          level: 'Case',     severity: 5, status: 'Active'   },
  { id: 'f3', name: 'Intraoperative',    lisCode: 'INTRA',  description: 'Frozen section / intraoperative consult',level: 'Specimen', severity: 4, status: 'Active'   },
  { id: 'f4', name: 'Correlation',       lisCode: 'CORR',   description: 'Clinical correlation recommended',       level: 'Case',     severity: 2, status: 'Active'   },
  { id: 'f5', name: 'Amended',           lisCode: 'AMD',    description: 'Report has been amended',                level: 'Case',     severity: 3, status: 'Active'   },
  { id: 'f6', name: 'Insufficient',      lisCode: 'INSUF',  description: 'Specimen insufficient for diagnosis',    level: 'Specimen', severity: 3, status: 'Active'   },
  { id: 'f7', name: 'QC Review',         lisCode: 'QC',     description: 'Selected for quality control review',    level: 'Case',     severity: 2, status: 'Active'   },
  { id: 'f8', name: 'Hold',              lisCode: 'HOLD',   description: 'Case on hold pending additional info',   level: 'Case',     severity: 2, status: 'Active'   },
  { id: 'f9', name: 'Discordant',        lisCode: 'DISC',   description: 'QC discordance noted',                  level: 'Case',     severity: 4, status: 'Active'   },
  { id: 'f10',name: 'Legacy Urgent',     lisCode: 'URG',    description: 'Legacy urgent flag — replaced by STAT', level: 'Case',     severity: 4, status: 'Inactive' },
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

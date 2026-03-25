import { ISubspecialtyService, Subspecialty } from './ISubspecialtyService';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

const SEED_SUBSPECIALTIES: Subspecialty[] = [
  { id: 'gi',       name: 'Gastrointestinal',    userIds: ['1', '7'], specimenIds: ['sp1', 'sp2'], status: 'Active'   },
  { id: 'breast',   name: 'Breast',              userIds: ['1', '6'], specimenIds: ['sp3'],        status: 'Active'   },
  { id: 'derm',     name: 'Dermatopathology',    userIds: ['6'],      specimenIds: ['sp4', 'sp5'], status: 'Active'   },
  { id: 'neuro',    name: 'Neuropathology',      userIds: ['6'],      specimenIds: ['sp6'],        status: 'Active'   },
  { id: 'heme',     name: 'Hematopathology',     userIds: ['9'],      specimenIds: ['sp7'],        status: 'Active'   },
  { id: 'gyn',      name: 'Gynecological',       userIds: ['1'],      specimenIds: ['sp8'],        status: 'Active'   },
  { id: 'uro',      name: 'Urological',          userIds: ['7'],      specimenIds: ['sp9'],        status: 'Active'   },
  { id: 'thoracic', name: 'Thoracic',            userIds: [],         specimenIds: [],             status: 'Inactive' },
];

const load = () => storageGet<Subspecialty[]>('formedrix_subspecialties', SEED_SUBSPECIALTIES);
const persist = (data: Subspecialty[]) => storageSet('formedrix_subspecialties', data);
let MOCK_SUBSPECIALTIES: Subspecialty[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

const findAndUpdate = (id: ID, fn: (s: Subspecialty) => Subspecialty): ServiceResult<Subspecialty> => {
  const idx = MOCK_SUBSPECIALTIES.findIndex(s => s.id === id);
  if (idx === -1) return err(`Subspecialty ${id} not found`);
  const updated = fn(MOCK_SUBSPECIALTIES[idx]);
  MOCK_SUBSPECIALTIES = MOCK_SUBSPECIALTIES.map(s => s.id === id ? updated : s);
  persist(MOCK_SUBSPECIALTIES);
  return ok({ ...updated });
};

export const mockSubspecialtyService: ISubspecialtyService = {
  async getAll() { await delay(); return ok([...MOCK_SUBSPECIALTIES]); },

  async getById(id) {
    await delay();
    const s = MOCK_SUBSPECIALTIES.find(s => s.id === id);
    return s ? ok({ ...s }) : err(`Subspecialty ${id} not found`);
  },

  async add(sub) {
    await delay();
    const newSub: Subspecialty = { ...sub, id: sub.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() };
    MOCK_SUBSPECIALTIES = [...MOCK_SUBSPECIALTIES, newSub];
    persist(MOCK_SUBSPECIALTIES);
    return ok({ ...newSub });
  },

  async update(id, changes) {
    await delay();
    return findAndUpdate(id, s => ({ ...s, ...changes }));
  },

  async deactivate(id) {
    await delay();
    return findAndUpdate(id, s => ({ ...s, status: 'Inactive', userIds: [], specimenIds: [] }));
  },

  async reactivate(id) {
    await delay();
    return findAndUpdate(id, s => ({ ...s, status: 'Active' }));
  },

  async assignUser(subspecialtyId, userId) {
    await delay();
    return findAndUpdate(subspecialtyId, s => ({
      ...s, userIds: s.userIds.includes(userId) ? s.userIds : [...s.userIds, userId],
    }));
  },

  async removeUser(subspecialtyId, userId) {
    await delay();
    return findAndUpdate(subspecialtyId, s => ({ ...s, userIds: s.userIds.filter(id => id !== userId) }));
  },

  async assignSpecimen(subspecialtyId, specimenId) {
    await delay();
    return findAndUpdate(subspecialtyId, s => ({
      ...s, specimenIds: s.specimenIds.includes(specimenId) ? s.specimenIds : [...s.specimenIds, specimenId],
    }));
  },

  async removeSpecimen(subspecialtyId, specimenId) {
    await delay();
    return findAndUpdate(subspecialtyId, s => ({ ...s, specimenIds: s.specimenIds.filter(id => id !== specimenId) }));
  },
};

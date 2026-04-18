import { IRoleService, Role } from './IRoleService';
import { ServiceResult, ID } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../../constants/systemActions';
import { storageGet, storageSet } from '../mockStorage';

// ─── Default participation type IDs ──────────────────────────────────────────
// References IDs from the master list in ParticipationTypesSection.
// These are the types each built-in role can serve as on a case.

const PATHOLOGIST_TYPE_IDS = ['primary', 'consultant', 'second_opinion', 'frozen_section'];
const RESIDENT_TYPE_IDS    = ['grossing', 'preliminary_report', 'observer'];

const SEED_ROLES: Role[] = [
  {
    id: 'pathologist', name: 'Pathologist',
    description: 'Licensed pathologist with full clinical case access and sign-out authority.',
    color: '#8AB4F8', caseAccess: true, configAccess: false,
    permissions: DEFAULT_ROLE_PERMISSIONS['Pathologist'], builtIn: true,
    participationTypeIds: PATHOLOGIST_TYPE_IDS,
  },
  {
    id: 'resident', name: 'Resident',
    description: 'Pathology resident with case access and co-sign capability.',
    color: '#81C995', caseAccess: true, configAccess: false,
    permissions: DEFAULT_ROLE_PERMISSIONS['Resident'], builtIn: true,
    participationTypeIds: RESIDENT_TYPE_IDS,
  },
  {
    id: 'admin', name: 'Admin',
    description: 'System administrator with configuration access but no clinical case access.',
    color: '#FDD663', caseAccess: false, configAccess: true,
    permissions: DEFAULT_ROLE_PERMISSIONS['Admin'], builtIn: true,
    participationTypeIds: [],
  },
  {
    id: 'physician', name: 'Physician',
    description: 'External ordering physician. Directory only — no app access.',
    color: '#C084FC', caseAccess: false, configAccess: false,
    permissions: DEFAULT_ROLE_PERMISSIONS['Physician'], builtIn: true,
    participationTypeIds: [],
  },
];

const load = () => storageGet<Role[]>('pathscribe_roles', SEED_ROLES);
const persist = (data: Role[]) => storageSet('pathscribe_roles', data);
let MOCK_ROLES: Role[] = load();

// Migrate stored roles that predate participationCapabilities
MOCK_ROLES = MOCK_ROLES.map(r => ({
  ...r,
  participationTypeIds: r.participationTypeIds ?? 
    SEED_ROLES.find(s => s.id === r.id)?.participationTypeIds ?? [],
}));

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockRoleService: IRoleService = {
  async getAll() {
    await delay();
    return ok([...MOCK_ROLES]);
  },

  async getById(id: ID) {
    await delay();
    const role = MOCK_ROLES.find(r => r.id === id);
    return role ? ok({ ...role }) : err(`Role ${id} not found`);
  },

  async add(role) {
    await delay();
    const newRole: Role = {
      ...role,
      id: role.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      participationTypeIds: role.participationTypeIds ?? [],
    };
    MOCK_ROLES = [...MOCK_ROLES, newRole];
    persist(MOCK_ROLES);
    return ok({ ...newRole });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_ROLES.findIndex(r => r.id === id);
    if (idx === -1) return err(`Role ${id} not found`);
    MOCK_ROLES = MOCK_ROLES.map(r => r.id === id ? { ...r, ...changes } : r);
    persist(MOCK_ROLES);
    return ok({ ...MOCK_ROLES[idx], ...changes });
  },

  async delete(id) {
    await delay();
    const role = MOCK_ROLES.find(r => r.id === id);
    if (!role) return err(`Role ${id} not found`);
    if (role.builtIn) return err(`Cannot delete built-in role "${role.name}"`);
    MOCK_ROLES = MOCK_ROLES.filter(r => r.id !== id);
    persist(MOCK_ROLES);
    return ok(undefined);
  },
};

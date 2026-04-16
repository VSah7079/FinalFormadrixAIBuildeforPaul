import { IUserService, StaffUser } from './IUserService';
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

// ─── Seed data (Updated with standardized Voice Profiles) ─────────────────────
const SEED_USERS: StaffUser[] = [
  { id: '1',  firstName: 'Sarah',   lastName: 'Chen',    email: 'schen@hospital.org',    roles: ['Pathologist'], npi: '1234567890', license: 'MD-12345', phone: '555-0101', department: 'Anatomic Pathology',  status: 'Active',   voiceProfile: 'EN-US' },
  { id: '2',  firstName: 'James',   lastName: 'Okafor',  email: 'jokafor@hospital.org',  roles: ['Resident'],    npi: '1234567891', license: 'MD-12346', phone: '555-0102', department: 'Anatomic Pathology',  status: 'Active',   voiceProfile: 'EN-US' },
  { id: '3',  firstName: 'Pete',    lastName: 'Nimmo',   email: 'pnimmo@hospital.org',   roles: ['Admin'],       npi: '',           license: '',         phone: '555-0103', department: 'Administration',       status: 'Active',   voiceProfile: 'EN-US' },
  { id: '4',  firstName: 'Maria',   lastName: 'Santos',  email: 'msantos@hospital.org',  roles: ['Pathologist'], npi: '1234567892', license: 'MD-12347', phone: '555-0104', department: 'Surgical Pathology',   status: 'Inactive', voiceProfile: 'EN-US' },
  { id: '5',  firstName: 'Kevin',   lastName: 'Park',    email: 'kpark@hospital.org',    roles: ['Resident'],    npi: '1234567893', license: 'MD-12348', phone: '555-0105', department: 'Anatomic Pathology',  status: 'Active',   voiceProfile: 'EN-US' },
  { id: '6',  firstName: 'Aisha',   lastName: 'Patel',   email: 'apatel@hospital.org',   roles: ['Pathologist'], npi: '1234567894', license: 'MD-12349', phone: '555-0106', department: 'Neuropathology',       status: 'Active',   voiceProfile: 'EN-US' },
  { id: '7',  firstName: 'Thomas',  lastName: 'Nguyen',  email: 'tnguyen@hospital.org',  roles: ['Pathologist'], npi: '1234567895', license: 'MD-12350', phone: '555-0107', department: 'Surgical Pathology',   status: 'Active',   voiceProfile: 'EN-US' },
  { id: '8',  firstName: 'Lisa',    lastName: 'Hoffman', email: 'lhoffman@hospital.org', roles: ['Resident'],    npi: '1234567896', license: 'MD-12351', phone: '555-0108', department: 'Anatomic Pathology',  status: 'Active',   voiceProfile: 'EN-US' },
  { id: '9',  firstName: 'Marcus',  lastName: 'Webb',    email: 'mwebb@hospital.org',    roles: ['Pathologist'], npi: '1234567897', license: 'MD-12352', phone: '555-0109', department: 'Hematopathology',      status: 'Active',   voiceProfile: 'EN-US' },
  { id: '10', firstName: 'Priya',   lastName: 'Sharma',  email: 'psharma@hospital.org',  roles: ['Resident'],    npi: '1234567898', license: 'MD-12353', phone: '555-0110', department: 'Anatomic Pathology',  status: 'Active',   voiceProfile: 'EN-US' },
];

const load = () => {
  const data = storageGet<StaffUser[]>('pathscribe_users', SEED_USERS);
  // Migration: Ensure all loaded users have a default voice profile if missing
  return data.map(u => ({ ...u, voiceProfile: u.voiceProfile || 'EN-US' }));
};

const persist = (data: StaffUser[]) => storageSet('pathscribe_users', data);
let MOCK_USERS: StaffUser[] = load();

const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockUserService: IUserService = {
  async getAll() {
    await delay();
    return ok([...MOCK_USERS]);
  },

  async getById(id: ID) {
    await delay();
    const user = MOCK_USERS.find(u => u.id === id);
    return user ? ok({ ...user }) : err(`User ${id} not found`);
  },

  async add(user) {
    await delay();
    // Default to 'EN-US' if not provided in the 'add' payload
    const newUser: StaffUser = { 
      ...user, 
      id: String(Date.now()),
      voiceProfile: user.voiceProfile || 'EN-US'
    };
    MOCK_USERS = [...MOCK_USERS, newUser];
    persist(MOCK_USERS);
    return ok({ ...newUser });
  },

  async update(id, changes) {
    await delay();
    const idx = MOCK_USERS.findIndex(u => u.id === id);
    if (idx === -1) return err(`User ${id} not found`);
    
    // Create the updated user object
    const updatedUser = { ...MOCK_USERS[idx], ...changes };
    
    MOCK_USERS = MOCK_USERS.map(u => u.id === id ? updatedUser : u);
    persist(MOCK_USERS);
    return ok(updatedUser);
  },

  async deactivate(id) {
    return mockUserService.update(id, { status: 'Inactive' });
  },

  async reactivate(id) {
    return mockUserService.update(id, { status: 'Active' });
  },
};

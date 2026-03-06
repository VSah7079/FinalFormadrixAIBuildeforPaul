import { ServiceResult, ID } from '../types';

export interface StaffUser {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  npi: string;
  license: string;
  phone: string;
  department: string;
  signatureUrl?: string;
  status: 'Active' | 'Inactive';
}

export interface IUserService {
  getAll(): Promise<ServiceResult<StaffUser[]>>;
  getById(id: ID): Promise<ServiceResult<StaffUser>>;
  add(user: Omit<StaffUser, 'id'>): Promise<ServiceResult<StaffUser>>;
  update(id: ID, changes: Partial<Omit<StaffUser, 'id'>>): Promise<ServiceResult<StaffUser>>;
  deactivate(id: ID): Promise<ServiceResult<StaffUser>>;
  reactivate(id: ID): Promise<ServiceResult<StaffUser>>;
}

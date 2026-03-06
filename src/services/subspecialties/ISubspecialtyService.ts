import { ServiceResult, ID } from '../types';

export interface Subspecialty {
  id: ID;
  name: string;
  userIds: string[];
  specimenIds: string[];
  status: 'Active' | 'Inactive';
}

export interface ISubspecialtyService {
  getAll(): Promise<ServiceResult<Subspecialty[]>>;
  getById(id: ID): Promise<ServiceResult<Subspecialty>>;
  add(subspecialty: Omit<Subspecialty, 'id'>): Promise<ServiceResult<Subspecialty>>;
  update(id: ID, changes: Partial<Omit<Subspecialty, 'id'>>): Promise<ServiceResult<Subspecialty>>;
  deactivate(id: ID): Promise<ServiceResult<Subspecialty>>;
  reactivate(id: ID): Promise<ServiceResult<Subspecialty>>;
  assignUser(subspecialtyId: ID, userId: ID): Promise<ServiceResult<Subspecialty>>;
  removeUser(subspecialtyId: ID, userId: ID): Promise<ServiceResult<Subspecialty>>;
  assignSpecimen(subspecialtyId: ID, specimenId: ID): Promise<ServiceResult<Subspecialty>>;
  removeSpecimen(subspecialtyId: ID, specimenId: ID): Promise<ServiceResult<Subspecialty>>;
}

import { ServiceResult, ID } from '../types';

export interface Flag {
  id: ID;
  name: string;
  lisCode: string;
  description: string;
  level: 'Case' | 'Specimen';
  severity: 1 | 2 | 3 | 4 | 5;
  status: 'Active' | 'Inactive';
}

export interface IFlagService {
  getAll(): Promise<ServiceResult<Flag[]>>;
  getById(id: ID): Promise<ServiceResult<Flag>>;
  add(flag: Omit<Flag, 'id'>): Promise<ServiceResult<Flag>>;
  update(id: ID, changes: Partial<Omit<Flag, 'id'>>): Promise<ServiceResult<Flag>>;
  deactivate(id: ID): Promise<ServiceResult<Flag>>;
  reactivate(id: ID): Promise<ServiceResult<Flag>>;
}

import { ServiceResult, ID } from '../types';

export type PermissionSet = Partial<Record<string, boolean>>;

export interface Role {
  id: ID;
  name: string;
  description: string;
  color: string;
  caseAccess: boolean;
  configAccess: boolean;
  permissions: PermissionSet;
  builtIn: boolean;
}

export interface IRoleService {
  getAll(): Promise<ServiceResult<Role[]>>;
  getById(id: ID): Promise<ServiceResult<Role>>;
  add(role: Omit<Role, 'id'>): Promise<ServiceResult<Role>>;
  update(id: ID, changes: Partial<Omit<Role, 'id'>>): Promise<ServiceResult<Role>>;
  delete(id: ID): Promise<ServiceResult<void>>;
}

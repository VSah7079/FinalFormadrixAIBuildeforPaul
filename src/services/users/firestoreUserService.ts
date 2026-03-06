import { IUserService } from './IUserService';

const notImplemented = (): never => { throw new Error('firestoreUserService: not yet implemented'); };

export const firestoreUserService: IUserService = {
  getAll:     notImplemented,
  getById:    notImplemented,
  add:        notImplemented,
  update:     notImplemented,
  deactivate: notImplemented,
  reactivate: notImplemented,
};

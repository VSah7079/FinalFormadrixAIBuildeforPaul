import { ServiceResult } from '../types';

export interface Shortcut {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string | null;
}

export type ShortcutMap = Record<string, Shortcut>;

export interface IShortcutService {
  getForUser(userId: string): Promise<ServiceResult<ShortcutMap>>;
  saveForUser(userId: string, shortcuts: ShortcutMap): Promise<ServiceResult<ShortcutMap>>;
  resetForUser(userId: string): Promise<ServiceResult<ShortcutMap>>;
}

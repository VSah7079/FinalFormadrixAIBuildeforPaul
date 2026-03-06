import { ServiceResult } from '../types';
import { storageGet, storageSet } from '../mockStorage';

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

// ─── Defaults ─────────────────────────────────────────────────────────────────
export const DEFAULT_SHORTCUTS: ShortcutMap = {
  'editor.bold':             { ctrl: true,  shift: true,  alt: false, meta: false, key: 'B' },
  'editor.italic':           { ctrl: true,  shift: true,  alt: false, meta: false, key: 'I' },
  'editor.underline':        { ctrl: true,  shift: true,  alt: false, meta: false, key: 'U' },
  'editor.bullets':          { ctrl: false, shift: false, alt: true,  meta: false, key: '8' },
  'editor.numbering':        { ctrl: false, shift: false, alt: true,  meta: false, key: '7' },
  'editor.increaseIndent':   { ctrl: true,  shift: false, alt: false, meta: false, key: ']' },
  'editor.decreaseIndent':   { ctrl: true,  shift: false, alt: false, meta: false, key: '[' },
  'editor.insertMacro':      { ctrl: false, shift: false, alt: true,  meta: false, key: 'M' },
  'editor.insertTable':      { ctrl: false, shift: true,  alt: false, meta: false, key: 'T' },
  'editor.insertSignature':  { ctrl: false, shift: true,  alt: false, meta: false, key: 'S' },
  'editor.find':             { ctrl: true,  shift: false, alt: false, meta: false, key: 'F' },
  'editor.replace':          { ctrl: true,  shift: true,  alt: false, meta: false, key: 'F' },
  'editor.selectAll':        { ctrl: true,  shift: false, alt: false, meta: false, key: 'A' },
  'editor.showRuler':        { ctrl: true,  shift: false, alt: true,  meta: false, key: 'R' },
  'editor.toggleFormatting': { ctrl: true,  shift: true,  alt: false, meta: false, key: 'P' },
};

// ─── Mock ─────────────────────────────────────────────────────────────────────
const userShortcuts: Record<string, ShortcutMap> = {};
const delay = () => new Promise(r => setTimeout(r, 80));
const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const mockShortcutService: IShortcutService = {
  async getForUser(userId) {
    await delay();
    return ok({ ...DEFAULT_SHORTCUTS, ...(userShortcuts[userId] ?? {}) });
  },

  async saveForUser(userId, shortcuts) {
    await delay();
    userShortcuts[userId] = { ...shortcuts };
    return ok({ ...shortcuts });
  },

  async resetForUser(userId) {
    await delay();
    delete userShortcuts[userId];
    return ok({ ...DEFAULT_SHORTCUTS });
  },
};

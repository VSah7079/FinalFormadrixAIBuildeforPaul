import React, { useState } from 'react';
import { ACTION_GROUPS, DEFAULT_ROLE_PERMISSIONS, ActionId, PermissionSet } from '../../../constants/systemActions';
import { roleService } from '../../../services';
import {
  overlay, modalBox, modalHeaderStyle, modalFooterStyle,
  cancelButtonStyle, applyButtonStyle,
} from '../../Common/modalStyles';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;         // hex badge color
  caseAccess: boolean;
  configAccess: boolean;
  permissions: PermissionSet;
  builtIn: boolean;      // built-in roles can't be deleted
}

const BUILT_IN_COLORS: Record<string, string> = {
  Pathologist: '#8AB4F8',
  Resident:    '#81C995',
  Admin:       '#FDD663',
  Physician:   '#C084FC',
};

export const DEFAULT_ROLES: Role[] = [
  { id: 'pathologist', name: 'Pathologist', description: 'Licensed pathologist with full clinical case access and sign-out authority.',    color: '#8AB4F8', caseAccess: true,  configAccess: false, permissions: DEFAULT_ROLE_PERMISSIONS['Pathologist'], builtIn: true },
  { id: 'resident',    name: 'Resident',    description: 'Pathology resident with case access and co-sign capability.',                     color: '#81C995', caseAccess: true,  configAccess: false, permissions: DEFAULT_ROLE_PERMISSIONS['Resident'],    builtIn: true },
  { id: '***REMOVED***',       name: 'Admin',       description: 'System ***REMOVED***istrator with configuration access but no clinical case access.',     color: '#FDD663', caseAccess: false, configAccess: true,  permissions: DEFAULT_ROLE_PERMISSIONS['Admin'],       builtIn: true },
  { id: 'physician',   name: 'Physician',   description: 'External ordering physician. Directory only — no app access.',                    color: '#C084FC', caseAccess: false, configAccess: false, permissions: DEFAULT_ROLE_PERMISSIONS['Physician'],   builtIn: true },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 };
const INPUT: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#e5e7eb', background: '#0f0f0f', border: '1px solid #374151', borderRadius: 7, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const FIELD: React.CSSProperties = { display: 'flex', flexDirection: 'column', marginBottom: 14 };

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: disabled ? 0.4 : 1 }}>
    <div onClick={() => !disabled && onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, cursor: disabled ? 'default' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, background: value ? '#22c55e' : '#374151', boxShadow: value ? '0 0 8px #22c55e55' : 'none' }}>
      <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: value ? 23 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: value ? '#22c55e' : '#6b7280' }}>{value ? 'Yes' : 'No'}</span>
  </div>
);

// ─── Tri-state group checkbox ─────────────────────────────────────────────────
// state: 'all' | 'some' | 'none'
type TriState = 'all' | 'some' | 'none';

function groupState(groupActionIds: ActionId[], permissions: PermissionSet): TriState {
  const granted = groupActionIds.filter(id => permissions[id]).length;
  if (granted === 0) return 'none';
  if (granted === groupActionIds.length) return 'all';
  return 'some';
}

const TriCheckbox = ({ state, onClick }: { state: TriState; onClick: () => void }) => (
  <div onClick={onClick} style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${state === 'none' ? '#374151' : '#8AB4F8'}`, background: state === 'all' ? '#8AB4F8' : state === 'some' ? 'rgba(138,180,248,0.2)' : 'transparent', transition: 'all 0.15s' }}>
    {state === 'all'  && <span style={{ color: '#0d1117', fontSize: 10, fontWeight: 900 }}>✓</span>}
    {state === 'some' && <span style={{ color: '#8AB4F8', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>—</span>}
  </div>
);

// ─── Permission Editor ────────────────────────────────────────────────────────
const PermissionEditor: React.FC<{ permissions: PermissionSet; onChange: (p: PermissionSet) => void; builtIn: boolean }> = ({ permissions, onChange, builtIn }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGroupClick = (groupActionIds: ActionId[], state: TriState) => {
    const next = { ...permissions };
    const newVal = state === 'all' ? false : true;
    groupActionIds.forEach(id => { next[id] = newVal; });
    onChange(next);
  };

  const handleActionClick = (id: ActionId) => {
    onChange({ ...permissions, [id]: !permissions[id] });
  };

  const filteredGroups = ACTION_GROUPS.map(g => ({
    ...g,
    actions: g.actions.filter(a => !search || a.label.toLowerCase().includes(search.toLowerCase())),
  })).filter(g => g.actions.length > 0);

  // Split groups into two columns
  const mid = Math.ceil(filteredGroups.length / 2);
  const leftCol  = filteredGroups.slice(0, mid);
  const rightCol = filteredGroups.slice(mid);

  const renderGroup = (group: typeof filteredGroups[0]) => {
    const groupIds = group.actions.map(a => a.id);
    const state = groupState(groupIds, permissions);
    const expanded = expandedGroups.has(group.id) || !!search;
    return (
      <div key={group.id} style={{ marginBottom: 6, border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: '#0a0a0a', cursor: 'pointer' }}
          onClick={() => toggleGroup(group.id)}>
          <TriCheckbox state={state} onClick={e => { (e as any).stopPropagation?.(); handleGroupClick(groupIds, state); }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f9fafb', flex: 1 }}>{group.title}</span>
          <span style={{ fontSize: 10, color: '#6b7280' }}>{groupIds.filter(id => permissions[id]).length}/{groupIds.length}</span>
          <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 2 }}>{expanded ? '▲' : '▼'}</span>
        </div>
        {expanded && (
          <div style={{ padding: '4px 6px 6px' }}>
            {group.actions.map(action => {
              const granted = !!permissions[action.id];
              return (
                <div key={action.id} onClick={() => handleActionClick(action.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px', borderRadius: 5, cursor: 'pointer', marginBottom: 1, background: granted ? 'rgba(138,180,248,0.05)' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = granted ? 'rgba(138,180,248,0.08)' : 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = granted ? 'rgba(138,180,248,0.05)' : 'transparent'}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0, border: `2px solid ${granted ? '#8AB4F8' : '#374151'}`, background: granted ? '#8AB4F8' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    {granted && <span style={{ color: '#0d1117', fontSize: 9, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: granted ? '#e5e7eb' : '#6b7280', flex: 1 }}>{action.label}</span>
                  {action.prebuilt && <span style={{ fontSize: 9, color: '#4b5563', fontStyle: 'italic' }}>future</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <input type="text" placeholder="Search actions..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ ...INPUT, marginBottom: 10, fontSize: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignItems: 'start' }}>
        <div>{leftCol.map(renderGroup)}</div>
        <div>{rightCol.map(renderGroup)}</div>
      </div>
    </div>
  );
};

// ─── Role Modal ───────────────────────────────────────────────────────────────
const COLOR_PRESETS = ['#8AB4F8', '#81C995', '#FDD663', '#C084FC', '#F87171', '#FB923C', '#34D399', '#22D3EE', '#A78BFA', '#F472B6'];

interface RoleModalProps {
  mode: 'add' | 'edit';
  role?: Role;
  onSave: (role: Omit<Role, 'id'>) => void;
  onClose: () => void;
}

const RoleModal: React.FC<RoleModalProps> = ({ mode, role, onSave, onClose }) => {
  const [name,         setName]         = useState(role?.name        ?? '');
  const [description,  setDescription]  = useState(role?.description ?? '');
  const [color,        setColor]        = useState(role?.color       ?? '#8AB4F8');
  const [caseAccess,   setCaseAccess]   = useState(role?.caseAccess  ?? false);
  const [configAccess, setConfigAccess] = useState(role?.configAccess ?? false);
  const [permissions,  setPermissions]  = useState<PermissionSet>(role?.permissions ?? {});
  const [errors,       setErrors]       = useState<{ name?: string }>({});
  const builtIn = role?.builtIn ?? false;

  const handleSave = async () => {
    if (!name.trim()) { setErrors({ name: 'Required' }); return; }
    onSave({ name, description, color, caseAccess, configAccess, permissions, builtIn });
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, maxWidth: 820, maxHeight: '95vh', padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...modalHeaderStyle, padding: '20px 24px 0', flexShrink: 0 }}>
          {mode === 'add' ? 'Add Role' : `Edit Role — ${role?.name}`}
          {builtIn && <span style={{ marginLeft: 10, fontSize: 11, color: '#6b7280', fontWeight: 400 }}>Built-in role</span>}
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Name + Color */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, marginBottom: 14 }}>
            <div style={FIELD}>
              <label style={LABEL}>Role Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={{ ...INPUT, borderColor: errors.name ? '#ef4444' : '#374151' }} value={name}
                onChange={e => { setName(e.target.value); setErrors({}); }} placeholder="e.g. Fellow, Lab Director" disabled={builtIn} />
              {errors.name && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{errors.name}</span>}
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Badge Color</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 160, paddingTop: 2 }}>
                {COLOR_PRESETS.map(c => (
                  <div key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid #fff' : '2px solid transparent', boxShadow: color === c ? `0 0 8px ${c}88` : 'none', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={FIELD}>
            <label style={LABEL}>Description</label>
            <textarea style={{ ...INPUT, resize: 'vertical', minHeight: 60 }} value={description}
              onChange={e => setDescription(e.target.value)} placeholder="Describe what this role is for..." />
          </div>

          {/* Access flags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={FIELD}>
              <label style={LABEL}>Case Access</label>
              <Toggle value={caseAccess} onChange={setCaseAccess} />
              <span style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>Can view and work on clinical cases</span>
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Config Access</label>
              <Toggle value={configAccess} onChange={setConfigAccess} />
              <span style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>Can access Configuration module</span>
            </div>
          </div>

          {/* Preview badge */}
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Badge Preview</label>
            <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44` }}>{name || 'Role Name'}</span>
          </div>

          {/* Permissions */}
          <div>
            <label style={{ ...LABEL, marginBottom: 8 }}>Permissions</label>
            <PermissionEditor permissions={permissions} onChange={setPermissions} builtIn={builtIn} />
          </div>

        </div>

        <div style={{ ...modalFooterStyle, padding: '12px 24px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
          <button style={cancelButtonStyle} onClick={onClose}>Cancel</button>
          <button style={applyButtonStyle} onClick={handleSave}>
            {mode === 'add' ? 'Add Role' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main RoleDictionary ──────────────────────────────────────────────────────
const RoleDictionary: React.FC<{ onRolesChange?: (roles: Role[]) => void }> = ({ onRolesChange }) => {
  const [roles,   setRoles]   = useState<Role[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    roleService.getAll().then(res => {
      if (res.ok) {
        setRoles(res.data);
        onRolesChange?.(res.data);
      } else {
        onRolesChange?.(DEFAULT_ROLES);
      }
      setLoading(false);
    });
  }, []);
  const [search, setSearch] = useState('');
  const [modal,  setModal]  = useState<{ mode: 'add' | 'edit'; role?: Role } | null>(null);

  const filtered = roles.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async (draft: Omit<Role, 'id'>) => {
    if (modal?.mode === 'add') {
      const res = await roleService.add({ ...draft, builtIn: false });
      if (res.ok) {
        const next = [...roles, res.data];
        setRoles(next);
        onRolesChange?.(next);
      }
    } else if (modal?.role) {
      const res = await roleService.update(modal.role.id, draft);
      if (res.ok) {
        const next = roles.map(r => r.id === res.data.id ? res.data : r);
        setRoles(next);
        onRolesChange?.(next);
      }
    }
    setModal(null);
  };

  const permissionCount = (r: Role) => Object.values(r.permissions).filter(Boolean).length;

  if (loading) return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading roles...</div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Role Dictionary</h2>
          <p style={{ fontSize: 14, color: '#9AA0A6' }}>Define roles and their system permissions.</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          style={{ padding: '8px 16px', background: '#8AB4F8', color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#6a9de0'}
          onMouseLeave={e => e.currentTarget.style.background = '#8AB4F8'}
        >+ Add Role</button>
      </div>

      <input type="text" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ ...INPUT, marginBottom: 16 }} />

      <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d1117' }}>
              {['Role', 'Description', 'Case Access', 'Config Access', 'Permissions', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((role, i) => (
              <tr key={role.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: `${role.color}22`, color: role.color, border: `1px solid ${role.color}44` }}>{role.name}</span>
                    {role.builtIn && <span style={{ fontSize: 10, color: '#4b5563' }}>built-in</span>}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#9AA0A6', maxWidth: 240 }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{role.description}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: role.caseAccess ? '#22c55e' : '#4b5563' }}>
                    {role.caseAccess ? '✓ Yes' : '— No'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: role.configAccess ? '#22c55e' : '#4b5563' }}>
                    {role.configAccess ? '✓ Yes' : '— No'}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, maxWidth: 80, height: 4, background: '#1f2937', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: role.color, width: `${Math.round(permissionCount(role) / 70 * 100)}%`, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{permissionCount(role)}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => setModal({ mode: 'edit', role })}
                    style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, background: 'rgba(255,255,255,0.07)', cursor: 'pointer', color: '#DEE4E7' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  >Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <RoleModal mode={modal.mode} role={modal.role} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

export default RoleDictionary;

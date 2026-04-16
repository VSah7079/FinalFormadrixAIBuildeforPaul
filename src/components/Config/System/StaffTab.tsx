import React, { useState, useRef } from 'react';
import { useSubspecialties } from '../../../contexts/useSubspecialties';
import {
  overlay, modalBox, modalHeaderStyle, modalFooterStyle,
  cancelButtonStyle, applyButtonStyle,
} from '../../Common/modalStyles';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Pathologist' | 'Resident' | 'Admin';
  npi: string;
  license: string;
  phone: string;
  department: string;
  signatureUrl?: string;
  status: 'Active' | 'Inactive';
}

export const USERS: StaffUser[] = [
  { id: '1',  firstName: 'Sarah',   lastName: 'Chen',    email: 'schen@hospital.org',    role: 'Pathologist', npi: '1234567890', license: 'MD-12345', phone: '555-0101', department: 'Anatomic Pathology',  status: 'Active'   },
  { id: '2',  firstName: 'James',   lastName: 'Okafor',  email: 'jokafor@hospital.org',  role: 'Resident',    npi: '1234567891', license: 'MD-12346', phone: '555-0102', department: 'Anatomic Pathology',  status: 'Active'   },
  { id: '3',  firstName: 'Pete',    lastName: 'Nimmo',   email: 'pnimmo@hospital.org',   role: 'Admin',       npi: '',           license: '',         phone: '555-0103', department: 'Administration',       status: 'Active'   },
  { id: '4',  firstName: 'Maria',   lastName: 'Santos',  email: 'msantos@hospital.org',  role: 'Pathologist', npi: '1234567892', license: 'MD-12347', phone: '555-0104', department: 'Surgical Pathology',   status: 'Inactive' },
  { id: '5',  firstName: 'Kevin',   lastName: 'Park',    email: 'kpark@hospital.org',    role: 'Resident',    npi: '1234567893', license: 'MD-12348', phone: '555-0105', department: 'Anatomic Pathology',  status: 'Active'   },
  { id: '6',  firstName: 'Aisha',   lastName: 'Patel',   email: 'apatel@hospital.org',   role: 'Pathologist', npi: '1234567894', license: 'MD-12349', phone: '555-0106', department: 'Neuropathology',       status: 'Active'   },
  { id: '7',  firstName: 'Thomas',  lastName: 'Nguyen',  email: 'tnguyen@hospital.org',  role: 'Pathologist', npi: '1234567895', license: 'MD-12350', phone: '555-0107', department: 'Surgical Pathology',   status: 'Active'   },
  { id: '8',  firstName: 'Lisa',    lastName: 'Hoffman', email: 'lhoffman@hospital.org', role: 'Resident',    npi: '1234567896', license: 'MD-12351', phone: '555-0108', department: 'Anatomic Pathology',  status: 'Active'   },
  { id: '9',  firstName: 'Marcus',  lastName: 'Webb',    email: 'mwebb@hospital.org',    role: 'Pathologist', npi: '1234567897', license: 'MD-12352', phone: '555-0109', department: 'Hematopathology',      status: 'Active'   },
  { id: '10', firstName: 'Priya',   lastName: 'Sharma',  email: 'psharma@hospital.org',  role: 'Resident',    npi: '1234567898', license: 'MD-12353', phone: '555-0110', department: 'Anatomic Pathology',  status: 'Active'   },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const roleStyle: Record<string, React.CSSProperties> = {
  Pathologist: { color: '#8AB4F8', background: 'rgba(138,180,248,0.15)', border: '1px solid rgba(138,180,248,0.25)' },
  Resident:    { color: '#81C995', background: 'rgba(129,201,149,0.15)', border: '1px solid rgba(129,201,149,0.25)' },
  Admin:       { color: '#FDD663', background: 'rgba(253,214,99,0.12)',  border: '1px solid rgba(253,214,99,0.25)'  },
};
const subBadge: React.CSSProperties = {
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, marginRight: 4, marginBottom: 2,
  background: 'rgba(0,163,196,0.1)', color: '#00A3C4',
  border: '1px solid rgba(0,163,196,0.25)',
};
const FIELD: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 };
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' };
const INPUT: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#e5e7eb', background: '#0f0f0f', border: '1px solid #374151', borderRadius: 7, outline: 'none', width: '100%', boxSizing: 'border-box' };
const SELECT: React.CSSProperties = { ...INPUT, cursor: 'pointer', appearance: 'none' };
const ROW: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };

function initials(u: StaffUser) { return (u.firstName[0] + u.lastName[0]).toUpperCase(); }
function fullName(u: StaffUser) { return `${u.firstName} ${u.lastName}`; }

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, background: value ? '#22c55e' : '#374151', boxShadow: value ? '0 0 8px #22c55e55' : 'none' }}>
      <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: value ? 23 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: value ? '#22c55e' : '#6b7280' }}>{value ? 'Active' : 'Inactive'}</span>
  </div>
);

// ─── Signature Upload ─────────────────────────────────────────────────────────
const SignatureUpload = ({ url, onChange }: { url?: string; onChange: (url: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {url ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 6, padding: '6px 12px', border: '1px solid #374151' }}>
            <img src={url} alt="Signature" style={{ maxHeight: 48, maxWidth: 200, display: 'block' }} />
          </div>
          <button onClick={() => onChange('')} style={{ fontSize: 11, color: '#ef4444', background: 'transparent', border: '1px solid #374151', borderRadius: 5, padding: '4px 10px', cursor: 'pointer' }}>Remove</button>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()} style={{ border: '2px dashed #374151', borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', color: '#6b7280', fontSize: 13 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#4b5563'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#374151'}>
          &#128444;&nbsp; Click to upload signature image
          <div style={{ fontSize: 11, marginTop: 4, color: '#4b5563' }}>PNG, JPG, SVG — transparent background recommended</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
type Draft = { firstName: string; lastName: string; email: string; role: 'Pathologist' | 'Resident' | 'Admin'; npi: string; license: string; phone: string; department: string; signatureUrl: string; active: boolean };
const emptyDraft: Draft = { firstName: '', lastName: '', email: '', role: 'Pathologist', npi: '', license: '', phone: '', department: '', signatureUrl: '', active: true };

interface StaffModalProps {
  mode: 'add' | 'edit';
  user?: StaffUser;
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const StaffModal: React.FC<StaffModalProps> = ({ mode, user, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(
    user ? { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, npi: user.npi, license: user.license, phone: user.phone, department: user.department, signatureUrl: user.signatureUrl || '', active: user.status === 'Active' }
         : emptyDraft
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const set = (k: keyof Draft, v: any) => { setDraft(prev => ({ ...prev, [k]: v })); setErrors(prev => ({ ...prev, [k]: '' })); };

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.firstName.trim()) e.firstName = 'Required';
    if (!draft.lastName.trim())  e.lastName  = 'Required';
    if (!draft.email.trim())     e.email     = 'Required';
    else if (!/\S+@\S+\.\S+/.test(draft.email)) e.email = 'Invalid email';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave(draft);
  };

  return (
    <div style={overlay}>
      <div style={{ ...modalBox, maxWidth: 600, maxHeight: '95vh', padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...modalHeaderStyle, padding: '20px 24px 0', flexShrink: 0 }}>
          {mode === 'add' ? 'Add Staff Member' : `Edit — ${user?.firstName} ${user?.lastName}`}
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>First Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={{ ...INPUT, borderColor: errors.firstName ? '#ef4444' : '#374151' }} value={draft.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
              {errors.firstName && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.firstName}</span>}
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Last Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={{ ...INPUT, borderColor: errors.lastName ? '#ef4444' : '#374151' }} value={draft.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
              {errors.lastName && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.lastName}</span>}
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>Email <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={{ ...INPUT, borderColor: errors.email ? '#ef4444' : '#374151' }} value={draft.email} onChange={e => set('email', e.target.value)} placeholder="user@hospital.org" />
              {errors.email && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.email}</span>}
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Role</label>
              <select style={SELECT} value={draft.role} onChange={e => set('role', e.target.value)}>
                <option value="Pathologist" style={{ background: '#0f0f0f' }}>Pathologist</option>
                <option value="Resident"    style={{ background: '#0f0f0f' }}>Resident</option>
                <option value="Admin"       style={{ background: '#0f0f0f' }}>Admin</option>
              </select>
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>NPI Number</label>
              <input style={INPUT} value={draft.npi} onChange={e => set('npi', e.target.value)} placeholder="10-digit NPI" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>License Number</label>
              <input style={INPUT} value={draft.license} onChange={e => set('license', e.target.value)} placeholder="State license #" />
            </div>
          </div>

          <div style={ROW}>
            <div style={FIELD}>
              <label style={LABEL}>Phone</label>
              <input style={INPUT} value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="555-0100" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Department</label>
              <input style={INPUT} value={draft.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Surgical Pathology" />
            </div>
          </div>

          <div style={FIELD}>
            <label style={LABEL}>Status</label>
            <Toggle value={draft.active} onChange={v => set('active', v)} />
          </div>

          <div style={FIELD}>
            <label style={LABEL}>Signature</label>
            <SignatureUpload url={draft.signatureUrl} onChange={url => set('signatureUrl', url)} />
          </div>

        </div>

        <div style={{ ...modalFooterStyle, padding: '12px 24px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
          <button style={cancelButtonStyle} onClick={onClose}>Cancel</button>
          <button style={applyButtonStyle} onClick={handleSave}>
            {mode === 'add' ? 'Add Staff Member' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main StaffTab ────────────────────────────────────────────────────────────
const StaffTab: React.FC = () => {
  const { subspecialties } = useSubspecialties();
  const [users, setUsers]           = useState<StaffUser[]>(USERS);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [modal, setModal]           = useState<{ mode: 'add' | 'edit'; user?: StaffUser } | null>(null);

  const userSubsMap: Record<string, string[]> = {};
  subspecialties.forEach(sub => {
    sub.userIds.forEach(uid => {
      if (!userSubsMap[uid]) userSubsMap[uid] = [];
      userSubsMap[uid].push(sub.name);
    });
  });

  const filtered = users.filter(u => {
    const name = fullName(u).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (roleFilter === 'All' || u.role === roleFilter);
  });

  const handleSave = (draft: Draft) => {
    if (modal?.mode === 'add') {
      setUsers(prev => [...prev, {
        id: String(Date.now()), firstName: draft.firstName, lastName: draft.lastName,
        email: draft.email, role: draft.role, npi: draft.npi, license: draft.license,
        phone: draft.phone, department: draft.department, signatureUrl: draft.signatureUrl,
        status: draft.active ? 'Active' : 'Inactive',
      }]);
    } else if (modal?.user) {
      setUsers(prev => prev.map(u => u.id === modal.user!.id
        ? { ...u, firstName: draft.firstName, lastName: draft.lastName, email: draft.email, role: draft.role, npi: draft.npi, license: draft.license, phone: draft.phone, department: draft.department, signatureUrl: draft.signatureUrl, status: draft.active ? 'Active' : 'Inactive' }
        : u
      ));
    }
    setModal(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>Staff</h2>
          <p style={{ fontSize: '14px', color: '#9AA0A6' }}>Manage pathologists, residents, and administrators.</p>
        </div>
        <button
          style={{ padding: '8px 16px', background: '#8AB4F8', color: '#0d1117', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#6a9de0'}
          onMouseLeave={e => e.currentTarget.style.background = '#8AB4F8'}
          onClick={() => setModal({ mode: 'add' })}
        >+ Add Staff</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input type="text" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '14px', color: '#DEE4E7', outline: 'none' }} />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', fontSize: '14px', color: '#DEE4E7', outline: 'none', cursor: 'pointer' }}>
          {['All', 'Pathologist', 'Resident', 'Admin'].map(r => <option key={r} style={{ background: '#1e293b' }}>{r}</option>)}
        </select>
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: '#0d1117' }}>
                {['Staff Member', 'Email', 'Role', 'Subspecialties', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const subs = userSubsMap[u.id] || [];
                return (
                  <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(138,180,248,0.2)', border: '1.5px solid rgba(138,180,248,0.5)', color: '#8AB4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                          {initials(u)}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#DEE4E7' }}>{fullName(u)}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#9AA0A6' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, ...roleStyle[u.role] }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {subs.length === 0
                        ? <span style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>None</span>
                        : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>{subs.map(s => <span key={s} style={subBadge}>{s}</span>)}</div>
                      }
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.status === 'Active' ? '#22c55e' : '#4b5563', display: 'inline-block', flexShrink: 0, boxShadow: u.status === 'Active' ? '0 0 6px #22c55e99' : 'none' }} />
                        <span style={{ fontSize: '13px', color: u.status === 'Active' ? '#d1d5db' : '#6b7280' }}>{u.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        style={{ padding: '5px 14px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', color: '#DEE4E7' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                        onClick={() => setModal({ mode: 'edit', user: u })}
                      >Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <StaffModal mode={modal.mode} user={modal.user} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

export default StaffTab;

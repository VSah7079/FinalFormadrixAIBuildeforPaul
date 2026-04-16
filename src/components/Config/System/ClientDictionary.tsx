import React, { useState, useMemo, useEffect } from 'react';
import '../../../pathscribe.css';
import { clientService } from '../../../services';
import {
  overlay, modalBox, modalHeaderStyle, modalFooterStyle,
  cancelButtonStyle, applyButtonStyle,
} from '../../Common/modalStyles';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ClientCodeSystems {
  icd: 'ICD-10' | 'ICD-11' | 'both';
  icdOEnabled: boolean;  // ICD-O-3.2 for NHS COSD / NCRAS oncology reporting
}

export interface Client {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string;
  email: string;
  contactName: string;
  contactTitle: string;
  notes: string;
  status: 'Active' | 'Inactive';
  /** Per-institution code system configuration (SR-25) */
  codeSystems: ClientCodeSystems;
}

// Clients loaded via clientService

// ─── Styles ───────────────────────────────────────────────────────────────────
const FIELD: React.CSSProperties  = { display: 'flex', flexDirection: 'column', gap: 5 };
const LABEL: React.CSSProperties  = { fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' };
const INPUT: React.CSSProperties  = { padding: '9px 12px', fontSize: 13, color: '#e5e7eb', background: '#0f0f0f', border: '1px solid #374151', borderRadius: 7, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
const TEXTAREA: React.CSSProperties = { ...INPUT, resize: 'vertical', minHeight: 64 } as React.CSSProperties;
const ROW2: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };
const ROW3: React.CSSProperties   = { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 };

// ─── Avatar ───────────────────────────────────────────────────────────────────
const ClientAvatar = ({ name: _name, code }: { name: string; code: string }) => (
  <div style={{
    width: 34, height: 34, minWidth: 34, borderRadius: 8, flexShrink: 0,
    background: 'radial-gradient(circle at 35% 35%, #2d5a8e, #0d1f35 60%)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#7eb8f7', fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
  }}>
    {code.slice(0, 3)}
  </div>
);

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, background: value ? '#22c55e' : '#374151', boxShadow: value ? '0 0 8px #22c55e55' : 'none' }}>
      <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: value ? 23 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 600, color: value ? '#22c55e' : '#6b7280' }}>{value ? 'Active' : 'Inactive'}</span>
  </div>
);

// ─── Draft ────────────────────────────────────────────────────────────────────
type Draft = Omit<Client, 'id'>;

const defaultCodeSystems: ClientCodeSystems = {
  icd: 'ICD-10',
  icdOEnabled: false,
};

const emptyDraft: Draft = {
  name: '', code: '', address: '', city: '', state: '', zip: '',
  phone: '', fax: '', email: '', contactName: '', contactTitle: '',
  notes: '', status: 'Active',
  codeSystems: { ...defaultCodeSystems },
};

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ClientModalProps {
  mode: 'add' | 'edit';
  client?: Client;
  onSave: (draft: Draft) => void;
  onClose: () => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ mode, client, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(
    client ? {
      name: client.name, code: client.code, address: client.address,
      city: client.city, state: client.state, zip: client.zip,
      phone: client.phone, fax: client.fax, email: client.email,
      contactName: client.contactName, contactTitle: client.contactTitle,
      notes: client.notes, status: client.status,
      codeSystems: client.codeSystems ?? { ...defaultCodeSystems },
    }
           : { ...emptyDraft }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const handleSave = () => {
    const e: typeof errors = {};
    if (!draft.name.trim()) e.name = 'Required';
    if (!draft.code.trim()) e.code = 'Required';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave(draft);
  };

  const inputStyle = (k: keyof Draft) => ({ ...INPUT, borderColor: errors[k] ? '#ef4444' : '#374151' });

  return (
    <div data-capture-hide="true" style={overlay}>
      <div style={{ ...modalBox, maxWidth: 580, maxHeight: '92vh', padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...modalHeaderStyle, padding: '20px 24px 16px', flexShrink: 0 }}>
          {mode === 'add' ? 'Add Client' : `Edit Client — ${client?.name}`}
        </div>

        <div style={{ padding: '0 24px 16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name + Code */}
          <div style={ROW2}>
            <div style={FIELD}>
              <label style={LABEL}>Client Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle('name')} value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Metro General Hospital" />
              {errors.name && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.name}</span>}
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Client Code <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={{ ...inputStyle('code'), textTransform: 'uppercase' }} value={draft.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. MGH" maxLength={8} />
              {errors.code && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.code}</span>}
            </div>
          </div>

          {/* Address */}
          <div style={FIELD}>
            <label style={LABEL}>Street Address</label>
            <input style={INPUT} value={draft.address} onChange={e => set('address', e.target.value)} placeholder="Street address" />
          </div>

          {/* City / State / Zip */}
          <div style={ROW3}>
            <div style={FIELD}>
              <label style={LABEL}>City</label>
              <input style={INPUT} value={draft.city} onChange={e => set('city', e.target.value)} placeholder="City" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>State</label>
              <input style={INPUT} value={draft.state} onChange={e => set('state', e.target.value.toUpperCase())} placeholder="AZ" maxLength={2} />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>ZIP</label>
              <input style={INPUT} value={draft.zip} onChange={e => set('zip', e.target.value)} placeholder="85001" maxLength={10} />
            </div>
          </div>

          {/* Phone / Fax */}
          <div style={ROW2}>
            <div style={FIELD}>
              <label style={LABEL}>Phone</label>
              <input style={INPUT} value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="602-555-0100" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Fax</label>
              <input style={INPUT} value={draft.fax} onChange={e => set('fax', e.target.value)} placeholder="602-555-0101" />
            </div>
          </div>

          {/* Email */}
          <div style={FIELD}>
            <label style={LABEL}>Email</label>
            <input style={INPUT} type="email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="lab@facility.org" />
          </div>

          {/* Contact */}
          <div style={ROW2}>
            <div style={FIELD}>
              <label style={LABEL}>Primary Contact Name</label>
              <input style={INPUT} value={draft.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Full name" />
            </div>
            <div style={FIELD}>
              <label style={LABEL}>Contact Title</label>
              <input style={INPUT} value={draft.contactTitle} onChange={e => set('contactTitle', e.target.value)} placeholder="Lab Director" />
            </div>
          </div>

          {/* Notes */}
          <div style={FIELD}>
            <label style={LABEL}>Notes</label>
            <textarea style={TEXTAREA} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special instructions or notes..." />
          </div>

          {/* ── Code Systems (SR-25) ── */}
          <div style={{ borderTop: '1px solid #1f2937', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Code Systems
            </div>

            {/* ICD version selector */}
            <div style={FIELD}>
              <label style={LABEL}>ICD Version</label>
              <div style={{ display: 'flex', gap: 0, borderRadius: 7, overflow: 'hidden', border: '1px solid #374151' }}>
                {([
                  { value: 'ICD-10',  label: 'ICD-10',          hint: 'Current standard' },
                  { value: 'both',    label: 'Both',             hint: 'Transition mode'  },
                  { value: 'ICD-11',  label: 'ICD-11',           hint: 'New standard'     },
                ] as const).map((opt, i) => {
                  const active = draft.codeSystems.icd === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('codeSystems', { ...draft.codeSystems, icd: opt.value })}
                      style={{
                        flex: 1, padding: '8px 6px', fontSize: 12, fontWeight: active ? 700 : 500,
                        background: active ? '#8AB4F8' : 'transparent',
                        color: active ? '#0d1117' : '#9AA0A6',
                        border: 'none',
                        borderLeft: i > 0 ? '1px solid #374151' : 'none',
                        cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(138,180,248,0.08)'; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span>{opt.label}</span>
                      <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
              {draft.codeSystems.icd === 'both' && (
                <div style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 6, padding: '7px 10px', marginTop: 6, lineHeight: 1.5 }}>
                  <strong>Transition mode:</strong> ICD-10 and ICD-11 tabs both appear in the code panel. Pathologists can assign codes in both systems simultaneously. Remove ICD-10 once the institution has fully migrated.
                </div>
              )}
              {draft.codeSystems.icd === 'ICD-11' && (
                <div style={{ fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '7px 10px', marginTop: 6, lineHeight: 1.5 }}>
                  ICD-11 only. ICD-10 tab hidden. Codes use the new alphanumeric format (e.g. XH1234).
                </div>
              )}
            </div>

            {/* ICD-O-3.2 toggle */}
            <div style={{ ...FIELD, marginTop: 12 }}>
              <label style={LABEL}>ICD-O-3.2 <span style={{ color: '#6b7280', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(NHS COSD / NCRAS oncology)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${draft.codeSystems.icdOEnabled ? 'rgba(138,180,248,0.3)' : '#374151'}`, borderRadius: 8, transition: 'border-color 0.2s' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#DEE4E7', fontWeight: 600 }}>
                    {draft.codeSystems.icdOEnabled ? 'ICD-O-3.2 enabled' : 'ICD-O-3.2 disabled'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {draft.codeSystems.icdOEnabled
                      ? 'Morphology + Topography tab visible in code panel. Required for COSD submission.'
                      : 'Enable for NHS trusts submitting to the National Cancer Registration and Analysis Service.'}
                  </div>
                </div>
                <Toggle
                  value={draft.codeSystems.icdOEnabled}
                  onChange={v => set('codeSystems', { ...draft.codeSystems, icdOEnabled: v })}
                />
              </div>
              {draft.codeSystems.icdOEnabled && (
                <div style={{ fontSize: 11, color: '#8AB4F8', background: 'rgba(138,180,248,0.06)', border: '1px solid rgba(138,180,248,0.15)', borderRadius: 6, padding: '7px 10px', marginTop: 4, lineHeight: 1.5 }}>
                  ICD-O-3.2 codes are per-specimen. Morphology codes include the behavior digit (e.g. 8500/3 — malignant). Both Morphology and Topography axes are supported.
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div style={FIELD}>
            <label style={LABEL}>Status</label>
            <Toggle value={draft.status === 'Active'} onChange={v => set('status', v ? 'Active' : 'Inactive')} />
          </div>

        </div>

        <div style={{ ...modalFooterStyle, padding: '12px 24px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
          <button style={cancelButtonStyle} onClick={onClose}>Cancel</button>
          <button style={applyButtonStyle} onClick={handleSave}>
            {mode === 'add' ? 'Add Client' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ClientDictionary: React.FC = () => {
  const [clients,      setClients]     = useState<Client[]>([]);
  const [loading,      setLoading]     = useState(true);

  useEffect(() => {
    clientService.getAll().then(res => {
      if (res.ok) setClients(res.data as any);
      setLoading(false);
    });
  }, []);
  const [search,       setSearch]      = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [modal,        setModal]       = useState<{ mode: 'add' | 'edit'; client?: Client } | null>(null);

  const filtered = useMemo(() => clients.filter(c => {
    const matchSearch = !search || [c.name, c.code, c.city, c.contactName, c.email]
      .some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchSearch && matchStatus;
  }), [clients, search, statusFilter]);

  const handleSave = async (draft: Draft) => {
    if (modal?.mode === 'add') {
      const res = await clientService.add(draft);
      if (res.ok) setClients((prev: any) => [...prev, res.data]);
    } else if (modal?.client) {
      const res = await clientService.update(modal.client.id, draft);
      if (res.ok) setClients((prev: any) => prev.map((c: any) => c.id === res.data.id ? res.data : c));
    }
    setModal(null);
  };

  const toggleStatus = async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;
    const res = client.status === 'Active'
      ? await clientService.deactivate(id)
      : await clientService.reactivate(id);
    if (res.ok) setClients((prev: any) => prev.map((c: any) => c.id === id ? res.data : c));
  };

  const activeCount   = clients.filter(c => c.status === 'Active').length;
  const inactiveCount = clients.filter(c => c.status === 'Inactive').length;

  if (loading) return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading clients...</div>
  );

  return (
    <div style={{ padding: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Client Dictionary</h2>
          <p style={{ fontSize: 14, color: '#9AA0A6' }}>
            Manage client facilities for report delivery and result routing.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          style={{ padding: '8px 16px', background: '#8AB4F8', color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.background = '#6a9de0'}
          onMouseLeave={e => e.currentTarget.style.background = '#8AB4F8'}
        >+ Add Client</button>
      </div>

      {/* Stats */}
      <div data-capture-hide="true" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total',    value: clients.length,  color: '#9AA0A6' },
          { label: 'Active',   value: activeCount,     color: '#22c55e' },
          { label: 'Inactive', value: inactiveCount,   color: '#6b7280' },
        ].map(s => (
          <div key={s.label} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div data-capture-hide="true" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 14, color: '#DEE4E7', outline: 'none', fontFamily: 'inherit' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding: '9px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 14, color: '#DEE4E7', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          {['All', 'Active', 'Inactive'].map(s => <option key={s} value={s} style={{ background: '#1e293b' }}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div data-capture-hide="true" style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ maxHeight: 'calc(100vh - 420px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr style={{ background: '#0d1117' }}>
                {['Client', 'Code', 'Location', 'Contact', 'Phone / Fax', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#4b5563', fontSize: 14 }}>
                    No clients match your search.
                  </td>
                </tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', opacity: c.status === 'Inactive' ? 0.6 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Client name */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ClientAvatar name={c.name} code={c.code} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#DEE4E7' }}>{c.name}</div>
                        {c.notes && <div style={{ fontSize: 11, color: '#4b5563', marginTop: 1 }}>{c.notes}</div>}
                        {/* Code system badges */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {(c.codeSystems?.icd === 'ICD-10' || c.codeSystems?.icd === 'both') && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>ICD-10</span>
                          )}
                          {(c.codeSystems?.icd === 'ICD-11' || c.codeSystems?.icd === 'both') && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(34,197,94,0.1)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}>ICD-11</span>
                          )}
                          {c.codeSystems?.icdOEnabled && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: 'rgba(138,180,248,0.1)', color: '#8AB4F8', border: '1px solid rgba(138,180,248,0.2)' }}>ICD-O-3.2</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Code */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8AB4F8', background: 'rgba(138,180,248,0.1)', border: '1px solid rgba(138,180,248,0.2)', padding: '2px 8px', borderRadius: 4 }}>{c.code}</span>
                  </td>

                  {/* Location */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#9AA0A6' }}>
                    {c.city && c.state ? `${c.city}, ${c.state}` : c.address || '—'}
                  </td>

                  {/* Contact */}
                  <td style={{ padding: '14px 16px' }}>
                    {c.contactName ? (
                      <div>
                        <div style={{ fontSize: 13, color: '#DEE4E7' }}>{c.contactName}</div>
                        {c.contactTitle && <div style={{ fontSize: 11, color: '#6b7280' }}>{c.contactTitle}</div>}
                      </div>
                    ) : <span style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>—</span>}
                  </td>

                  {/* Phone / Fax */}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#9AA0A6' }}>
                    {c.phone && <div>{c.phone}</div>}
                    {c.fax   && <div style={{ fontSize: 11, color: '#6b7280' }}>Fax: {c.fax}</div>}
                    {!c.phone && !c.fax && <span style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>—</span>}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <div
                      onClick={() => toggleStatus(c.id)}
                      title={`Click to ${c.status === 'Active' ? 'deactivate' : 'activate'}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: c.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: c.status === 'Active' ? '#22c55e' : '#6b7280', border: `1px solid ${c.status === 'Active' ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)'}` }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'Active' ? '#22c55e' : '#6b7280', flexShrink: 0 }} />
                      {c.status}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => setModal({ mode: 'edit', client: c })}
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
      </div>

      {modal && <ClientModal mode={modal.mode} client={modal.client} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
};

export default ClientDictionary;

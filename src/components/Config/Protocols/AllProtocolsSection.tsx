/**
 * AllProtocolsSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete protocol library — active, staged, draft, archived — in one view.
 * Previously the empty "All Templates" stub in TemplatesTab.
 *
 * Architecture role:
 *   One of three sub-sections in the merged Protocols tab. Shows every protocol
 *   in the registry regardless of lifecycle state. Useful for ***REMOVED***s who need
 *   a full picture of what exists, what's pending, and what's been archived.
 *
 * Consumed by:
 *   components/Config/Protocols/index.tsx  (renders as 'all' sub-section)
 *
 * Related files:
 *   protocols/protocolRegistry.ts   ← base + override registry
 *   ActiveProtocolsSection.tsx       ← validated-only view
 *   ReviewQueueSection.tsx           ← in-review/staged view
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadProtocolRegistry } from '../../../protocols/protocolRegistry';

type LifecycleFilter = 'all' | 'validated' | 'staged' | 'draft' | 'in_review' | 'needs_changes' | 'approved';

const LIFECYCLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  validated:     { bg: 'rgba(16,185,129,0.12)',  color: '#10B981',  border: 'rgba(16,185,129,0.3)'  },
  draft:         { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8',  border: 'rgba(100,116,139,0.3)' },
  in_review:     { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24',  border: 'rgba(245,158,11,0.3)'  },
  needs_changes: { bg: 'rgba(239,68,68,0.12)',   color: '#f87171',  border: 'rgba(239,68,68,0.3)'   },
  approved:      { bg: 'rgba(16,185,129,0.08)',  color: '#6ee7b7',  border: 'rgba(16,185,129,0.2)'  },
  staged:        { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa',  border: 'rgba(139,92,246,0.3)'  },
  published:     { bg: 'rgba(8,145,178,0.12)',   color: '#38bdf8',  border: 'rgba(8,145,178,0.3)'   },
};

const LifecycleBadge: React.FC<{ lifecycle: string }> = ({ lifecycle }) => {
  const s = LIFECYCLE_STYLES[lifecycle] ?? LIFECYCLE_STYLES.draft;
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, padding: '2px 10px',
      borderRadius: '99px', background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {lifecycle.replace('_', ' ')}
    </span>
  );
};

const FILTER_OPTIONS: { id: LifecycleFilter; label: string }[] = [
  { id: 'all',           label: 'All'           },
  { id: 'validated',     label: 'Active'        },
  { id: 'staged',        label: 'Staged'        },
  { id: 'in_review',     label: 'In Review'     },
  { id: 'needs_changes', label: 'Needs Changes' },
  { id: 'draft',         label: 'Draft'         },
];

const AllProtocolsSection: React.FC = () => {
  const navigate = useNavigate();
  const [search,          setSearch]         = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('all');

  const registry = loadProtocolRegistry();

  // Include mock staged template alongside registry
  const allProtocols = [
    ...Object.values(registry),
    { id: 'breast_dcis_resection', name: 'Breast DCIS – Resection', version: '4.4.0.0', lifecycle: 'staged', source: 'CAP', category: 'Breast', sections: [] },
  ].filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx); // dedupe

  const filtered = allProtocols.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchLifecycle = lifecycleFilter === 'all' || p.lifecycle === lifecycleFilter;
    return matchSearch && matchLifecycle;
  });

  const getDestination = (p: typeof allProtocols[0]) => {
    if (p.lifecycle === 'validated') return `/configuration/protocols/${p.id}?from=protocols`;
    return `/template-review/${p.id}`;
  };

  return (
    <div style={{ padding: '4px 0' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          📚 All Protocols
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
          Complete protocol library across all lifecycle states.
          {' '}<span style={{ color: '#64748b' }}>{allProtocols.length} total</span>
        </p>
      </div>

      {/* ── Search + filter bar ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search protocols…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '180px', padding: '8px 12px',
            borderRadius: '7px', border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)', color: '#f1f5f9',
            fontSize: '13px', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setLifecycleFilter(f.id)}
              style={{
                padding: '6px 12px', borderRadius: '6px', fontSize: '12px',
                fontWeight: lifecycleFilter === f.id ? 700 : 500,
                border: lifecycleFilter === f.id
                  ? '1px solid rgba(8,145,178,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                background: lifecycleFilter === f.id
                  ? 'rgba(8,145,178,0.15)'
                  : 'rgba(255,255,255,0.03)',
                color: lifecycleFilter === f.id ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Protocol list ── */}
      {filtered.length === 0 ? (
        <div style={{
          padding: '32px', textAlign: 'center',
          border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
          color: '#475569', fontSize: '14px',
        }}>
          No protocols found{search ? ` matching "${search}"` : ''}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(getDestination(p))}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(8,145,178,0.06)';
                e.currentTarget.style.borderColor = 'rgba(8,145,178,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '2px' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '8px' }}>
                  <span>v{p.version}</span>
                  <span>•</span>
                  <span>{p.source}</span>
                  <span>•</span>
                  <span>{p.category ?? '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LifecycleBadge lifecycle={p.lifecycle} />
                <span style={{ color: '#475569', fontSize: '16px' }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllProtocolsSection;

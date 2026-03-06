/**
 * ReviewQueueSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows protocols currently staged for review before becoming active.
 * Previously lived as the "Templates" tab (AdminTemplateList + TemplatesTab).
 *
 * Architecture role:
 *   One of three sub-sections in the merged Protocols tab. Protocols move
 *   through a lifecycle: draft → in_review → needs_changes → approved → published.
 *   This section surfaces protocols that are not yet "validated" (active).
 *
 * Consumed by:
 *   components/Config/Protocols/index.tsx  (renders as 'review' sub-section)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { loadProtocolRegistry } from '../../../protocols/protocolRegistry';

const LIFECYCLE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  draft:         { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8',  border: 'rgba(100,116,139,0.3)' },
  in_review:     { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24',  border: 'rgba(245,158,11,0.3)'  },
  needs_changes: { bg: 'rgba(239,68,68,0.12)',   color: '#f87171',  border: 'rgba(239,68,68,0.3)'   },
  approved:      { bg: 'rgba(16,185,129,0.12)',  color: '#10B981',  border: 'rgba(16,185,129,0.3)'  },
  staged:        { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa',  border: 'rgba(139,92,246,0.3)'  },
  published:     { bg: 'rgba(8,145,178,0.12)',   color: '#38bdf8',  border: 'rgba(8,145,178,0.3)'   },
};

const badge = (lifecycle: string) => {
  const s = LIFECYCLE_COLORS[lifecycle] ?? LIFECYCLE_COLORS.draft;
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700,
      padding: '2px 10px', borderRadius: '99px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      textTransform: 'capitalize',
    }}>
      {lifecycle.replace('_', ' ')}
    </span>
  );
};

const ReviewQueueSection: React.FC = () => {
  const navigate = useNavigate();
  const registry = loadProtocolRegistry();

  // Show everything that isn't fully validated/active
  const queued = Object.values(registry).filter(
    p => p.lifecycle !== 'validated'
  );

  // Also include our single mock staged template
  const mockStaged = [
    { id: 'breast_dcis_resection', name: 'Breast DCIS – Resection', version: '4.4.0.0', lifecycle: 'staged', source: 'CAP', category: 'Breast' },
  ];

  const allQueued = [
    ...mockStaged,
    ...queued.filter(p => !mockStaged.find(m => m.id === p.id)),
  ];

  return (
    <div style={{ padding: '4px 0' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          📋 Review Queue
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
          Protocols staged for review before becoming active. Approve or request
          changes before publishing to the reporting workflow.
        </p>
      </div>

      {allQueued.length === 0 ? (
        <div style={{
          padding: '32px', textAlign: 'center',
          border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '10px',
          color: '#475569', fontSize: '14px',
        }}>
          No protocols currently in review queue.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allQueued.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/template-review/${p.id}`)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
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
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', marginBottom: '3px' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '10px' }}>
                  <span>v{p.version}</span>
                  <span>•</span>
                  <span>{p.source ?? 'CAP'}</span>
                  <span>•</span>
                  <span>{p.category ?? '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {badge(p.lifecycle)}
                <span style={{ color: '#475569', fontSize: '16px' }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewQueueSection;

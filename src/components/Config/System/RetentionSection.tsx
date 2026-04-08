/**
 * RetentionSection.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays data retention policy settings for AI decisions, audit logs,
 * and case snapshots.
 *
 * Architecture role:
 *   One of several focused section components that make up the System config tab.
 *   Previously inlined in old.index.tsx — extracted here so each section is its
 *   own file, consistent with the pattern used for LISSection, FontsSection, etc.
 *
 * State:
 *   Currently read-only (retention periods are displayed but not editable).
 *   When configurable retention is implemented, this component should read from
 *   and write to SystemConfigContext via retention fields added to SystemConfig
 *   (e.g. aiSuggestionRetentionDays, auditLogRetentionDays, caseSnapshotRetentionYears).
 *
 * Consumed by:
 *   components/Config/System/index.tsx  (renders this as the 'retention' section)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import '../../../pathscribe.css';

// ─── Retention policy data ────────────────────────────────────────────────────
// TODO: Move to SystemConfig when these become user-configurable.
const RETENTION_POLICIES: { label: string; value: string; note: string }[] = [
  {
    label: 'AI Suggestions',
    value: '90 days',
    note: 'AI-generated field suggestions and confidence scores',
  },
  {
    label: 'Audit Logs',
    value: '365 days',
    note: 'All user actions, sign-outs, amendments, and system events',
  },
  {
    label: 'Case Snapshots',
    value: '7 years',
    note: 'Full case data at each finalization and sign-out event',
  },
];

const card: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px',
};

const RetentionSection: React.FC = () => (
  <div style={{ padding: '4px 0' }}>
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
        🗄️ Data Retention
      </h2>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
        How long pathscribe retains AI decisions, audit trails, and case snapshots.
        These settings are governed by your institution's data governance policy.
      </p>
    </div>

    {RETENTION_POLICIES.map(({ label, value, note }) => (
      <div key={label} style={card}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#DEE4E7', marginBottom: '2px' }}>
            {label}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{note}</div>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#8AB4F8', flexShrink: 0 }}>
          {value}
        </span>
      </div>
    ))}

    <div style={{
      marginTop: '16px', padding: '10px 14px', borderRadius: '8px',
      background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
      fontSize: '12px', color: '#a78bfa', lineHeight: '1.5',
    }}>
      🔒 Retention periods are currently set by your system administrator.
      Contact your pathscribe administrator to request changes.
    </div>
  </div>
);

export default RetentionSection;

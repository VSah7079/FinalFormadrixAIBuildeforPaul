// src/pages/SynopticReportPage/components/HeaderBar.tsx
// Rich case header — white bar with accession, patient info, progress steps.
// Styles extracted directly from original SynopticReportPage monolith.

import React from 'react';
import type { Case } from '@/types/case/Case';

interface HeaderBarProps {
  caseData: Case | null;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
  aiConfidence?: number; // 0–100
}

type StepStatus = 'completed' | 'current' | 'pending' | 'alert';

const stepCircle = (status: StepStatus): React.CSSProperties => ({
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: 700,
  background:
    status === 'completed' ? '#0891B2' :
    status === 'current'   ? '#fff'    :
    status === 'alert'     ? '#fef3c7' : '#f1f5f9',
  color:
    status === 'completed' ? '#fff'    :
    status === 'current'   ? '#0891B2' :
    status === 'alert'     ? '#92400e' : '#94a3b8',
  border:
    status === 'completed' ? '2px solid #0891B2' :
    status === 'current'   ? '2px solid #0891B2' :
    status === 'alert'     ? '2px solid #f59e0b' : '2px solid #e2e8f0',
});

const progressSteps = [
  { id: 1, label: 'Grossing',    status: 'completed' as StepStatus },
  { id: 2, label: 'Processing',  status: 'completed' as StepStatus },
  { id: 3, label: 'Synoptic',    status: 'current'   as StepStatus },
  { id: 4, label: 'Sign-out',    status: 'pending'   as StepStatus },
];

const HeaderBar: React.FC<HeaderBarProps> = ({
  caseData,
  onSignOut,
  onNavigate,
  aiConfidence,
}) => {

  const accession  = caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? '—';
  const patient    = caseData?.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '—';
  const dob        = caseData?.patient?.dateOfBirth
    ? new Date(caseData.patient.dateOfBirth).toLocaleDateString()
    : '—';
  const mrn        = caseData?.patient?.mrn ?? '—';
  const sex        = caseData?.patient?.sex ?? '—';
  const status     = caseData?.status ?? 'draft';

  const caseStateMeta: Record<string, { bg: string; border: string; color: string; dot: string }> = {
    draft:          { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', dot: '#3b82f6' },
    'in-progress':  { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', dot: '#3b82f6' },
    finalized:      { bg: '#f0fdf4', border: '#86efac', color: '#15803d', dot: '#22c55e' },
    'pending-review': { bg: '#fef3c7', border: '#fde047', color: '#92400e', dot: '#f59e0b' },
  };
  const meta = caseStateMeta[status] ?? caseStateMeta['draft'];

  return (
    <div style={{ background: 'white', padding: '8px 40px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
        <span
          onClick={() => onNavigate('/')}
          style={{ cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#0891B2'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >Home</span>
        <span style={{ color: '#cbd5e1' }}>›</span>
        <span
          onClick={() => onNavigate('/worklist')}
          style={{ cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#0891B2'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >Worklist</span>
        <span style={{ color: '#cbd5e1' }}>›</span>
        <span style={{ color: '#0891B2', fontWeight: 600 }}>Case Report</span>
      </div>

      {/* Main header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>

        {/* Left — accession + patient info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>

          {/* Accession block */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Accession</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>{accession}</div>
            <div style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: meta.bg, border: `1px solid ${meta.border}` }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: meta.color, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{status}</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '40px', background: '#e2e8f0', flexShrink: 0 }} />

          {/* Patient info fields */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Patient</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{patient}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Sex</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{sex}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Date of Birth</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{dob}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>MRN</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{mrn}</div>
            </div>
          </div>

        </div>

        {/* Centre — progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', flexShrink: 0 }}>
          {progressSteps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={stepCircle(step.status)}>
                  {step.status === 'completed' ? '✓' : step.status === 'alert' ? '⚠' : step.id}
                </div>
                <div style={{ fontSize: '7px', fontWeight: step.status === 'current' ? 600 : 500, color: step.status === 'alert' ? '#F59E0B' : step.status === 'current' ? '#1e293b' : '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {step.label}
                </div>
              </div>
              {idx < progressSteps.length - 1 && (
                <div style={{ width: '10px', height: '2px', background: idx < 2 ? '#0891B2' : '#e2e8f0', marginBottom: '10px' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right — status + AI confidence */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            border: '1px solid #6ee7b7',
            borderRadius: '12px',
            padding: '8px 16px',
            minWidth: '160px',
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)',
          }}>
            {/* Status + priority row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontWeight: 700, color: '#065f46', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {status}
              </div>
              <div style={{ fontSize: '10px', color: '#047857', fontWeight: 500 }}>
                {caseData?.order?.priority ?? 'Routine'}
              </div>
            </div>

            {/* AI Confidence — hero */}
            {aiConfidence !== undefined && (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#064e3b', lineHeight: 1 }}>
                    {aiConfidence}%
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                    AI confidence
                  </span>
                </div>
                {/* Bar */}
                <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${aiConfidence}%`,
                    borderRadius: '3px',
                    background: aiConfidence >= 80
                      ? 'linear-gradient(90deg, #059669, #10b981)'
                      : aiConfidence >= 60
                      ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                      : 'linear-gradient(90deg, #dc2626, #ef4444)',
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;

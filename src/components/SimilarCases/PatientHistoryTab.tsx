import React from 'react';
import '../../pathscribe.css';
import { PatientCaseSummary } from '../../Legacy/CasePanel_similarcases_legacy';

interface PatientHistoryTabProps {
  patientHistory: PatientCaseSummary[];
  onOpenCase: (accession: string) => void;
}

const PatientHistoryTab: React.FC<PatientHistoryTabProps> = ({
  patientHistory,
  onOpenCase,
}) => {
  if (patientHistory.length === 0) {
    return (
      <div style={{ fontSize: 13, color: '#9ca3af' }}>
        No prior cases found for this patient.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(148,163,184,0.4)',
          fontSize: 12,
          color: '#9ca3af',
        }}
      >
        Same patient only. Chronological view of prior cases and reports.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {patientHistory.map(caseItem => (
          <div
            key={caseItem.accession}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: '#020617',
              border: '1px solid rgba(51,65,85,0.9)',
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: '#e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span data-phi="accession">{caseItem.accession}</span>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>{caseItem.date}</span>
            </div>

            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              {caseItem.specimen}
            </div>

            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
              {caseItem.diagnosis}
            </div>

            <button
              type="button"
              onClick={() => onOpenCase(caseItem.accession)}
              style={{
                marginTop: 6,
                border: 'none',
                background: 'rgba(37,99,235,0.15)',
                color: '#93c5fd',
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Open Case
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientHistoryTab;

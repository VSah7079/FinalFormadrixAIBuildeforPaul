import React from 'react';
import '../../pathscribe.css';
import { SimilarCaseSummary } from '../../Legacy/CasePanel_similarcases_legacy';

interface DifferentialDiagnosisTabProps {
  similarCases: SimilarCaseSummary[];
  aiConfidence: 'high' | 'medium' | 'low';
  onRefineSearch?: () => void;
  onOpenCase: (accession: string) => void;
}

const DifferentialDiagnosisTab: React.FC<DifferentialDiagnosisTabProps> = ({
  similarCases,
  aiConfidence,
  onRefineSearch,
  onOpenCase,
}) => {
  const confidenceLabel =
    aiConfidence === 'high'
      ? 'AI found strong matches based on structured data.'
      : aiConfidence === 'medium'
      ? 'AI found some matches. Review before relying on them.'
      : 'Matches are weak. Consider refining search manually.';

  const confidenceColor =
    aiConfidence === 'high'
      ? 'rgba(22,163,74,0.2)'
      : aiConfidence === 'medium'
      ? 'rgba(234,179,8,0.2)'
      : 'rgba(248,113,113,0.2)';

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          padding: '8px 10px',
          borderRadius: 8,
          background: confidenceColor,
          border: '1px solid rgba(148,163,184,0.4)',
          fontSize: 12,
          color: '#e5e7eb',
        }}
      >
        AI‑proposed similar cases from other patients. {confidenceLabel}
      </div>

      {similarCases.length === 0 && (
        <div style={{ fontSize: 13, color: '#9ca3af' }}>
          No similar cases found.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {similarCases.map(c => (
          <div
            key={c.accession}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              background: '#020617',
              border: '1px solid rgba(51,65,85,0.9)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <div style={{ fontSize: 13, color: '#e5e7eb' }} data-phi="accession">{c.accession}</div>
              <div
                style={{
                  fontSize: 11,
                  color: '#bfdbfe',
                  background: 'rgba(37,99,235,0.2)',
                  borderRadius: 999,
                  padding: '2px 8px',
                }}
              >
                {c.similarity}% match
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#9ca3af' }}>{c.specimen}</div>

            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
              {c.diagnosis}
            </div>

            {c.keyMatches.length > 0 && (
              <div
                style={{
                  marginTop: 6,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                }}
              >
                {c.keyMatches.map((m, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 11,
                      color: '#e5e7eb',
                      background: 'rgba(15,23,42,0.9)',
                      borderRadius: 999,
                      padding: '2px 8px',
                      border: '1px solid rgba(148,163,184,0.5)',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenCase(c.accession)}
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

      {onRefineSearch && (
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={onRefineSearch}
            style={{
              border: 'none',
              background: '#4f46e5',
              color: '#e5e7eb',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refine Search Manually
          </button>
        </div>
      )}
    </div>
  );
};

export default DifferentialDiagnosisTab;

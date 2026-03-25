import React from 'react';

export interface SimilarCase {
  accession: string;
  diagnosis?: string;
  similarity: number;
  matchReason?: string; // NEW
}

interface CasePanelProps {
  isOpen: boolean;
  onClose: () => void;

  patientName: string;
  mrn: string;
  patientHistory: string;

  similarCases: SimilarCase[];

  aiConfidence: 'low' | 'medium' | 'high'; // unused now, but kept for compatibility
  onRefineSearch: () => void;
  onOpenCase: (accession: string) => void;
}

const CasePanel: React.FC<CasePanelProps> = ({
  isOpen,
  onClose,
  patientName,
  mrn,
  patientHistory,
  similarCases,
  onRefineSearch,
  onOpenCase,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 20000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '960px',
          maxHeight: '80vh',
          background: '#0b1120',
          borderRadius: '18px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          border: '1px solid rgba(148,163,184,0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid rgba(51,65,85,0.9)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background:
              'radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 55%)',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#64748b',
                marginBottom: '4px',
              }}
            >
              Similar cases
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e5e7eb' }}>
              {patientName}{' '}
              <span style={{ color: '#64748b', fontWeight: 500 }}>· MRN {mrn}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.3fr)',
            gap: '0',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Left: Patient history */}
          <div
            style={{
              padding: '18px 20px',
              borderRight: '1px solid rgba(30,41,59,0.9)',
              background:
                'radial-gradient(circle at top, rgba(30,64,175,0.35), transparent 60%)',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#cbd5f5',
                marginBottom: '8px',
              }}
            >
              Patient history
            </div>

            <div
              style={{
                fontSize: '13px',
                color: '#e5e7eb',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {patientHistory}
            </div>
          </div>

          {/* Right: Similar cases */}
          <div
            style={{
              padding: '18px 20px',
              background:
                'radial-gradient(circle at top right, rgba(8,47,73,0.7), transparent 60%)',
              overflowY: 'auto',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#cbd5f5',
                marginBottom: '12px',
              }}
            >
              Matched cases ({similarCases.length})
            </h3>

            {similarCases.length === 0 ? (
              <div
                style={{
                  fontSize: '13px',
                  color: '#9ca3af',
                  padding: '18px',
                  borderRadius: '10px',
                  border: '1px dashed rgba(75,85,99,0.9)',
                  background: 'rgba(15,23,42,0.8)',
                  textAlign: 'center',
                }}
              >
                No similar cases found for the current context.
              </div>
            ) : (
              similarCases.map(sc => {
                const similarityPercent = Math.round(sc.similarity * 100);

                return (
                  <button
                    key={sc.accession}
                    onClick={() => onOpenCase(sc.accession)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      marginBottom: '8px',
                      borderRadius: '10px',
                      border: '1px solid rgba(51,65,85,0.9)',
                      background: 'rgba(15,23,42,0.9)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#38bdf8';
                      e.currentTarget.style.background = 'rgba(15,23,42,1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(51,65,85,0.9)';
                      e.currentTarget.style.background = 'rgba(15,23,42,0.9)';
                    }}
                  >
                    {/* Accession + similarity */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#e5e7eb',
                        }}
                      >
                        {sc.accession}
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                        }}
                      >
                        {similarityPercent}% match
                      </div>
                    </div>

                    {/* Diagnosis */}
                    {sc.diagnosis && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#cbd5f5',
                          lineHeight: 1.4,
                        }}
                      >
                        {sc.diagnosis}
                      </div>
                    )}

                    {/* Match reason */}
                    {sc.matchReason && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          fontStyle: 'italic',
                        }}
                      >
                        Matched on: {sc.matchReason}
                      </div>
                    )}

                    {/* Confidence bar */}
                    <div
                      style={{
                        marginTop: '2px',
                        height: '5px',
                        background: 'rgba(31,41,55,1)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${similarityPercent}%`,
                          height: '100%',
                          background: '#0ea5e9',
                        }}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid rgba(30,41,59,0.9)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'rgba(15,23,42,0.98)',
          }}
        >
          <button
            onClick={onRefineSearch}
            style={{
              padding: '7px 14px',
              background: '#0ea5e9',
              color: '#0f172a',
              border: 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Refine search
          </button>
        </div>
      </div>
    </div>
  );
};

export default CasePanel;

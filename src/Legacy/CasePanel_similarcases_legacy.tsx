import React, { useState } from 'react';
import PatientHistoryTab from '../components/SimilarCases/PatientHistoryTab';
import DifferentialDiagnosisTab from '../components/SimilarCases/DifferentialDiagnosisTab';

export type TabId = 'history' | 'differential';

export interface PatientCaseSummary {
  accession: string;
  date: string;
  specimen: string;
  diagnosis: string;
}

export interface SimilarCaseSummary {
  accession: string;
  similarity: number;
  specimen: string;
  diagnosis: string;
  keyMatches: string[];
}

interface CasePanelProps {
  isOpen: boolean;
  onClose: () => void;

  patientName: string;
  mrn: string;

  patientHistory: PatientCaseSummary[];
  similarCases: SimilarCaseSummary[];
  aiConfidence?: 'high' | 'medium' | 'low';

  onRefineSearch?: () => void;
  onOpenCase: (accession: string) => void;
}

const CasePanel: React.FC<CasePanelProps> = ({
  isOpen,
  onClose,
  patientName,
  mrn,
  patientHistory,
  similarCases,
  aiConfidence = 'high',
  onRefineSearch,
  onOpenCase,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('history');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.6)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '100%',
          height: '100%',
          background: '#020617',
          borderLeft: '1px solid rgba(148,163,184,0.4)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(30,64,175,0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Similar Cases Assistant</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {patientName} &bull; MRN: {mrn}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#9ca3af',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(30,64,175,0.4)',
          }}
        >
          {[
            { id: 'history' as TabId, label: 'Patient History' },
            { id: 'differential' as TabId, label: 'Differential Diagnosis' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: 'none',
                background: '#020617',
                borderBottom:
                  activeTab === tab.id
                    ? '2px solid #6366f1'
                    : '2px solid transparent',
                color: activeTab === tab.id ? '#e5e7eb' : '#9ca3af',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px' }}>
          {activeTab === 'history' ? (
            <PatientHistoryTab
              patientHistory={patientHistory}
              onOpenCase={onOpenCase}
            />
          ) : (
            <DifferentialDiagnosisTab
              similarCases={similarCases}
              aiConfidence={aiConfidence}
              onRefineSearch={onRefineSearch}
              onOpenCase={onOpenCase}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CasePanel;

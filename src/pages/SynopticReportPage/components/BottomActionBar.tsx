import React, { useState } from 'react';
import type { Case } from '@/types/case/Case';

interface BottomActionBarProps {
  caseData: Case | null;
  onSaveDraft: () => void;
  onSaveAndNext: () => void;
  onFinalize: () => void;
  onFinalizeAndNext: () => void;
  onSignOut: () => void;
  onAddendumAmendment: () => void;
  onDelegate?: () => void; // Renamed from onConsult
  onHistory?: () => void;
  onFlags?: () => void;
  onCodes?: () => void;
  onNextCase: () => void;
  onPreviousCase: () => void;
}

const ActionButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  variant: 'outline' | 'solid';
  color: string;
  hoverColor?: string;
  title?: string;
}> = ({ onClick, children, variant, color, hoverColor, title }) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    padding: variant === 'solid' ? '7px 16px' : '7px 12px',
    borderRadius: '7px',
    fontWeight: variant === 'solid' ? 700 : 600,
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
    border: variant === 'solid' ? 'none' : `1.5px solid ${color}`,
    background: variant === 'solid' 
      ? (isHovered ? (hoverColor || color) : color) 
      : (isHovered ? `${color}1A` : 'transparent'),
    color: variant === 'solid' ? 'white' : color,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  return (
    <button 
      onClick={onClick} 
      style={baseStyle} 
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
};

const Divider = () => (
  <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
);

const BottomActionBar: React.FC<BottomActionBarProps> = ({
  caseData,
  onSaveDraft,
  onSaveAndNext,
  onFinalize,
  onFinalizeAndNext,
  onSignOut,
  onAddendumAmendment,
  onDelegate, // Updated name
  onHistory,
  onFlags,
  onCodes,
  onNextCase,
  onPreviousCase,
}) => {
  const status = caseData?.status ?? 'draft';
  const isFinalized = status === 'finalized';

  const hasCodes = ((caseData as any)?.coding?.icd10?.length ?? 0) > 0 ||
                   ((caseData as any)?.coding?.snomed?.length ?? 0) > 0;
  const codesColor = hasCodes ? '#0891B2' : '#f59e0b';
  
  const isSigned = status === 'finalized'; 

  const allFinalized = (caseData?.synopticReports?.length ?? 0) > 0 &&
    caseData!.synopticReports!.every(r => r.status === 'finalized');

  return (
    <div style={{
      background: '#0d1829',
      padding: '10px 24px',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
      gap: '8px',
    }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <ActionButton onClick={onPreviousCase} variant="outline" color="#64748b" title="Previous case">
          ← Previous
        </ActionButton>
        <ActionButton onClick={onNextCase} variant="outline" color="#64748b" title="Next case">
          Next →
        </ActionButton>

        <Divider />

        {isFinalized && (
          <ActionButton onClick={onAddendumAmendment} variant="outline" color="#0891B2">
            📎 Addendum
          </ActionButton>
        )}
        
        {/* UPDATED DELEGATE BUTTON */}
        <ActionButton 
          onClick={() => onDelegate?.()} 
          variant="outline" 
          color="#7c3aed"
          title="Delegate case to a specialist or workgroup pool"
        >
          👥 Delegate
        </ActionButton>

        <ActionButton onClick={() => onHistory?.()} variant="outline" color="#0891B2">
          📋 History
        </ActionButton>
        <ActionButton onClick={() => onFlags?.()} variant="outline" color="#f59e0b">
          🚩 Flags
        </ActionButton>
        <ActionButton onClick={() => onCodes?.()} variant="outline" color={codesColor} title={hasCodes ? 'View / edit codes' : 'No codes assigned yet'}>
          # Codes{!hasCodes && ' ⚠'}
        </ActionButton>
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {!isFinalized && (
          <>
            <ActionButton onClick={onSaveDraft} variant="outline" color="#0891B2">
              💾 Save Draft
            </ActionButton>
            <ActionButton onClick={onSaveAndNext} variant="outline" color="#0891B2">
              💾 Save &amp; Next
            </ActionButton>
            
            <Divider />
            
            <ActionButton onClick={onFinalize} variant="solid" color="#0891B2" hoverColor="#0E7490">
              🔒 Finalize
            </ActionButton>
            <ActionButton onClick={onFinalizeAndNext} variant="solid" color="#0891B2" hoverColor="#0E7490">
              🔒 Finalize &amp; Next
            </ActionButton>
          </>
        )}

        {(allFinalized || isFinalized) && !isSigned && (
          <>
            <Divider />
            <ActionButton onClick={onSignOut} variant="solid" color="#047857" hoverColor="#065f46">
              ✍️ Sign Out Case
            </ActionButton>
          </>
        )}

        {isSigned && (
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
            ✓ Case Signed Out
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomActionBar;
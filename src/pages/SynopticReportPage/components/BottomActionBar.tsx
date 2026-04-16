import React, { useState, useEffect, useRef } from 'react';
import type { Case } from '@/types/case/Case';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RequestReviewModal from '@/components/RequestReview/RequestReviewModal';
import { PoolClaimModal } from '@/components/Worklist/PoolClaimModal';
import { mockCaseService } from '@/services/cases/mockCaseService';

interface BottomActionBarProps {
  caseData: Case | null;
  isDirty?: boolean;
  onSaveDraft: () => void;
  onSaveAndNext: () => void;
  onFinalize: () => void;
  onFinalizeAndNext: () => void;
  onSignOut: () => void;
  onAddendumAmendment: () => void;
  onDelegate?: () => void;
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
    <button onClick={onClick} style={baseStyle} title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      {children}
    </button>
  );
};

const Divider = () => (
  <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
);

const BottomActionBar: React.FC<BottomActionBarProps> = ({
  caseData,
  isDirty = false,
  onSaveDraft,
  onSaveAndNext,
  onFinalize,
  onFinalizeAndNext,
  onSignOut,
  onAddendumAmendment,
  onDelegate,
  onHistory,
  onFlags,
  onCodes,
  onNextCase,
  onPreviousCase,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [claimOpen,  setClaimOpen]  = useState(false);
  const emrWindowRef = useRef<Window | null>(null);
  const status = caseData?.status ?? 'draft';
  const isFinalized = status === 'finalized';
  const isPool = status === 'pool';
  
  // Logic to auto-close EMR window when patient changes
  useEffect(() => {
    return () => {
      if (emrWindowRef.current && !emrWindowRef.current.closed) {
        emrWindowRef.current.close();
      }
    };
  }, [caseData?.patient?.mrn]); // Trigger whenever MRN changes

const handleLaunchEMR = () => {
  const mrn = caseData?.patient?.mrn ?? '100004';
  const targetUrl = `${window.location.origin}/mock-emr?patientId=${mrn}`;
  
  // Standard stable dimensions for demo laptops/projectors
  const width = 1200;
  const height = 800;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  if (emrWindowRef.current && !emrWindowRef.current.closed) {
    emrWindowRef.current.location.href = targetUrl;
    emrWindowRef.current.focus();
  } else {
    emrWindowRef.current = window.open(
      targetUrl, 
      'PathScribeEMRSidecar', 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }
};

// Keep your safety close logic
useEffect(() => {
  if (emrWindowRef.current && !emrWindowRef.current.closed) {
    emrWindowRef.current.close();
    emrWindowRef.current = null;
  }
}, [caseData?.id]);

  const hasCodes = ((caseData as any)?.coding?.icd10?.length ?? 0) > 0 ||
                   ((caseData as any)?.coding?.snomed?.length ?? 0) > 0;
  const codesColor = hasCodes ? '#0891B2' : '#f59e0b';
  const allFinalized = (caseData?.synopticReports?.length ?? 0) > 0 &&
    caseData!.synopticReports!.every(r => r.status === 'finalized');

  return (
    <>
    <div style={{
      background: '#0d1829', padding: '10px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: '8px',
    }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <ActionButton onClick={onPreviousCase} variant="outline" color="#64748b" title="Previous case">← Previous</ActionButton>
        <ActionButton onClick={onNextCase} variant="outline" color="#64748b" title="Next case">Next →</ActionButton>
        <Divider />
        
        {/* LAUNCH EMR BUTTON */}
        <ActionButton onClick={handleLaunchEMR} variant="outline" color="#0ea5e9" title="Open Patient Record in EMR Sidecar">
          🌐 Launch EMR
        </ActionButton>

        {/* Hide delegate/review/flags/codes for pool cases — not yet assigned */}
        {!isPool && <>
          <ActionButton onClick={() => onDelegate?.()} variant="outline" color="#7c3aed" title="Delegate case">👥 Delegate</ActionButton>
          <ActionButton onClick={() => setReviewOpen(true)} variant="outline" color="#8B5CF6" title="Request informal peer review">🔍 Request Review</ActionButton>
          <ActionButton onClick={() => onHistory?.()} variant="outline" color="#0891B2">📋 History</ActionButton>
          <ActionButton onClick={() => onFlags?.()} variant="outline" color="#f59e0b">🚩 Flags</ActionButton>
          <ActionButton onClick={() => onCodes?.()} variant="outline" color={codesColor}># Codes</ActionButton>
        </>}
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Pool case — show Claim button only */}
        {isPool && (
          <ActionButton onClick={() => setClaimOpen(true)} variant="solid" color="#6366f1" hoverColor="#4f46e5">
            ✋ Claim This Case
          </ActionButton>
        )}

        {/* Normal reporting actions — hidden for pool cases */}
        {!isPool && !isFinalized && (
          <>
            <ActionButton onClick={onSaveDraft} variant="outline" color={isDirty ? '#0891B2' : '#334155'}>💾 Save Draft</ActionButton>
            <ActionButton onClick={onSaveAndNext} variant="outline" color={isDirty ? '#0891B2' : '#334155'}>💾 Save &amp; Next</ActionButton>
            <Divider />
            <ActionButton onClick={onFinalize} variant="solid" color="#0891B2" hoverColor="#0E7490">🔒 Finalize</ActionButton>
            <ActionButton onClick={onFinalizeAndNext} variant="solid" color="#0891B2" hoverColor="#0E7490">🔒 Finalize &amp; Next</ActionButton>
          </>
        )}
        {!isPool && (allFinalized || isFinalized) && status !== 'finalized' && (
          <ActionButton onClick={onSignOut} variant="solid" color="#047857" hoverColor="#065f46">✍️ Sign Out Case</ActionButton>
        )}
      </div>
    </div>

    <RequestReviewModal
      isOpen={reviewOpen}
      caseId={caseData?.id ?? ''}
      caseLabel={caseData ? `${caseData.patient?.lastName}, ${caseData.patient?.firstName}` : undefined}
      fromUserId={user?.id ?? 'u1'}
      fromUserName={user?.name ?? 'Unknown'}
      onClose={() => setReviewOpen(false)}
    />

    <PoolClaimModal
      isOpen={claimOpen && isPool}
      caseId={caseData?.id ?? null}
      caseSummary={caseData ? `${caseData.patient?.lastName}, ${caseData.patient?.firstName} — ${caseData.specimens?.[0]?.description ?? ''}` : undefined}
      poolName={`${(caseData as any)?.originHospitalId ?? 'MFT'} Pool`}
      currentUserId={user?.id ?? 'u1'}
      currentUserName={user?.name ?? 'Unknown'}
      continueToReport={true}
      onAccepted={() => setClaimOpen(false)}
      onPassed={() => {
        setClaimOpen(false);
        navigate('/worklist');
      }}
      onClose={() => setClaimOpen(false)}
    />
    </>
  );
};

export default BottomActionBar;
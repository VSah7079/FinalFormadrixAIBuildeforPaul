// src/pages/WorklistPage/PoolAcceptModal.tsx
// Shown when a pathologist selects a pool case — atomic claim then accept/pass

import React, { useEffect, useCallback, useState } from 'react';
import '../../pathscribe.css';
import { claimPoolCase, acceptPoolCase, passPoolCase } from '../../services/cases/mockCaseService';

interface PoolAcceptModalProps {
  caseId: string;
  accession: string;
  patientName: string;
  poolName: string;
  specimenDescription: string;
  priority: string;
  currentUserId: string;
  onAccepted: () => void;   // navigate to case report page
  onPassed:   () => void;   // return to pool list
}

export const PoolAcceptModal: React.FC<PoolAcceptModalProps> = ({
  caseId, accession, patientName, poolName, specimenDescription,
  priority, currentUserId, onAccepted, onPassed,
}) => {
  const [claimState, setClaimState] = useState<'claiming' | 'claimed' | 'taken'>('claiming');
  const [takenBy,    setTakenBy]    = useState<string | null>(null);
  const [accepting,  setAccepting]  = useState(false);

  // Voice command listeners
  useEffect(() => {
    window.addEventListener('PATHSCRIBE_POOL_ACCEPT_CASE', handleAccept as any);
    window.addEventListener('PATHSCRIBE_POOL_PASS_CASE',   handlePass  as any);
    return () => {
      window.removeEventListener('PATHSCRIBE_POOL_ACCEPT_CASE', handleAccept as any);
      window.removeEventListener('PATHSCRIBE_POOL_PASS_CASE',   handlePass  as any);
    };
  }, [handleAccept, handlePass]);

  useEffect(() => {
    // Attempt atomic claim as soon as modal opens
    claimPoolCase(caseId, currentUserId).then(result => {
      if (result.success) {
        setClaimState('claimed');
      } else {
        setTakenBy(result.claimedBy ?? 'another pathologist');
        setClaimState('taken');
      }
    });
  }, [caseId, currentUserId]);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    await acceptPoolCase(caseId, currentUserId);
    onAccepted();
  }, [caseId, currentUserId, accepting, onAccepted]);

  const handlePass = useCallback(async () => {
    await passPoolCase(caseId);
    onPassed();
  }, [caseId, onPassed]);

  return (
    <div className="fm-overlay">
      <div className="ps-modal ps-modal-md">

        {/* Header */}
        <div className="ps-modal-header">
          <div>
            <div className="fm-eyebrow">Pool Case · {poolName}</div>
            <div className="fm-title-row">
              <span style={{ fontSize: 20 }}>👥</span>
              <h2 className="ps-modal-title">Accept this case?</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="ps-modal-body">

          {/* Case summary card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#38bdf8', background: 'rgba(8,145,178,0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                {accession}
              </span>
              {priority === 'STAT' && (
                <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  STAT
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{patientName}</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{specimenDescription}</div>
          </div>

          {/* Claim status */}
          {claimState === 'claiming' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
              <span style={{ fontSize: 16 }}>⏳</span>
              <span style={{ fontSize: 13, color: '#a5b4fc' }}>Checking availability…</span>
            </div>
          )}

          {claimState === 'taken' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>Case just taken</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {takenBy} is currently reviewing this case. It will be returned to the pool if they pass.
                </div>
              </div>
            </div>
          )}

          {claimState === 'claimed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
              <span style={{ fontSize: 16 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>Case available</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Accepting will assign this case to you and remove it from the {poolName} pool.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fm-footer">
          <span className="fm-footer-status">
            {claimState === 'taken' ? 'Not available — return to pool list' : 'Accept to open the case report'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {claimState === 'taken' ? (
              <button className="fm-btn-save" onClick={onPassed}>
                Back to Pool
              </button>
            ) : (
              <>
                <button
                  className="fm-btn-cancel"
                  onClick={handlePass}
                  disabled={claimState === 'claiming' || accepting}
                >
                  Pass
                </button>
                <button
                  className="fm-btn-save"
                  onClick={handleAccept}
                  disabled={claimState !== 'claimed' || accepting}
                  style={{ opacity: claimState !== 'claimed' || accepting ? 0.5 : 1 }}
                >
                  {accepting ? 'Accepting…' : 'Accept Case'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PoolAcceptModal;

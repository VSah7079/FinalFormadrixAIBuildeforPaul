// src/pages/WorklistPage/PoolAcceptModal.tsx
// Shown when a pathologist selects a pool case — atomic claim then accept/pass

import React, { useEffect, useCallback, useState } from 'react';
import '../../pathscribe.css';
import { claimPoolCase, acceptPoolCase, passPoolCase } from '../../services/cases/mockCaseService';

interface PoolAcceptModalProps {
  caseId:              string;
  accession:           string;
  patientName:         string;
  poolName:            string;
  specimenDescription: string;
  priority:            string;
  currentUserId:       string;
  onAccepted:          () => void;  // navigate to case report page
  onPassed:            () => void;  // return to pool list
}

export const PoolAcceptModal: React.FC<PoolAcceptModalProps> = ({
  caseId, accession, patientName, poolName, specimenDescription,
  priority, currentUserId, onAccepted, onPassed,
}) => {
  const [claimState, setClaimState] = useState<'claiming' | 'claimed' | 'taken'>('claiming');
  const [takenBy,    setTakenBy]    = useState<string | null>(null);
  const [accepting,  setAccepting]  = useState(false);

  // Attempt atomic claim as soon as modal opens
  useEffect(() => {
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
    if (claimState !== 'claimed' || accepting) return;
    setAccepting(true);
    await acceptPoolCase(caseId, currentUserId);
    onAccepted();
  }, [caseId, currentUserId, claimState, accepting, onAccepted]);

  const handlePass = useCallback(async () => {
    await passPoolCase(caseId);
    onPassed();
  }, [caseId, onPassed]);

  // Voice command listeners
  useEffect(() => {
    window.addEventListener('PATHSCRIBE_POOL_ACCEPT_CASE', handleAccept as any);
    window.addEventListener('PATHSCRIBE_POOL_PASS_CASE',   handlePass  as any);
    return () => {
      window.removeEventListener('PATHSCRIBE_POOL_ACCEPT_CASE', handleAccept as any);
      window.removeEventListener('PATHSCRIBE_POOL_PASS_CASE',   handlePass  as any);
    };
  }, [handleAccept, handlePass]);

  // ESC to pass
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handlePass(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePass]);

  return (
    <div className="fm-overlay" onClick={claimState === 'taken' ? onPassed : handlePass}>
      <div
        className="ps-research-modal"
        style={{ width: 480 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">Pool Case · {poolName}</div>
            <div className="fm-title-row">
              <h2 className="fm-title">Accept this case?</h2>
              {priority === 'STAT' && (
                <span style={{
                  fontSize: 10, fontWeight: 800, color: '#ef4444',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  padding: '2px 8px', borderRadius: 4,
                  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                }}>
                  STAT
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Case summary */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontFamily: 'monospace', color: '#38bdf8',
                background: 'rgba(8,145,178,0.1)', padding: '2px 8px',
                borderRadius: 4, fontWeight: 700,
              }}>
                {accession}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
              {patientName}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              {specimenDescription}
            </div>
          </div>

          {/* Claim status */}
          {claimState === 'claiming' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 18 }}>⏳</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>
                  Checking availability…
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Attempting to claim this case from the pool
                </div>
              </div>
            </div>
          )}

          {claimState === 'taken' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fca5a5' }}>
                  Case just taken
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {takenBy} is currently reviewing this case. It will return to the pool if they pass.
                </div>
              </div>
            </div>
          )}

          {claimState === 'claimed' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 8,
            }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>
                  Case available
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Accepting will assign this case to you and remove it from the {poolName} pool.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 28px',
          borderTop: '1px solid rgba(51,65,85,0.9)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--ps-grad-header, rgba(0,0,0,0.2))',
        }}>
          <span style={{ fontSize: 12, color: '#475569' }}>
            {claimState === 'taken'
              ? 'Not available — return to pool list'
              : claimState === 'claiming'
              ? 'Checking availability…'
              : 'Accept to open the case report'}
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
                  disabled={accepting}
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

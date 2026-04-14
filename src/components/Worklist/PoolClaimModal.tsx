/**
 * PoolClaimModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown when a pathologist clicks a pool case.
 * They must explicitly Accept (assigns to them) or Pass (returns to pool).
 * The case is status-locked to 'claimed' while this modal is open.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { claimPoolCase, acceptPoolCase, passPoolCase } from '../../services/cases/mockCaseService';

interface PoolClaimModalProps {
  isOpen:       boolean;
  caseId:       string | null;
  caseSummary?: string;
  poolName?:    string;
  currentUserId:   string;
  currentUserName: string;
  continueToReport?: boolean;
  fromFilter?:  string;  // filter to restore when returning to worklist
  onAccepted:   () => void;
  onPassed:     () => void;
  onClose:      () => void;
}

type Step = 'claiming' | 'ready' | 'blocked' | 'accepting' | 'passing';

export const PoolClaimModal: React.FC<PoolClaimModalProps> = ({
  isOpen, caseId, caseSummary, poolName,
  currentUserId, currentUserName,
  continueToReport = false,
  fromFilter,
  onAccepted, onPassed, onClose,
}) => {
  const navigate = useNavigate();
  const [step,      setStep]      = useState<Step>('claiming');
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  const handleViewReport = () => {
    if (!caseId) return;
    navigate(`/report/${caseId}`, { state: { fromFilter: 'pool' } });
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !caseId) return;
    setStep('claiming');
    setBlockedBy(null);

    claimPoolCase(caseId, currentUserId, currentUserName).then(result => {
      if (result.success) {
        setStep('ready');
      } else {
        setBlockedBy(result.claimedBy ?? 'another pathologist');
        setStep('blocked');
      }
    });

    // Release claim if modal closes without action
    return () => {
      if (caseId) passPoolCase(caseId, currentUserId).catch(() => {});
    };
  }, [isOpen, caseId, currentUserId, currentUserName]);

  const handleAccept = async () => {
    if (!caseId) return;
    setStep('accepting');
    await acceptPoolCase(caseId, currentUserId, currentUserName);
    if (continueToReport) {
      navigate(`/case/${caseId}/synoptic`);
      onAccepted();
    } else {
      onAccepted();
    }
  };

  const handlePass = async () => {
    if (!caseId) return;
    setStep('passing');
    await passPoolCase(caseId, currentUserId);
    onPassed();
    navigate('/worklist', { state: { restoreFilter: fromFilter ?? 'pool' } });
  };

  if (!isOpen || !caseId) return null;

  const btn = (label: string, onClick: () => void, primary: boolean, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      background: primary ? 'rgba(8,145,178,0.8)' : 'transparent',
      border: primary ? 'none' : '1px solid rgba(255,255,255,0.12)',
      color: primary ? '#fff' : '#94a3b8',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s',
    }}>{label}</button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, background: '#0f172a', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            👥 {poolName ?? 'Pool'} — Case Assignment
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>{caseSummary ?? caseId}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{caseId}</div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {step === 'claiming' && (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
              Checking case availability…
            </div>
          )}

          {step === 'blocked' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f87171', marginBottom: 8 }}>Case Unavailable</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                This case is currently being reviewed by <strong style={{ color: '#e2e8f0' }}>{blockedBy}</strong>. Please try another case or check back shortly.
              </div>
              <div style={{ marginTop: 20 }}>
                {btn('Close', onClose, false)}
              </div>
            </div>
          )}

          {(step === 'ready' || step === 'accepting' || step === 'passing') && (
            <>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, lineHeight: 1.6 }}>
                {continueToReport
                  ? <>Would you like to <strong style={{ color: '#38bdf8' }}>claim this case and continue reporting</strong>, or <strong style={{ color: '#f59e0b' }}>pass</strong> and return it to the pool?</>
                  : <>Would you like to <strong style={{ color: '#38bdf8' }}>claim</strong> this case, <strong style={{ color: '#a78bfa' }}>view the report</strong> before deciding, or <strong style={{ color: '#f59e0b' }}>pass</strong> and return it to the pool?</>
                }
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>What happens next</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {continueToReport
                    ? <>
                        <div>✅ <strong style={{ color: '#e2e8f0' }}>Claim &amp; Continue</strong> — Case moves to your worklist and opens directly in the synoptic report.</div>
                        <div>⏭️ <strong style={{ color: '#e2e8f0' }}>Pass</strong> — Case returns to the pool for another pathologist.</div>
                      </>
                    : <>
                        <div>✅ <strong style={{ color: '#e2e8f0' }}>Claim Case</strong> — Case moves to your worklist as In Progress.</div>
                        <div>🔍 <strong style={{ color: '#e2e8f0' }}>View Report</strong> — Preview the case report before deciding. You can claim or pass from there.</div>
                        <div>⏭️ <strong style={{ color: '#e2e8f0' }}>Pass</strong> — Case returns to the pool for another pathologist.</div>
                      </>
                  }
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {btn('Pass', handlePass, false, step === 'accepting' || step === 'passing')}
                {!continueToReport && (
                  <button
                    onClick={handleViewReport}
                    disabled={step === 'accepting' || step === 'passing'}
                    style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa', opacity: step === 'accepting' || step === 'passing' ? 0.5 : 1, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    View Report
                  </button>
                )}
                {btn(
                  step === 'accepting' ? 'Claiming…' : continueToReport ? 'Claim & Continue' : 'Claim Case',
                  handleAccept,
                  true,
                  step === 'accepting' || step === 'passing'
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoolClaimModal;

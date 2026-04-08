/**
 * PoolClaimModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown when a pathologist clicks a pool case.
 * They must explicitly Accept (assigns to them) or Pass (returns to pool).
 * The case is status-locked to 'claimed' while this modal is open.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { claimPoolCase, acceptPoolCase, passPoolCase } from '../../services/cases/mockCaseService';

interface PoolClaimModalProps {
  isOpen:       boolean;
  caseId:       string | null;
  caseSummary?: string;   // e.g. patient name + protocol
  poolName?:    string;
  currentUserId:   string;
  currentUserName: string;
  onAccepted:   () => void;
  onPassed:     () => void;
  onClose:      () => void;
}

type Step = 'claiming' | 'ready' | 'blocked' | 'accepting' | 'passing';

export const PoolClaimModal: React.FC<PoolClaimModalProps> = ({
  isOpen, caseId, caseSummary, poolName,
  currentUserId, currentUserName,
  onAccepted, onPassed, onClose,
}) => {
  const [step,      setStep]      = useState<Step>('claiming');
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

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
    onAccepted();
  };

  const handlePass = async () => {
    if (!caseId) return;
    setStep('passing');
    await passPoolCase(caseId, currentUserId);
    onPassed();
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
                Would you like to <strong style={{ color: '#38bdf8' }}>accept</strong> this case and add it to your worklist, or <strong style={{ color: '#f59e0b' }}>pass</strong> and return it to the pool?
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>What happens next</div>
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>✅ <strong style={{ color: '#e2e8f0' }}>Accept</strong> — Case moves to your worklist as In Progress. The delegating pathologist is notified.</div>
                  <div>⏭️ <strong style={{ color: '#e2e8f0' }}>Pass</strong> — Case returns to the pool for another pathologist to claim.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {btn('Pass', handlePass, false, step === 'accepting' || step === 'passing')}
                {btn(step === 'accepting' ? 'Accepting…' : 'Accept Case', handleAccept, true, step === 'accepting' || step === 'passing')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoolClaimModal;

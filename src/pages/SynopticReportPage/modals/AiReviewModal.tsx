/**
 * AiReviewModal — AI Triage / Spell-checker Flow
 * ------------------------------------------------
 * Shown between Finalize click and FinalizeSynopticModal when there are
 * required fields that are AI-suggested but unverified and below the
 * confidence threshold.
 *
 * Keyboard: Space/→ = Confirm, O = Override, S = Skip, Esc = Cancel
 * Voice:    "Confirm" / "Override" / "Skip" / "Next" / "Cancel"
 */

import React, { useEffect, useCallback, useState } from 'react';
import '../../../pathscribe.css';

export interface ReviewField {
  fieldId:      string;
  fieldLabel:   string;
  sectionTitle: string;
  aiValue:      string | string[];
  confidence:   number;
  source:       string;
  verification: 'unverified' | 'verified' | 'disputed';
}

interface AiReviewModalProps {
  fields:         ReviewField[];
  finalizeAndNext: boolean;
  onConfirm:      (fieldId: string) => void;
  onOverride:     (fieldId: string) => void;
  onSkip:         (fieldId: string) => void;
  onComplete:     (summary: { confirmed: string[]; overridden: string[]; skipped: string[] }) => void;
  onCancel:       () => void;
}

const CONF_COLOR = (c: number) =>
  c >= 85 ? '#34d399' : c >= 60 ? '#fbbf24' : '#f87171';

export const AiReviewModal: React.FC<AiReviewModalProps> = ({
  fields, finalizeAndNext, onConfirm, onOverride, onSkip, onComplete, onCancel,
}) => {
  const [index,    setIndex]    = useState(0);
  const [skipped,  setSkipped]  = useState<string[]>([]);
  const [confirmed,  setConfirmed]  = useState<string[]>([]);
  const [overridden, setOverridden] = useState<string[]>([]);

  const current = fields[index];
  const total   = fields.length;
  const isDone  = index >= total;

  // Advance to next field
  const advance = useCallback(() => {
    if (index + 1 >= total) {
      onComplete({ confirmed, overridden, skipped });
    } else {
      setIndex(i => i + 1);
    }
  }, [index, total, onComplete, confirmed, overridden, skipped]);

  const handleConfirm = useCallback(() => {
    if (!current) return;
    onConfirm(current.fieldId);
    setConfirmed(c => [...c, current.fieldId]);
    advance();
  }, [current, onConfirm, advance]);

  const handleOverride = useCallback(() => {
    if (!current) return;
    onOverride(current.fieldId);
    setOverridden(o => [...o, current.fieldId]);
    advance();
  }, [current, onOverride, advance]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    onSkip(current.fieldId);
    setSkipped(s => [...s, current.fieldId]);
    advance();
  }, [current, onSkip, advance]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleConfirm(); }
      if (e.key === 'o' || e.key === 'O')           { e.preventDefault(); handleOverride(); }
      if (e.key === 's' || e.key === 'S')           { e.preventDefault(); handleSkip(); }
      if (e.key === 'Escape')                        { onCancel(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleConfirm, handleOverride, handleSkip, onCancel]);

  // Voice command handler — listens for PATHSCRIBE_ events dispatched by mockActionRegistryService
  useEffect(() => {
    const confirm  = () => handleConfirm();
    const override = () => handleOverride();
    const skip     = () => handleSkip();
    const cancel   = () => onCancel();
    window.addEventListener('PATHSCRIBE_AI_REVIEW_CONFIRM',  confirm);
    window.addEventListener('PATHSCRIBE_AI_REVIEW_OVERRIDE', override);
    window.addEventListener('PATHSCRIBE_AI_REVIEW_SKIP',     skip);
    window.addEventListener('PATHSCRIBE_AI_REVIEW_CANCEL',   cancel);
    return () => {
      window.removeEventListener('PATHSCRIBE_AI_REVIEW_CONFIRM',  confirm);
      window.removeEventListener('PATHSCRIBE_AI_REVIEW_OVERRIDE', override);
      window.removeEventListener('PATHSCRIBE_AI_REVIEW_SKIP',     skip);
      window.removeEventListener('PATHSCRIBE_AI_REVIEW_CANCEL',   cancel);
    };
  }, [handleConfirm, handleOverride, handleSkip, onCancel]);

  if (isDone) return null;

  const progress = Math.round((index / total) * 100);
  const displayValue = Array.isArray(current.aiValue)
    ? current.aiValue.join(', ')
    : current.aiValue;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        width: 580, background: '#0f172a',
        borderRadius: 18, border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 30px 70px rgba(0,0,0,0.7)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(8,145,178,0.1)',
          borderBottom: '1px solid rgba(8,145,178,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
              ✦ AI Review Mode · {finalizeAndNext ? 'Finalize & Next' : 'Finalize'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
              Review uncertain AI findings before sign-out
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', padding: 4 }}>×</button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#0891B2', transition: 'width 0.3s ease' }} />
        </div>

        {/* Field counter */}
        <div style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Field <strong style={{ color: '#e2e8f0' }}>{index + 1}</strong> of <strong style={{ color: '#e2e8f0' }}>{total}</strong>
            {skipped.length > 0 && <span style={{ color: '#f59e0b', marginLeft: 8 }}> · {skipped.length} skipped</span>}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {fields.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i < index
                  ? (skipped.includes(fields[i].fieldId) ? '#f59e0b' : '#10b981')
                  : i === index ? '#38bdf8' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        </div>

        {/* Field content */}
        <div style={{ padding: '24px', flex: 1 }}>

          {/* Section + field label */}
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {current.sectionTitle}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
            {current.fieldLabel}
          </div>

          {/* AI suggestion card */}
          <div style={{
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(8,145,178,0.08)',
            border: `1px solid rgba(8,145,178,0.2)`,
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>✦ AI Suggestion</span>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '1px 8px', borderRadius: 20,
                background: CONF_COLOR(current.confidence) + '22',
                color: CONF_COLOR(current.confidence),
                border: `1px solid ${CONF_COLOR(current.confidence)}44`,
              }}>
                {current.confidence}% confidence
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>
              {displayValue || '—'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              {current.source}
            </div>
          </div>

          {/* Keyboard hints */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'Space / →', label: 'Confirm', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { key: 'O',         label: 'Override', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
              { key: 'S',         label: 'Skip',    color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
              { key: 'Esc',       label: 'Cancel',  color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.15)' },
            ].map(h => (
              <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: h.bg, border: `1px solid ${h.border}` }}>
                <kbd style={{ fontSize: 10, fontWeight: 700, color: h.color, fontFamily: 'monospace' }}>{h.key}</kbd>
                <span style={{ fontSize: 11, color: h.color }}>{h.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer action buttons */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleSkip}
            style={{ padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1.5px solid rgba(100,116,139,0.4)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            S — Skip
          </button>
          <button
            onClick={handleOverride}
            style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1.5px solid rgba(245,158,11,0.3)', color: '#fbbf24', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            O — Override
          </button>
          <button
            onClick={handleConfirm}
            style={{ padding: '9px 22px', borderRadius: 8, background: '#0891B2', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Space — Confirm {index + 1 < total ? '& Next →' : '& Finalise 🔒'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiReviewModal;

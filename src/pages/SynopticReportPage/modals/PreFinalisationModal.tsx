/**
 * PreFinalisationModal.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen pre-finalisation review shown before every Finalise / Finalise Next.
 *
 * Capabilities:
 *   1. Preview synoptics as they will be sent to the LIS (Q&A format, CoPath style)
 *   2. Reorder specimens for transmission (clinical significance, not accession order)
 *   3. Exclude synoptics from this transmission (soft-exclude, retained in PathScribe)
 *   4. Integrated e-signature — biometric (WebAuthn) or password fallback
 *      Regulatory: password cannot be defaulted per 21 CFR Part 11
 *
 * Guards:
 *   - Synoptics are locked to their specimen — drag zones are specimen-scoped
 *   - Changes are staged until "Finalise now" — Cancel discards all staging
 *
 * Wiring: intercept onFinalize / onFinalizeAndNext in SynopticReportPage
 *   before setShowFinalizeModal(true).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import {
  isBiometricAvailable,
  isBiometricCurrentForUser,
  verifyBiometric,
  getCredentialForUser,
  getDeviceName,
  getBiometricPolicy,
} from '@/services/biometric/mockBiometricService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SynopticForReview {
  instanceId: string;
  templateName: string;
  specimenId: string;
  specimenLabel: string;     // A, B, C — display only, never reordered
  specimenDesc: string;
  answers: Record<string, string | string[]>;
  fieldLabels: Record<string, string>; // fieldId → human label
  fieldOrder: string[];                // ordered field IDs for Q&A output
  answeredCount: number;
  totalCount: number;
  status: string;
}

interface StagedSpecimen {
  specimenId: string;
  specimenLabel: string;
  specimenDesc: string;
  synoptics: StagedSynoptic[];
}

interface StagedSynoptic {
  instanceId: string;
  templateName: string;
  answeredCount: number;
  totalCount: number;
  excluded: boolean;
  answers: Record<string, string | string[]>;
  fieldLabels: Record<string, string>;
  fieldOrder: string[];
}

interface Props {
  show: boolean;
  caseAccession: string;
  patientName: string;
  reportingMode: 'copilot' | 'pathscribe';
  synoptics: SynopticForReview[];
  userId: string;
  userDisplayName: string;
  userCredentials: string; // e.g. "MD, FCAP"
  finalizeAndNext?: boolean;
  onConfirm: (orderedInstanceIds: string[], excludedInstanceIds: string[]) => void;
  onCancel: () => void;
}

// ─── Colours (match PathScribe dark theme) ────────────────────────────────────
const C = {
  bg:      '#0f172a',
  panel:   '#1e293b',
  border:  '#334155',
  teal:    '#0891B2',
  tealDim: 'rgba(8,145,178,0.15)',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  amber:   '#f59e0b',
  amberDim:'rgba(245,158,11,0.12)',
  green:   '#10b981',
  red:     '#ef4444',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildStaged(synoptics: SynopticForReview[]): StagedSpecimen[] {
  const specimenMap = new Map<string, StagedSpecimen>();
  synoptics.forEach(syn => {
    if (!specimenMap.has(syn.specimenId)) {
      specimenMap.set(syn.specimenId, {
        specimenId: syn.specimenId,
        specimenLabel: syn.specimenLabel,
        specimenDesc: syn.specimenDesc,
        synoptics: [],
      });
    }
    specimenMap.get(syn.specimenId)!.synoptics.push({
      instanceId: syn.instanceId,
      templateName: syn.templateName,
      answeredCount: syn.answeredCount,
      totalCount: syn.totalCount,
      excluded: false,
      answers: syn.answers,
      fieldLabels: syn.fieldLabels,
      fieldOrder: syn.fieldOrder,
    });
  });
  return Array.from(specimenMap.values());
}

function formatAnswer(val: string | string[] | undefined): string {
  if (val === undefined || val === null || val === '') return '—';
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
  return String(val);
}

// ─── Q&A Preview ─────────────────────────────────────────────────────────────

const QAPreview: React.FC<{ syn: StagedSynoptic }> = ({ syn }) => {
  const fields = syn.fieldOrder.filter(fid => syn.answers[fid] !== undefined && syn.answers[fid] !== '');
  if (!fields.length) return (
    <div style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', padding: '8px 0' }}>
      No fields completed — synoptic is empty.
    </div>
  );
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7 }}>
      {fields.map((fid, i) => (
        <div key={fid} style={{
          display: 'flex', gap: 0,
          borderBottom: i < fields.length - 1 ? `0.5px solid ${C.border}` : 'none',
          padding: '4px 0',
        }}>
          <span style={{ color: C.muted, flex: '0 0 220px', paddingRight: 12, fontSize: 12 }}>
            {syn.fieldLabels[fid] ?? fid}
          </span>
          <span style={{ color: C.text, flex: 1 }}>
            {formatAnswer(syn.answers[fid])}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Signing panel ────────────────────────────────────────────────────────────
// Biometric attempts first when enrolled + policy enabled.
// If biometric fails (face changed, bad lighting, no reader) → password shown.
// Password is ALWAYS available — pathologists are never blocked.

type BioStep = 'idle' | 'pending' | 'failed' | 'verified';

interface SigningPanelProps {
  userId: string;
  userDisplayName: string;
  userCredentials: string;
  excludedCount: number;
  totalCount: number;
  finalizeAndNext: boolean;
  onSign: () => void;
  onCancel: () => void;
}

const SigningPanel: React.FC<SigningPanelProps> = ({
  userId, userDisplayName, userCredentials,
  excludedCount, totalCount, finalizeAndNext, onSign, onCancel,
}) => {
  const [showBiometric, setShowBiometric] = React.useState(false);
  const [bioStep, setBioStep]             = React.useState<BioStep>('idle');
  const [deviceName, setDeviceName]       = React.useState('Biometric');
  const [password, setPassword]           = React.useState('');
  const [pwError, setPwError]             = React.useState('');
  const [bioFailMsg, setBioFailMsg]       = React.useState('');
  const pwRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const policy = getBiometricPolicy();
    if (!policy.enabled) {
      // Biometric disabled institution-wide — password only, auto-focus
      setTimeout(() => pwRef.current?.focus(), 100);
      return;
    }
    isBiometricAvailable().then(avail => {
      const cred = getCredentialForUser(userId);
      const enrolled = !!cred && avail;
      setShowBiometric(enrolled);
      setDeviceName(getDeviceName());
      if (!enrolled) setTimeout(() => pwRef.current?.focus(), 100);
    });
  }, [userId]);

  const handleBiometric = async () => {
    setBioStep('pending');
    setBioFailMsg('');
    const result = await verifyBiometric(userId);
    if (result.ok) {
      setBioStep('verified');
      setTimeout(onSign, 400);
    } else {
      // Biometric failed — fall back to password, explain why
      setBioStep('failed');
      setBioFailMsg('Biometric didn\'t recognise you — please use your password.');
      setTimeout(() => pwRef.current?.focus(), 100);
    }
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setPwError('Password is required.'); return; }
    if (password.length < 3) { setPwError('Incorrect password.'); return; }
    setPwError('');
    onSign();
  };

  const includedCount = totalCount - excludedCount;

  return (
    <div style={{
      background: C.panel, borderTop: `1px solid ${C.border}`,
      padding: '16px 32px', flexShrink: 0,
    }}>
      {/* Fail message */}
      {bioFailMsg && (
        <div style={{ fontSize: 12, color: C.amber, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>⚠</span> {bioFailMsg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        {/* Signer identity */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
            Signing as {userDisplayName}{userCredentials ? ` · ${userCredentials}` : ''}
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            {includedCount} synoptic{includedCount !== 1 ? 's' : ''} transmitted
            {excludedCount > 0 && <span style={{ color: C.amber }}> · {excludedCount} excluded</span>}
            {finalizeAndNext && <span style={{ color: C.teal }}> · next case queued</span>}
          </p>
        </div>

        {/* Biometric button — shown when enrolled + policy enabled */}
        {showBiometric && bioStep !== 'failed' && (
          <>
            <button
              onClick={handleBiometric}
              disabled={bioStep === 'pending' || bioStep === 'verified'}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: bioStep === 'idle' ? 'pointer' : 'default',
                border: `1px solid ${bioStep === 'verified' ? C.green : C.teal}`,
                background: bioStep === 'verified' ? 'rgba(16,185,129,0.15)' : C.tealDim,
                color: bioStep === 'verified' ? C.green : C.teal,
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 15 }}>
                {bioStep === 'verified' ? '✓' : bioStep === 'pending' ? '⏳' : '👆'}
              </span>
              {bioStep === 'verified' ? 'Verified' : bioStep === 'pending' ? 'Verifying…' : deviceName}
            </button>
            <span style={{ fontSize: 12, color: C.muted }}>or</span>
          </>
        )}

        {/* Password — always present */}
        <form onSubmit={handlePassword} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <input
              ref={pwRef}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPwError(''); }}
              placeholder={showBiometric ? 'Password fallback' : 'Password'}
              autoComplete="current-password"
              style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13,
                border: `1px solid ${pwError ? C.red : C.border}`,
                background: '#0f172a', color: C.text, width: 170, outline: 'none',
              }}
            />
            {pwError && <p style={{ fontSize: 11, color: C.red, margin: '3px 0 0' }}>{pwError}</p>}
          </div>
          <button type="submit" style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', border: 'none', background: C.teal, color: '#fff',
          }}>
            {finalizeAndNext ? 'Finalise & Next' : 'Finalise now'}
          </button>
        </form>

        <button onClick={onCancel} style={{
          padding: '9px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
          border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, flexShrink: 0,
        }}>Cancel</button>
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const PreFinalisationModal: React.FC<Props> = ({
  show, caseAccession, patientName, reportingMode,
  synoptics, userId, userDisplayName, userCredentials,
  finalizeAndNext = false, onConfirm, onCancel,
}) => {
  const [staged, setStaged] = React.useState<StagedSpecimen[]>([]);
  const [dragSrc, setDragSrc] = React.useState<{ type: 'specimen' | 'synoptic'; si: number; syi: number } | null>(null);
  const [dragOver, setDragOver] = React.useState<{ si: number; syi: number } | null>(null);

  React.useEffect(() => {
    if (show) setStaged(buildStaged(synoptics));
  }, [show, synoptics]);

  if (!show) return null;

  const allSynoptics = staged.flatMap(sp => sp.synoptics);
  const excludedCount = allSynoptics.filter(s => s.excluded).length;
  const totalCount = allSynoptics.length;

  const toggleExclude = (si: number, syi: number) => {
    setStaged(prev => prev.map((sp, i) =>
      i !== si ? sp : {
        ...sp,
        synoptics: sp.synoptics.map((syn, j) =>
          j !== syi ? syn : { ...syn, excluded: !syn.excluded }
        ),
      }
    ));
  };

  // ── Drag handlers ────────────────────────────────────────────────────────

  const onDragStart = (e: React.DragEvent, type: 'specimen' | 'synoptic', si: number, syi: number) => {
    setDragSrc({ type, si, syi });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, si: number, syi: number) => {
    if (!dragSrc) return;
    if (dragSrc.type === 'synoptic' && dragSrc.si !== si) return; // cross-specimen guard
    e.preventDefault();
    setDragOver({ si, syi });
  };

  const onDrop = (e: React.DragEvent, si: number, syi: number) => {
    e.preventDefault();
    if (!dragSrc) return;
    setStaged(prev => {
      const next = prev.map(sp => ({ ...sp, synoptics: [...sp.synoptics] }));
      if (dragSrc.type === 'specimen' && si !== dragSrc.si) {
        const [moved] = next.splice(dragSrc.si, 1);
        next.splice(si, 0, moved);
      } else if (dragSrc.type === 'synoptic' && dragSrc.si === si && syi !== dragSrc.syi) {
        const syns = next[si].synoptics;
        const [moved] = syns.splice(dragSrc.syi, 1);
        syns.splice(syi, 0, moved);
      }
      return next;
    });
    setDragSrc(null);
    setDragOver(null);
  };

  const onDragEnd = () => { setDragSrc(null); setDragOver(null); };

  // ── Confirm ──────────────────────────────────────────────────────────────

  const handleSign = () => {
    const ordered = staged.flatMap(sp => sp.synoptics.filter(s => !s.excluded).map(s => s.instanceId));
    const excluded = staged.flatMap(sp => sp.synoptics.filter(s => s.excluded).map(s => s.instanceId));
    onConfirm(ordered, excluded);
  };

  // ── Drag handle SVG ──────────────────────────────────────────────────────
  const DragHandle = ({ muted = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: muted ? 0.2 : 0.4, flexShrink: 0, cursor: 'grab' }}>
      {[0,1,2].map(i => <div key={i} style={{ width: 16, height: 1.5, background: 'currentColor', borderRadius: 1 }} />)}
    </div>
  );

  const ordinalLabel = (i: number) => ['First','Second','Third','Fourth','Fifth','Sixth'][i] ?? `${i+1}th`;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center',
      zIndex: 9000, padding: '20px',
    }}>
      <div style={{
        background: C.bg, borderRadius: 16, border: `1px solid ${C.border}`,
        width: '100%', maxWidth: 980, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '20px 32px 16px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
                Review before finalising
              </h2>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                background: reportingMode === 'copilot' ? 'rgba(8,145,178,0.15)' : 'rgba(16,185,129,0.12)',
                color: reportingMode === 'copilot' ? C.teal : C.green,
                border: `1px solid ${reportingMode === 'copilot' ? 'rgba(8,145,178,0.3)' : 'rgba(16,185,129,0.3)'}`,
              }}>
                {reportingMode === 'copilot' ? 'Copilot mode' : 'Orchestration mode'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              {caseAccession} · {patientName}
            </p>
          </div>
          <div style={{ fontSize: 13, color: C.muted, textAlign: 'right', lineHeight: 1.5 }}>
            <div>Drag specimens to set transmission order</div>
            <div style={{ fontSize: 12 }}>Synoptics are locked to their specimen</div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px 8px' }}>

          {staged.map((sp, si) => {
            const isSpDragOver = dragOver?.si === si && dragOver?.syi === -1 && dragSrc?.type === 'specimen';
            return (
              <div
                key={sp.specimenId}
                draggable
                onDragStart={e => onDragStart(e, 'specimen', si, -1)}
                onDragOver={e => onDragOver(e, si, -1)}
                onDrop={e => onDrop(e, si, -1)}
                onDragEnd={onDragEnd}
                style={{
                  marginBottom: 12,
                  borderRadius: 12,
                  border: `1px solid ${isSpDragOver ? C.teal : C.border}`,
                  background: isSpDragOver ? C.tealDim : C.panel,
                  transition: 'border-color 0.15s, background 0.15s',
                  opacity: dragSrc?.type === 'specimen' && dragSrc.si === si ? 0.4 : 1,
                  cursor: 'grab',
                  overflow: 'hidden',
                }}
              >
                {/* Specimen header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <DragHandle />
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: C.tealDim, border: `1px solid rgba(8,145,178,0.3)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: C.teal, flexShrink: 0,
                  }}>{sp.specimenLabel}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                      Specimen {sp.specimenLabel} — {sp.specimenDesc}
                    </p>
                    <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                      Transmits {ordinalLabel(si).toLowerCase()}
                    </p>
                  </div>
                </div>

                {/* Synoptics for this specimen */}
                {sp.synoptics.map((syn, syi) => {
                  const isSynDragOver = dragOver?.si === si && dragOver?.syi === syi && dragSrc?.type === 'synoptic';
                  return (
                    <div
                      key={syn.instanceId}
                      draggable={!syn.excluded && sp.synoptics.length > 1}
                      onDragStart={e => { e.stopPropagation(); onDragStart(e, 'synoptic', si, syi); }}
                      onDragOver={e => { e.stopPropagation(); onDragOver(e, si, syi); }}
                      onDrop={e => { e.stopPropagation(); onDrop(e, si, syi); }}
                      style={{
                        borderTop: syi > 0 ? `1px solid ${C.border}` : 'none',
                        padding: '14px 16px 14px 62px',
                        opacity: syn.excluded ? 0.5 : dragSrc?.si === si && dragSrc?.syi === syi && dragSrc?.type === 'synoptic' ? 0.3 : 1,
                        background: isSynDragOver ? 'rgba(8,145,178,0.07)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Synoptic header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: syn.excluded ? 0 : 12 }}>
                        {sp.synoptics.length > 1 && !syn.excluded && (
                          <div style={{ marginTop: 2, flexShrink: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, opacity: 0.3, cursor: 'grab' }}>
                              {[0,1].map(i => <div key={i} style={{ width: 14, height: 1.5, background: C.text, borderRadius: 1 }} />)}
                            </div>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
                              {syn.templateName}
                            </p>
                            {syn.excluded && (
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 6,
                                background: C.amberDim, color: C.amber,
                                border: `1px solid rgba(245,158,11,0.3)`,
                              }}>Excluded from transmission</span>
                            )}
                          </div>
                          <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>
                            {syn.answeredCount}/{syn.totalCount} fields completed
                            {syn.excluded && ' · retained in PathScribe for addendum'}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleExclude(si, syi)}
                          style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', flexShrink: 0,
                            border: syn.excluded
                              ? `1px solid rgba(8,145,178,0.4)`
                              : `1px solid ${C.border}`,
                            background: syn.excluded ? C.tealDim : 'transparent',
                            color: syn.excluded ? C.teal : C.muted,
                          }}
                        >
                          {syn.excluded ? 'Re-include' : 'Exclude'}
                        </button>
                      </div>

                      {/* Q&A Preview */}
                      {!syn.excluded && (
                        <div style={{
                          background: 'rgba(0,0,0,0.2)',
                          borderRadius: 8, padding: '10px 14px',
                          border: `0.5px solid ${C.border}`,
                        }}>
                          <p style={{
                            fontSize: 11, fontWeight: 600, color: C.muted,
                            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px',
                          }}>As transmitted to LIS</p>
                          <QAPreview syn={syn} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Addendum note (Copilot mode only) */}
          {reportingMode === 'copilot' && excludedCount > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: C.amberDim, border: `1px solid rgba(245,158,11,0.25)`,
              fontSize: 12, color: '#92400e', marginBottom: 12,
            }}>
              <strong>{excludedCount} synoptic{excludedCount > 1 ? 's' : ''} excluded.</strong>{' '}
              In Copilot mode, excluded synoptics are retained in PathScribe and can be transmitted via an addendum when ready. The LIS report will not include them in this transmission.
            </div>
          )}
        </div>

        {/* ── Signing panel (sticky bottom) ── */}
        <SigningPanel
          userId={userId}
          userDisplayName={userDisplayName}
          userCredentials={userCredentials}
          excludedCount={excludedCount}
          totalCount={totalCount}
          finalizeAndNext={finalizeAndNext}
          onSign={handleSign}
          onCancel={onCancel}
        />

      </div>
    </div>
  );
};

export default PreFinalisationModal;

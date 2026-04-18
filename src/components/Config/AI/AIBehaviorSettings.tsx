/**
 * AIBehaviorSettings.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * UI for the AI Behavior section of the Configuration → AI tab.
 * Controls confidenceThreshold and autoInsertSuggestions.
 *
 * Drop this into src/components/Config/AI/AIBehaviorSettings.tsx
 * and import it into your existing Config/AI/index.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import { aiBehaviorService } from '@/services';
import type { AIBehaviorConfig } from '@/services/aiIntegration/IAIBehaviorService';

const TEAL   = '#0891B2';
const PANEL  = '#1e293b';
const BORDER = '#334155';
const TEXT   = '#f1f5f9';
const MUTED  = '#94a3b8';
const GREEN  = '#10b981';
const AMBER  = '#f59e0b';

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start',
  justifyContent: 'space-between', gap: 24,
  padding: '18px 0', borderBottom: `1px solid ${BORDER}`,
};

export const AIBehaviorSettings: React.FC = () => {
  const [config,   setConfig]   = React.useState<AIBehaviorConfig | null>(null);
  const [saved,    setSaved]    = React.useState(false);
  const [dirty,    setDirty]    = React.useState(false);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    aiBehaviorService.get().then(res => {
      if (res.ok) setConfig(res.data);
      setLoading(false);
    });
  }, []);

  const update = (changes: Partial<AIBehaviorConfig>) => {
    setConfig(prev => prev ? { ...prev, ...changes } : prev);
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!config) return;
    await aiBehaviorService.update(config);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = async () => {
    const res = await aiBehaviorService.reset();
    if (res.ok) { setConfig(res.data); setDirty(false); setSaved(false); }
  };

  if (loading || !config) return (
    <div style={{ padding: '24px 0', color: MUTED, fontSize: 13 }}>Loading AI settings…</div>
  );

  const ToggleBtn = ({ field, val, label }: { field: keyof AIBehaviorConfig; val: boolean; label: string }) => (
    <button
      onClick={() => update({ [field]: val } as any)}
      style={{
        padding: '6px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', border: `1px solid ${BORDER}`,
        background: (config[field] as boolean) === val ? TEAL : 'transparent',
        color:      (config[field] as boolean) === val ? '#fff' : MUTED,
        transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  // Confidence threshold colour feedback
  const thresholdColor = config.confidenceThreshold >= 85 ? GREEN
    : config.confidenceThreshold >= 70 ? TEAL
    : AMBER;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: '0 0 4px' }}>
          AI Suggestion Behaviour
        </h3>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
          Controls how AI-extracted field values are applied to synoptic reports.
        </p>
      </div>

      <div style={{ background: PANEL, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '0 24px', marginBottom: 20 }}>

        {/* ── Auto-insert suggestions ─────────────────────────────────────── */}
        <div style={row}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
              Auto-insert suggestions
            </div>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
              <strong style={{ color: TEXT }}>Off (recommended)</strong> — AI suggestions appear as
              badges below each field. The pathologist clicks <em>Confirm</em> to accept or
              <em> Override</em> to reject. Fields stay blank until actively confirmed.
              Stronger audit trail; each acceptance is a deliberate clinical decision.
              <br /><br />
              <strong style={{ color: TEXT }}>On</strong> — AI values are written directly into
              fields when confidence is at or above the threshold. Pathologist reviews and
              overrides as needed. Faster for high-volume routine cases.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2 }}>
            <ToggleBtn field="autoInsertSuggestions" val={false} label="Off" />
            <ToggleBtn field="autoInsertSuggestions" val={true}  label="On"  />
          </div>
        </div>

        {/* ── Confidence threshold ────────────────────────────────────────── */}
        <div style={{ ...row, borderBottom: 'none', paddingBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
              Confidence threshold
            </div>
            <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>
              Fields where AI confidence is below this threshold show a{' '}
              <span style={{ color: AMBER, fontWeight: 600 }}>⚠ low confidence</span> badge
              and are never auto-inserted regardless of the setting above.
              Fields above the threshold show the confidence % with Confirm / Override.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range" min={50} max={99} step={5}
                value={config.confidenceThreshold}
                onChange={e => update({ confidenceThreshold: Number(e.target.value) })}
                style={{ flex: 1, accentColor: TEAL }}
              />
              <span style={{
                fontSize: 18, fontWeight: 700, color: thresholdColor,
                minWidth: 48, textAlign: 'right',
              }}>
                {config.confidenceThreshold}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED, marginTop: 4 }}>
              <span>50% — permissive</span>
              <span>75% — recommended</span>
              <span>99% — strict</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Additional toggles ──────────────────────────────────────────────── */}
      <div style={{ background: PANEL, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '0 24px', marginBottom: 20 }}>
        <div style={row}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Show confidence scores</div>
            <div style={{ fontSize: 12, color: MUTED }}>Display percentage confidence on each AI suggestion badge in the synoptic editor.</div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <ToggleBtn field="showConfidenceScores" val={true}  label="On"  />
            <ToggleBtn field="showConfidenceScores" val={false} label="Off" />
          </div>
        </div>
        <div style={{ ...row, borderBottom: 'none', paddingBottom: 18 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Subspecialty routing</div>
            <div style={{ fontSize: 12, color: MUTED }}>Filter AI suggestions based on the assigned pathologist's subspecialty to improve relevance.</div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <ToggleBtn field="subspecialtyRouting" val={true}  label="On"  />
            <ToggleBtn field="subspecialtyRouting" val={false} label="Off" />
          </div>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={!dirty}
          style={{
            padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: dirty ? 'pointer' : 'default', border: 'none',
            background: dirty ? TEAL : '#334155', color: '#fff', transition: 'all 0.2s',
          }}
        >
          {saved ? '✓ Saved' : 'Save settings'}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '10px 16px', borderRadius: 8, fontSize: 13,
            cursor: 'pointer', border: `1px solid ${BORDER}`,
            background: 'transparent', color: MUTED,
          }}
        >
          Reset to defaults
        </button>
        {saved && <span style={{ fontSize: 12, color: GREEN }}>Settings saved</span>}
      </div>
    </div>
  );
};

export default AIBehaviorSettings;

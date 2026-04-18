/**
 * components/Config/System/DemoResetTab.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo data reset panel — available in Configuration > System tab.
 * Clears all mock localStorage state so the demo restarts from scratch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';

// ─── Storage keys to wipe ────────────────────────────────────────────────────

const DEMO_KEYS: string[] = [
  // Cases & synoptics
  'pathscribe_mock_cases',
  'pathscribe_mock_cases_version',
  // Messages
  'pathscribe_messages',
  'pathscribe_messages_version',
  // Action registry & learned voice triggers
  'ps_action_registry',
  'ps_learned_triggers',
  // AI behavior settings
  'pathscribe_mock_pathscribe_aiBehavior',
  // Protocol registry overrides
  'ps_registry_overrides_v1',
  // AI feedback log
  'pathscribe_ai_feedback',
  // Delegations & claims
  'ps_delegations_v1',
  'ps_claims_v1',
  // Biometric state (not credentials — just session/policy)
  'ps_biometric_policy',
  'ps_biometric_session',
  'ps_biometric_wizard_dismissed',
  // Client / role / user overrides
  'pathscribe_mock_pathscribe_clients',
  'pathscribe_mock_pathscribe_roles',
  'pathscribe_mock_pathscribe_users',
  // Routing & participation
  'pathscribe_routing_config',
  'pathscribe_routing_rules',
  'pathscribe_participation_types',
  // Worklist sort preference
  'worklistSort',
];

// Also clear any per-case comment keys (ps_case_comment_<id>)
const CASE_COMMENT_PREFIX = 'ps_case_comment_';

// ─── Component ───────────────────────────────────────────────────────────────

const C = {
  bg:        '#0f172a',
  surface:   '#1e293b',
  border:    '#334155',
  text:      '#f1f5f9',
  muted:     '#94a3b8',
  danger:    '#ef4444',
  dangerBg:  'rgba(239,68,68,0.08)',
  dangerBdr: 'rgba(239,68,68,0.3)',
  amber:     '#f59e0b',
  amberBg:   'rgba(245,158,11,0.08)',
  amberBdr:  'rgba(245,158,11,0.3)',
  green:     '#22c55e',
  greenBg:   'rgba(34,197,94,0.08)',
  greenBdr:  'rgba(34,197,94,0.3)',
};

type ResetState = 'idle' | 'confirm' | 'done';

export function DemoResetTab() {
  const [state, setState]   = useState<ResetState>('idle');
  const [cleared, setCleared] = useState<number>(0);

  function handleReset() {
    let count = 0;

    // Clear known keys
    for (const key of DEMO_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        count++;
      }
    }

    // Clear dynamic case comment keys
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith(CASE_COMMENT_PREFIX)) {
        localStorage.removeItem(key);
        count++;
      }
    }

    setCleared(count);
    setState('done');
  }

  return (
    <div style={{ maxWidth: 640, padding: '32px 0' }}>

      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>
        Demo Reset
      </h2>
      <p style={{ fontSize: 13, color: C.muted, margin: '0 0 32px', lineHeight: 1.7 }}>
        Resets all mock demo data back to the initial seeded state — cases,
        messages, AI suggestions, voice learning, protocol overrides, and
        worklist preferences. The page will reload automatically.
        <br /><br />
        Use this after a demo run so the next reviewer starts with a clean slate.
      </p>

      {/* What gets reset */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '20px 24px', marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          What gets reset
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
          {[
            'All case data & synoptic answers',
            'AI suggestions & verification state',
            'In-app messages & notifications',
            'Voice learned triggers',
            'Countersign workflow state',
            'Protocol registry overrides',
            'Delegation & claim records',
            'AI behavior settings',
            'Case comments',
            'Worklist sort preferences',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.muted }}>
              <span style={{ color: C.amber, fontSize: 16, lineHeight: 1 }}>◦</span>
              {item}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 7,
          background: C.amberBg, border: `1px solid ${C.amberBdr}`,
          fontSize: 12, color: C.amber,
        }}>
          ⚠ Does <strong>not</strong> reset: login credentials, biometric enrolment, theme, or system configuration.
        </div>
      </div>

      {/* Idle state */}
      {state === 'idle' && (
        <button
          onClick={() => setState('confirm')}
          style={{
            padding: '11px 28px', borderRadius: 8, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', border: `1.5px solid ${C.dangerBdr}`,
            background: C.dangerBg, color: C.danger,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.background = 'rgba(239,68,68,0.16)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.background = C.dangerBg;
          }}
        >
          Reset Demo Data…
        </button>
      )}

      {/* Confirm state */}
      {state === 'confirm' && (
        <div style={{
          background: C.dangerBg, border: `1.5px solid ${C.dangerBdr}`,
          borderRadius: 10, padding: '20px 24px',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.danger, margin: '0 0 6px' }}>
            Are you sure?
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 20px', lineHeight: 1.6 }}>
            This will wipe all in-progress demo work — answered fields, messages,
            countersign state, and voice learning. The app will reload and all
            cases will return to their initial state.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setState('idle')}
              style={{
                padding: '9px 20px', borderRadius: 7, fontSize: 13, cursor: 'pointer',
                border: `1px solid ${C.border}`, background: 'transparent', color: C.muted,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleReset();
                // Short delay so the user sees "done" before reload
                setTimeout(() => window.location.reload(), 1200);
              }}
              style={{
                padding: '9px 24px', borderRadius: 7, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', border: 'none', background: C.danger, color: '#fff',
              }}
            >
              Yes, Reset Everything
            </button>
          </div>
        </div>
      )}

      {/* Done state */}
      {state === 'done' && (
        <div style={{
          background: C.greenBg, border: `1.5px solid ${C.greenBdr}`,
          borderRadius: 10, padding: '20px 24px',
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.green, margin: '0 0 4px' }}>
            ✓ Reset complete — {cleared} storage {cleared === 1 ? 'key' : 'keys'} cleared
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Reloading…
          </p>
        </div>
      )}
    </div>
  );
}

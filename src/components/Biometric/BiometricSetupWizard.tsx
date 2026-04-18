/**
 * BiometricSetupWizard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * First-login biometric enrolment wizard.
 * Triggered by AuthContext when shouldShowBiometricWizard() returns true.
 * Three steps: welcome → device check → enrol.
 * Dismissible ("set up later") — re-prompts after 3 dismissals.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import {
  isBiometricAvailable,
  enrollBiometric,
  dismissBiometricWizard,
  getDeviceName,
} from '@/services/biometric/mockBiometricService';

interface Props {
  userId: string;
  userName: string;
  onComplete: () => void;
  onDismiss: () => void;
}

type Step = 'welcome' | 'checking' | 'unavailable' | 'enrol' | 'enrolling' | 'done' | 'error';

const TEAL  = '#0891B2';
const DARK  = '#0f172a';
const PANEL = '#1e293b';
const BORDER = '#334155';
const TEXT  = '#f1f5f9';
const MUTED = '#94a3b8';

const btn = (primary: boolean): React.CSSProperties => ({
  padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600,
  cursor: 'pointer', border: primary ? 'none' : `1px solid ${BORDER}`,
  background: primary ? TEAL : 'transparent',
  color: primary ? '#fff' : MUTED,
  transition: 'all 0.15s',
});

export const BiometricSetupWizard: React.FC<Props> = ({ userId, userName, onComplete, onDismiss }) => {
  const [step, setStep] = React.useState<Step>('welcome');
  const [deviceName, setDeviceName] = React.useState('biometric');
  const [errorMsg, setErrorMsg] = React.useState('');

  const startCheck = async () => {
    setStep('checking');
    const available = await isBiometricAvailable();
    if (available) {
      setDeviceName(getDeviceName());
      setStep('enrol');
    } else {
      setStep('unavailable');
    }
  };

  const handleEnrol = async () => {
    setStep('enrolling');
    const result = await enrollBiometric(userId);
    if (result.ok) {
      setStep('done');
    } else {
      setErrorMsg(result.error ?? 'Enrolment failed. Please try again.');
      setStep('error');
    }
  };

  const handleDismiss = () => {
    dismissBiometricWizard(userId);
    onDismiss();
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99999,
  };
  const modal: React.CSSProperties = {
    background: PANEL, borderRadius: 16, border: `1px solid ${BORDER}`,
    width: 440, padding: '36px 40px', boxSizing: 'border-box',
  };

  const iconBox = (icon: string) => (
    <div style={{
      width: 64, height: 64, borderRadius: 16,
      background: 'rgba(8,145,178,0.12)', border: `1px solid rgba(8,145,178,0.25)',`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, marginBottom: 24,
    }}>{icon}</div>
  );

  return (
    <div style={overlay} onClick={e => e.stopPropagation()}>
      <div style={modal}>

        {/* ── Welcome ─────────────────────────────────────────── */}
        {step === 'welcome' && (<>
          {iconBox('🔐')}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>
            Set up biometric sign-off
          </h2>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 8px' }}>
            Hi {userName}. PathScribe can use {getDeviceName()} to verify your identity when finalising reports — replacing your password for a faster, more secure workflow.
          </p>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: '0 0 28px' }}>
            Your biometric data never leaves your device. PathScribe stores only a cryptographic reference, which satisfies 21 CFR Part 11 e-signature requirements.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btn(true)} onClick={startCheck}>Set up now</button>
            <button style={btn(false)} onClick={handleDismiss}>Set up later</button>
          </div>
        </>)}

        {/* ── Checking ────────────────────────────────────────── */}
        {step === 'checking' && (<>
          {iconBox('⏳')}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>Checking your device…</h2>
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>Detecting available authenticators.</p>
        </>)}

        {/* ── Unavailable ─────────────────────────────────────── */}
        {step === 'unavailable' && (<>
          {iconBox('⚠️')}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>Not available on this device</h2>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>
            Your device doesn't support platform biometric authentication. You can continue using your password to sign off reports.
            <br /><br />
            If you switch to a device with Touch ID, Face ID, or Windows Hello, you can set this up from Profile settings.
          </p>
          <button style={btn(true)} onClick={onComplete}>Continue with password</button>
        </>)}

        {/* ── Enrol ───────────────────────────────────────────── */}
        {step === 'enrol' && (<>
          {iconBox('👆')}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>
            Register {deviceName}
          </h2>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>
            Click the button below. Your browser will prompt you to authenticate with {deviceName}. This registers your credential with PathScribe — you won't need your password to finalise reports after this.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btn(true)} onClick={handleEnrol}>Register {deviceName}</button>
            <button style={btn(false)} onClick={handleDismiss}>Skip for now</button>
          </div>
        </>)}

        {/* ── Enrolling ───────────────────────────────────────── */}
        {step === 'enrolling' && (<>
          {iconBox('⏳')}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>Waiting for {deviceName}…</h2>
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>
            Follow the prompt on your device to complete registration.
          </p>
        </>)}

        {/* ── Done ────────────────────────────────────────────── */}
        {step === 'done' && (<>
          {iconBox('✅')}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>You're set up</h2>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>
            {deviceName} is now registered. From now on, when you finalise a report you'll see a biometric option alongside the password field.
            <br /><br />
            You can manage this from <strong style={{ color: TEXT }}>Profile → Security</strong> at any time.
          </p>
          <button style={btn(true)} onClick={onComplete}>Done</button>
        </>)}

        {/* ── Error ───────────────────────────────────────────── */}
        {step === 'error' && (<>
          {iconBox('❌')}
          <h2 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>Enrolment failed</h2>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 24px' }}>{errorMsg}</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btn(true)} onClick={() => setStep('enrol')}>Try again</button>
            <button style={btn(false)} onClick={handleDismiss}>Skip for now</button>
          </div>
        </>)}

      </div>
    </div>
  );
};

export default BiometricSetupWizard;

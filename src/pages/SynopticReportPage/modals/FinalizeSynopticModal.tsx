/**
 * FinalizeSynopticModal
 * ---------------------
 * A standalone modal component responsible for handling the finalization
 * of a single synoptic report. This modal replaces the large inline JSX
 * block previously embedded inside SynopticReportPage.tsx.
 *
 * PURPOSE
 * -------
 * - Prompt the user for their password before finalizing a synoptic.
 * - Display validation errors (e.g., incorrect password).
 * - Support "Finalize" and "Finalize & Next" flows.
 * - Lock the synoptic after confirmation (handled by parent callback).
 *
 * PROPS
 * -----
 * show: boolean
 *    Controls visibility of the modal.
 *
 * overlayStyle: React.CSSProperties
 *    The shared modal overlay style from SynopticReportPage.
 *
 * activeSynoptic: SynopticReport | null
 *    The synoptic being finalized; used only for displaying the title.
 *
 * finalizePassword: string
 *    The password entered by the user.
 *
 * finalizeError: string
 *    Error message shown when password validation fails.
 *
 * finalizeAndNext: boolean
 *    Indicates whether the user triggered "Finalize & Next".
 *
 * onClose(): void
 *    Closes the modal without finalizing.
 *
 * onPasswordChange(value: string): void
 *    Updates the password input in the parent component.
 *
 * onConfirm(): void
 *    Parent callback that performs the actual finalization logic.
 *
 * BEHAVIOR
 * --------
 * - Renders a password input field.
 * - Shows an error message if finalizeError is non-empty.
 * - Calls onConfirm() when the user presses Enter or clicks the button.
 * - Calls onClose() when the user cancels.
 *
 * NOTES
 * -----
 * - This component contains no business logic.
 * - All finalization logic remains inside SynopticReportPage.
 * - This extraction reduces the main page size and isolates modal UI.
 */

import React from 'react';
// Temporary until we extract real types during refactor
type SynopticReport = any;
interface FinalizeSynopticModalProps {
  show: boolean;
  overlayStyle: React.CSSProperties;
  activeSynoptic: SynopticReport | null;
  finalizePassword: string;
  finalizeError: string;
  finalizeAndNext: boolean;
  onClose: () => void;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

const FinalizeSynopticModal: React.FC<FinalizeSynopticModalProps> = ({
  show,
  overlayStyle,
  activeSynoptic,
  finalizePassword,
  finalizeError,
  finalizeAndNext,
  onClose,
  onPasswordChange,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div data-capture-hide="true" style={overlayStyle}>
      <div
        style={{
          width: '420px',
          backgroundColor: '#fff',
          padding: '36px',
          borderRadius: '20px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 6px',
          }}
        >
          Finalize {activeSynoptic?.title ?? 'Synoptic Report'}
        </h2>
        <p
          style={{
            color: '#64748b',
            marginBottom: '24px',
            lineHeight: '1.5',
            fontSize: '13px',
          }}
        >
          Finalizing this report locks it for editing and creates an audit entry.
          <br />
          Enter your password to confirm.
        </p>
        <input
          type="password"
          autoFocus
          value={finalizePassword}
          onChange={e => onPasswordChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm()}
          placeholder="Your password"
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: `2px solid ${finalizeError ? '#ef4444' : '#e2e8f0'}`,
            fontSize: '14px',
            marginBottom: '8px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        {finalizeError && (
          <p
            style={{
              color: '#ef4444',
              fontSize: '12px',
              margin: '0 0 12px',
              textAlign: 'left',
            }}
          >
            {finalizeError}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              background: 'transparent',
              border: '2px solid #e2e8f0',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              background: '#0891B2',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#0E7490';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#0891B2';
            }}
          >
            🔒 Confirm &amp; Finalize{finalizeAndNext ? ' →' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalizeSynopticModal;
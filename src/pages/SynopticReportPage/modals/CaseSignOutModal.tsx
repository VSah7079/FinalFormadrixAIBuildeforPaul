/**
 * CaseSignOutModal
 * ----------------
 * A standalone modal component responsible for signing out an entire case
 * after all synoptic reports have been finalized. This replaces the large
 * inline JSX block previously embedded inside SynopticReportPage.tsx.
 *
 * PURPOSE
 * -------
 * - Prompt the user for username + password before signing out a case.
 * - Display authentication errors (e.g., incorrect credentials).
 * - Trigger the parent’s sign-out workflow upon confirmation.
 *
 * PROPS
 * -----
 * show: boolean
 *    Controls visibility of the modal.
 *
 * overlayStyle: React.CSSProperties
 *    The shared modal overlay style from SynopticReportPage.
 *
 * accession: string
 *    The case accession number, displayed in the modal text.
 *
 * signOutUser: string
 *    Username entered by the user.
 *
 * signOutPassword: string
 *    Password entered by the user.
 *
 * signOutError: string
 *    Error message shown when authentication fails.
 *
 * onClose(): void
 *    Closes the modal without signing out.
 *
 * onUserChange(value: string): void
 *    Updates the username input in the parent component.
 *
 * onPasswordChange(value: string): void
 *    Updates the password input in the parent component.
 *
 * onConfirm(): void
 *    Parent callback that performs the actual sign-out logic.
 *
 * BEHAVIOR
 * --------
 * - Renders username + password fields.
 * - Shows an error message if signOutError is non-empty.
 * - Calls onConfirm() when the user presses Enter or clicks the button.
 * - Calls onClose() when the user cancels.
 *
 * NOTES
 * -----
 * - This component contains no business logic.
 * - All sign-out logic remains inside SynopticReportPage.
 * - This extraction isolates authentication UI and reduces page size.
 */

import React from 'react';

interface CaseSignOutModalProps {
  show: boolean;
  overlayStyle: React.CSSProperties;
  accession: string;
  signOutUser: string;
  signOutPassword: string;
  signOutError: string;
  onClose: () => void;
  onUserChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
}

const CaseSignOutModal: React.FC<CaseSignOutModalProps> = ({
  show,
  overlayStyle,
  accession,
  signOutUser,
  signOutPassword,
  signOutError,
  onClose,
  onUserChange,
  onPasswordChange,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div data-capture-hide="true" style={overlayStyle}>
      <div
        style={{
          width: '460px',
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>✍️</div>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 6px',
          }}
        >
          Sign Out Case
        </h2>
        <p
          style={{
            color: '#64748b',
            marginBottom: '6px',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          All synoptic reports for{' '}
          <strong data-phi="accession">Case {accession}</strong> have been
          finalized.
        </p>
        <p
          style={{
            color: '#64748b',
            marginBottom: '24px',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          Enter your username and password to sign out this case from PathScribe.
        </p>
        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Username
          </label>
          <input
            type="text"
            autoFocus
            value={signOutUser}
            onChange={e => onUserChange(e.target.value)}
            placeholder="Your username"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`,
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
        <div style={{ textAlign: 'left', marginBottom: '8px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            Password
          </label>
          <input
            type="password"
            value={signOutPassword}
            onChange={e => onPasswordChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onConfirm()}
            placeholder="Your password"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`,
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>
        {signOutError && (
          <p
            style={{
              color: '#ef4444',
              fontSize: '12px',
              margin: '0 0 8px',
              textAlign: 'left',
            }}
          >
            {signOutError}
          </p>
        )}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
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
              padding: '12px',
              borderRadius: '10px',
              background: '#047857',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#065f46';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#047857';
            }}
          >
            ✍️ Sign Out Case
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseSignOutModal;
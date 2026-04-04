/**
 * LogoutWarningModal
 * ------------------
 * A standalone modal that warns the user when logging out with unsaved
 * changes. This replaces the inline logout warning modal previously
 * embedded inside SynopticReportPage.tsx.
 *
 * PURPOSE
 * -------
 * - Warn the user that logging out will discard unsaved changes.
 * - Provide "Cancel" and "Logout Anyway" actions.
 *
 * PROPS
 * -----
 * show: boolean
 *    Controls visibility.
 *
 * overlayStyle: React.CSSProperties
 *    Shared modal overlay style from SynopticReportPage.
 *
 * onCancel(): void
 *    Closes the modal without logging out.
 *
 * onConfirm(): void
 *    Confirms logout and discards unsaved changes.
 */

import React from 'react';

interface LogoutWarningModalProps {
  show: boolean;
  overlayStyle: React.CSSProperties;
  onCancel: () => void;
  onConfirm: () => void;
}

const LogoutWarningModal: React.FC<LogoutWarningModalProps> = ({
  show,
  overlayStyle,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;

  return (
    <div data-capture-hide="true" style={overlayStyle} onClick={onCancel}>
      <div
        style={{
          width: '420px',
          backgroundColor: '#fff',
          padding: '32px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px' }}>
          Unsaved Data
        </h2>

        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
          You have unsaved changes. Logging out now will discard your edits.
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '2px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: '#dc2626',
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Logout Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutWarningModal;
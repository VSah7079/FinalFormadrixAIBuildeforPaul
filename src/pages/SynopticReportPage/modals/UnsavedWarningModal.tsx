/**
 * UnsavedWarningModal
 * -------------------
 * A standalone modal that warns the user when navigating away with
 * unsaved changes. This replaces the inline warning modal previously
 * embedded inside SynopticReportPage.tsx.
 *
 * PURPOSE
 * -------
 * - Warn the user that unsaved changes will be lost.
 * - Provide "Cancel" and "Leave Without Saving" actions.
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
 *    Closes the modal without navigating.
 *
 * onConfirm(): void
 *    Confirms navigation and discards unsaved changes.
 */

import React from 'react';

interface UnsavedWarningModalProps {
  show: boolean;
  overlayStyle: React.CSSProperties;
  onCancel: () => void;
  onConfirm: () => void;
}

const UnsavedWarningModal: React.FC<UnsavedWarningModalProps> = ({
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
          Unsaved Changes
        </h2>

        <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px' }}>
          You have unsaved changes. If you leave now, your edits will be lost.
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
            Leave Without Saving
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedWarningModal;
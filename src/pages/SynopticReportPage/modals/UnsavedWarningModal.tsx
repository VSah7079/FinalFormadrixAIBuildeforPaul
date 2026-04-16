// src/pages/SynopticReportPage/modals/UnsavedWarningModal.tsx

import React from 'react';
import '@/pathscribe.css';

interface UnsavedWarningModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  overlayStyle?: React.CSSProperties;
}

const UnsavedWarningModal: React.FC<UnsavedWarningModalProps> = ({
  show, onConfirm, onCancel, overlayStyle,
}) => {
  if (!show) return null;

  return (
    <div className="ps-overlay" style={{ zIndex: 25000, ...overlayStyle }}>
      <div className="ps-modal-dark">

        <div className="ps-modal-dark-header">
          <svg width="36" height="34" viewBox="0 0 40 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <polygon points="20,2 38,34 2,34" fill="#f59e0b" stroke="#92400e" strokeWidth="1.5" strokeLinejoin="round" />
            <text x="20" y="29" textAnchor="middle" fontSize="17" fontWeight="900" fill="#1c1007" fontFamily="Arial, sans-serif">!</text>
          </svg>
          <span className="ps-modal-dark-title">Unsaved Changes</span>
        </div>

        <p className="ps-modal-dark-body">
          You have unsaved changes to this synoptic report. If you leave now your edits will be lost.
        </p>
        <p className="ps-modal-dark-hint">
          Use <strong>Save Draft</strong> at the bottom of the page to preserve your work.
        </p>

        <div className="ps-modal-dark-footer">
          <button type="button" className="ps-btn-ghost-dark" onClick={onCancel}>
            Stay on Page
          </button>
          <button type="button" className="ps-btn-amber" onClick={onConfirm}>
            Leave Without Saving
          </button>
        </div>

      </div>
    </div>
  );
};

export default UnsavedWarningModal;

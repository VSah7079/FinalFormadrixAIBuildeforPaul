/**
 * AmendmentModal
 * --------------
 * A standalone modal component for submitting either an Amendment or an
 * Addendum request on a finalized synoptic report. This replaces the large
 * inline JSX block previously embedded inside SynopticReportPage.tsx.
 *
 * PURPOSE
 * -------
 * - Allow the user to choose between "Amendment" and "Addendum" modes.
 * - Provide a textarea for describing the requested change.
 * - Trigger the parent callback when the request is submitted.
 * - Mirror the exact UI and behavior of the original inline modal.
 *
 * PROPS
 * -----
 * show: boolean
 *    Controls visibility of the modal.
 *
 * overlayStyle: React.CSSProperties
 *    The shared modal overlay style from SynopticReportPage.
 *
 * amendmentMode: 'amendment' | 'addendum'
 *    The currently selected mode.
 *
 * amendmentText: string
 *    The text entered by the user.
 *
 * activeSynopticTitle: string
 *    Title of the synoptic being amended (for display only).
 *
 * onModeChange(mode): void
 *    Switches between amendment/addendum.
 *
 * onTextChange(value): void
 *    Updates the textarea text.
 *
 * onClose(): void
 *    Closes the modal without submitting.
 *
 * onSubmit(): void
 *    Parent callback that handles the actual submission logic.
 *
 * BEHAVIOR
 * --------
 * - Renders two mode buttons (Amendment / Addendum).
 * - Renders a textarea with dynamic placeholder text.
 * - Submit button is disabled until text is non-empty.
 * - Calls onSubmit() when the user confirms.
 * - Calls onClose() when the user cancels or clicks outside.
 *
 * NOTES
 * -----
 * - Contains no business logic.
 * - All submission logic remains inside SynopticReportPage.
 * - Extraction reduces page size and isolates modal UI.
 */

import React from 'react';

interface AmendmentModalProps {
  show: boolean;
  overlayStyle: React.CSSProperties;
  amendmentMode: 'amendment' | 'addendum';
  amendmentText: string;
  activeSynopticTitle: string;
  onModeChange: (mode: 'amendment' | 'addendum') => void;
  onTextChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const AmendmentModal: React.FC<AmendmentModalProps> = ({
  show,
  overlayStyle,
  amendmentMode,
  amendmentText,
  activeSynopticTitle,
  onModeChange,
  onTextChange,
  onClose,
  onSubmit,
}) => {
  if (!show) return null;

  const isAmendment = amendmentMode === 'amendment';
  const canSubmit = amendmentText.trim().length > 0;

  return (
    <div data-capture-hide="true" style={overlayStyle} onClick={onClose}>
      <div
        style={{
          width: '520px',
          backgroundColor: '#fff',
          padding: '36px',
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mode Switch */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['amendment', 'addendum'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1.5px solid',
                background:
                  amendmentMode === mode
                    ? mode === 'amendment'
                      ? '#d97706'
                      : '#0891B2'
                    : 'white',
                color:
                  amendmentMode === mode
                    ? 'white'
                    : mode === 'amendment'
                    ? '#d97706'
                    : '#0891B2',
                borderColor: mode === 'amendment' ? '#d97706' : '#0891B2',
              }}
            >
              {mode === 'amendment' ? '✏️ Amendment' : '📎 Addendum'}
            </button>
          ))}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 6px',
          }}
        >
          {isAmendment ? 'Amendment Request' : 'Addendum Request'}
        </h2>

        {/* Description */}
        <p
          style={{
            color: '#64748b',
            fontSize: '12px',
            marginBottom: '20px',
            lineHeight: '1.5',
          }}
        >
          {isAmendment
            ? 'An amendment is a corrective change to a finalized report. Describe the error and the correction required.'
            : 'An addendum is an official addition to a finalized report. Describe the reason for the addendum and any changes required.'}{' '}
          Applies to <strong>{activeSynopticTitle}</strong>.
        </p>

        {/* Textarea */}
        <textarea
          autoFocus
          value={amendmentText}
          onChange={e => onTextChange(e.target.value)}
          placeholder={
            isAmendment
              ? 'Describe the error and the required correction…'
              : 'Describe the reason for the addendum and any changes required…'
          }
          rows={6}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '8px',
            border: '2px solid #e2e8f0',
            fontSize: '13px',
            lineHeight: '1.6',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
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
            onClick={onSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit
                ? isAmendment
                  ? '#d97706'
                  : '#0891B2'
                : '#e2e8f0',
              color: canSubmit ? '#fff' : '#94a3b8',
            }}
          >
            {isAmendment ? '✏️ Submit Amendment' : '📎 Submit Addendum'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmendmentModal;
import React from 'react';
import '../../../formedrix.css';
import ForMedrixEditor from '../../../components/Editor/ForMedrixEditor';
import { CommentModalShell } from './CommentModalShell';
import { OtherRoleComment } from './OtherRoleComment';
import type { CaseRole } from '../synopticTypes';
import { ROLE_META } from '../synopticUtils';

interface CaseCommentModalProps {
  accession: string;
  caseComments: Partial<Record<CaseRole, string>>;
  onChangeAttending: (html: string) => void;
  onClose: () => void;
}

const CaseCommentModal: React.FC<CaseCommentModalProps> = ({
  accession, caseComments, onChangeAttending, onClose,
}) => (
  <CommentModalShell
    title="📋 Case Comment"
    subtitle={<>Case {accession} — applies to the entire case, not tied to any specimen</>}
    onClose={onClose}
    footerLeft="TODO: Role Dictionary — will show your role's editable comment and other roles read-only."
  >
    {/* ── Attending (editable) ── */}
    {/* TODO: Replace with dynamic currentUserRole once Role/Capabilities Dictionary is built */}
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '10px', background: ROLE_META.attending.bg, color: ROLE_META.attending.color, border: `1px solid ${ROLE_META.attending.border}` }}>
          {ROLE_META.attending.label}
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>— your comment</span>
        {(!caseComments?.attending || caseComments.attending === '<p></p>')
          ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>No comment yet — start typing below</span>
          : <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>✓ Comment saved — click to edit</span>
        }
      </div>
      <ForMedrixEditor
        key="modal-case-comment-attending"
        content={caseComments?.attending ?? ''}
        placeholder="Enter attending pathologist case comment…"
        onChange={onChangeAttending}
        minHeight="320px"
        showRulerDefault={true}
        macros={[]}
        approvedFonts={['Arial', 'Times New Roman', 'Calibri', 'Courier New']}
      />
    </div>

    {/* ── Resident (read-only collapsible) ── */}
    <OtherRoleComment
      role="resident"
      meta={ROLE_META.resident}
      content={caseComments?.resident ?? ''}
      hasContent={!!(caseComments?.resident && caseComments.resident !== '<p></p>')}
    />
  </CommentModalShell>
);

// ─── OtherRoleComment ─────────────────────────────────────────────────────────
// Read-only collapsible panel showing another role's case comment.

export { CaseCommentModal };
export type { CaseCommentModalProps };

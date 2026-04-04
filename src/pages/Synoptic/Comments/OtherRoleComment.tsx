import React from 'react';
import '../../../pathscribe.css';
import PathScribeEditor from '../../../components/Editor/PathScribeEditor';

const OtherRoleComment: React.FC<{
  role: CaseRole;
  meta: { label: string; color: string; bg: string; border: string };
  content: string;
  hasContent: boolean;
}> = ({ role: _role, meta, content, hasContent }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div style={{ marginBottom: '10px', border: `1px solid ${hasContent ? meta.border : '#e2e8f0'}`, borderRadius: '8px', overflow: 'hidden' }}>
      <div
        onClick={() => { if (hasContent) setExpanded(v => !v); }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: hasContent ? meta.bg : '#f8fafc', cursor: hasContent ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: hasContent ? 'white' : '#e2e8f0', color: hasContent ? meta.color : '#94a3b8', border: `1px solid ${hasContent ? meta.border : '#e2e8f0'}` }}>
          {meta.label}
        </span>
        {hasContent
          ? <span style={{ fontSize: '11px', color: meta.color, fontWeight: 600, flex: 1 }}>● Has comment</span>
          : <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1 }}>No comment</span>
        }
        {hasContent && (
          <span style={{ fontSize: '12px', color: meta.color, transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
        )}
      </div>
      {expanded && hasContent && (
        <div
          style={{ padding: '12px 16px', borderTop: `1px solid ${meta.border}`, background: 'white', fontSize: '13px', lineHeight: '1.7', color: '#1e293b' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
};

// ─── ConfidenceBadge (SR-07) ──────────────────────────────────────────────────
// Extracted as a proper component so useState is legal (hooks can't live inside
// a plain render function called from a loop).

export { OtherRoleComment };

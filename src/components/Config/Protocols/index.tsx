/**
 * components/Config/Protocols/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Entry point for the Synoptic Library configuration tab rendered by ConfigurationPage.
 *
 * Architecture role:
 *   Merged replacement for both the old Protocols tab and the old Templates tab.
 *   Templates and Protocols were the same concept at different lifecycle stages —
 *   merging them here eliminates the false distinction.
 *
 *   This file is a pure orchestrator: sidebar nav + section switching only.
 *   All substantive logic lives in the individual section components.
 *
 * Sub-sections:
 *   ActiveProtocolsSection.tsx  ← validated CAP checklists in use (was: Protocols tab)
 *   ReviewQueueSection.tsx      ← staged/in-review protocols (was: Templates tab)
 *   AllProtocolsSection.tsx     ← complete library, all lifecycle states (was: stub)
 *
 * To add a new section:
 *   1. Create MySection.tsx in this directory
 *   2. Add its id to ProtocolSection type
 *   3. Add to SECTIONS array and renderSection() switch
 *
 * Consumed by:
 *   pages/ConfigurationPage.tsx  (imported as ProtocolsTab, rendered for tab 'protocols')
 *
 * Routes that feed into this tab:
 *   /configuration/protocols/:protocolId  → ProtocolEditor (full-page, active protocols)
 *   /template-review/:id                  → TemplateRenderer (full-page, review queue)
 *   Both navigate back to /configuration?tab=protocols
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import ActiveProtocolsSection from './ActiveProtocolsSection';
import ReviewQueueSection     from './ReviewQueueSection';
import AllProtocolsSection    from './AllProtocolsSection';

type ProtocolSection = 'active' | 'review' | 'all';

const SECTIONS: { id: ProtocolSection; emoji: string; label: string; description: string }[] = [
  {
    id: 'active',
    emoji: '✅',
    label: 'Active Protocols',
    description: 'Validated, in-use checklists',
  },
  {
    id: 'review',
    emoji: '📋',
    label: 'Review Queue',
    description: 'Staged for approval',
  },
  {
    id: 'all',
    emoji: '📚',
    label: 'All Protocols',
    description: 'Complete library',
  },
];

const ProtocolsTab: React.FC = () => {
  const [active, setActive] = useState<ProtocolSection>('active');

  const renderSection = () => {
    switch (active) {
      case 'active': return <ActiveProtocolsSection />;
      case 'review': return <ReviewQueueSection />;
      case 'all':    return <AllProtocolsSection />;
      default:       return null;
    }
  };

  return (
    <div>

      {/* ── Section header ── */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          Synoptic Library
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          CAP, RCPath, and site-specific synoptic templates
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>

      {/* ── Sidebar nav ── */}
      <div style={{ width: '210px', flexShrink: 0, paddingTop: '4px' }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            onMouseEnter={e => { if (active !== s.id) e.currentTarget.style.color = '#DEE4E7'; }}
            onMouseLeave={e => { if (active !== s.id) e.currentTarget.style.color = '#9AA0A6'; }}
            style={{
              width: '100%', textAlign: 'left', padding: '10px 14px',
              background: active === s.id ? 'rgba(138,180,248,0.15)' : 'transparent',
              color: active === s.id ? '#8AB4F8' : '#9AA0A6',
              border: `1px solid ${active === s.id ? 'rgba(138,180,248,0.35)' : 'transparent'}`,
              borderRadius: '8px', cursor: 'pointer',
              marginBottom: '4px', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: active === s.id ? 600 : 500 }}>
              {s.emoji} {s.label}
            </div>
            <div style={{ fontSize: '11px', color: active === s.id ? '#8AB4F8' : '#475569', marginTop: '2px' }}>
              {s.description}
            </div>
          </button>
        ))}
      </div>

      {/* ── Section content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderSection()}
      </div>

      </div>
    </div>
  );
};

export default ProtocolsTab;

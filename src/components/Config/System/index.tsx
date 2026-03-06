/**
 * components/Config/System/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Entry point for the System configuration tab rendered by ConfigurationPage.
 *
 * Architecture role:
 *   Pure orchestrator — it owns only the sidebar navigation and section
 *   switching logic. Every section is a focused, self-contained component
 *   in its own file. This file should never contain inline component
 *   definitions; add new sections as separate files and import them here.
 *
 * Section files:
 *   FlagConfigPage.tsx       ← Flag management (existing)
 *   SpecimenDictionary.tsx   ← Specimen type dictionary (existing)
 *   KeyboardShortcutsModal.tsx ← Keyboard shortcut config (existing)
 *   FontsSection.tsx         ← Approved fonts list
 *   LISSection.tsx           ← LIS integration settings (reads/writes SystemConfigContext)
 *   RetentionSection.tsx     ← Data retention policy display
 *
 * To add a new section:
 *   1. Create MyNewSection.tsx in this directory
 *   2. Add its id to the SystemSection type below
 *   3. Add it to the SECTIONS array (emoji + label)
 *   4. Add its case to renderSection()
 *   No other files need to change.
 *
 * Consumed by:
 *   pages/ConfigurationPage.tsx  (imported as SystemTab, rendered for tab 'system')
 *
 * Config state:
 *   This file does not directly read or write SystemConfigContext — that is
 *   the responsibility of individual section components (e.g. LISSection).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import FlagConfigPage    from './FlagConfigPage';
import SpecimenDictionary from './SpecimenDictionary';
import SubspecialtiesSection from './SubspecialtiesSection';
import SystemShortcuts   from './SystemShortcutsSection';
import FontsSection      from './FontsSection';
import LISSection        from './LISSection';
import RetentionSection  from './RetentionSection';
import ClientDictionary from './ClientDictionary';

// ─── Section registry ─────────────────────────────────────────────────────────

type SystemSection = 'flags' | 'subspecialties' | 'specimens' | 'shortcuts' | 'fonts' | 'lis' | 'retention' | 'clients';

const SECTIONS: { id: SystemSection; emoji: string; label: string }[] = [
  { id: 'flags',     emoji: '🚩',  label: 'Flags'               },
  { id: 'subspecialties', emoji: '🩺', label: 'Subspecialties' },
  { id: 'specimens', emoji: '🔬',  label: 'Specimen Dictionary'  },
  { id: 'shortcuts', emoji: '⌨️', label: 'Keyboard Shortcuts'   },
  { id: 'fonts',     emoji: '🔤',  label: 'Approved Fonts'       },
  { id: 'lis',       emoji: '🔗',  label: 'LIS Integration'      },
  { id: 'retention', emoji: '🗄️', label: 'Data Retention'       },
  { id: 'clients',   emoji: '🏥',  label: 'Client Dictionary'    },
];

// ─── Main component ───────────────────────────────────────────────────────────

const SystemTab: React.FC = () => {
  const [active, setActive] = useState<SystemSection>('flags');

  const renderSection = () => {
    switch (active) {
      case 'flags':         return <FlagConfigPage />;
      case 'subspecialties': return <SubspecialtiesSection />;
      case 'specimens':     return <SpecimenDictionary />;
      case 'shortcuts': return <SystemShortcuts />;
      case 'fonts':     return <FontsSection />;
      case 'lis':       return <LISSection />;
      case 'retention': return <RetentionSection />;
      case 'clients':   return <ClientDictionary />;
      default:          return null;
    }
  };

  return (
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
              borderRadius: '8px', fontSize: '13px',
              fontWeight: active === s.id ? 600 : 500,
              cursor: 'pointer', marginBottom: '4px', transition: 'all 0.15s',
            }}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* ── Section content ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderSection()}
      </div>

    </div>
  );
};

export default SystemTab;

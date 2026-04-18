import React, { useState } from 'react';
import '../../../pathscribe.css';
import FlagConfigPage    from './FlagConfigPage';
import SpecimenDictionary from './SpecimenDictionary';
import SubspecialtiesSection from './SubspecialtiesSection';
// REMOVED: import SystemShortcuts from './SystemShortcutsSection';
import FontsSection      from './FontsSection';
import LISSection        from './LISSection';
import RetentionSection  from './RetentionSection';
import ClientDictionary from './ClientDictionary';
import IdentifierFormatsSection from './IdentifierFormatsSection';
import GoverningBodiesSection  from './GoverningBodiesSection';
import DelegationTypeSection   from './DelegationTypeSection';
import TerminologyServicesSection from '../Terminology/TerminologyServicesSection';

// ─── Section registry ─────────────────────────────────────────────────────────

// 1. Updated: Removed 'shortcuts'
type SystemSection = 'flags' | 'subspecialties' | 'specimens' | 'fonts' | 'lis' | 'retention' | 'clients' | 'identifiers' | 'governing_bodies' | 'delegation_types' | 'terminology';

const SECTIONS: { id: SystemSection; emoji: string; label: string }[] = [
  { id: 'flags',            emoji: '🚩',  label: 'Flags'               },
  { id: 'subspecialties',   emoji: '🩺',  label: 'Subspecialties'      },
  { id: 'specimens',        emoji: '🔬',  label: 'Specimen Dictionary'  },
  // REMOVED: Keyboard Shortcuts entry
  { id: 'fonts',            emoji: '🔤',  label: 'Approved Fonts'       },
  { id: 'lis',              emoji: '🔗',  label: 'LIS Integration'      },
  { id: 'retention',        emoji: '🗄️', label: 'Data Retention'       },
  { id: 'clients',          emoji: '🏥',  label: 'Client Dictionary'    },
  { id: 'identifiers',      emoji: '🔍',  label: 'Identifier Formats'   },
  { id: 'governing_bodies', emoji: '📋',  label: 'Governing Bodies'     },
  { id: 'delegation_types', emoji: '🔀',  label: 'Delegation Types'     },
  { id: 'terminology',      emoji: '🔌',  label: 'Terminology Services' },
];

// ─── Main component ───────────────────────────────────────────────────────────

const SystemTab: React.FC = () => {
  const [active, setActive] = useState<SystemSection>('flags');

  const renderSection = () => {
    switch (active) {
      case 'flags':         return <FlagConfigPage />;
      case 'subspecialties': return <SubspecialtiesSection />;
      case 'specimens':     return <SpecimenDictionary />;
      // REMOVED: case 'shortcuts'
      case 'fonts':     return <FontsSection />;
      case 'lis':       return <LISSection />;
      case 'retention': return <RetentionSection />;
      case 'clients':   return <ClientDictionary />;
      case 'identifiers': return <IdentifierFormatsSection />;
      case 'governing_bodies': return <GoverningBodiesSection isSuperAdmin={true} />; 
      case 'delegation_types': return <DelegationTypeSection />;
      case 'terminology':      return <TerminologyServicesSection isSuperAdmin={true} />;
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

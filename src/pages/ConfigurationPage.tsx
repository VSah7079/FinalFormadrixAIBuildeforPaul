/**
 * ConfigurationPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top-level configuration page, accessible from the Home screen nav tile.
 *
 * Architecture role:
 *   Thin shell that owns tab navigation and renders the active tab's component.
 *   All substantive logic lives inside the individual tab components — this
 *   file should stay lean (nav + routing only).
 *
 * Tab components:
 *   AI Behavior  → components/Config/AI/index.tsx
 *   Models       → components/Config/Models/index.tsx
 *   Synoptic Library → components/Config/Protocols/index.tsx

 *   Staff        → components/Config/Users/index.tsx
 *   System       → components/Config/System/index.tsx  ← orchestrates sub-sections
 *   Macros       → components/Config/Macros/index.tsx
 *
 * Config state:
 *   System-level settings (LIS integration, etc.) are managed by
 *   SystemConfigContext (contexts/SystemConfigContext.tsx).
 *   This page does not read or write that context directly — the System tab's
 *   LISSection component handles it.
 *
 * Prerequisites:
 *   <SystemConfigProvider> must wrap this page in App.tsx / main.tsx so that
 *   LISSection and any other config-reading components can access the context.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuditLog } from '../components/Audit/useAuditLog';
import { useAuth } from '@contexts/AuthContext';
import { useLogout } from '@hooks/useLogout';

import AITab        from '../components/Config/AI/index';
import ModelsTab    from '../components/Config/Models/index';
import ProtocolsTab from '../components/Config/Protocols/index';

import StaffTab     from '../components/Config/Users/index';
import SystemTab    from '../components/Config/System/index';
import MacrosTab    from '../components/Config/Macros/index';

const VALID_TABS = ['ai', 'models', 'protocols', 'staff', 'system', 'macros'] as const;
type TabId = typeof VALID_TABS[number];

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'ai',        label: 'AI Behavior' },
  { id: 'models',    label: 'Models'      },
  { id: 'protocols', label: 'Synoptic Library' },
  { id: 'staff',     label: 'Staff'       },
  { id: 'system',    label: 'System'      },
  { id: 'macros',    label: 'Macros'      },
];

function getTabFromSearch(search: string): TabId {
  const t = new URLSearchParams(search).get('tab') as TabId | null;
  return t && (VALID_TABS as readonly string[]).includes(t) ? t : 'ai';
}

const ConfigurationPage: React.FC = () => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { log }       = useAuditLog();
  const { user }      = useAuth();
  const handleLogout  = useLogout();

  const [activeTab,      setActiveTab]      = useState<TabId>(() => getTabFromSearch(location.search));
  const [isLoaded,       setIsLoaded]       = useState(false);
  const [hasUnsavedData, setHasUnsavedData] = useState(false);
  const [showWarning,    setShowWarning]    = useState(false);

  useEffect(() => { setActiveTab(getTabFromSearch(location.search)); }, [location.search]);
  useEffect(() => { const t = setTimeout(() => setIsLoaded(true), 100); return () => clearTimeout(t); }, []);

  const handleTabChange    = (tabId: TabId) => { setActiveTab(tabId); log('navigate_tab', { tab: tabId }); };
  const handleNavigateHome = () => navigate('/');

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'ai':        return <AITab />;
      case 'models':    return <ModelsTab />;
      case 'protocols': return <ProtocolsTab />;
      case 'staff':     return <StaffTab />;
      case 'system':    return <SystemTab />;
      case 'macros':    return <MacrosTab />;
      default:          return null;
    }
  };

  if (!isLoaded) return <div style={{ padding: '24px', color: '#e2e8f0' }}>Loading configuration…</div>;

  return (
    <div style={{ minHeight: '100vh', color: '#f1f5f9' }}>

      {/* ── Nav Bar ── */}
      <nav style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img
            src="/pathscribe-logo-dark.svg"
            alt="PathScribe AI"
            style={{ height: '60px', width: 'auto', cursor: 'pointer' }}
            onClick={handleNavigateHome}
          />
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />

          {/* Breadcrumbs */}
          <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <span
              onClick={handleNavigateHome}
              style={{ cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0891B2'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
            >
              Home
            </span>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <span style={{ color: '#0891B2', fontWeight: 600 }}>Configuration</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '20px' }}>
            <span style={{ fontSize: '17px', fontWeight: 600 }}>{user?.name || 'Dr. Johnson'}</span>
            <span style={{ fontSize: '12px', color: '#0891B2', fontWeight: 700 }}>MD, FCAP</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* User initials badge */}
            <button
              style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: 'transparent', border: '2px solid #0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891B2', fontWeight: 800, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'DJ'}
            </button>

            {/* Quick Links */}
            <button
              title="Quick Links"
              style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'transparent', border: '2px solid #0891B2', color: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'transparent', border: '2px solid #0891B2', color: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>Configuration</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8' }}>Control AI behavior, templates, users, and system settings</p>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #1e293b' }}>
          {TAB_LABELS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#e2e8f0'; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#94a3b8'; }}
              style={{
                padding: '9px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: '13px', whiteSpace: 'nowrap' as const,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#0891b2' : '#94a3b8',
                borderBottom: activeTab === tab.id ? '2px solid #0891b2' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {renderActiveTab()}
      </div>

      {/* ── Unsaved Changes Modal ── */}
      {showWarning && (
        <div onClick={() => setShowWarning(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '420px', background: '#1e293b', borderRadius: '16px', padding: '32px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>Unsaved Changes</h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>You have unsaved changes. Are you sure you want to leave?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowWarning(false)} style={{ padding: '10px 20px', border: '1px solid #334155', borderRadius: '8px', background: 'transparent', color: '#94a3b8', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Stay</button>
              <button onClick={() => navigate('/')} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPage;

/**
 * components/AppShell/AppShell.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global layout shell — wraps all authenticated pages.
 * Contains the shared nav bar so individual pages don't duplicate it.
 *
 * Renders:
 *   - Logo → navigates home
 *   - Breadcrumb slot (driven by current route)
 *   - 💡 Enhancement Request button
 *   - User initials badge
 *   - Quick Links button
 *   - Logout button
 *   - <Outlet /> for the active page content
 *
 * Drop-in path: src/components/AppShell/AppShell.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import { EnhancementRequestButton } from '../EnhancementRequest/EnhancementRequestButton';

// ─── Breadcrumb map ───────────────────────────────────────────────────────────

const BREADCRUMBS: Record<string, string> = {
  '/':                      'Home',
  '/worklist':              'Worklist',
  '/search':                'Search',
  '/audit':                 'Audit Log',
  '/configuration':         'Configuration',
  '/contribution':          'Contribution Dashboard',
};

function getBreadcrumb(pathname: string): string {
  // Exact match first
  if (BREADCRUMBS[pathname]) return BREADCRUMBS[pathname];
  // Prefix matches for dynamic routes
  if (pathname.startsWith('/case/'))             return 'Case Report';
  if (pathname.startsWith('/report/'))           return 'Full Report';
  if (pathname.startsWith('/template-editor/'))  return 'Template Editor';
  if (pathname.startsWith('/template-review/'))  return 'Template Review';
  if (pathname.startsWith('/configuration/'))    return 'Configuration';
  return '';
}

// ─── NavButton ────────────────────────────────────────────────────────────────

const NavButton: React.FC<{
  title:    string;
  onClick?: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: '42px', height: '42px', borderRadius: '8px',
      background: 'transparent', border: '2px solid #0891B2',
      color: '#0891B2', display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
      fontWeight: 800, fontSize: '15px', flexShrink: 0,
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.1)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    {children}
  </button>
);

// ─── AppShell ─────────────────────────────────────────────────────────────────

const AppShell: React.FC = () => {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { user }      = useAuth();
  const handleLogout  = useLogout();

  const breadcrumb    = getBreadcrumb(location.pathname);
  const isHome        = location.pathname === '/';
  const initials      = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('')
    : '??';

  return (
    <div style={{ minHeight: '100vh', color: '#f1f5f9' }}>

      {/* ── Global Nav Bar ── */}
      <nav style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky', top: 0, zIndex: 1000,
      }}>

        {/* Left — logo + breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <img
            src="/pathscribe-logo.svg"
            alt="pathscribe AI"
            style={{ height: '60px', width: 'auto', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />

          {!isHome && breadcrumb && (
            <>
              <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                <span
                  onClick={() => navigate('/')}
                  style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#0891B2'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                >
                  Home
                </span>
                <span style={{ color: '#cbd5e1' }}>›</span>
                <span style={{ color: '#0891B2', fontWeight: 600 }}>{breadcrumb}</span>
              </div>
            </>
          )}
        </div>

        {/* Right — user info + action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

          {/* User name + credential — PII: hidden during capture */}
          <div data-capture-hide="true" style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '20px' }}>
            <span style={{ fontSize: '17px', fontWeight: 600 }}>
              {user?.name ?? 'Unknown User'}
            </span>
            <span style={{ fontSize: '12px', color: '#0891B2', fontWeight: 700 }}>
              {user?.role === '***REMOVED***' ? 'Admin' : 'MD, FCAP'}
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* User initials — PII: hidden during capture */}
            <div data-capture-hide="true" style={{ display: "inline-flex" }}>
              <NavButton title="Profile">
                {initials}
              </NavButton>
            </div>

            {/* Enhancement Request */}
            <EnhancementRequestButton />

            {/* QA / Testing Feedback */}
            <EnhancementRequestButton mode="qa" />

            {/* Quick Links */}
            <NavButton title="Quick Links">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </NavButton>

            {/* Logout */}
            <NavButton title="Sign Out" onClick={handleLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </NavButton>
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <Outlet />
    </div>
  );
};

export default AppShell;

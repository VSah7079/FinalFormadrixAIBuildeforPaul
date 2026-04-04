import React, { useState, useEffect } from 'react';
import '../../pathscribe.css';
import { useAuth } from '../../contexts/AuthContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { EnhancementRequestButton } from '../EnhancementRequest/EnhancementRequestButton';
import { loadEnhancementConfig } from '../../services/enhancementRequestService';
import { VoiceToggleButton } from '../Voice/VoiceToggleButton';
import { VoiceCommandOverlay } from '../Voice/VoiceCommandOverlay';
import { VoiceMissPrompt } from '../Voice/VoiceMissPrompt';

console.log("Vite MODE:", import.meta.env.MODE);

// Show success toasts in dev, hide in production
const VOICE_SHOW_SUCCESS = import.meta.env.DEV;

const EXTERNAL_LINKS = [
  { name: 'CAP Cancer Protocols', url: 'https://www.cap.org/protocols/cancer-protocols-templates' },
  { name: 'WHO Classification of Tumours', url: 'https://tumourclassification.iarc.who.int/' },
  { name: 'PathologyOutlines', url: 'https://www.pathologyoutlines.com/' },
];

interface NavBarProps {
  onLogoClick: () => void;
  onLogout: () => void;
  onProfileClick: () => void;
  logoHeight?: string;
}

const NavBar: React.FC<NavBarProps> = ({
  onLogoClick,
  onLogout,
  onProfileClick,
  logoHeight = '32px',
}) => {
  const { user } = useAuth();
  const { unreadCount, hasUrgent, setPortalOpen } = useMessaging();
  const [linksOpen, setLinksOpen] = useState(false);
  const qaEnabled = loadEnhancementConfig().qaEnabled;

  const userInitials = user?.name
    ? user.name.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('')
    : 'DSJ';

  // ── Voice: open enhancement/feedback modals ─────────────────────────────
  useEffect(() => {
    const openEnhancement = () => {
      const btn = document.querySelector<HTMLElement>('[data-voice-target="enhancement-request"] button');
      btn?.click();
    };
    const openFeedback = () => {
      const btn = document.querySelector<HTMLElement>('[data-voice-target="testing-feedback"] button');
      btn?.click();
    };
    window.addEventListener('PATHSCRIBE_HOME_OPEN_ENHANCEMENT_REQUEST', openEnhancement);
    window.addEventListener('PATHSCRIBE_HOME_OPEN_TESTING_FEEDBACK',    openFeedback);
    return () => {
      window.removeEventListener('PATHSCRIBE_HOME_OPEN_ENHANCEMENT_REQUEST', openEnhancement);
      window.removeEventListener('PATHSCRIBE_HOME_OPEN_TESTING_FEEDBACK',    openFeedback);
    };
  }, []);

  return (
    <>
      <nav style={navBarStyle}>
        {/* Left: Logo & Dev Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
          <img
            src="/pathscribe-logo-dark.svg"
            alt="PathScribe AI"
            style={{ height: logoHeight, cursor: 'pointer' }}
            onClick={onLogoClick}
          />
          <div style={dividerStyle} />
          <span data-voice-target="enhancement-request"><EnhancementRequestButton /></span>
          {qaEnabled && <span data-voice-target="testing-feedback"><EnhancementRequestButton mode="qa" /></span>}
        </div>

        {/* Right: Profile & Voice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* User Profile */}
          <div onClick={onProfileClick} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
              <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                {user?.name || 'Dr. Sarah Johnson'}
              </div>
              <div style={{ color: '#0891B2', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                MD, FCAP
              </div>
            </div>
            <div style={avatarStyle}>{userInitials}</div>
          </div>

          <div style={dividerStyle} />

          {/* Voice Toggle — onMouseDown prevents focus stealing */}
          <div onMouseDown={(e) => e.preventDefault()} style={{ display: 'flex', alignItems: 'center' }}>
            <VoiceToggleButton />
          </div>

          {/* Messaging Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPortalOpen(true)}
            style={iconBtnStyle}
            className={hasUrgent ? 'urgent-pulse' : ''}
          >
            <div style={{ position: 'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {unreadCount > 0 && <div style={badgeStyle}>{unreadCount}</div>}
            </div>
          </button>

          {/* Clinical Links */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setLinksOpen(true)}
            style={iconBtnStyle}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>

          {/* Logout */}
          <button type="button" onClick={onLogout} style={iconBtnStyle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </nav>

      {/* External Links Modal */}
      {linksOpen && (
        <div className="ps-overlay" style={overlayStyle} onClick={() => setLinksOpen(false)}>
          <div className="ps-modal" style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={modalHeaderStyle}>Clinical Resources</div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {EXTERNAL_LINKS.map(link => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="ps-link-item">
                  {link.name}
                </a>
              ))}
            </div>
            <button type="button" onClick={() => setLinksOpen(false)} style={closeBtnStyle}>Close</button>
          </div>
        </div>
      )}

      {/* Voice overlays
          VoiceMissPrompt:     bottom 104px
          VoiceCommandOverlay: bottom 40px  */}
      <VoiceCommandOverlay showSuccess={VOICE_SHOW_SUCCESS} />
      <VoiceMissPrompt />
    </>
  );
};

// --- STYLES ---

const navBarStyle: React.CSSProperties = {
  background: 'rgba(10, 10, 10, 0.85)',
  position: 'sticky', top: 0, left: 0, right: 0, height: '64px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 24px', backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  zIndex: 1000, boxSizing: 'border-box',
};

const dividerStyle: React.CSSProperties = {
  width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)',
};

const avatarStyle: React.CSSProperties = {
  width: '36px', height: '36px', borderRadius: '10px',
  background: 'rgba(8, 145, 178, 0.1)',
  border: '1px solid rgba(8, 145, 178, 0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#0891B2', fontWeight: 700, fontSize: '13px',
};

const iconBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#94a3b8',
  width: '40px', height: '40px', borderRadius: '10px',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', transition: 'all 0.2s ease',
};

const badgeStyle: React.CSSProperties = {
  position: 'absolute', top: '-4px', right: '-4px',
  minWidth: '16px', height: '16px',
  background: '#EF4444', color: 'white', borderRadius: '50%',
  fontSize: '10px', fontWeight: 800,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: '2px solid #000',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 2000,
};

const modalStyle: React.CSSProperties = {
  width: '320px', background: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px', overflow: 'hidden',
};

const modalHeaderStyle: React.CSSProperties = {
  padding: '16px', background: 'rgba(255,255,255,0.03)',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: '14px', fontWeight: 600, color: '#fff', textAlign: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  width: '100%', padding: '12px', background: 'transparent', border: 'none',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  color: '#64748b', fontSize: '13px', cursor: 'pointer',
};

export default NavBar;

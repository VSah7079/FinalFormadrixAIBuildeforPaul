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

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLogout } from '../../hooks/useLogout';
import { UserSelectorModal } from '../Users/UserSelectorModal';
import { messageService } from '../../services';
import type { MessageThread } from '../../services';
import { useMessaging } from '../../contexts/MessagingContext';
import NavBar from '../NavBar/NavBar';
import '../../pathscribe.css';

const formatMessageDate = (date: Date | string | number) => {
  try {
    // Convert to Date object regardless of what was passed in
    const d = new Date(date);
    
    // Safety check: If the date is invalid, return an empty string instead of crashing
    if (isNaN(d.getTime())) return ""; 
    
    const now = new Date();
    
    // Normalize both to start of day to compare "Today-ness" accurately
    const isToday = d.toDateString() === now.toDateString();
    
    // Calculate difference in days
    const diffInDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' }); // "Mon", "Tue"
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }); // "Feb 15"
    }
  } catch (e) {
    return ""; // Total safety fallback
  }
};

const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userInitials = user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : 'DR';
  const handleLogout = useLogout();
  const location = useLocation();
  const breadcrumbMap: Record<string, { label: string; parent?: string; parentPath?: string }> = {
    '/':              { label: 'Home' },
    '/worklist':      { label: 'Worklist', parent: 'Home', parentPath: '/' },
    '/search':        { label: 'Search', parent: 'Home', parentPath: '/' },
    '/audit':         { label: 'Audit Log', parent: 'Home', parentPath: '/' },
    '/configuration': { label: 'Configuration', parent: 'Home', parentPath: '/' },
    '/contribution':  { label: 'Contributions', parent: 'Home', parentPath: '/' },
  };
  const crumb = breadcrumbMap[location.pathname];

  const {
    messages, setMessages,
    unreadCount,
    portalOpen, setPortalOpen,
  } = useMessaging();

// ─── Drawers & Modals ──────────────────────────────────────────────────────
  const [aboutOpen, setAboutOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newTo, setNewTo] = useState('');
  const [newToId, setNewToId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');

  // ─── Edit / selection ───────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ─── Messaging ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [previousMsgId, setPreviousMsgId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [isUrgentNew, setIsUrgentNew] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'deleted'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const userId = user?.id ?? 'u1';

  // ─── Load inbox ─────────────────────────────────────────────────────────────
  const loadInbox = useCallback(async () => {
    setLoading(true);
    const result = await messageService.getInbox(userId);
    if (result.ok) {
      setMessages(result.data);
      setSelectedMsgId(null);
    }
    setLoading(false);
  }, [userId, setMessages]);

  useEffect(() => { loadInbox(); }, [loadInbox]);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const displayMessages = messages
    .filter(m => filterType === 'deleted' ? m.isDeleted : !m.isDeleted)
    .filter(m =>
      m.senderName.toLowerCase().includes(searchText.toLowerCase()) ||
      m.body.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const currentMsg = messages.find(m => m.id === selectedMsgId);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleMarkRead = async (id: string) => {
    await messageService.markRead(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
  };


  const handleSoftDelete = async (id: string) => {
    await messageService.softDelete(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true } : m));
    if (selectedMsgId === id) setSelectedMsgId(null);
  };

  const handleRestore = async (id: string) => {
    await messageService.restore(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: false } : m));
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this message? This cannot be undone.')) return;
    await messageService.permanentDelete(id);
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedMsgId === id) setSelectedMsgId(null);
  };

  const handleEmptyDeleted = async () => {
    const count = messages.filter(m => m.isDeleted).length;
    if (!window.confirm(`Permanently delete all ${count} messages? This cannot be undone.`)) return;
    await messageService.emptyDeleted(userId);
    setMessages(prev => prev.filter(m => !m.isDeleted));
    setSelectedMsgId(null);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedMsgId) return;
    const result = await messageService.reply(selectedMsgId, userId, user?.name ?? 'Dr. Sarah Johnson', inputText);
    if (result.ok) {
      setMessages(prev => prev.map(m => m.id === selectedMsgId ? result.data : m));
    }
    setInputText('');
    setIsDirty(false);
  };

  const handleSendNew = async () => {
    if (!newBody.trim() || !newToId) return;
    const result = await messageService.send({
      senderId:      userId,
      senderName:    user?.name ?? 'Dr. Sarah Johnson',
      recipientId:   newToId,
      recipientName: newTo,
      subject:       newSubject,
      body:          newBody,
      timestamp:     new Date(),
      isUrgent:      isUrgentNew,
    });
    if (result.ok) {
      setMessages(prev => [result.data, ...prev]);
      setSelectedMsgId(result.data.id);
    }
    setNewTo(''); setNewToId(''); setNewSubject(''); setNewBody('');
    setIsUrgentNew(false); setIsDirty(false); setIsComposing(false);
  };

  const handleBulkDelete = async () => {
    if (filterType === 'deleted') {
      if (!window.confirm(`Permanently delete ${selectedIds.length} message(s)? This cannot be undone.`)) return;
      await Promise.all(selectedIds.map(id => messageService.permanentDelete(id)));
      setMessages(prev => prev.filter(m => !selectedIds.includes(m.id)));
    } else {
      await Promise.all(selectedIds.map(id => messageService.softDelete(id)));
      setMessages(prev => prev.map(m => selectedIds.includes(m.id) ? { ...m, isDeleted: true } : m));
    }
    setSelectedIds([]);
    setIsEditing(false);
  };

  const handleBulkMarkRead = async () => {
    await Promise.all(selectedIds.map(id => messageService.markRead(id)));
    setMessages(prev => prev.map(m => selectedIds.includes(m.id) ? { ...m, isRead: true } : m));
    setSelectedIds([]);
  };

  const resetDrawerState = () => {
    setSelectedMsgId(null);
    setFilterType('all');
    setSearchText('');
    setIsEditing(false);
    setSelectedIds([]);
    setIsFilterMenuOpen(false);
    setHoveredMsgId(null);
    setInputText('');
    setIsDirty(false);
    setIsUrgentNew(false);
    setIsComposing(false);
    setNewTo(''); setNewToId(''); setNewSubject(''); setNewBody('');
  };

  const handleCloseDrawer = () => {
    if (isDirty && window.confirm('You have an unsent message. Are you sure you want to close?')) {
      setPortalOpen(false);
      sessionStorage.removeItem('ps_drawer_open');
      resetDrawerState();
    } else if (!isDirty) {
      setPortalOpen(false);
      sessionStorage.removeItem('ps_drawer_open');
      resetDrawerState();
    }
  };

  // ─── Voice command listeners ───────────────────────────────────────────────
  // Placed after all handlers and derived values so every closure is in scope.
  useEffect(() => {
    // ── Page navigation ──────────────────────────────────────────────────────
    const openHome               = () => navigate('/');
    const openMessages           = () => setPortalOpen(true);
    const openWorklist           = () => navigate('/worklist');
    const openConfig             = () => navigate('/configuration');
    const openSearch             = () => navigate('/search');
    const openAudit              = () => navigate('/audit');
    const openContribution       = () => navigate('/contribution');
    const goBack                 = () => navigate(-1);
    const goForward              = () => navigate(1);
    const nextCase               = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_NAV_NEXT_CASE'));
    const previousCase           = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_NAV_PREVIOUS_CASE'));

    // ── Home page actions ────────────────────────────────────────────────────
    const openEnhancementRequest = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_HOME_OPEN_ENHANCEMENT_REQUEST'));
    const openTestingFeedback    = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_HOME_OPEN_TESTING_FEEDBACK'));
    const viewHelp               = () => window.open('/help/documentation.pdf', '_blank');
    const openResources          = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_PAGE_OPEN_RESOURCES'));
    const systemLogout           = () => handleLogout();

    // ── Messages: navigation ─────────────────────────────────────────────────
    const msgNext = () => {
      setSelectedMsgId(current => {
        const idx = displayMessages.findIndex(m => m.id === current);
        return displayMessages[idx + 1]?.id ?? current;
      });
    };
    const msgPrevious = () => {
      setSelectedMsgId(current => {
        const idx = displayMessages.findIndex(m => m.id === current);
        return idx > 0 ? displayMessages[idx - 1].id : current;
      });
    };

    // ── Messages: actions ────────────────────────────────────────────────────
    const msgReply = () => {
      if (selectedMsgId) {
        setPreviousMsgId(selectedMsgId);
        setSelectedMsgId(null);
        setIsComposing(true);
        setInputText('');
      }
    };
    const msgDelete = () => {
      if (!selectedMsgId) return;
      if (filterType === 'deleted') handlePermanentDelete(selectedMsgId);
      else handleSoftDelete(selectedMsgId);
    };
    const msgMarkRead    = () => { if (selectedMsgId) handleMarkRead(selectedMsgId); };
    const msgMarkReadAll = () => handleBulkMarkRead();
    const msgCompose     = () => {
      setPreviousMsgId(selectedMsgId);
      setSelectedMsgId(null);
      setIsComposing(true);
      setInputText('');
    };
    const msgSend        = () => { if (isComposing) void handleSendNew(); else void handleSend(); };
    const msgClose       = () => handleCloseDrawer();
    const msgEdit        = () => { setIsEditing(e => !e); if (isEditing) setSelectedIds([]); };
    const msgSearch      = () => {
      const input = document.querySelector<HTMLInputElement>('.ps-msg-drawer input[placeholder="Search"]');
      input?.focus();
    };
    const msgViewDeleted  = () => setFilterType('deleted');
    const msgViewMessages = () => setFilterType('all');
    const msgRestore      = () => { if (selectedMsgId) void handleRestore(selectedMsgId); };
    const msgDeleteAll    = () => {
      if (filterType === 'deleted') void handleEmptyDeleted();
      else void handleBulkDelete();
    };

    // ── Messages compose: field helpers ──────────────────────────────────────
    const msgGotoSubject     = () => {
      document.querySelector<HTMLInputElement>('.ps-msg-drawer input[placeholder*="Subject"]')?.focus();
    };
    const msgGotoBody        = () => {
      document.querySelector<HTMLTextAreaElement>('.ps-msg-drawer textarea')?.focus();
    };
    const msgClearSubject    = () => setNewSubject('');
    const msgClearBody       = () => { setNewBody(''); setIsDirty(false); };
    const msgUrgent          = () => setIsUrgentNew(u => !u);
    const msgRecipientSearch = () => setUserModalOpen(true);

    window.addEventListener('PATHSCRIBE_OPEN_HOME',               openHome);
    window.addEventListener('PATHSCRIBE_OPEN_MESSAGES',           openMessages);
    window.addEventListener('PATHSCRIBE_OPEN_WORKLIST',           openWorklist);
    window.addEventListener('PATHSCRIBE_OPEN_CONFIGURATION',      openConfig);
    window.addEventListener('PATHSCRIBE_OPEN_SEARCH',             openSearch);
    window.addEventListener('PATHSCRIBE_OPEN_AUDIT',              openAudit);
    window.addEventListener('PATHSCRIBE_OPEN_CONTRIBUTION',       openContribution);
    window.addEventListener('PATHSCRIBE_GO_BACK',                 goBack);
    window.addEventListener('PATHSCRIBE_GO_FORWARD',              goForward);
    window.addEventListener('PATHSCRIBE_NEXT_CASE',               nextCase);
    window.addEventListener('PATHSCRIBE_PREVIOUS_CASE',           previousCase);
    window.addEventListener('PATHSCRIBE_OPEN_ENHANCEMENT_REQUEST',openEnhancementRequest);
    window.addEventListener('PATHSCRIBE_OPEN_TESTING_FEEDBACK',   openTestingFeedback);
    window.addEventListener('PATHSCRIBE_VIEW_HELP',               viewHelp);
    window.addEventListener('PATHSCRIBE_OPEN_RESOURCES',          openResources);
    window.addEventListener('PATHSCRIBE_SYSTEM_LOGOUT',           systemLogout);
    window.addEventListener('PATHSCRIBE_MSG_NEXT',                msgNext);
    window.addEventListener('PATHSCRIBE_MSG_PREVIOUS',            msgPrevious);
    window.addEventListener('PATHSCRIBE_MSG_REPLY',               msgReply);
    window.addEventListener('PATHSCRIBE_MSG_DELETE',              msgDelete);
    window.addEventListener('PATHSCRIBE_MSG_MARK_READ',           msgMarkRead);
    window.addEventListener('PATHSCRIBE_MSG_MARK_READ_ALL',       msgMarkReadAll);
    window.addEventListener('PATHSCRIBE_MSG_COMPOSE',             msgCompose);
    window.addEventListener('PATHSCRIBE_MSG_SEND',                msgSend);
    window.addEventListener('PATHSCRIBE_MSG_CLOSE',               msgClose);
    window.addEventListener('PATHSCRIBE_MSG_EDIT',                msgEdit);
    window.addEventListener('PATHSCRIBE_MSG_SEARCH',              msgSearch);
    window.addEventListener('PATHSCRIBE_MSG_VIEW_DELETED',        msgViewDeleted);
    window.addEventListener('PATHSCRIBE_MSG_VIEW_MESSAGES',       msgViewMessages);
    window.addEventListener('PATHSCRIBE_MSG_RESTORE',             msgRestore);
    window.addEventListener('PATHSCRIBE_MSG_DELETE_ALL',          msgDeleteAll);
    window.addEventListener('PATHSCRIBE_MSG_GOTO_SUBJECT',        msgGotoSubject);
    window.addEventListener('PATHSCRIBE_MSG_GOTO_BODY',           msgGotoBody);
    window.addEventListener('PATHSCRIBE_MSG_CLEAR_SUBJECT',       msgClearSubject);
    window.addEventListener('PATHSCRIBE_MSG_CLEAR_BODY',          msgClearBody);
    window.addEventListener('PATHSCRIBE_MSG_URGENT',              msgUrgent);
    window.addEventListener('PATHSCRIBE_MSG_RECIPIENT_SEARCH',    msgRecipientSearch);

    return () => {
      window.removeEventListener('PATHSCRIBE_OPEN_HOME',               openHome);
      window.removeEventListener('PATHSCRIBE_OPEN_MESSAGES',           openMessages);
      window.removeEventListener('PATHSCRIBE_OPEN_WORKLIST',           openWorklist);
      window.removeEventListener('PATHSCRIBE_OPEN_CONFIGURATION',      openConfig);
      window.removeEventListener('PATHSCRIBE_OPEN_SEARCH',             openSearch);
      window.removeEventListener('PATHSCRIBE_OPEN_AUDIT',              openAudit);
      window.removeEventListener('PATHSCRIBE_OPEN_CONTRIBUTION',       openContribution);
      window.removeEventListener('PATHSCRIBE_GO_BACK',                 goBack);
      window.removeEventListener('PATHSCRIBE_GO_FORWARD',              goForward);
      window.removeEventListener('PATHSCRIBE_NEXT_CASE',               nextCase);
      window.removeEventListener('PATHSCRIBE_PREVIOUS_CASE',           previousCase);
      window.removeEventListener('PATHSCRIBE_OPEN_ENHANCEMENT_REQUEST',openEnhancementRequest);
      window.removeEventListener('PATHSCRIBE_OPEN_TESTING_FEEDBACK',   openTestingFeedback);
      window.removeEventListener('PATHSCRIBE_VIEW_HELP',               viewHelp);
      window.removeEventListener('PATHSCRIBE_OPEN_RESOURCES',          openResources);
      window.removeEventListener('PATHSCRIBE_SYSTEM_LOGOUT',           systemLogout);
      window.removeEventListener('PATHSCRIBE_MSG_NEXT',                msgNext);
      window.removeEventListener('PATHSCRIBE_MSG_PREVIOUS',            msgPrevious);
      window.removeEventListener('PATHSCRIBE_MSG_REPLY',               msgReply);
      window.removeEventListener('PATHSCRIBE_MSG_DELETE',              msgDelete);
      window.removeEventListener('PATHSCRIBE_MSG_MARK_READ',           msgMarkRead);
      window.removeEventListener('PATHSCRIBE_MSG_MARK_READ_ALL',       msgMarkReadAll);
      window.removeEventListener('PATHSCRIBE_MSG_COMPOSE',             msgCompose);
      window.removeEventListener('PATHSCRIBE_MSG_SEND',                msgSend);
      window.removeEventListener('PATHSCRIBE_MSG_CLOSE',               msgClose);
      window.removeEventListener('PATHSCRIBE_MSG_EDIT',                msgEdit);
      window.removeEventListener('PATHSCRIBE_MSG_SEARCH',              msgSearch);
      window.removeEventListener('PATHSCRIBE_MSG_VIEW_DELETED',        msgViewDeleted);
      window.removeEventListener('PATHSCRIBE_MSG_VIEW_MESSAGES',       msgViewMessages);
      window.removeEventListener('PATHSCRIBE_MSG_RESTORE',             msgRestore);
      window.removeEventListener('PATHSCRIBE_MSG_DELETE_ALL',          msgDeleteAll);
      window.removeEventListener('PATHSCRIBE_MSG_GOTO_SUBJECT',        msgGotoSubject);
      window.removeEventListener('PATHSCRIBE_MSG_GOTO_BODY',           msgGotoBody);
      window.removeEventListener('PATHSCRIBE_MSG_CLEAR_SUBJECT',       msgClearSubject);
      window.removeEventListener('PATHSCRIBE_MSG_CLEAR_BODY',          msgClearBody);
      window.removeEventListener('PATHSCRIBE_MSG_URGENT',              msgUrgent);
      window.removeEventListener('PATHSCRIBE_MSG_RECIPIENT_SEARCH',    msgRecipientSearch);
    };
  }, [
    navigate, setPortalOpen, displayMessages, selectedMsgId,
    filterType, isComposing, isEditing,
    handleMarkRead, handleSoftDelete, handlePermanentDelete, handleRestore,
    handleBulkMarkRead, handleBulkDelete, handleEmptyDeleted,
    handleSend, handleSendNew, handleCloseDrawer, handleLogout,
  ]);

 return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#f1f5f9', background: '#020617', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
     {/* ── NAVBAR ── */}
      <NavBar
        onLogoClick={() => navigate('/')}
        onLogout={handleLogout}
        onProfileClick={() => setAboutOpen(true)}
      />


      {/* Breadcrumb bar */}
      {crumb && crumb.parent && (
        <div style={{ flexShrink: 0, padding: '5px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => navigate(crumb.parentPath!)}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#64748b'}
          >
            {crumb.parent}
          </button>
          <span style={{ color: '#334155', fontSize: '11px' }}>{'›'}</span>
          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>{crumb.label}</span>
        </div>
      )}
      {/* Outlet — flex:1 so it fills remaining height exactly */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Outlet />
      </div>

      {/* ── MESSAGES DRAWER ── */}
      {portalOpen && (
        <>
          <div onClick={handleCloseDrawer} style={{ position: 'fixed', top: '70px', right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999 }} />

          {/* ── Unified messaging surface ── */}
          <div className="ps-msg-drawer" style={{ width: '850px' }}>

            {/* ── Unified top bar ── */}
            <div className="ps-msg-topbar">

              {/* Left segment: title + controls */}
              <div style={{ width: '320px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 className="ps-msg-title">
                    {filterType === 'deleted' ? 'Recently Deleted' : 'Messages'}
                  </h2>
                  {unreadCount > 0 && filterType !== 'deleted' && (
                    <span className="ps-unread-bubble">{unreadCount}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button onClick={() => { setIsEditing(!isEditing); if (isEditing) setSelectedIds([]); }}
                    style={{ color: '#0A84FF', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', fontWeight: 600, padding: '4px 8px', borderRadius: '6px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,132,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >{isEditing ? 'Done' : 'Edit'}</button>
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'none'; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="21" y1="7" x2="3" y2="7" /><line x1="18" y1="12" x2="6" y2="12" /><line x1="15" y1="17" x2="9" y2="17" />
                      </svg>
                    </button>
                    {isFilterMenuOpen && (
                      <>
                        <div onClick={() => setIsFilterMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                        <div style={{ position: 'absolute', top: '35px', right: 0, width: '190px', background: '#1a1d2a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 1000, padding: '4px' }}>
                          {[{ id: 'all', label: 'Messages' }, { id: 'deleted', label: 'Recently Deleted' }].map((opt) => (
                            <div key={opt.id} onClick={() => { setFilterType(opt.id as any); setIsFilterMenuOpen(false); }}
                              style={{ padding: '12px 16px', fontSize: '14px', color: filterType === opt.id ? '#0891B2' : '#e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', borderRadius: '8px' }}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                            >
                              <span>{opt.label}</span>
                              {filterType === opt.id && <span style={{ color: '#0891B2' }}>✓</span>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right segment: thread context, compose title, or close button */}
              <div className="ps-msg-topbar-right">
                {selectedMsgId && currentMsg ? (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentMsg.senderName}</span>
                        {currentMsg.isUrgent && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,69,58,0.12)', color: '#FF453A', border: '1px solid rgba(255,69,58,0.25)', letterSpacing: '0.05em', textTransform: 'uppercase' as const, flexShrink: 0 }}>Urgent</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {currentMsg.subject && (
                          <span style={{ fontSize: '12px', color: '#6b7f99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentMsg.subject}</span>
                        )}
                        {currentMsg.caseNumber && (
                          <button onClick={() => navigate(`/report/${currentMsg.caseNumber}`)}
                            style={{ background: 'rgba(8,145,178,0.08)', border: '1px solid rgba(8,145,178,0.2)', borderRadius: '5px', cursor: 'pointer', color: '#0891B2', fontSize: '11px', fontWeight: 600, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0, transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.08)'; }}
                          >
                            Case {currentMsg.caseNumber}
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={handleCloseDrawer}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a7299', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, marginLeft: '12px', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#5a7299'; e.currentTarget.style.background = 'none'; }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </>
                ) : isComposing ? (
                  <>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#0891B2' }}>New Message</span>
                    <button onClick={handleCloseDrawer}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a7299', display: 'flex', alignItems: 'center', width: '32px', height: '32px', borderRadius: '50%', justifyContent: 'center', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#5a7299'; e.currentTarget.style.background = 'none'; }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </>
                ) : (
                  <button onClick={handleCloseDrawer}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#5a7299', display: 'flex', alignItems: 'center', width: '32px', height: '32px', borderRadius: '50%', justifyContent: 'center', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#5a7299'; e.currentTarget.style.background = 'none'; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* ── Body ── */}
            <div className="ps-msg-body">

              {/* LEFT SIDEBAR */}
              <div className="ps-msg-sidebar">
                <div className="ps-msg-list" style={{ flex: 1, overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#334155', fontSize: '14px' }}>Loading...</div>
                  ) : displayMessages.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#334155', fontSize: '14px' }}>No messages</div>
                  ) : displayMessages.map((m) => {
                    const isSelected = selectedIds.includes(m.id);
                    return (
                      <div key={m.id}
                        onMouseEnter={() => setHoveredMsgId(m.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                        onClick={() => {
                          if (isEditing) {
                            setSelectedIds(prev => isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id]);
                          } else {
                            setSelectedMsgId(m.id);
                            handleMarkRead(m.id);
                          }
                        }}
                        style={{ padding: '12px 18px', cursor: 'pointer', background: selectedMsgId === m.id ? 'rgba(8,145,178,0.08)' : hoveredMsgId === m.id ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: `2px solid ${selectedMsgId === m.id ? '#0891B2' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.12s' }}
                      >
                        {isEditing && (
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: isSelected ? 'none' : '1.5px solid #334155', background: isSelected ? '#0891B2' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {isSelected && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                          </div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{ fontWeight: m.isRead ? 400 : 700, color: m.isUrgent ? (m.isRead ? '#7f3530' : '#FF453A') : m.isRead ? '#6b7f99' : '#f1f5f9', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.senderName}</span>
                            {!isEditing && (
                              hoveredMsgId === m.id ? (
                                filterType === 'deleted' ? (
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                    <button onClick={(e) => { e.stopPropagation(); handleRestore(m.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A84FF', fontSize: '11px', fontWeight: 600, padding: 0 }}>Restore</button>
                                    <button onClick={(e) => { e.stopPropagation(); handlePermanentDelete(m.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF453A', fontSize: '11px', fontWeight: 600, padding: 0 }}>Delete</button>
                                  </div>
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); handleSoftDelete(m.id); }} title="Delete"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF453A', display: 'flex', alignItems: 'center', padding: 0 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                    </svg>
                                  </button>
                                )
                              ) : (
                                <span style={{ fontSize: '11px', color: '#6b7f99', flexShrink: 0 }}>{formatMessageDate(m.timestamp)}</span>
                              )
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: m.isRead ? '#8a9db5' : '#b8c5d4', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{m.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sidebar footer */}
                <div className="ps-msg-sidebar-footer">
                  {isEditing ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button onClick={handleBulkMarkRead} style={{ background: 'none', border: 'none', color: '#0A84FF', cursor: 'pointer', fontSize: '14px', padding: 0 }}>Read All</button>
                      <button onClick={handleBulkDelete} style={{ background: 'none', border: 'none', color: '#FF453A', cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: 0 }}>Delete</button>
                    </div>
                  ) : filterType === 'deleted' ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button disabled={displayMessages.length === 0} onClick={handleEmptyDeleted}
                        style={{ background: 'none', border: 'none', cursor: displayMessages.length === 0 ? 'default' : 'pointer', color: displayMessages.length === 0 ? '#1e293b' : '#FF453A', fontSize: '14px', fontWeight: 600 }}>Delete All</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input className="ps-input" placeholder="Search" value={searchText} onChange={e => setSearchText(e.target.value)}
                        style={{ flex: 1, background: 'rgba(22,34,61,0.9)', border: '1px solid rgba(82,102,128,0.9)', borderRadius: '8px', padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(8,145,178,0.6)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(82,102,128,0.9)'}
                      />
                      <button onClick={() => { setPreviousMsgId(selectedMsgId); setSelectedMsgId(null); setIsComposing(true); setInputText(''); }}
                        title="New Message" disabled={isComposing}
                        style={{ background: 'none', border: 'none', cursor: isComposing ? 'default' : 'pointer', color: isComposing ? '#1e293b' : '#1ab8e0', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', transition: 'all 0.15s' }}
                        onMouseEnter={e => { if (!isComposing) e.currentTarget.style.background = 'rgba(8,145,178,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT CONTENT */}
              <div className="ps-msg-content">
                {isComposing ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', gap: '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 0' }}>
                      <button type="button" onClick={() => setUserModalOpen(true)} style={{ color: '#0891B2', fontSize: '14px', fontWeight: 600, width: '50px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>To:</button>
                      <span style={{ color: newTo ? '#e2e8f0' : '#334155', fontSize: '14px' }}>{newTo || 'Select a user...'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 0' }}>
                      <span style={{ color: '#334155', fontSize: '14px', fontWeight: 600, width: '50px' }}>Subj:</span>
                      <input type="text" placeholder="Subject / Case Number" value={newSubject} onChange={e => setNewSubject(e.target.value)}
                        style={{ flex: 1, background: 'none', border: 'none', color: '#e2e8f0', outline: 'none', fontSize: '14px' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <button onClick={() => setIsUrgentNew(p => !p)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: isUrgentNew ? 'rgba(255,69,58,0.12)' : 'none', border: isUrgentNew ? '1px solid rgba(255,69,58,0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', color: isUrgentNew ? '#FF453A' : '#475569', fontSize: '11px', fontWeight: 600, padding: '4px 8px', transition: 'all 0.2s' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill={isUrgentNew ? '#FF453A' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Urgent
                      </button>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        <button onClick={() => { setIsComposing(false); setSelectedMsgId(previousMsgId); }}
                          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '5px 14px', cursor: 'pointer', color: '#475569', fontSize: '13px', fontWeight: 600 }}>Cancel</button>
                        <button onClick={handleSendNew}
                          style={{ background: '#0891B2', border: 'none', borderRadius: '7px', padding: '5px 16px', cursor: 'pointer', color: '#FFF', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                          Send
                        </button>
                      </div>
                    </div>
                    <textarea placeholder="Type your message here..." value={newBody} onChange={e => { setNewBody(e.target.value); setIsDirty(e.target.value.length > 0); }}
                      style={{ flex: 1, background: 'none', border: 'none', color: '#e2e8f0', outline: 'none', fontSize: '14px', resize: 'none', lineHeight: '1.6', marginTop: '12px' }} />
                  </div>
                ) : selectedMsgId ? (
                  <>
                    <div className="ps-thread-body ps-msg-thread">
                      {(currentMsg?.thread?.length ? currentMsg.thread : [{ senderId: currentMsg?.senderId ?? '', sender: currentMsg?.senderName ?? '', text: currentMsg?.body ?? '', timestamp: currentMsg?.timestamp ?? new Date() } as MessageThread]).map((msg, idx) => {
                        const isMe = msg.senderId === userId;
                        return (
                          <div key={idx} className={`ps-bubble ${isMe ? 'mine' : 'theirs'}`}>
                            {msg.text}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ padding: '14px 20px 34px', borderTop: '1px solid rgba(51,65,85,0.9)', display: 'flex', alignItems: 'center', gap: '10px', background: '#0a1628', flexShrink: 0 }}>
                      <div className="ps-msg-input-wrap">
                        <input className="ps-input" type="text" placeholder="Message..." value={inputText}
                          onChange={e => { setInputText(e.target.value); setIsDirty(e.target.value.length > 0); }}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '14px' }}
                        />
                      </div>
                      <button onClick={handleSend} disabled={!inputText.trim()}
                        style={{ width: '43px', height: '43px', borderRadius: '50%', background: inputText.trim() ? '#0891B2' : 'rgba(22,34,61,0.9)', border: `1px solid ${inputText.trim() ? 'transparent' : 'rgba(82,102,128,0.9)'}`, cursor: inputText.trim() ? 'pointer' : 'default', color: inputText.trim() ? '#FFF' : '#5a7299', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                        onMouseEnter={e => { if (inputText.trim()) e.currentTarget.style.background = '#0e7490'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = inputText.trim() ? '#0891B2' : 'rgba(22,34,61,0.9)'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#1e293b' }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p style={{ fontSize: '13px', margin: 0 }}>Select a message to read</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
{userModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 4000 }}>
          <UserSelectorModal 
            onClose={() => setUserModalOpen(false)}
            onSelect={(u: any) => {
              setNewTo(u.name);
              setNewToId(u.id);
              setUserModalOpen(false);
            }}
          />
        </div>
      )}



      {/* MODALS */}
{aboutOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1C1C1E', width: '380px', borderRadius: '16px', padding: '30px', textAlign: 'center', border: '1px solid #333' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '12px', border: '2px solid #0891B2', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891B2', fontSize: '24px', fontWeight: 800 }}>{userInitials}</div>
            <h2 style={{ margin: '0', color: '#FFF' }}>{user?.name || "Dr. Sarah Johnson"}</h2>
            
            {/* RESTORED HELP LINK SECTION */}
            <div style={{ margin: '20px 0', padding: '15px 0', borderTop: '1px solid #333', borderBottom: '1px solid #333' }}>
              <a 
                href="/help/documentation.pdf" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: '#0891B2', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'block' }}
              >
                View System Help File
              </a>
            </div>

            <button 
              onClick={() => setAboutOpen(false)} 
              style={{ marginTop: '10px', background: '#0891B2', color: '#FFF', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppShell;
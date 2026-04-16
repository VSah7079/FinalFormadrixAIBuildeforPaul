import React, { useState, useEffect, useCallback } from 'react';
import { mockCaseService, getDelegations } from '@/services/cases/mockCaseService';
import type { Case } from '@/types/case/Case';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '@hooks/useLogout';
import WorklistTable      from '../../components/Worklist/WorklistTable';
import ResourcesModal     from './ResourcesModal';
import LogoutWarningModal from './LogoutWarningModal';
import CaseSearchBar from '../../components/Search/CaseSearchBar';
import { mockActionRegistryService } from '../../services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../../constants/systemActions';
import { PoolClaimModal } from '../../components/Worklist/PoolClaimModal';
import { useAuth } from '@/contexts/AuthContext';

const WorklistPage: React.FC = () => {
  const handleLogout = useLogout();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter]       = useState<'all' | 'review' | 'completed' | 'urgent' | 'physician' | 'pool' | 'delegated' | 'inprogress' | 'amended' | 'draft' | 'finalizing'>('all');
  const [realCases, setRealCases]             = useState<Case[]>([]);
  const [delegatedToMeCount, setDelegatedToMeCount] = useState(0);
  const [physicianFilter, setPhysicianFilter] = useState<string>('');
  const [physicianPrompt, setPhysicianPrompt] = useState<string | null>(null);
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const CURRENT_USER_ID   = user?.id   ?? 'PATH-001';
  const CURRENT_USER_NAME = user?.name ?? 'Dr. Sarah Johnson';

  // Measure available height for the table container.
  // We get the wrapper's top offset from the viewport and subtract from 100vh.
  // This is immune to any parent overflow/flex chain issues.
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number>(400);
  useEffect(() => {
    const measure = () => {
      if (!wrapperRef.current) return;
      const top = wrapperRef.current.getBoundingClientRect().top;
      const available = window.innerHeight - top - 16; // 16px bottom breathing room
      setTableHeight(Math.max(200, available));
    };
    // Small delay so the tiles/header have rendered and settled
    const t = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, []);

  // Pool claim modal state
  const [claimModal, setClaimModal] = useState<{ caseId: string; summary: string; poolName: string } | null>(null);

  // Load real cases from mockCaseService on mount
  useEffect(() => {
    mockCaseService.listCasesForUser(user?.id ?? 'current').then(setRealCases).catch(() => {});
    // Load delegated-to-me count
    getDelegations().then(all => {
      const count = all.filter(d => d.toUserId === CURRENT_USER_ID && d.status === 'pending').length;
      setDelegatedToMeCount(count);
    }).catch(() => {});
  }, [user?.id]);

  // Quick Links Data
  const quickLinks = {
    protocols: [
      { title: 'CAP Cancer Protocols', url: 'https://www.cap.org/protocols-and-guidelines' },
      { title: 'WHO Classification', url: 'https://www.who.int/publications' }
    ],
    references: [
      { title: 'PathologyOutlines', url: 'https://www.pathologyoutlines.com' },
      { title: 'UpToDate', url: 'https://www.uptodate.com' }
    ],
    systems: [
      { title: 'Hospital LIS', url: '#' },
      { title: 'Lab Management', url: '#' }
    ]
  };

  // ── 50 Mock Cases ──────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const location  = useLocation();

  // ── Voice: selected row index for keyboard/voice navigation ───────────────
  const [selectedIndex,    setSelectedIndex]    = useState<number>(-1);
  const [selectedCaseId,   setSelectedCaseId]   = useState<string | null>(null);
  const [displayOrder,     setDisplayOrder]      = useState<string[]>([]);

  // ── Return-from-case selection ─────────────────────────────────────────
  // When navigating back from a synoptic report, advance to the next case
  // in the table's actual display order (respects active sort).
  // displayOrder is populated by WorklistTable via onDisplayOrder before this runs.
  const fromCaseId    = (location.state as any)?.fromCaseId    as string | undefined;
  const restoreFilter = (location.state as any)?.restoreFilter as string | undefined;

  // Restore filter when navigating back from report page
  useEffect(() => {
    if (restoreFilter) {
      setActiveFilter(restoreFilter as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once on mount

  useEffect(() => {
    if (!fromCaseId || displayOrder.length === 0) return;
    const viewedIdx = displayOrder.indexOf(fromCaseId);
    const targetId  = displayOrder[viewedIdx + 1] ?? displayOrder[viewedIdx] ?? null;
    if (!targetId) return;
    setSelectedIndex(0);
    setSelectedCaseId(targetId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayOrder]); // fires once displayOrder arrives from the table


  const filteredCases = realCases.filter(c => {
    if (activeFilter === 'pool')       return (c as any).status === 'pool';
    if (activeFilter === 'all')        return (c as any).status !== 'pool';
    // Urgent shows pool cases too — they appear grouped as pool in the list
    if (activeFilter === 'urgent')     return c.order?.priority === 'STAT';
    // All other filters exclude pool cases
    if ((c as any).status === 'pool')  return false;
    if (activeFilter === 'review')     return c.status === 'pending-review';
    if (activeFilter === 'completed')  return c.status === 'finalized';
    if (activeFilter === 'draft')      return c.status === 'draft';
    if (activeFilter === 'inprogress') return c.status === 'in-progress';
    if (activeFilter === 'amended')    return c.status === 'amended';
    if (activeFilter === 'physician')  return (c.order?.requestingProvider ?? '').toLowerCase().includes(physicianFilter.toLowerCase());
    return true;
  });

  const nonPoolCases = realCases.filter(c => (c as any).status !== 'pool');
  const stats = {
    total:          nonPoolCases.length,
    pool:           realCases.filter(c => (c as any).status === 'pool').length,
    inProgress:     nonPoolCases.filter(c => c.status === 'in-progress').length,
    needsReview:    nonPoolCases.filter(c => c.status === 'pending-review').length,
    urgent:         nonPoolCases.filter(c => c.order?.priority === 'STAT').length,
    amended:        nonPoolCases.filter(c => c.status === 'amended').length,
    draft:          nonPoolCases.filter(c => c.status === 'draft').length,
    finalizing:     nonPoolCases.filter(c => c.status === 'finalizing').length,
    completedToday: nonPoolCases.filter(c => {
      if (c.status !== 'finalized') return false;
      if (!c.updatedAt) return false;
      const u = new Date(c.updatedAt), t = new Date();
      return u.getFullYear() === t.getFullYear() &&
             u.getMonth()    === t.getMonth()    &&
             u.getDate()     === t.getDate();
    }).length,
  };

  // ── Voice: set WORKLIST context on mount ──────────────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: table navigation listeners ────────────────────────────────────────
  useEffect(() => {
    const clamp = (i: number) => Math.max(0, Math.min(i, filteredCases.length - 1));

    // Sync both index and case ID together so selection survives sort/filter changes
    const syncId = (idx: number) => {
      setSelectedIndex(idx);
      setSelectedCaseId(filteredCases[idx]?.id ?? null);
    };

    // Default to row 0 on first voice command if nothing selected yet
    const ensureSelection = (i: number) => i < 0 ? 0 : i;

    const next        = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) + 1); syncId(n); return n; });
    const previous    = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) - 1); syncId(n); return n; });
    const pageDown    = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) + 10); syncId(n); return n; });
    const pageUp      = () => setSelectedIndex(i => { const n = clamp(ensureSelection(i) - 10); syncId(n); return n; });
    const first       = () => syncId(0);
    const last        = () => syncId(clamp(filteredCases.length - 1));
    const refresh     = () => window.location.reload();

    // TTS helper — reads text aloud via Web Speech Synthesis
    const speak = (text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1; u.volume = 1;
      window.speechSynthesis.speak(u);
    };

    // Read flags for the focused row
    const readFlags = () => {
      const focused = realCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      const flags = [
        ...((focused as any).caseFlags    ?? []).map((f: any) => f.name),
        ...((focused as any).specimenFlags ?? []).map((f: any) => f.name),
      ];
      if (flags.length === 0) {
        speak(`${focused.id} has no flags.`);
      } else {
        speak(`${focused.id} has ${flags.join(' and ')}.`);
      }
    };

    // Read specimen type for the focused row
    const readSpecimen = () => {
      const focused = realCases.find(c => c.id === selectedCaseId);
      if (!focused) { speak('No case selected.'); return; }
      const spec = focused.specimens?.[0];
      speak(`${focused.id}: ${spec ? spec.description : 'no specimen description'}.`);
    };

    // Filter by physician name — extracted from transcript
    const filterPhysician = (e: Event) => {
      const transcript = ((e as CustomEvent).detail?.transcript as string) ?? '';
      const name = transcript.toLowerCase().replace(/filter by\s*/i, '').trim();
      if (!name) return;

      // Find all unique physicians in the worklist
      const physicians = [...new Set(realCases.map(c => c.order?.requestingProvider ?? '').filter(Boolean))];
      const matches = physicians.filter(p => p.toLowerCase().includes(name));

      if (matches.length === 0) {
        speak(`No physician found matching ${name}.`);
      } else if (matches.length === 1) {
        setPhysicianFilter(matches[0]);
        setActiveFilter('physician');
        setSelectedIndex(-1); setSelectedCaseId(null);
        speak(`Filtering by ${matches[0]}.`);
      } else {
        // Ambiguity — prompt for clarification
        setPhysicianPrompt(`Did you mean: ${matches.slice(0, 3).join(', or ')}?`);
        speak(`Multiple physicians match ${name}. ${matches.slice(0, 3).join(', or ')}?`);
      }
    };

    // Filter commands — reset selection when filter changes
    const filterUrgent    = () => { setActiveFilter('urgent');    setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterCompleted = () => { setActiveFilter('completed'); setSelectedIndex(-1); setSelectedCaseId(null); };
    const filterReview    = () => { setActiveFilter('review');    setSelectedIndex(-1); setSelectedCaseId(null); };
    const clearFilter     = () => { setActiveFilter('all');       setSelectedIndex(-1); setSelectedCaseId(null); };

    // Sort commands — forward to WorklistTable's internal sort system via custom events
    const sortDate     = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'accessionDate', dir: 'desc' } }));
    const sortPriority = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'flagSeverity',  dir: 'desc' } }));
    const sortStatus   = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_APPLY', { detail: { key: 'status',        dir: 'asc'  } }));

    // Sort by column name — extracted from transcript e.g. "sort by date", "sort by physician"
    const sortByColumn = (e: Event) => {
      const t = ((e as CustomEvent).detail?.transcript as string ?? '').toLowerCase().replace('sort by', '').trim();
      const map: Record<string, () => void> = {
        'date': sortDate, 'accession date': sortDate, 'accession': sortDate,
        'priority': sortPriority, 'stat': sortPriority, 'urgency': sortPriority,
        'status': sortStatus, 'case status': sortStatus,
      };
      const fn = map[t];
      if (fn) { fn(); }
      else { speak(`Column "${t}" not recognised. Try date, priority, or status.`); }
    };
    const clearSort    = () => window.dispatchEvent(new CustomEvent('PATHSCRIBE_TABLE_SORT_CLEAR'));

    const openResources = () => setIsResourcesOpen(true);

    const worklistState = { worklistCaseIds: filteredCases.map(c => c.id) };

    const openSelected = () => {
      if (selectedIndex >= 0 && filteredCases[selectedIndex]) {
        navigate(`/case/${filteredCases[selectedIndex].id}/synoptic`, { state: worklistState });
      }
    };

    const nextCase = () => {
      const idx = clamp(ensureSelection(selectedIndex) + 1);
      syncId(idx);
      navigate(`/case/${filteredCases[idx].id}/synoptic`, { state: worklistState });
    };

    const prevCase = () => {
      const idx = clamp(ensureSelection(selectedIndex) - 1);
      syncId(idx);
      navigate(`/case/${filteredCases[idx].id}/synoptic`, { state: worklistState });
    };

    window.addEventListener('PATHSCRIBE_TABLE_NEXT',             next);
    window.addEventListener('PATHSCRIBE_TABLE_PREVIOUS',         previous);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',        pageDown);
    window.addEventListener('PATHSCRIBE_TABLE_PAGE_UP',          pageUp);
    window.addEventListener('PATHSCRIBE_TABLE_FIRST',            first);
    window.addEventListener('PATHSCRIBE_TABLE_LAST',             last);
    window.addEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED',    openSelected);
    window.addEventListener('PATHSCRIBE_TABLE_REFRESH',          refresh);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
    window.addEventListener('PATHSCRIBE_TABLE_CLEAR_FILTER',     clearFilter);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_REVIEW',    filterReview);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
    window.addEventListener('PATHSCRIBE_TABLE_FILTER_PHYSICIAN', filterPhysician);
    window.addEventListener('PATHSCRIBE_READ_FLAGS',             readFlags);
    window.addEventListener('PATHSCRIBE_READ_SPECIMEN',          readSpecimen);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_DATE',        sortDate);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_PRIORITY',    sortPriority);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_STATUS',      sortStatus);
    window.addEventListener('PATHSCRIBE_TABLE_SORT_BY_COLUMN',   sortByColumn);
    window.addEventListener('PATHSCRIBE_TABLE_CLEAR_SORT',       clearSort);
    window.addEventListener('PATHSCRIBE_NAV_NEXT_CASE',          nextCase);
    window.addEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',      prevCase);
    window.addEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',    openResources);

    return () => {
      window.removeEventListener('PATHSCRIBE_TABLE_NEXT',             next);
      window.removeEventListener('PATHSCRIBE_TABLE_PREVIOUS',         previous);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_DOWN',        pageDown);
      window.removeEventListener('PATHSCRIBE_TABLE_PAGE_UP',          pageUp);
      window.removeEventListener('PATHSCRIBE_TABLE_FIRST',            first);
      window.removeEventListener('PATHSCRIBE_TABLE_LAST',             last);
      window.removeEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED',    openSelected);
      window.removeEventListener('PATHSCRIBE_TABLE_REFRESH',          refresh);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
      window.removeEventListener('PATHSCRIBE_TABLE_CLEAR_FILTER',     clearFilter);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_URGENT',    filterUrgent);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_REVIEW',    filterReview);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_COMPLETED', filterCompleted);
      window.removeEventListener('PATHSCRIBE_TABLE_FILTER_PHYSICIAN', filterPhysician);
      window.removeEventListener('PATHSCRIBE_READ_FLAGS',             readFlags);
      window.removeEventListener('PATHSCRIBE_READ_SPECIMEN',          readSpecimen);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_DATE',        sortDate);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_PRIORITY',    sortPriority);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_STATUS',      sortStatus);
      window.removeEventListener('PATHSCRIBE_TABLE_SORT_BY_COLUMN',   sortByColumn);
      window.removeEventListener('PATHSCRIBE_TABLE_CLEAR_SORT',       clearSort);
      window.removeEventListener('PATHSCRIBE_NAV_NEXT_CASE',          nextCase);
      window.removeEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE',      prevCase);
      window.removeEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',    openResources);
    };
  }, [filteredCases, selectedIndex, navigate]);

  return (
    <div style={{
      position: 'relative', width: '100vw', height: '100vh',
      backgroundColor: '#000000', color: '#ffffff',
      fontFamily: "'Inter', sans-serif",
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Backgrounds — self-closing, no scroll contribution */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/main_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, filter: 'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, #000000 100%)', zIndex: 1 }} />

      {/* All content — fills viewport exactly, no overflow */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Search bar — fixed height, never scrolls */}
        <div data-capture-hide="true" style={{ flexShrink: 0, padding: '12px 24px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <CaseSearchBar />
        </div>

        {/* Main — fills remaining height */}
        <main style={{ flex: 1, minHeight: 0, padding: '12px 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

            {/* Header row — title LEFT, tiles RIGHT, fixed height */}
            <div data-capture-hide="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', flexShrink: 0 }}>

              {/* Title */}
              <div style={{ flexShrink: 0 }}>
                <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>Active Cases</h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', whiteSpace: 'nowrap' }}>
                  {activeFilter === 'pool'
                    ? <span style={{ color: '#F97316' }}>Viewing pool queue — {stats.pool} case{stats.pool !== 1 ? 's' : ''}</span>
                    : <>Managing {stats.total} case{stats.total !== 1 ? 's' : ''}{activeFilter !== 'all' && <span style={{ color: '#0891B2', marginLeft: '6px' }}>· filtered</span>}</>
                  }
                </p>
              </div>

              {/* Tiles — right side, compact, act as filter buttons */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                {/* ── TOTAL CASES — standalone summary tile, separated from filters ── */}
                {(() => {
                  const isActive = activeFilter === 'all';
                  return (
                    <button
                      title={isActive ? 'Showing: All Cases — click to reset' : 'Show all cases'}
                      onClick={() => { setActiveFilter(isActive ? 'all' : 'all'); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      style={{
                        background:     isActive ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                        border:         `1.5px solid ${isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)'}`,
                        boxShadow:      'none',
                        borderRadius:   '8px',
                        padding:        '6px 14px',
                        backdropFilter: 'blur(10px)',
                        minWidth:       '90px',
                        cursor:         'pointer',
                        transition:     'all 0.15s ease',
                        textAlign:      'left' as const,
                        outline:        'none',
                        transform:      isActive ? 'translateY(-1px)' : 'none',
                        marginRight:    '6px', // extra breathing room before divider
                      }}
                    >
                      <div style={{ fontSize: '8px', fontWeight: 800, color: isActive ? '#e2e8f0' : '#8899aa', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {isActive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#e2e8f0', display: 'inline-block', flexShrink: 0 }} />}
                        ⬡ Total Cases
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
                        {stats.total}
                      </div>
                    </button>
                  );
                })()}

                {/* ── Vertical divider ── */}
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.10)', alignSelf: 'stretch', margin: '0 4px', flexShrink: 0 }} />

                {/* ── Filter tiles group ── */}
                {([
                  { key: 'pool',       label: activeFilter === 'pool' ? '← Back to My Cases' : 'Pool Cases',      count: stats.pool,           color: '#F97316', bg: 'rgba(249,115,22,0.05)',  border: 'rgba(249,115,22,0.18)',  activeBg: 'rgba(249,115,22,0.18)',  activeBorder: '#F97316',               glow: '0 0 12px rgba(249,115,22,0.4)' },
                  { key: 'delegated',  label: 'Delegated to Me', count: delegatedToMeCount,   color: '#38bdf8', bg: 'rgba(56,189,248,0.05)',  border: 'rgba(56,189,248,0.18)',  activeBg: 'rgba(56,189,248,0.18)',  activeBorder: '#38bdf8',               glow: '0 0 12px rgba(56,189,248,0.4)' },
                  { key: 'urgent',     label: 'Critical',        count: stats.urgent,         color: '#EF4444', bg: 'rgba(239,68,68,0.05)',   border: 'rgba(239,68,68,0.18)',   activeBg: 'rgba(239,68,68,0.18)',   activeBorder: '#EF4444',               glow: '0 0 12px rgba(239,68,68,0.4)' },
                  { key: 'inprogress', label: 'In Progress',     count: stats.inProgress,     color: '#0891B2', bg: 'rgba(8,145,178,0.05)',   border: 'rgba(8,145,178,0.18)',   activeBg: 'rgba(8,145,178,0.18)',   activeBorder: '#0891B2',               glow: '0 0 12px rgba(8,145,178,0.4)' },
                  { key: 'review',     label: 'Needs Review',    count: stats.needsReview,    color: '#F59E0B', bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.18)',  activeBg: 'rgba(245,158,11,0.18)',  activeBorder: '#F59E0B',               glow: '0 0 12px rgba(245,158,11,0.4)' },
                  { key: 'amended',    label: 'Amended',         count: stats.amended,        color: '#8B5CF6', bg: 'rgba(139,92,246,0.05)',  border: 'rgba(139,92,246,0.18)',  activeBg: 'rgba(139,92,246,0.18)',  activeBorder: '#8B5CF6',               glow: '0 0 12px rgba(139,92,246,0.4)' },
                  { key: 'completed',  label: 'Completed Today', count: stats.completedToday, color: '#10B981', bg: 'rgba(16,185,129,0.05)',  border: 'rgba(16,185,129,0.18)',  activeBg: 'rgba(16,185,129,0.18)',  activeBorder: '#10B981',               glow: '0 0 12px rgba(16,185,129,0.4)' },
                  { key: 'draft',      label: 'Draft',           count: stats.draft,          color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.18)', activeBg: 'rgba(148,163,184,0.18)', activeBorder: '#94a3b8',               glow: '0 0 12px rgba(148,163,184,0.3)' },
                  { key: 'finalizing', label: 'Finalizing',      count: stats.finalizing,     color: '#EC4899', bg: 'rgba(236,72,153,0.05)',  border: 'rgba(236,72,153,0.18)',  activeBg: 'rgba(236,72,153,0.18)',  activeBorder: '#EC4899',               glow: '0 0 12px rgba(236,72,153,0.4)' },
                ] as const).map(tile => {
                  const isActive = activeFilter === tile.key;
                  return (
                    <button
                      key={tile.key}
                      title={isActive ? `Showing: ${tile.label} — click to reset` : `Filter by: ${tile.label}`}
                      onClick={() => { setActiveFilter(isActive ? 'all' : tile.key as any); setSelectedIndex(-1); setSelectedCaseId(null); }}
                      style={{
                        background:     isActive ? tile.activeBg  : tile.bg,
                        border:         `1.5px solid ${isActive ? tile.activeBorder : tile.border}`,
                        boxShadow:      isActive ? tile.glow : 'none',
                        borderRadius:   '8px',
                        padding:        '6px 12px',
                        backdropFilter: 'blur(10px)',
                        minWidth:       '80px',
                        cursor:         'pointer',
                        transition:     'all 0.15s ease',
                        textAlign:      'left' as const,
                        outline:        'none',
                        transform:      isActive ? 'translateY(-1px)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: '8px', fontWeight: 800, color: isActive ? tile.color : '#8899aa', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {isActive && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: tile.color, display: 'inline-block', flexShrink: 0 }} />}
                        {tile.label}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: tile.color, lineHeight: 1 }}>
                        {tile.count}
                      </div>
                    </button>
                  );
                })}
                {activeFilter === 'physician' && physicianFilter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(139,92,246,0.15)', border: '1.5px solid rgba(139,92,246,0.4)', borderRadius: '8px', fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>
                    👤 {physicianFilter}
                    <button onClick={() => { setActiveFilter('all'); setPhysicianFilter(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '14px', padding: '0 0 0 4px', lineHeight: 1 }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Physician voice prompt — conditional, fixed height */}
            {physicianPrompt && (
              <div style={{ flexShrink: 0, marginBottom: '8px', padding: '8px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 500 }}>🎙️ {physicianPrompt}</span>
                <button onClick={() => setPhysicianPrompt(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
            )}

            {/* Worklist table — height measured from viewport top offset */}
            <div
              ref={wrapperRef}
              data-capture-hide="true"
            >
              <WorklistTable
                cases={realCases}
                activeFilter={activeFilter}
                tableHeight={tableHeight}
                onPoolCaseClick={(caseId, summary) => {
                  const c = realCases.find(c => c.id === caseId);
                  setClaimModal({
                    caseId,
                    summary,
                    poolName: c?.originHospitalId ?? 'MFT Pool',
                  });
                }}
                selectedIndex={selectedIndex}
                selectedCaseId={selectedCaseId}
                onRowSelect={(idx: number, id: string) => { setSelectedIndex(idx); setSelectedCaseId(id); }}
                onFirstCaseId={(id: string | null) => {
                  if ((location.state as any)?.fromCaseId) return;
                  if (selectedCaseId) return;
                  if (id) { setSelectedIndex(0); setSelectedCaseId(id); }
                }}
                onDisplayOrder={useCallback((ids: string[]) => setDisplayOrder(ids), [])}
              />
            </div>

          </div>
        </main>

      </div>

      <ResourcesModal
        isOpen={isResourcesOpen}
        onClose={() => setIsResourcesOpen(false)}
        quickLinks={quickLinks}
      />
      <LogoutWarningModal
        isOpen={showLogoutWarning}
        onClose={() => setShowLogoutWarning(false)}
        onLogout={handleLogout}
      />
      <PoolClaimModal
        isOpen={!!claimModal}
        caseId={claimModal?.caseId ?? null}
        caseSummary={claimModal?.summary}
        poolName={claimModal?.poolName}
        currentUserId={CURRENT_USER_ID}
        currentUserName={CURRENT_USER_NAME}
        fromFilter="pool"
        onAccepted={() => {
          setClaimModal(null);
          mockCaseService.listCasesForUser(user?.id ?? 'current').then(setRealCases).catch(() => {});
        }}
        onPassed={() => setClaimModal(null)}
        onClose={() => setClaimModal(null)}
      />

    </div>
  );
};

export default WorklistPage;

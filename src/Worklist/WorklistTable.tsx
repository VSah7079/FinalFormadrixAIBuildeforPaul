import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PathologyCase } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SortEntry  = { key: string; dir: 'asc' | 'desc' };
type DividerRow = { __divider: true; label: string; count: number };
type DisplayRow = PathologyCase | DividerRow;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 15;
const SORT_KEY   = 'worklistSort';

const HEADER_COLUMNS: { label: string; key: string }[] = [
  { label: 'Case / Patient',      key: 'id'                  },
  { label: 'Protocol · Specimen', key: 'protocol'            },
  { label: 'Accession',           key: 'accessionDate'       },
  { label: 'Physician',           key: 'submittingPhysician' },
  { label: 'Status',              key: 'status'              },
  { label: 'AI',                  key: 'confidence'          },
  { label: 'Flags',               key: 'flagSeverity'        },
];

const FLAG_PALETTE: Record<string, { bg: string; border: string; dot: string }> = {
  red:    { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   dot: '#EF4444' },
  yellow: { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  dot: '#F59E0B' },
  blue:   { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  dot: '#3B82F6' },
  green:  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)',  dot: '#10B981' },
  orange: { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  dot: '#F97316' },
  purple: { bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)',  dot: '#A855F7' },
};

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const compareValues = (a: any, b: any, dir: 'asc' | 'desc'): number => {
  if (a == null) a = '';
  if (b == null) b = '';
  const aDate = typeof a === 'string' ? Date.parse(a) : NaN;
  const bDate = typeof b === 'string' ? Date.parse(b) : NaN;
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate))
    return dir === 'asc' ? aDate - bDate : bDate - aDate;
  if (typeof a === 'number' && typeof b === 'number')
    return dir === 'asc' ? a - b : b - a;
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  if (sa < sb) return dir === 'asc' ? -1 : 1;
  if (sa > sb) return dir === 'asc' ?  1 : -1;
  return 0;
};

const getFlagSeverity = (c: any): number =>
  Math.max(
    0,
    ...((c.caseFlags     || []).map((f: any) => (typeof f.severity === 'number' ? f.severity : 0))),
    ...((c.specimenFlags || []).map((f: any) => (typeof f.severity === 'number' ? f.severity : 0))),
  );

const getValue = (c: any, key: string): any =>
  key === 'flagSeverity' ? getFlagSeverity(c) : c[key];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Grossed':        return { bg: 'rgba(8,145,178,0.15)',   color: '#0891B2', border: 'rgba(8,145,178,0.3)'   };
    case 'Awaiting Micro': return { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', border: 'rgba(245,158,11,0.3)'  };
    case 'Finalizing':     return { bg: 'rgba(16,185,129,0.15)',  color: '#10B981', border: 'rgba(16,185,129,0.3)'  };
    case 'Completed':      return { bg: 'rgba(100,116,139,0.15)', color: '#64748b', border: 'rgba(100,116,139,0.3)' };
    default:               return { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
  }
};

const getConfidenceColor = (score: number) => {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#F59E0B';
  return '#EF4444';
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS  (defined outside WorklistTable to avoid re-creation)
// ─────────────────────────────────────────────────────────────────────────────

const FlagChip: React.FC<{ flag: any; isSpecimen?: boolean }> = ({ flag, isSpecimen }) => {
  const palette = FLAG_PALETTE[flag.color] ?? FLAG_PALETTE.blue;
  const label: string = flag.name || flag.label || flag.type || flag.color || 'Flag';
  return (
    <span
      title={`${isSpecimen ? 'Specimen' : 'Case'}: ${label}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', borderRadius: '20px',
        fontSize: '10px', fontWeight: 700,
        background: palette.bg, border: `1px solid ${palette.border}`,
        color: palette.dot, whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      <svg width="7" height="8" viewBox="0 0 7 8" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M1 7V1 M1 1 L6 2.5 L1 4"
          stroke={palette.dot}
          strokeWidth={isSpecimen ? 1.2 : 1.8}
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={isSpecimen ? '2 1' : undefined}
          fill="none"
        />
      </svg>
      {label}
    </span>
  );
};

const UrgentDot: React.FC = () => (
  <span
    title="Urgent Case"
    style={{
      display: 'inline-block', width: '8px', height: '8px',
      borderRadius: '50%', background: '#EF4444',
      boxShadow: '0 0 6px #EF4444, 0 0 12px rgba(239,68,68,0.4)',
      flexShrink: 0,
      animation: 'urgentPulse 2s ease-in-out infinite',
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// useVoiceCommand  (defined outside WorklistTable — must be a top-level function)
// ─────────────────────────────────────────────────────────────────────────────

function useVoiceCommand(cases: PathologyCase[], onMatch: (id: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'matched' | 'no-match'>('idle');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    recognitionRef.current = rec;

    rec.onstart  = () => { setIsListening(true); setVoiceStatus('listening'); setTranscript(''); };
    rec.onerror  = () => { setIsListening(false); setVoiceStatus('idle'); };
    rec.onend    = () => setIsListening(false);
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(text);
      const m = text.match(/open\s+case\s+([\w\s\-]+)/i);
      if (m) {
        const spoken = m[1].replace(/[\s\-]/g, '').toUpperCase();
        const found = cases.find(c => {
          const id = c.id.replace(/[\s\-]/g, '').toUpperCase();
          return id === spoken || id.endsWith(spoken) || spoken.endsWith(id);
        });
        if (found) {
          setVoiceStatus('matched');
          setTimeout(() => { onMatch(found.id); setVoiceStatus('idle'); }, 600);
          return;
        }
      }
      setVoiceStatus('no-match');
      setTimeout(() => setVoiceStatus('idle'), 2000);
    };
    rec.start();
  }, [cases, onMatch]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceStatus('idle');
  }, []);

  return { isListening, transcript, voiceStatus, startListening, stopListening };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKLIST TABLE
// ─────────────────────────────────────────────────────────────────────────────

interface WorklistTableProps {
  cases: PathologyCase[];
  activeFilter: 'all' | 'review' | 'completed';
  onBeforeNavigate?: (caseId: string) => void;
}

const WorklistTable: React.FC<WorklistTableProps> = ({ cases, activeFilter, onBeforeNavigate }) => {
  const navigate   = useNavigate();
  const scrollRef  = useRef<HTMLDivElement>(null);

  const [visibleCount,  setVisibleCount]  = useState(BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hoveredRow,    setHoveredRow]    = useState<string | null>(null);

  // ── Multi-column sort stack – persisted to localStorage ──────────────────
  // Index 0 = primary sort, 1 = secondary, 2 = tertiary (max 3).
  // • Click an inactive header  → append to stack
  // • Click an active header    → toggle its direction
  // • Click × on a sort chip    → remove that column from the stack
  const [sortStack, setSortStack] = useState<SortEntry[]>(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      if (!raw) return [{ key: 'id', dir: 'asc' }];
      const p = JSON.parse(raw);
      if (Array.isArray(p) && p.length > 0) return p as SortEntry[];
      if (p?.key) return [{ key: p.key, dir: p.dir ?? 'asc' }];
      return [{ key: 'id', dir: 'asc' }];
    } catch { return [{ key: 'id', dir: 'asc' }]; }
  });

  useEffect(() => {
    try { localStorage.setItem(SORT_KEY, JSON.stringify(sortStack)); } catch {}
  }, [sortStack]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const openCase = useCallback((id: string) => {
    onBeforeNavigate?.(id);
    navigate(`/case/${id}/synoptic`);
  }, [navigate, onBeforeNavigate]);

  // ── Voice ─────────────────────────────────────────────────────────────────
  const { isListening, transcript, voiceStatus, startListening, stopListening } =
    useVoiceCommand(cases, openCase);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredCases = useMemo(() => cases.filter(c => {
    if (activeFilter === 'all')       return true;
    if (activeFilter === 'review')    return ['Grossed', 'Awaiting Micro', 'Finalizing'].includes(c.status);
    if (activeFilter === 'completed') return c.status === 'Completed';
    return true;
  }), [cases, activeFilter]);

  // ── Urgent / normal split ─────────────────────────────────────────────────
  // Data field is `isCritical` (per PathologyCase type) — displayed as "Urgent" in UI.
  // isHighPriority is also included as it's used for sorting priority.
  const isUrgentCase = (c: PathologyCase) =>
    c.isCritical === true || c.isHighPriority === true;

  const urgentCases = useMemo(
    () => filteredCases.filter(c => isUrgentCase(c)),
    [filteredCases],
  );
  const normalCases = useMemo(
    () => filteredCases.filter(c => !isUrgentCase(c)),
    [filteredCases],
  );

  // ── Sort (applied independently within each section) ─────────────────────
  const sortGroup = useCallback((arr: PathologyCase[]) => {
    if (sortStack.length === 0) return arr.slice();
    return arr.slice().sort((a, b) => {
      for (const { key, dir } of sortStack) {
        const r = compareValues(getValue(a, key), getValue(b, key), dir);
        if (r !== 0) return r;
      }
      return 0;
    });
  }, [sortStack]);

  const sortedUrgent = useMemo(() => sortGroup(urgentCases), [urgentCases, sortGroup]);
  const sortedNormal = useMemo(() => sortGroup(normalCases), [normalCases, sortGroup]);
  const finalCases   = useMemo(() => [...sortedUrgent, ...sortedNormal], [sortedUrgent, sortedNormal]);

  // ── Build display list (case rows + section divider sentinels) ────────────
  const displayRows = useMemo<DisplayRow[]>(() => {
    const rows: DisplayRow[] = [];
    if (sortedUrgent.length > 0) {
      rows.push({ __divider: true, label: 'Urgent',    count: sortedUrgent.length });
      rows.push(...sortedUrgent);
    }
    if (sortedNormal.length > 0) {
      rows.push({ __divider: true, label: 'All Cases', count: sortedNormal.length });
      rows.push(...sortedNormal);
    }
    return rows;
  }, [sortedUrgent, sortedNormal]);

  // ── Pagination – divider rows don't consume a slot ────────────────────────
  const visibleRows = useMemo<DisplayRow[]>(() => {
    let n = 0;
    const out: DisplayRow[] = [];
    for (const row of displayRows) {
      if ('__divider' in row) { out.push(row); continue; }
      if (n >= visibleCount) break;
      out.push(row);
      n++;
    }
    return out;
  }, [displayRows, visibleCount]);

  const hasMore = visibleCount < finalCases.length;

  // ── Reset scroll / pagination when filter changes ─────────────────────────
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeFilter]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + BATCH_SIZE, finalCases.length));
        setIsLoadingMore(false);
      }, 400);
    }
  }, [isLoadingMore, hasMore, finalCases.length]);

  // ── Sort header click ─────────────────────────────────────────────────────
  // Click inactive header → append to stack (max 3)
  // Click active header   → toggle direction
  const onHeaderClick = useCallback((key: string) => {
    const defaultDir = (k: string): 'asc' | 'desc' => k === 'flagSeverity' ? 'desc' : 'asc';
    setSortStack(prev => {
      const idx = prev.findIndex(e => e.key === key);
      if (idx !== -1) {
        // toggle direction
        const next = [...prev];
        next[idx] = { key, dir: prev[idx].dir === 'asc' ? 'desc' : 'asc' };
        return next;
      }
      if (prev.length >= 3) return prev; // max reached
      return [...prev, { key, dir: defaultDir(key) }];
    });
  }, []);

  const onRemoveSort = useCallback((key: string) =>
    setSortStack(prev => prev.filter(e => e.key !== key)), []);

  const onClearSort = useCallback(() => setSortStack([]), []);

  // ── Label map for sort bar ────────────────────────────────────────────────
  const colLabelMap = useMemo(() => {
    const m: Record<string, string> = {};
    HEADER_COLUMNS.forEach(({ label, key }) => { m[key] = label; });
    return m;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const containerRef = useRef<HTMLDivElement>(null);

  const colGrid = '28px 220px 1fr 110px 160px 150px 1fr 1fr';

  return (
    <div
      ref={containerRef}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        flex: 1, minHeight: 0,
      }}>

      {/* ── Toolbar ── */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0, background: 'rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
          {finalCases.length} case{finalCases.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={isListening ? stopListening : startListening}
          title={isListening ? 'Stop listening' : 'Voice command: "Open Case S26-XXXX"'}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '20px',
            background: isListening ? 'rgba(8,145,178,0.15)' : 'rgba(255,255,255,0.04)',
            border: isListening ? '1px solid rgba(8,145,178,0.4)' : '1px solid rgba(255,255,255,0.1)',
            color: isListening ? '#0891B2' : '#475569',
            fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {isListening ? 'Listening…' : 'Voice'}
        </button>
      </div>

      {/* ── Column headers ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: colGrid,
        padding: '8px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.15)', flexShrink: 0,
      }}>
        <div />
        {HEADER_COLUMNS.map(({ label, key }) => {
          const stackIdx = sortStack.findIndex(e => e.key === key);
          const isActive = stackIdx !== -1;
          const sortDir  = isActive ? sortStack[stackIdx].dir : null;
          const atMax    = !isActive && sortStack.length >= 3;
          return (
            <div key={key} style={{
              fontSize: '10px', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <button
                onClick={() => onHeaderClick(key)}
                title={
                  isActive ? `Click to toggle direction (${sortDir})` :
                  atMax    ? 'Remove a sort column before adding another' :
                             `Click to sort · adds as column ${sortStack.length + 1}`
                }
                style={{
                  background: 'transparent', border: 'none', padding: 0, margin: 0,
                  cursor: atMax ? 'not-allowed' : 'pointer',
                  opacity: atMax ? 0.35 : 1,
                  color: isActive ? '#0ea5a4' : '#334155',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  fontWeight: 800, fontSize: '10px', textTransform: 'uppercase',
                }}
              >
                <span>{label}</span>
                <span aria-hidden="true" style={{ fontSize: '10px', opacity: isActive ? 1 : 0.35 }}>
                  {sortDir === 'asc' ? '▴' : '▾'}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Sort indicator bar ── */}
      {sortStack.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
          padding: '5px 20px',
          background: 'rgba(8,145,178,0.04)',
          borderBottom: '1px solid rgba(8,145,178,0.1)',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: '9px', fontWeight: 700, color: '#334155',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '2px',
          }}>
            Sort:
          </span>

          {sortStack.map((entry, i) => (
            <React.Fragment key={entry.key}>
              {i > 0 && <span style={{ color: '#334155', fontSize: '10px' }}>›</span>}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '2px 6px 2px 8px', borderRadius: '20px',
                background: 'rgba(8,145,178,0.12)', border: '1px solid rgba(8,145,178,0.25)',
                fontSize: '10px', fontWeight: 700, color: '#0ea5a4',
              }}>
                <span
                  onClick={() => onHeaderClick(entry.key)}
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  title="Click to toggle direction"
                >
                  {colLabelMap[entry.key] ?? entry.key}
                  <span style={{ fontSize: '9px', opacity: 0.8 }}>
                    {entry.dir === 'asc' ? '▴' : '▾'}
                  </span>
                </span>
                <span
                  onClick={() => onRemoveSort(entry.key)}
                  title="Remove this sort"
                  style={{
                    cursor: 'pointer', marginLeft: '2px',
                    color: 'rgba(8,145,178,0.6)', fontSize: '12px',
                    fontWeight: 400, lineHeight: 1,
                  }}
                >×</span>
              </span>
            </React.Fragment>
          ))}

          <button
            onClick={onClearSort}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              cursor: 'pointer', color: '#334155', fontSize: '9px',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
              padding: '2px 4px',
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Voice status bar ── */}
      {voiceStatus !== 'idle' && (
        <div style={{
          padding: '6px 20px', fontSize: '11px', fontWeight: 600, flexShrink: 0,
          color: voiceStatus === 'listening' ? '#0891B2' : voiceStatus === 'matched' ? '#10B981' : '#EF4444',
          background: `${voiceStatus === 'listening' ? '#0891B2' : voiceStatus === 'matched' ? '#10B981' : '#EF4444'}18`,
          borderBottom: `1px solid ${voiceStatus === 'listening' ? '#0891B2' : voiceStatus === 'matched' ? '#10B981' : '#EF4444'}30`,
          display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
        }}>
          {voiceStatus === 'listening' && (
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: '#0891B2', display: 'inline-block',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
          )}
          {voiceStatus === 'listening'
            ? 'Listening… say "Open Case S26-XXXX"'
            : voiceStatus === 'matched'
              ? 'Opening case…'
              : `No match found for "${transcript}"`}
        </div>
      )}

      {/* ── Scrollable rows ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="wl-scroll"
        style={{ overflowY: 'auto', flex: 1 }}
      >
        {finalCases.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#475569' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>No cases found</div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>Try a different filter</div>
          </div>
        ) : visibleRows.map((row, idx) => {

          // ── Section divider ──────────────────────────────────────────────
          if ('__divider' in row) {
            const isUrgent = row.label === 'Urgent';
            return (
              <div
                key={`divider-${row.label}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 20px 6px',
                  background: isUrgent ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                  borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {isUrgent && (
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#EF4444', boxShadow: '0 0 6px #EF4444',
                    flexShrink: 0, display: 'inline-block',
                    animation: 'urgentPulse 2s ease-in-out infinite',
                  }} />
                )}
                <span style={{
                  fontSize: '10px', fontWeight: 800, letterSpacing: '0.8px',
                  textTransform: 'uppercase' as const,
                  color: isUrgent ? '#F87171' : '#475569',
                }}>
                  {row.label}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: isUrgent ? 'rgba(248,113,113,0.6)' : 'rgba(71,85,105,0.6)',
                  background: isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  padding: '1px 7px', borderRadius: '20px',
                }}>
                  {row.count}
                </span>
                <div style={{
                  flex: 1, height: '1px',
                  background: isUrgent ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                }} />
              </div>
            );
          }

          // ── Case row ─────────────────────────────────────────────────────
          const c = row as PathologyCase;
          const urgent = isUrgentCase(c);
          return (
            <div
              key={c.id}
              onClick={() => openCase(c.id)}
              onMouseEnter={() => setHoveredRow(c.id)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'grid', gridTemplateColumns: colGrid,
                padding: '10px 20px', minHeight: '46px', alignItems: 'start',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: urgent && hoveredRow !== c.id
                  ? 'rgba(239,68,68,0.04)'
                  : hoveredRow === c.id ? 'rgba(8,145,178,0.07)' : 'transparent',
                borderLeft: urgent
                  ? '2px solid rgba(239,68,68,0.5)'
                  : '2px solid transparent',
                transition: 'background-color 0.15s ease',
                cursor: 'pointer',
              }}
            >
              {/* Urgent indicator dot */}
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: '5px' }}>
                {urgent && <UrgentDot />}
              </div>

              {/* Case ID + Patient */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, paddingTop: '2px' }}>
                <span style={{
                  fontSize: '13px', fontWeight: 800, whiteSpace: 'nowrap',
                  letterSpacing: '0.3px', flexShrink: 0,
                  color: urgent ? '#F87171' : '#0891B2',
                }}>
                  {c.id}
                </span>
                <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                <span style={{
                  fontSize: '13px', color: '#cbd5e1', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.patient}
                </span>
              </div>

              {/* Protocol · Specimen */}
              <div title={`${c.protocol} · ${c.specimen}`} style={{
                fontSize: '12px', color: '#94a3b8',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                paddingRight: '16px', paddingTop: '4px',
              }}>
                {c.protocol}
                <span style={{ color: '#334155', margin: '0 5px' }}>·</span>
                {c.specimen}
              </div>

              {/* Accession */}
              <div style={{ paddingTop: '4px' }}>
                <span style={{
                  fontSize: '11px', color: '#64748b', fontWeight: 500,
                  whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                }}>
                  {c.accessionDate ?? '—'}
                </span>
              </div>

              {/* Physician */}
              <div title={c.submittingPhysician} style={{
                fontSize: '11px', color: '#94a3b8', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                paddingRight: '12px', paddingTop: '4px',
              }}>
                {c.submittingPhysician ?? '—'}
              </div>

              {/* Status */}
              <div style={{ paddingTop: '2px' }}>
                <span title={`Priority: ${c.priority} · ${c.time}`} style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 10px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                  background: getStatusStyle(c.status).bg,
                  color:      getStatusStyle(c.status).color,
                  border:    `1px solid ${getStatusStyle(c.status).border}`,
                }}>
                  {c.status}
                </span>
              </div>

              {/* AI confidence */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                minWidth: 0, paddingRight: '12px', paddingTop: '4px',
              }}>
                {c.confidence > 0 ? (
                  <>
                    <span style={{
                      fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0,
                      color: getConfidenceColor(c.confidence),
                    }}>
                      {c.confidence}%
                    </span>
                    <span style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    <span title={c.aiStatus} style={{
                      fontSize: '12px', color: '#94a3b8',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.aiStatus}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic' }}>Pending</span>
                )}
              </div>

              {/* Flags */}
              <div style={{
                display: 'flex', alignItems: 'flex-start',
                gap: '4px', flexWrap: 'wrap', paddingTop: '2px',
              }}>
                {((c.caseFlags || []).length + (c.specimenFlags || []).length) === 0 ? (
                  <span style={{ fontSize: '11px', color: '#1e293b' }}>—</span>
                ) : [
                  ...(c.caseFlags     || []).map((f: any, i: number) => <FlagChip key={`c-${i}`} flag={f} isSpecimen={false} />),
                  ...(c.specimenFlags || []).map((f: any, i: number) => <FlagChip key={`s-${i}`} flag={f} isSpecimen={true}  />),
                ]}
              </div>
            </div>
          );
        })}

        {isLoadingMore && (
          <div style={{
            padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <div style={{
              width: '14px', height: '14px',
              border: '2px solid rgba(8,145,178,0.2)', borderTopColor: '#0891B2',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite',
            }} />
            Loading more cases...
          </div>
        )}

        {!hasMore && finalCases.length > BATCH_SIZE && (
          <div style={{
            padding: '10px', textAlign: 'center', color: '#1e293b',
            fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
          }}>
            ✓ All {finalCases.length} cases loaded
          </div>
        )}
      </div>

      {/* ── Scoped styles — no global selectors ── */}
      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes pulse       { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes urgentPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #EF4444, 0 0 12px rgba(239,68,68,0.4); }
          50%       { opacity: 0.7; box-shadow: 0 0 3px #EF4444, 0 0 6px rgba(239,68,68,0.2); }
        }
        .wl-scroll                          { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .wl-scroll::-webkit-scrollbar       { width: 4px; }
        .wl-scroll::-webkit-scrollbar-track { background: transparent; }
        .wl-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .wl-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default WorklistTable;

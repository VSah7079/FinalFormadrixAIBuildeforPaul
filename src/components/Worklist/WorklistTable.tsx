import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import '../../pathscribe.css';
import { Case } from "../../types/case/Case";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type SortEntry = { 
  key: string; 
  dir: 'asc' | 'desc' 
};

type DividerRow = { 
  __divider: true; 
  label: string; 
  count: number 
};

type DisplayRow = Case | DividerRow;

interface WorklistTableProps {
  cases: Case[];
  activeFilter: string;
  onBeforeNavigate?: (caseId: string) => void;
  selectedIndex?: number;
  selectedCaseId?: string | null;
  onRowSelect?: (index: number, id: string) => void;
  onFirstCaseId?: (id: string | null) => void;
  onDisplayOrder?: (ids: string[]) => void;
}
// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 15;
const SORT_KEY   = 'worklistSort';

// Defines the exact grid proportions for the table
const COL_GRID = '16px 152px 1fr 72px 26px 150px 1fr 95px 1fr 1fr 68px';

const HEADER_COLUMNS: { label: string; key: string }[] = [
  { label: 'Case',        key: 'id'                  },
  { label: 'Patient',     key: 'lastName'             },
  { label: 'MRN',         key: 'mrn'                  },
  { label: 'Sex',         key: 'sex'                  },
  { label: 'DOB (Age)',   key: 'dateOfBirth'          },
  { label: 'Specimen(s)', key: 'specimenSummary'      },
  { label: 'Accession',   key: 'accessionDate'        },
  { label: 'Physician',   key: 'submittingPhysician'  },
  { label: 'Flag(s)',     key: 'flagSeverity'         },
  { label: 'Status',      key: 'status'               },
];
// ─────────────────────────────────────────────────────────────────────────────
// COLOR PALETTES
// ─────────────────────────────────────────────────────────────────────────────

const FLAG_PALETTE: Record<string, { bg: string; border: string; dot: string }> = {
  red:    { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   dot: '#EF4444' },
  yellow: { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  dot: '#F59E0B' },
  blue:   { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  dot: '#3B82F6' },
  green:  { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)',  dot: '#10B981' },
  orange: { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  dot: '#F97316' },
  purple: { bg: 'rgba(168,85,247,0.15)',  border: 'rgba(168,85,247,0.4)',  dot: '#A855F7' },
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE & TIME HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const formatDateTime = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`;
};

const getAgeLabel = (dobStr: string): string => {
  const dob = new Date(dobStr);
  const now = new Date();
  const msOld = now.getTime() - dob.getTime();
  const days = Math.floor(msOld / (1000 * 3600 * 24));
  
  if (days < 1) return `${Math.max(0, Math.floor(msOld / (1000 * 3600)))}h`;
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30.43)}mo`;
  return `${Math.floor(days / 365.25)}y`;
};
// ─────────────────────────────────────────────────────────────────────────────
// SORTING LOGIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A versatile comparator that handles:
 * 1. Null/Undefined values (pushed to bottom)
 * 2. ISO Date strings (converted to timestamps)
 * 3. Numbers (direct subtraction)
 * 4. Strings (locale-aware comparison)
 */
const compareValues = (a: any, b: any, dir: 'asc' | 'desc'): number => {
  // Move null/undefined to the end regardless of direction
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // Attempt to parse as dates if they look like strings
  if (typeof a === 'string' && typeof b === 'string') {
    const aDate = Date.parse(a);
    const bDate = Date.parse(b);
    
    // Only compare as dates if both are valid timestamps and look like ISO strings
    if (!isNaN(aDate) && !isNaN(bDate) && a.includes('-') && b.includes('-')) {
      return dir === 'asc' ? aDate - bDate : bDate - aDate;
    }
  }

  // Numeric comparison
  if (typeof a === 'number' && typeof b === 'number') {
    return dir === 'asc' ? a - b : b - a;
  }

  // Fallback to string comparison
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  
  if (sa < sb) return dir === 'asc' ? -1 : 1;
  if (sa > sb) return dir === 'asc' ?  1 : -1;
  return 0;
};

/**
 * Extracts the raw value from a Case object based on the header key.
 * This is used by the sorting engine to know what to compare.
 */
const getSortValue = (c: Case, key: string): any => {
  switch (key) {
    case 'id':
      return c.id;
    case 'lastName':
      return c.patient?.lastName ?? '';
    case 'mrn':
      return c.patient?.mrn ?? '';
    case 'sex':
      return c.patient?.sex ?? '';
    case 'dateOfBirth':
      return c.patient?.dateOfBirth ?? '';
    case 'specimenSummary':
      return (c.specimens || []).map(s => s.label).join('');
    case 'accessionDate':
      return c.order?.receivedDate ?? '';
    case 'submittingPhysician':
      return c.order?.requestingProvider ?? '';
    case 'status':
      return c.status;
    case 'flagSeverity':
      // Derived value: total number of flags
      return (c.caseFlags?.length ?? 0) + (c.specimenFlags?.length ?? 0);
    default:
      return (c as any)[key];
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// STATUS & VISUAL STYLES
// ─────────────────────────────────────────────────────────────────────────────

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'draft':
      return { bg: 'rgba(148,163,184,0.15)', color: '#64748b', border: 'rgba(148,163,184,0.4)' };
    case 'in-progress':
      return { bg: 'rgba(8,145,178,0.15)',   color: '#0891B2', border: 'rgba(8,145,178,0.3)'   };
    case 'pending-review':
      return { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', border: 'rgba(245,158,11,0.3)'  };
    case 'finalized':
      return { bg: 'rgba(16,185,129,0.15)',  color: '#10B981', border: 'rgba(16,185,129,0.3)'  };
    case 'amended':
      return { bg: 'rgba(129,140,248,0.15)', color: '#818CF8', border: 'rgba(129,140,248,0.3)' };
    default:
      return { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FlagChip: Renders a small badge with a flag icon.
 * isSpecimen = true renders a dashed flag icon.
 * isSpecimen = false renders a solid flag icon.
 */
const FlagChip: React.FC<{ flag: any; isSpecimen?: boolean }> = React.memo(({ flag, isSpecimen }) => {
  const palette = FLAG_PALETTE[flag.color] ?? FLAG_PALETTE.blue;
  const label: string = flag.label || flag.name || flag.type || flag.color || 'Flag';
  
  return (
    <span
      className="wl-flag-chip"
      title={`${isSpecimen ? 'Specimen' : 'Case'}: ${label}`}
      style={{
        background: palette.bg, 
        border: `1px solid ${palette.border}`,
        color: palette.dot,
      }}
    >
      <svg width="7" height="8" viewBox="0 0 7 8" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M1 7V1 M1 1 L6 2.5 L1 4"
          stroke={palette.dot}
          strokeWidth={isSpecimen ? 1.2 : 1.8}
          strokeLinecap="round" 
          strokeLinejoin="round"
          strokeDasharray={isSpecimen ? '2 1' : undefined}
          fill="none"
        />
      </svg>
      {label}
    </span>
  );
});
/**
 * SpecimenChip: Renders a compact pill for each specimen.
 * Includes a tooltip for the full description.
 */
const SpecimenChip: React.FC<{ 
  label: string; 
  description: string; 
  fullDescription?: string 
}> = React.memo(({ label, description, fullDescription }) => (
  <span
    className="wl-specimen-chip"
    title={`${label}: ${fullDescription || description}`}
    style={{ maxWidth: '100%', overflow: 'hidden' }}
  >
    <span className="wl-specimen-chip__label" style={{ flexShrink: 0 }}>
      {label}
    </span>
    <span className="wl-specimen-chip__sep" style={{ flexShrink: 0 }}>·</span>
    <span style={{ 
      overflow: 'hidden', 
      textOverflow: 'ellipsis', 
      whiteSpace: 'nowrap', 
      minWidth: 0 
    }}>
      {description}
    </span>
  </span>
));

/**
 * StatusDot: A simple colored circle representing the case status.
 */
const StatusDot: React.FC<{ status: string }> = React.memo(({ status }) => {
  const s = getStatusStyle(status);
  const label = status.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <span
      title={`Status: ${label}`}
      style={{
        display: 'inline-block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: s.color,
        boxShadow: `0 0 4px ${s.color}66`,
        flexShrink: 0,
        cursor: 'default',
      }}
    />
  );
});

/**
 * UrgentDot: A red pulsing dot used to highlight STAT/Urgent cases.
 */
const UrgentDot: React.FC = React.memo(() => (
  <span
    title="Urgent Case (STAT)"
    style={{
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#EF4444',
      boxShadow: '0 0 6px #EF4444, 0 0 12px rgba(239,68,68,0.4)',
      flexShrink: 0,
      animation: 'urgentPulse 2s ease-in-out infinite',
    }}
  />
));
// ─────────────────────────────────────────────────────────────────────────────
// WORKLIST TABLE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const WorklistTable: React.FC<WorklistTableProps> = ({
  cases,
  activeFilter,
  onBeforeNavigate,
  selectedIndex = -1,
  selectedCaseId = null,
  onRowSelect,
  onFirstCaseId,
  onDisplayOrder,
}) => {
  const navigate = useNavigate();
  
  // Ref for the scrollable container to implement infinite scroll
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stable refs for parent callbacks — prevents them from being dependency array
  // triggers that cause infinite re-render loops when parents pass inline functions.
  const onFirstCaseIdRef = useRef(onFirstCaseId);
  const onDisplayOrderRef = useRef(onDisplayOrder);
  useEffect(() => { onFirstCaseIdRef.current = onFirstCaseId; }, [onFirstCaseId]);
  useEffect(() => { onDisplayOrderRef.current = onDisplayOrder; }, [onDisplayOrder]);

  // Pagination & Loading State
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Hover state for row highlighting
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  /**
   * Reset pagination whenever the filter changes to ensure the user 
   * starts at the top of the new list.
   */
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activeFilter]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SORT STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * multi-sort stack: 
   * The first element is the primary sort, second is secondary, etc.
   */
  const [sortStack, setSortStack] = useState<SortEntry[]>(() => {
    try {
      const raw = localStorage.getItem(SORT_KEY);
      if (!raw) return [{ key: 'id', dir: 'asc' }];
      
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as SortEntry[];
      }
      return [{ key: 'id', dir: 'asc' }];
    } catch (e) {
      console.warn("Failed to parse sort state from localStorage", e);
      return [{ key: 'id', dir: 'asc' }];
    }
  });

  // Persist sort preferences to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(sortStack));
    } catch (e) {
      console.error("Failed to save sort state", e);
    }
  }, [sortStack]);
// ─────────────────────────────────────────────────────────────────────────────
  // SORT INTERACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * handleHeaderClick:
   * 1. If key is already in stack, toggle its direction.
   * 2. If key is new, add it to the end of the stack (up to 3 levels).
   */
  const onHeaderClick = useCallback((key: string) => {
    setSortStack(prev => {
      const existingIdx = prev.findIndex(e => e.key === key);
      
      if (existingIdx !== -1) {
        // Toggle direction of existing sort
        const next = [...prev];
        next[existingIdx] = { 
          key, 
          dir: prev[existingIdx].dir === 'asc' ? 'desc' : 'asc' 
        };
        return next;
      }
      
      // Limit multi-sort to 3 levels to maintain UI clarity and performance
      if (prev.length >= 3) return prev;
      
      // Add new sort level
      // Note: flags default to descending (most flags first)
      const defaultDir = key === 'flagSeverity' ? 'desc' : 'asc';
      return [...prev, { key, dir: defaultDir }];
    });
  }, []);

  /**
   * onRemoveSort: 
   * Removes a specific level of sorting from the stack.
   */
  const onRemoveSort = useCallback((key: string) => {
    setSortStack(prev => {
      const filtered = prev.filter(e => e.key !== key);
      // If stack becomes empty, fallback to default ID sort
      return filtered.length > 0 ? filtered : [{ key: 'id', dir: 'asc' }];
    });
  }, []);

  /**
   * clearSort:
   * Resets the table to the default primary sort.
   */
  const clearSort = useCallback(() => {
    setSortStack([{ key: 'id', dir: 'asc' }]);
  }, []);
// ─────────────────────────────────────────────────────────────────────────────
  // FILTERING & CATEGORIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * isUrgentCase:
   * Returns true if the case is marked as 'STAT' in the order priority.
   */
  const isUrgentCase = useCallback((c: Case) => {
    return c.order?.priority === 'STAT';
  }, []);

  /**
   * filteredCases:
   * Applies the UI's active filter to the master cases array.
   */
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      // 1. Show everything
      if (activeFilter === 'all') return true;

      // 2. Urgent / STAT cases only
      if (activeFilter === 'urgent') return isUrgentCase(c);

      // 3. Status-based filters
      if (activeFilter === 'review') return c.status === 'pending-review';
      if (activeFilter === 'inprogress') return c.status === 'in-progress';
      if (activeFilter === 'amended') return c.status === 'amended';

      // 4. Completed filter: 
      // Only show cases finalized TODAY (2026-04-02)
      if (activeFilter === 'completed') {
        if (c.status !== 'finalized' || !c.updatedAt) return false;
        
        const updateDate = new Date(c.updatedAt);
        const today = new Date();
        
        return (
          updateDate.getFullYear() === today.getFullYear() &&
          updateDate.getMonth() === today.getMonth() &&
          updateDate.getDate() === today.getDate()
        );
      }

      return true;
    });
  }, [cases, activeFilter, isUrgentCase]);
/**
   * sortGroup:
   * A helper that applies the current multi-level sortStack to a 
   * specific array of cases.
   */
  const sortGroup = useCallback(
    (arr: Case[]) => {
      if (sortStack.length === 0) return [...arr];

      return [...arr].sort((a, b) => {
        // Iterate through each sort level in the stack
        for (const { key, dir } of sortStack) {
          const valA = getSortValue(a, key);
          const valB = getSortValue(b, key);
          
          const result = compareValues(valA, valB, dir);
          
          // If this sort level finds a difference, return it.
          // If they are equal (0), proceed to the next level in the stack.
          if (result !== 0) return result;
        }
        return 0;
      });
    },
    [sortStack]
  );

  /**
   * finalCases:
   * The source of truth for the table's display order.
   * 1. Splits cases into Urgent (STAT) and Normal.
   * 2. Sorts each group independently using the sortStack.
   * 3. Re-combines them so Urgent is always first.
   */
  const finalCases = useMemo(() => {
    const urgent = filteredCases.filter(isUrgentCase);
    const normal = filteredCases.filter((c) => !isUrgentCase(c));

    return [
      ...sortGroup(urgent),
      ...sortGroup(normal)
    ];
  }, [filteredCases, isUrgentCase, sortGroup]);

  // ─────────────────────────────────────────────────────────────────────────────
  // NAVIGATION & SELECTION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * openCase:
   * Triggers the navigation to the synoptic reporting view,
   * passing the current worklist order in the router state.
   */
  const openCase = useCallback(
    (id: string) => {
      onBeforeNavigate?.(id);
      navigate(`/case/${id}/synoptic`, {
        state: { 
          // Pass the IDs so the case view can implement "Next/Prev"
          worklistCaseIds: finalCases.map((c) => c.id) 
        },
      });
    },
    [navigate, onBeforeNavigate, finalCases]
  );

  /**
   * handleRowClick:
   * Synchronizes the selection with parent components before navigating.
   */
  const handleRowClick = useCallback(
    (id: string) => {
      const idx = cases.findIndex((c) => c.id === id);
      if (idx !== -1) {
        onRowSelect?.(idx, id);
      }
      openCase(id);
    },
    [cases, openCase, onRowSelect]
  );
// ─────────────────────────────────────────────────────────────────────────────
  // DISPLAY ROW GENERATION (Dividers + Virtualization)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * displayRows:
   * Maps the sorted cases into a format that includes UI dividers.
   */
  const displayRows = useMemo<DisplayRow[]>(() => {
    const urgent = finalCases.filter(isUrgentCase);
    const normal = finalCases.filter(c => !isUrgentCase(c));
    const rows: DisplayRow[] = [];
    
    // If there are STAT cases, add the Urgent section
    if (urgent.length > 0) {
      rows.push({ 
        __divider: true, 
        label: 'Urgent', 
        count: urgent.length 
      });
      rows.push(...urgent);
    }
    
    // Add the standard section
    if (normal.length > 0) {
      rows.push({ 
        __divider: true, 
        label: 'All Cases', 
        count: normal.length 
      });
      rows.push(...normal);
    }
    
    return rows;
  }, [finalCases, isUrgentCase]);

  /**
   * visibleRows:
   * Slices the displayRows based on the current infinite scroll position.
   * This prevents the DOM from becoming heavy with 800+ rows.
   */
  const visibleRows = useMemo(() => {
    let caseCount = 0;
    const result: DisplayRow[] = [];
    
    for (const row of displayRows) {
      // Dividers don't count toward the BATCH_SIZE limit
      if ('__divider' in row) {
        result.push(row);
        continue;
      }

      if (caseCount >= visibleCount) break;
      
      result.push(row);
      caseCount++;
    }
    return result;
  }, [displayRows, visibleCount]);

  /**
   * hasMore:
   * Boolean flag to tell the scroll listener if there's more data to fetch.
   */
  const hasMore = visibleCount < finalCases.length;
/**
   * handleScroll:
   * Monitors the scroll position of the table body. When the user 
   * nears the bottom, it increments the visibleCount to show more rows.
   */
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // Trigger "Load More" when user is within 80px of the bottom
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 80;

    if (isNearBottom) {
      setIsLoadingMore(true);
      
      // Artificial delay (400ms) to provide a smooth visual transition
      // and show the loading spinner for better UX.
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, finalCases.length));
        setIsLoadingMore(false);
      }, 400);
    }
  }, [isLoadingMore, hasMore, finalCases.length]);

  /**
   * Parent Synchronization:
   * Keeps the parent component informed about which case is at the 
   * top of the current sorted/filtered list and the total sequence.
   */
  useEffect(() => {
    onFirstCaseIdRef.current?.(finalCases[0]?.id ?? null);
    onDisplayOrderRef.current?.(finalCases.map(c => c.id));
  }, [finalCases]); // Callbacks intentionally read from refs — omitting them here is correct

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: TABLE SHELL & SORT RIBBON
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="wl-container" style={{ 
      background: 'rgba(255,255,255,0.02)', 
      border: '1px solid rgba(255,255,255,0.1)', 
      borderRadius: '16px', 
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1, 
      minHeight: 0 
    }}>
      
      {/* Multi-Sort Indicator Ribbon */}
      {sortStack.length > 1 && (
        <div style={{ 
          display: 'flex', gap: '8px', padding: '6px 20px', 
          background: 'rgba(56,189,248,0.05)',
          borderBottom: '1px solid rgba(56,189,248,0.1)', 
          alignItems: 'center' 
        }}>
          <span style={{ 
            fontSize: '9px', fontWeight: 700, color: '#38bdf8', 
            textTransform: 'uppercase' 
          }}>
            Sorted by:
          </span>
          {sortStack.map((s, i) => (
            <div key={s.key} style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', 
              background: 'rgba(56,189,248,0.1)', 
              padding: '2px 8px', borderRadius: '4px', 
              fontSize: '10px', color: '#38bdf8' 
            }}>
              {HEADER_COLUMNS.find(h => h.key === s.key)?.label} 
              <span style={{ opacity: 0.6, marginLeft: '2px' }}>{s.dir}</span>
              <button 
                onClick={() => onRemoveSort(s.key)} 
                style={{ 
                  border: 'none', background: 'transparent', 
                  color: '#38bdf8', cursor: 'pointer', padding: '0 2px' 
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button 
            onClick={clearSort} 
            style={{ 
              marginLeft: 'auto', background: 'transparent', border: 'none', 
              color: '#64748b', fontSize: '9px', cursor: 'pointer', 
              textDecoration: 'underline' 
            }}
          >
            Clear All
          </button>
        </div>
      )}
{/* 2. Main Grid Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: COL_GRID, 
        columnGap: '12px', 
        padding: '8px 20px', 
        background: 'rgba(0,0,0,0.15)', 
        borderBottom: '1px solid rgba(255,255,255,0.09)', 
        flexShrink: 0 
      }}>
        {/* Leading empty cell for the Status/Urgent dot column */}
        <div /> 

        {HEADER_COLUMNS.map(({ label, key }) => {
          const sortEntry = sortStack.find(e => e.key === key);
          const isPrimary = sortStack[0]?.key === key;
          
          return (
            <div key={key} className="wl-col-header">
              <button 
                onClick={() => onHeaderClick(key)} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: isPrimary ? '#38bdf8' : sortEntry ? '#7dd3fc' : '#64748b', 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  cursor: 'pointer',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  transition: 'color 0.2s',
                  padding: 0
                }}
              >
                {label}
                {sortEntry && (
                  <span style={{ fontSize: '12px', lineHeight: 1 }}>
                    {sortEntry.dir === 'asc' ? '▴' : '▾'}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
{/* 3. Table Body Container */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll} 
        className="wl-scroll" 
        style={{ 
          overflowY: 'auto', 
          flex: 1, 
          position: 'relative' 
        }}
      >
 {finalCases.length === 0 ? (
          <div style={{ 
            padding: '60px', 
            textAlign: 'center', 
            color: '#64748b',
            fontSize: '13px'
          }}>
            No cases match the current filter.
          </div>
        ) : (
          visibleRows.map((row: DisplayRow, rowIndex: number) => {
            // 1. Render Divider Row
            if ('__divider' in row) {
              return (
                <div 
                  key={`div-${row.label}-${rowIndex}`} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    padding: '12px 20px 6px', 
                    background: row.label === 'Urgent' 
                      ? 'rgba(239,68,68,0.06)' 
                      : 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 1
                  }}
                >
                  <span style={{ 
                    fontSize: '9px', 
                    fontWeight: 800, 
                    color: row.label === 'Urgent' ? '#f87171' : '#475569', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    {row.label}
                  </span>
                  <span style={{ 
                    fontSize: '9px', 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '1px 6px', 
                    borderRadius: '10px', 
                    color: '#64748b' 
                  }}>
                    {row.count}
                  </span>
                  <div style={{ 
                    flex: 1, 
                    height: '1px', 
                    background: 'rgba(255,255,255,0.05)' 
                  }} />
                </div>
              );
            }

            // 2. Render Case Row
            const c = row as Case;
            const isUrgent = isUrgentCase(c);
            const isSelected = selectedCaseId ? c.id === selectedCaseId : false;

            return (
              <div 
                key={c.id} 
                onClick={() => handleRowClick(c.id)}
                onMouseEnter={() => setHoveredRow(c.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: 'grid', 
                  gridTemplateColumns: COL_GRID, 
                  columnGap: '12px', 
                  padding: '12px 20px', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  background: isSelected 
                    ? 'rgba(8,145,178,0.18)' 
                    : hoveredRow === c.id 
                      ? 'rgba(8,145,178,0.10)' 
                      : 'transparent',
                  borderLeft: isSelected 
                    ? '2px solid #0891B2' 
                    : isUrgent 
                      ? '2px solid rgba(239,68,68,0.5)' 
                      : '2px solid transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.15s ease, border-left 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {isUrgent && <UrgentDot />}
                </div>

                <div style={{ fontWeight: 600, color: isUrgent ? '#f87171' : '#0891b2' }}>
                  {c.id}
                </div>
                
                <div data-phi="name">
                  {c.patient.lastName}, {c.patient.firstName}
                </div>

                <div style={{ opacity: 0.6, fontSize: '11px' }} data-phi="mrn">
                  {c.patient.mrn ?? '—'}
                </div>

                <div style={{ opacity: 0.6, textAlign: 'center' }}>
                  {c.patient.sex?.charAt(0) ?? '—'}
                </div>

                <div style={{ fontSize: '11px', whiteSpace: 'nowrap' }} data-phi="dob">
                  {formatDate(c.patient.dateOfBirth)}
                  <span style={{ opacity: 0.4, marginLeft: '4px' }}>
                    ({c.patient.dateOfBirth ? getAgeLabel(c.patient.dateOfBirth) : '—'})
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', maxHeight: '24px' }}>
                  {c.specimens?.slice(0, 3).map(s => (
                    <SpecimenChip key={s.id} label={s.label} description={s.description} />
                  ))}
                </div>

                <div style={{ opacity: 0.7, fontSize: '11px' }}>
                  {formatDate(c.order?.receivedDate)}
                </div>

                <div style={{ opacity: 0.7, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.order?.requestingProvider ?? '—'}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {c.caseFlags?.map((f, idx) => (
                    <FlagChip key={`cf-${idx}`} flag={f} isSpecimen={false} />
                  ))}
                  {c.specimenFlags?.map((f, idx) => (
                    <FlagChip key={`sf-${idx}`} flag={f} isSpecimen={true} />
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StatusDot status={c.status} />
                </div>
              </div>
            );
          })
        )}

        {isLoadingMore && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div className="wl-loader-spinner" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes urgentPulse {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 6px #EF4444; }
          50% { opacity: 0.7; transform: scale(0.9); }
        }
        .wl-loader-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(56,189,248,0.1);
          border-top-color: #38bdf8; border-radius: 50%; animation: wl-spin 0.8s linear infinite;
        }
        @keyframes wl-spin { to { transform: rotate(360deg); } }
        .wl-scroll::-webkit-scrollbar { width: 6px; }
        .wl-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .wl-flag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 800; text-transform: uppercase; }
        .wl-specimen-chip { display: inline-flex; align-items: center; gap: 3px; background: rgba(255,255,255,0.04); padding: 1px 6px; border-radius: 4px; font-size: 9px; color: rgba(255,255,255,0.7); }
        .wl-col-header:hover button { color: #f1f5f9 !important; }
      `}</style>
    </div>
  );
};

export default WorklistTable;
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getOrganisationByHospitalId, getOrganisationShortName } from '../../services/organisation/organisationService';
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
  tableHeight?: number;
  onBeforeNavigate?: (caseId: string) => void;
  onPoolCaseClick?: (caseId: string, summary: string) => void;
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
  purple: { bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  dot: '#F97316' },
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
      return { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: 'rgba(148,163,184,0.4)' }; // slate  — matches Draft tile
    case 'in-progress':
      return { bg: 'rgba(8,145,178,0.15)',   color: '#0891B2', border: 'rgba(8,145,178,0.3)'   }; // teal   — matches In Progress tile
    case 'pending-review':
      return { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', border: 'rgba(245,158,11,0.3)'  }; // amber  — matches Needs Review tile
    case 'finalized':
      return { bg: 'rgba(16,185,129,0.15)',  color: '#10B981', border: 'rgba(16,185,129,0.3)'  }; // green  — matches Completed tile
    case 'amended':
      return { bg: 'rgba(139,92,246,0.15)',  color: '#8B5CF6', border: 'rgba(139,92,246,0.3)'  }; // violet — matches Amended tile
    case 'finalizing':
      return { bg: 'rgba(236,72,153,0.15)',  color: '#EC4899', border: 'rgba(236,72,153,0.3)'  }; // pink — matches Finalizing tile
    case 'pool':
      return { bg: 'rgba(249,115,22,0.15)',  color: '#F97316', border: 'rgba(249,115,22,0.3)'  }; // orange — matches Pool tile
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
  tableHeight,
  onBeforeNavigate,
  onPoolCaseClick,
  selectedIndex = -1,
  selectedCaseId = null,
  onRowSelect,
  onFirstCaseId,
  onDisplayOrder,
}) => {
  const navigate = useNavigate();
  
  // Ref for the scrollable container to implement infinite scroll
  const scrollRef  = useRef<HTMLDivElement>(null);
  // Ref for the floating mirror scrollbar at the bottom of the table container
  const mirrorRef  = useRef<HTMLDivElement>(null);
  const innerRef   = useRef<HTMLDivElement>(null); // tracks inner table width for mirror

  // ─────────────────────────────────────────────────────────────────────────────
  // RESPONSIVE: must be declared early — referenced by useEffects below
  // ─────────────────────────────────────────────────────────────────────────────
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const isTablet = viewportWidth < 1024;

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
      // 1. Show everything (non-pool)
      if (activeFilter === 'all') return (c as any).status !== 'pool';

      // 1b. Pool queue
      if (activeFilter === 'pool') return (c as any).status === 'pool';

      // 2. Urgent / STAT cases only
      if (activeFilter === 'urgent') return isUrgentCase(c);

      // 3. Status-based filters
      if (activeFilter === 'review')     return c.status === 'pending-review';
      if (activeFilter === 'inprogress') return c.status === 'in-progress';
      if (activeFilter === 'amended')    return c.status === 'amended';
      if (activeFilter === 'draft')      return c.status === 'draft';
      if (activeFilter === 'finalizing') return c.status === 'finalizing';

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
      const c = cases.find(c => c.id === id);

      // Pool cases open the claim modal instead of navigating
      if ((c as any)?.status === 'pool' && onPoolCaseClick) {
        const summary = c?.specimens?.[0]?.description ?? c?.specimens?.[0]?.label ?? '';
        onPoolCaseClick(id, summary);
        return;
      }

      const idx = cases.findIndex((c) => c.id === id);
      if (idx !== -1) {
        onRowSelect?.(idx, id);
      }
      openCase(id);
    },
    [cases, openCase, onRowSelect, onPoolCaseClick]
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
   * Monitors scroll position for infinite load + syncs floating mirror scrollbar.
   */
  const handleScroll = useCallback(() => {
    // Sync mirror scrollbar horizontal position
    if (mirrorRef.current && scrollRef.current) {
      mirrorRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
    if (!scrollRef.current || isLoadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 80;
    if (isNearBottom) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, finalCases.length));
        setIsLoadingMore(false);
      }, 400);
    }
  }, [isLoadingMore, hasMore, finalCases.length]);

  // When user drags the mirror bar, sync back to the table
  const handleMirrorScroll = useCallback(() => {
    if (mirrorRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft = mirrorRef.current.scrollLeft;
    }
  }, []);

  // Keep the mirror inner spacer width in sync with the actual table width
  useEffect(() => {
    if (isTablet) return;
    const table = scrollRef.current?.querySelector('table');
    if (!innerRef.current || !table) return;
    const sync = () => {
      if (innerRef.current) innerRef.current.style.width = `${table.scrollWidth}px`;
    };
    const observer = new ResizeObserver(sync);
    observer.observe(table);
    sync();
    return () => observer.disconnect();
  }, [isTablet]);

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
      display: 'flex', 
      flexDirection: 'column',
      height: tableHeight ? `${tableHeight}px` : '100%',
      overflow: 'hidden',
    }}>
      
      {/* Multi-Sort Indicator Ribbon */}
      {sortStack.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', padding: '6px 20px', background: 'rgba(56,189,248,0.05)', borderBottom: '1px solid rgba(56,189,248,0.1)', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Sorted by:</span>
          {sortStack.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', color: '#38bdf8' }}>
              {HEADER_COLUMNS.find(h => h.key === s.key)?.label}
              <span style={{ opacity: 0.6, marginLeft: '2px' }}>{s.dir}</span>
              <button onClick={() => onRemoveSort(s.key)} style={{ border: 'none', background: 'transparent', color: '#38bdf8', cursor: 'pointer', padding: '0 2px' }}>×</button>
            </div>
          ))}
          <button onClick={clearSort} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#64748b', fontSize: '9px', cursor: 'pointer', textDecoration: 'underline' }}>Clear All</button>
        </div>
      )}

      {/*
        Layout: <table> with tableLayout:'fixed' + <colgroup> is the ONLY reliable
        way to guarantee header/body column alignment. CSS Grid 1fr columns diverge
        between header and body when scroll gutters or padding differ by even 1px.
        Sticky <thead> works correctly inside overflow-y:auto when the table itself
        provides the scroll height — no sticky-inside-overflow conflict.

        Below 1024px (iPad / tablet) we switch to a card layout via isTablet.
      */}

      {/* ── CARD LAYOUT (tablet / iPad < 1024px) ── */}
      {isTablet ? (
        <div className="wl-scroll wl-card-list" ref={scrollRef} onScroll={handleScroll} style={{ overflowX: 'hidden' }}>
          {finalCases.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No cases match the current filter.
            </div>
          ) : (
            <>
              {visibleRows.map((row: DisplayRow, rowIndex: number) => {

                // Section divider
                if ('__divider' in row) {
                  return (
                    <div key={`div-${row.label}-${rowIndex}`} className="wl-card-divider">
                      <span className={`wl-card-divider__label${row.label === 'Urgent' ? ' wl-card-divider__label--urgent' : ''}`}>
                        {row.label}
                      </span>
                      <span className="wl-card-divider__count">{row.count}</span>
                      <div className="wl-card-divider__line" />
                    </div>
                  );
                }

                // Case card
                const c = row as Case;
                const isUrgent = isUrgentCase(c);
                const isSelected = selectedCaseId ? c.id === selectedCaseId : false;
                const statusStyle = getStatusStyle(c.status);
                const statusLabel = c.status.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());

                let cardClass = 'wl-card';
                if (isSelected) cardClass += ' wl-card--selected';
                else if (isUrgent) cardClass += ' wl-card--urgent';

                return (
                  <div
                    key={c.id}
                    className={cardClass}
                    onClick={() => handleRowClick(c.id)}
                    onMouseEnter={() => setHoveredRow(c.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* ── Card header: case ID + status badge ── */}
                    <div className="wl-card__header">
                      <div className="wl-card__id-group">
                        {isUrgent && <UrgentDot />}
                        <div>
                          {c.originHospitalId && c.originHospitalId !== 'HOSP-001' && (
                            <div
                              className="wl-card__org"
                              title={getOrganisationByHospitalId(c.originHospitalId)?.name ?? c.originHospitalId}
                            >
                              {getOrganisationShortName(c.originHospitalId)}
                            </div>
                          )}
                          <span className={`wl-card__case-id${isUrgent ? ' wl-card__case-id--urgent' : ''}`}>
                            {c.id}
                          </span>
                        </div>
                      </div>
                      <span
                        className="wl-card__status-badge"
                        style={{ background: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.border }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* ── Card body ── */}
                    <div className="wl-card__body">

                      {/* Patient */}
                      <div>
                        <div className="wl-card__field-label">Patient</div>
                        <div className="wl-card__field-value" data-phi="name">
                          {c.patient.lastName}, {c.patient.firstName}
                        </div>
                        <div className="wl-card__field-sub" data-phi="dob">
                          {c.patient.sex?.charAt(0) ?? '—'}
                          {' · '}
                          {formatDate(c.patient.dateOfBirth)}
                          {' '}
                          ({c.patient.dateOfBirth ? getAgeLabel(c.patient.dateOfBirth) : '—'})
                          <span style={{ marginLeft: '6px' }} data-phi="mrn">· MRN {c.patient.mrn ?? '—'}</span>
                        </div>
                      </div>

                      {/* Accession + Physician */}
                      <div>
                        <div className="wl-card__field-label">Accession · Physician</div>
                        <div className="wl-card__field-sub">{formatDate(c.order?.receivedDate)}</div>
                        <div className="wl-card__field-sub" style={{ color: '#94a3b8' }}>
                          {c.order?.requestingProvider ?? '—'}
                        </div>
                      </div>

                      {/* Specimens — full width */}
                      {c.specimens && c.specimens.length > 0 && (
                        <div className="wl-card__body-full">
                          <div className="wl-card__field-label">Specimen{c.specimens.length > 1 ? 's' : ''}</div>
                          <div className="wl-card__chips">
                            {c.specimens.slice(0, 3).map(s => (
                              <SpecimenChip key={s.id} label={s.label} description={s.description} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Flags — full width, only if present */}
                      {((c.caseFlags?.length ?? 0) + (c.specimenFlags?.length ?? 0)) > 0 && (
                        <div className="wl-card__body-full">
                          <div className="wl-card__field-label">Flags</div>
                          <div className="wl-card__chips">
                            {c.caseFlags?.map((f, idx) => <FlagChip key={`cf-${idx}`} flag={f} isSpecimen={false} />)}
                            {c.specimenFlags?.map((f, idx) => <FlagChip key={`sf-${idx}`} flag={f} isSpecimen={true} />)}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

              {isLoadingMore && (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div className="wl-loader-spinner" style={{ margin: '0 auto' }} />
                </div>
              )}

              {/* Bottom buffer */}
              <div style={{ height: '80px' }} />
            </>
          )}
        </div>

      ) : (

      /* ── TABLE LAYOUT (desktop ≥ 1024px) ── */
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>

        {/* Scroll container — inset:0 fills the relative parent exactly */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            position: 'absolute',
            inset: 0,
            overflowX: 'auto',
            overflowY: 'auto',
          }}
        >
          <table style={{ width: '100%', minWidth: '1255px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>

          {/* Single source of truth for all column widths */}
          <colgroup>
            <col style={{ width: '32px'  }} />{/* urgent dot */}
            <col style={{ width: '155px' }} />{/* case id */}
            <col style={{ width: '155px' }} />{/* patient */}
            <col style={{ width: '72px'  }} />{/* mrn */}
            <col style={{ width: '32px'  }} />{/* sex */}
            <col style={{ width: '112px' }} />{/* dob */}
            <col style={{ width: '225px' }} />{/* specimens */}
            <col style={{ width: '90px'  }} />{/* accession */}
            <col style={{ width: '145px' }} />{/* physician */}
            <col style={{ width: '240px' }} />{/* flags — fixed, not greedy */}
            <col style={{ width: '32px'  }} />{/* status dot */}
          </colgroup>

          {/* ── Sticky Header ── */}
          <thead style={{ position: 'sticky', top: 0, zIndex: 3 }}>
            <tr style={{ background: 'rgba(10,15,25,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.09)' }}>
              <th style={{ padding: '8px' }} />
              {HEADER_COLUMNS.map(({ label, key }) => {
                const sortEntry = sortStack.find(e => e.key === key);
                const isPrimary = sortStack[0]?.key === key;
                return (
                  <th key={key} style={{ padding: '8px 8px 8px 0', textAlign: 'left', fontWeight: 'normal' }}>
                    <button onClick={() => onHeaderClick(key)} style={{ background: 'transparent', border: 'none', color: isPrimary ? '#38bdf8' : sortEntry ? '#7dd3fc' : '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s', padding: 0, whiteSpace: 'nowrap' }}>
                      {label}
                      {sortEntry && <span style={{ fontSize: '12px', lineHeight: 1 }}>{sortEntry.dir === 'asc' ? '▴' : '▾'}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {finalCases.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  No cases match the current filter.
                </td>
              </tr>
            ) : (
              visibleRows.map((row: DisplayRow, rowIndex: number) => {

                // Section divider
                if ('__divider' in row) {
                  return (
                    <tr key={`div-${row.label}-${rowIndex}`}>
                      <td colSpan={11} style={{ padding: '10px 20px 6px', background: row.label === 'Urgent' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: row.label === 'Urgent' ? '#f87171' : '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</span>
                          <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '10px', color: '#64748b' }}>{row.count}</span>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Case row
                const c = row as Case;
                const isUrgent = isUrgentCase(c);
                const isPool   = (c as any).status === 'pool';
                const isSelected = selectedCaseId ? c.id === selectedCaseId : false;
                const isHovered = hoveredRow === c.id;

                return (
                  <tr
                    key={c.id}
                    onClick={() => handleRowClick(c.id)}
                    onMouseEnter={() => setHoveredRow(c.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: isSelected ? 'rgba(8,145,178,0.18)' : isHovered && isPool ? 'rgba(249,115,22,0.10)' : isHovered ? 'rgba(8,145,178,0.10)' : 'transparent',
                      borderLeft: `2px solid ${isSelected ? '#0891B2' : isPool ? 'rgba(249,115,22,0.7)' : isUrgent ? 'rgba(239,68,68,0.5)' : 'transparent'}`,
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Urgent dot */}
                    <td style={{ padding: '12px 8px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {isUrgent && <UrgentDot />}
                      </div>
                    </td>

                    {/* Case ID */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle' }}>
                      {c.originHospitalId && c.originHospitalId !== 'HOSP-001' && (
                        <div title={getOrganisationByHospitalId(c.originHospitalId)?.name ?? c.originHospitalId}
                          style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 1, cursor: 'default' }}>
                          {getOrganisationShortName(c.originHospitalId)}
                        </div>
                      )}
                      <div style={{ fontWeight: 600, color: isUrgent ? '#f87171' : isPool ? '#F97316' : '#0891b2', fontSize: '13px' }}>
                        {c.id}
                      </div>
                    </td>

                    {/* Patient name */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle' }} data-phi="name">
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.patient.lastName}, {c.patient.firstName}
                      </div>
                    </td>

                    {/* MRN */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle', opacity: 0.6, fontSize: '12px' }} data-phi="mrn">
                      {c.patient.mrn ?? '—'}
                    </td>

                    {/* Sex */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle', opacity: 0.6, textAlign: 'center' }}>
                      {c.patient.sex?.charAt(0) ?? '—'}
                    </td>

                    {/* DOB */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle', fontSize: '12px', whiteSpace: 'nowrap' }} data-phi="dob">
                      {formatDate(c.patient.dateOfBirth)}
                      <span style={{ opacity: 0.4, marginLeft: '4px' }}>({c.patient.dateOfBirth ? getAgeLabel(c.patient.dateOfBirth) : '—'})</span>
                    </td>

                    {/* Specimens */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {c.specimens?.slice(0, 3).map(s => (
                          <SpecimenChip key={s.id} label={s.label} description={s.description} />
                        ))}
                      </div>
                    </td>

                    {/* Accession date */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle', opacity: 0.7, fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {formatDate(c.order?.receivedDate)}
                    </td>

                    {/* Physician */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle', opacity: 0.7, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.order?.requestingProvider ?? '—'}
                    </td>

                    {/* Flags */}
                    <td style={{ padding: '12px 8px 12px 0', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                        {c.caseFlags?.map((f, idx) => <FlagChip key={`cf-${idx}`} flag={f} isSpecimen={false} />)}
                        {c.specimenFlags?.map((f, idx) => <FlagChip key={`sf-${idx}`} flag={f} isSpecimen={true} />)}
                      </div>
                    </td>

                    {/* Status dot */}
                    <td style={{ padding: '12px 20px 12px 0', verticalAlign: 'middle', textAlign: 'center' }}>
                      <StatusDot status={c.status} />
                    </td>
                  </tr>
                );
              })
            )}

            {isLoadingMore && (
              <tr>
                <td colSpan={11} style={{ padding: '32px', textAlign: 'center' }}>
                  <div className="wl-loader-spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            )}

            {/* Bottom buffer so last row doesn't sit on the taskbar */}
            <tr><td colSpan={11} style={{ height: '60px' }} /></tr>
          </tbody>
        </table>
        </div>{/* end scroll container */}

      </div>

      )} {/* end isTablet ternary */}

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
        .wl-scroll::-webkit-scrollbar { width: 4px; height: 8px; }
        .wl-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 4px; }
        .wl-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.6); border-radius: 4px; }
        .wl-scroll::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.9); }
        .wl-scroll::-webkit-scrollbar-corner { background: transparent; }
        .wl-mirror-bar { overflow-x: auto; overflow-y: hidden; height: 12px; flex-shrink: 0; background: rgba(0,0,0,0.25); border-top: 1px solid rgba(255,255,255,0.06); }
        .wl-mirror-bar::-webkit-scrollbar { height: 12px; }
        .wl-mirror-bar::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        .wl-mirror-bar::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.5); border-radius: 6px; }
        .wl-mirror-bar::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.8); }
        .wl-flag-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .wl-specimen-chip { display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(100,116,139,0.28); padding: 3px 10px; border-radius: 20px; font-size: 11px; color: rgba(255,255,255,0.75); }
        .wl-specimen-chip__label { color: #cbd5e1; font-weight: 600; }
        .wl-specimen-chip__sep { color: rgba(148,163,184,0.4); }
        .wl-col-header:hover button { color: #f1f5f9 !important; }
        thead tr th { border-bottom: 1px solid rgba(255,255,255,0.09); }

        /* ── Card layout (tablet < 1024px) ── */
        .wl-card-list { padding: 12px; overflow-x: hidden; }
        .wl-card-divider { display: flex; align-items: center; gap: 8px; padding: 16px 4px 8px; }
        .wl-card-divider__label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
        .wl-card-divider__label--urgent { color: #f87171; }
        .wl-card-divider__count { font-size: 9px; background: rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 10px; color: #64748b; }
        .wl-card-divider__line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

        .wl-card {
          margin-bottom: 8px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          border-left: 3px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease;
          overflow: hidden;
        }
        .wl-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.14); }
        .wl-card--urgent { border-color: rgba(239,68,68,0.4); border-left-color: #EF4444; }
        .wl-card--selected { background: rgba(8,145,178,0.12); border-color: #0891B2; border-left-color: #0891B2; }

        .wl-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .wl-card__id-group { display: flex; align-items: center; gap: 8px; }
        .wl-card__org { font-size: 8px; font-weight: 700; color: #475569; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 1px; }
        .wl-card__case-id { font-size: 14px; font-weight: 700; color: #0891b2; }
        .wl-card__case-id--urgent { color: #f87171; }
        .wl-card__status-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 10px; border-radius: 6px; border: 1px solid transparent; white-space: nowrap; }

        .wl-card__body { padding: 10px 14px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
        .wl-card__body-full { grid-column: 1 / -1; }
        .wl-card__field-label { font-size: 9px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
        .wl-card__field-value { font-size: 14px; font-weight: 600; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wl-card__field-sub { font-size: 11px; color: #64748b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wl-card__chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
      `}</style>
    </div>
  );
};

export default WorklistTable;

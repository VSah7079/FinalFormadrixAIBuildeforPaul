/**
 * SynopticReportPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main page for reviewing and completing CAP synoptic reports for a case.
 *
 * Architecture role:
 *   The primary clinical workspace in PathScribe. Pathologists spend most of
 *   their active reporting time here. Owns the full synoptic editing workflow:
 *   draft → finalize (with password) → case sign-out (with username + password).
 *   Post-finalization: Addendum (new synoptic template) and Amendment (corrective
 *   change) workflows, subject to LIS configuration.
 *
 * Layout:
 *   ┌─ Nav ────────────────────────────────────────────────────────────────────┐
 *   ├─ Case header (breadcrumb, title, progress steps, confidence) ────────────┤
 *   ├─ Alert bar (low-confidence field warnings) ──────────────────────────────┤
 *   ├─ Sidebar │ Left panel (LIS report) │ Right panel (synoptic checklist) ───┤
 *   └─ Bottom action bar ──────────────────────────────────────────────────────┘
 *
 * Voice integration:
 *   Context: REPORTING — set on mount, reset to WORKLIST on unmount.
 *   Listeners: NEXT_TAB, PREVIOUS_TAB, SAVE_DRAFT, SIGN_OUT, GO_BACK,
 *              GO_FORWARD, NAV_NEXT_CASE, NAV_PREVIOUS_CASE,
 *              ENTER_GROSS, ENTER_MICRO, ENTER_DIAGNOSIS, ENTER_ADDENDUM.
 *   VoiceCommandOverlay and VoiceMissPrompt are mounted directly here
 *   because this page is outside AppShell.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import CaseSignOutModal from './SynopticReportPage/CaseSignOutModal';
import AmendmentModal from './SynopticReportPage/AmendmentModal';
import '../pathscribe.css';
import { useParams, useNavigate } from 'react-router-dom';
import { getMockReport } from '../mock/mockReports';
import type { FullReport } from '../mock/mockReports';
import { useAuth } from '@contexts/AuthContext';
import { useLogout } from '@hooks/useLogout';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { HelpIcon, WarningIcon } from "../components/Icons";
import CasePanel from '../components/CasePanel/CasePanel';
import { getCaseWithFlags, applyFlags, deleteFlags } from '../api/caseFlagsApi';
import FlagManagerModal from '../components/Config/System/FlagManagerModal';
import InternalNotesDrawer from '../components/InternalNotes/InternalNotesDrawer';
import { useMessaging } from '../contexts/MessagingContext';
import NavBar from '../components/NavBar/NavBar';
import { VoiceCommandOverlay } from '../components/Voice/VoiceCommandOverlay';
import { VoiceMissPrompt }     from '../components/Voice/VoiceMissPrompt';
import { useVoice, reportDictationCorrection } from '../contexts/VoiceProvider';
import { mockActionRegistryService } from '../services/actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../constants/systemActions';
import { toast } from 'react-toastify';

import type {
  SynopticField, MedicalCode, SynopticReportNode, FieldVerification, CaseRole,
  CaseData, ActivePath,
} from './Synoptic/synopticTypes';
import {
  getNodeAtPath, updateNodeAtPath, finalizeNodeAndChildren, getBreadcrumb,
  loadCase, saveCase, mockSimilarCases,
} from './Synoptic/synopticUtils';
import { CodesPanel }          from './Synoptic/Codes/CodesPanel';
import { ReportCommentModal }  from './Synoptic/Comments/ReportCommentModal';
import { CaseCommentModal }    from './Synoptic/Comments/CaseCommentModal';
import { ConfidenceBadge }     from './Synoptic/UI/ConfidenceBadge';
import { SaveToast }           from './Synoptic/UI/SaveToast';
import { ReportPreviewModal }  from './Synoptic/ReportPreviewModal';
import { useSynopticModals }   from './Synoptic/useSynopticModals';
import { useSynopticFinalize } from './Synoptic/useSynopticFinalize';
import { useSynopticToast }    from './Synoptic/useSynopticToast';
import { useSynopticFlags }    from './Synoptic/useSynopticFlags';

type ValidationSummaryPanelProps = {
  issues: any[];
  requiredMissing: any[];
  disputed: any[];
  unverified: any[];
  dirty: any[];
  isReadyToFinalize: boolean;
  onJumpToField: (fieldId: string) => void;
};

const ValidationSummaryPanel = (_props: ValidationSummaryPanelProps) => null;

const POST_SIGNOUT_PREF_KEY = 'ps_post_signout_pref';


// 1. FieldGroup union (must match the keys above)
type FieldGroup =
  | 'tumorFields'
  | 'marginFields'
  | 'lymphNodes'
  | 'ancillaryFields'
  | 'specimenFields'
  | 'biomarkerFields';

// 2. Canonical group order
const FIELD_GROUP_ORDER: FieldGroup[] = [
  'tumorFields',
  'marginFields',
  'lymphNodes',
  'ancillaryFields',
  'specimenFields',
  'biomarkerFields',
];

const SYNOPTIC_TAB_ORDER = ['tumor', 'margins', 'biomarkers', 'codes'] as const;
type SynopticTab = typeof SYNOPTIC_TAB_ORDER[number];

const SynopticReportPage: React.FC = () => {
  const { caseId = 'S25-12345' } = useParams<{ caseId: string }>();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const handleLogout = useLogout();
  const [narrative, setNarrative] = useState('');


  // ⭐ ACTIVE PATH — [specimenIdx, reportIdx, childIdx?, grandchildIdx?, ...]
  const [activePath, setActivePath] = useState<ActivePath>([0, 0]);
  const [expandedSpecimens, setExpandedSpecimens] = useState<Set<number>>(new Set([0]));

  // ⭐ FLAG MANAGER STATE
  const {
    flagCaseData, setFlagCaseData, flagDefinitions,
    showFlagManager, setShowFlagManager, openFlagManager,
  } = useSynopticFlags(caseId);

// Temporary validation summary stub
const validationSummary = {
  allIssues: [],
  requiredMissing: [],
  disputed: [],
  unverified: [],
  dirty: [],
  isReadyToFinalize: true,
};

// Temporary scroll helper stub
const scrollToField = (fieldId: string) => {
  const el = fieldRefs.current[fieldId];
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

  // ⭐ MODAL STATE
  const {
    internalNotesOpen,      setInternalNotesOpen,
    isSimilarCasesOpen,     setIsSimilarCasesOpen,
    isProfileOpen,          setIsProfileOpen,
    isResourcesOpen,        setIsResourcesOpen,
    showAbout,              setShowAbout,
    showReportCommentModal, setShowReportCommentModal,
    showCaseCommentModal,   setShowCaseCommentModal,
    showAddSynopticModal,   setShowAddSynopticModal,
    showProtocolDropdown,   setShowProtocolDropdown,
    showWarning,            setShowWarning,
    showLogoutModal,        setShowLogoutModal,
    showBulkConfirmPrompt,  setShowBulkConfirmPrompt,
    showReportPreview,      setShowReportPreview,
    isExpandedView,         setIsExpandedView,
  } = useSynopticModals();

  // ⭐ MESSAGING
  const { } = useMessaging();

  // Load flag data once on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [cwd] = await Promise.all([getCaseWithFlags(caseId)]);
        if (!cancelled) setFlagCaseData(cwd);
      } catch (e) {
        console.error('Failed to load flag data', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [caseId]);

  // ── Core page state ────────────────────────────────────────────────────────
  const [isLoaded,            setIsLoaded]            = useState(false);
  const [isAlertExpanded,     setIsAlertExpanded]     = useState(true);
  const [activeSynopticTab,   setActiveSynopticTab]   = useState<SynopticTab>('tumor');
  const [_commentModal,       _setCommentModal]       = useState<{ field: SynopticField; group: FieldGroup; sectionLabel: string } | null>(null);
  const [selectedSpecimens,   setSelectedSpecimens]   = useState<number[]>([]);
  const [selectedProtocol,    setSelectedProtocol]    = useState('');
  const [protocolSearch,      setProtocolSearch]      = useState('');
  const [learnPairing,        setLearnPairing]        = useState(true);
  const [pendingNavigation,   setPendingNavigation]   = useState<string | null>(null);
  const [hasUnsavedData,      setHasUnsavedData]      = useState(false);
  const [pendingTabChange,    setPendingTabChange]    = useState<SynopticTab | null>(null);
  const [activeFieldSource,   setActiveFieldSource]   = useState<string | null>(null);
  // Tracks which field currently has focus — used by voice 'confirm', 'edit', 'skip'
  const [activeFieldId,      setActiveFieldId]       = useState<string | null>(null);
  const [activeFieldGroup,   setActiveFieldGroup]    = useState<FieldGroup | null>(null);
  const reportPanelRef                                = useRef<HTMLDivElement>(null);

  // ── Finalize / sign-out state ──────────────────────────────────────────────
  const {
    showFinalizeModal,    setShowFinalizeModal,
    finalizeAndNext,      setFinalizeAndNext,
    finalizePassword,     setFinalizePassword,
    finalizeError,        setFinalizeError,
    showPostSignOutModal, setShowPostSignOutModal,
    postSignOutPref,      setPostSignOutPref,
    showAmendmentModal,   setShowAmendmentModal,
    amendmentText,        setAmendmentText,
    amendmentMode,        setAmendmentMode,
    showSignOutModal,     setShowSignOutModal,
    signOutUser,          setSignOutUser,
    signOutPassword,      setSignOutPassword,
    signOutError,         setSignOutError,
    caseSigned,           setCaseSigned,
  } = useSynopticFinalize();

  // ── LIS config ─────────────────────────────────────────────────────────────
  const { config: systemConfig }                = useSystemConfig();
  const lisIntegrationEnabled                   = systemConfig.lisIntegrationEnabled;
  const allowPathScribePostFinalActions         = systemConfig.allowPathScribePostFinalActions;
  const showAmendmentButton                     = !lisIntegrationEnabled || allowPathScribePostFinalActions;
  const { toastMsg, toastVisible, showToast }   = useSynopticToast();
  const { startDictation, stopDictation }        = useVoice();
  // Set to true when voice command opened the internal notes drawer
  const [voiceOpenedNotes, setVoiceOpenedNotes]    = React.useState(false);

  // ── Case data ──────────────────────────────────────────────────────────────
  const [caseData, setCaseData] = useState<CaseData>(() => loadCase(caseId));

  const activeSynoptic      = getNodeAtPath(caseData.synoptics, activePath);
  const activeSpecimenIndex = activePath[0] ?? 0;
  const isFinalized         = activeSynoptic?.status === 'finalized';

  const hasCaseComment = Object.values(caseData.caseComments ?? {}).some(
    v => v && v !== '<p></p>'
  );

  // ── Field update helpers ───────────────────────────────────────────────────

  const getAllRequiredFields = (node: SynopticReportNode): SynopticField[] => {
  const groups = FIELD_GROUP_ORDER;
  const fields: SynopticField[] = [];

  for (const group of groups) {
    const groupFields = node[group] as SynopticField[] | undefined;
    if (!groupFields) continue;

    for (const field of groupFields) {
      if (field.required) fields.push(field);
    }
  }

  // recurse into children
  for (const child of node.children) {
    fields.push(...getAllRequiredFields(child));
  }

  return fields;
};

const findFirstInvalidRequiredField = (node: SynopticReportNode): SynopticField | null => {
  const required = getAllRequiredFields(node);

  return required.find(f =>
    !f.value ||
    f.value === '' ||
    f.verification !== 'verified'
  ) || null;
};

  type FieldGroup = 'tumorFields' | 'marginFields' | 'biomarkerFields';

  const updateField = useCallback((group: FieldGroup, fieldId: string, value: string) => {
  setCaseData((prev: CaseData) => ({
    ...prev,
    synoptics: updateNodeAtPath(prev.synoptics, activePath, (node: SynopticReportNode) => ({
      ...node,
      [group]: (node[group] as SynopticField[]).map(f => {
        if (f.id !== fieldId) return f;

        const dirty = value !== f.aiValue;
        const verification: FieldVerification =
          f.aiValue === '' ? f.verification :
          dirty            ? 'disputed'     : 'unverified';

        // ⭐ Step 3 trigger condition
        if (!isFinalized && f.aiValue && dirty) {
          // Defer auto‑advance until after React state updates
          setTimeout(() => {
            advanceToNextUnverifiedField(group, fieldId);
          }, 0);
        }

        return { ...f, value, dirty, verification };
      }),
    })),
  }));

  setHasUnsavedData(true);
}, [activePath]);

  const updateVerification = useCallback(
  (group: FieldGroup, fieldId: string, status: FieldVerification) => {
    setCaseData(prev => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, node => ({
        ...node,
        [group]: (node[group] as SynopticField[]).map(f => {
          if (f.id !== fieldId) return f;

          // If user confirms AI value, dirty must be cleared
          const dirty = status === 'verified' ? false : f.dirty;

          // Step 8: dispute workflow
          if (status === 'disputed') {
            return {
              ...f,
              verification: status,
              dirty,
              disputeReason: f.disputeReason ?? '',
              attested: false,
            };
          }

          // If switching away from disputed → clear dispute metadata
          return {
            ...f,
            verification: status,
            dirty,
            disputeReason: undefined,
            attested: undefined,
          };
        })
      }))
    }));

    setHasUnsavedData(true);

    // ⭐ Auto‑advance only when confirming AI value
    if (status === 'verified') {
      setTimeout(() => {
        advanceToNextUnverifiedField(group, fieldId);
      }, 0);
    }
  }, [activePath]);

  const updateSpecimenComment = useCallback((html: string) => {
    setCaseData((prev: CaseData) => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, (node: SynopticReportNode) => ({
        ...node, specimenComment: html,
      })),
    }));
    setHasUnsavedData(true);
  }, [activePath]);

  const updateCaseComment = useCallback((role: CaseRole, html: string) => {
    setCaseData((prev: CaseData) => ({
      ...prev,
      caseComments: { ...prev.caseComments, [role]: html },
    }));
    setHasUnsavedData(true);
  }, []);

  // ── Code helpers ───────────────────────────────────────────────────────────
  const removeCode = useCallback((codeId: string) => {
    setCaseData((prev: CaseData) => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, (node: SynopticReportNode) => ({
        ...node, codes: node.codes.filter((c: MedicalCode) => c.id !== codeId),
      })),
    }));
    setHasUnsavedData(true);
  }, [activePath]);

  const updateCodeVerification = useCallback((codeId: string, verification: FieldVerification) => {
    setCaseData((prev: CaseData) => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, (node: SynopticReportNode) => ({
        ...node,
        codes: node.codes.map((c: MedicalCode) => c.id === codeId ? { ...c, verification } : c),
      })),
    }));
    setHasUnsavedData(true);
  }, [activePath]);

  const addCodesToSpecimens = useCallback((
    codes: Omit<MedicalCode, 'id' | 'source'>[],
    specimenIndices: number[]
  ) => {
    setCaseData((prev: CaseData) => ({
      ...prev,
      synoptics: prev.synoptics.map((s: any, si: number) => {
        if (!specimenIndices.includes(si)) return s;
        return updateNodeAtPath([s], [0, 0], (node: SynopticReportNode) => {
          const newCodes = codes
            .filter((c: any) => !node.codes.some((ex: any) => ex.code === c.code && ex.system === c.system))
            .map((c, j) => ({ ...c, id: `manual-${Date.now()}-${si}-${j}`, source: 'manual' as const }));
          return { ...node, codes: [...node.codes, ...newCodes] };
        })[0];
      }),
    }));
    setHasUnsavedData(true);
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────
  const allSynopticsFinalized = caseData.synoptics.every((spec: any) =>
    spec.reports.every((r: any) => r.status === 'finalized')
  );

  type CaseState = 'Draft' | 'All Finalized' | 'Signed Out';
  const caseState: CaseState =
    caseSigned            ? 'Signed Out'    :
    allSynopticsFinalized ? 'All Finalized' : 'Draft';
  const caseStateMeta: Record<CaseState, { bg: string; border: string; color: string; dot: string }> = {
    'Draft':         { bg: '#f8fafc', border: '#cbd5e1', color: '#475569', dot: '#94a3b8' },
    'All Finalized': { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', dot: '#3b82f6' },
    'Signed Out':    { bg: '#f0fdf4', border: '#86efac', color: '#15803d', dot: '#22c55e' },
  };

  // ── Next unfinalized path ──────────────────────────────────────────────────
  const getNextUnfinalizedPath = useCallback((): ActivePath | null => {
    const all: ActivePath[] = [];
    const collectPaths = (nodes: SynopticReportNode[], pathSoFar: ActivePath) => {
      nodes.forEach((node, i) => {
        const p: ActivePath = [...pathSoFar, i];
        all.push(p);
        collectPaths(node.children, p);
      });
    };
    caseData.synoptics.forEach((spec: any, si: number) => collectPaths(spec.reports, [si]));
    const currentIdx = all.findIndex(p => JSON.stringify(p) === JSON.stringify(activePath));
    for (let i = currentIdx + 1; i < all.length; i++) {
      const node = getNodeAtPath(caseData.synoptics, all[i]);
      if (node && node.status !== 'finalized') return all[i];
    }
    return null;
  }, [caseData.synoptics, activePath]);

  // ── Save draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(() => {
    saveCase(caseId, caseData);
    setHasUnsavedData(false);
    showToast('Draft saved');
  }, [caseId, caseData]);

  // ── Save and advance ───────────────────────────────────────────────────────
  const handleSaveAndNext = useCallback(() => {
    saveCase(caseId, caseData);
    setHasUnsavedData(false);
    showToast('Draft saved');
    const next = getNextUnfinalizedPath();
    if (next) { setActivePath(next); setActiveSynopticTab('tumor'); }
    else showToast('All reports up to date — no next unfinalized report');
  }, [caseId, caseData, getNextUnfinalizedPath]);

  // ── Open finalize modal ────────────────────────────────────────────────────
  const openFinalizeModal = (andNext: boolean) => {
    setFinalizePassword('');
    setFinalizeError('');
    setFinalizeAndNext(andNext);
    setShowFinalizeModal(true);
  };

// ── Confirm finalization ───────────────────────────────────────────────────
const handleFinalizeConfirm = useCallback(() => {
  // Step 7 + 8 validation
  if (!activeSynoptic) return;

  const invalid = findFirstInvalidRequiredField(activeSynoptic);
  if (invalid) {
    toast.error("Please complete or attest all required fields before finalizing.");
    return;
  }

  // Password check (unchanged)
  if (finalizePassword.length < 4) {
    setFinalizeError('Incorrect password. Please try again.');
    return;
  }

  // Finalize this synoptic + children
  const updated: CaseData = {
    ...caseData,
    synoptics: updateNodeAtPath(
      caseData.synoptics,
      activePath,
      finalizeNodeAndChildren
    ),
  };

  setCaseData(updated);
  saveCase(caseId, updated);
  setHasUnsavedData(false);
  setShowFinalizeModal(false);
  setFinalizePassword('');
  setFinalizeError('');

  showToast(`${activeSynoptic?.title ?? 'Report'} finalized`);

  // Check if all synoptics are finalized
  const nowAllFinalized = updated.synoptics.every((spec: any) =>
    spec.reports.every((r: any) => r.status === 'finalized')
  );

  if (nowAllFinalized && !caseSigned) {
    setTimeout(() => {
      setSignOutUser('');
      setSignOutPassword('');
      setSignOutError('');
      setShowSignOutModal(true);
    }, 500);
  } else if (finalizeAndNext) {
    const next = getNextUnfinalizedPath();
    if (next) {
      setActivePath(next);
      setActiveSynopticTab('tumor');
    }
  }
}, [
  finalizePassword,
  caseId,
  caseData,
  activePath,
  activeSynoptic,
  finalizeAndNext,
  caseSigned,
  getNextUnfinalizedPath
]);

  // ── Case sign-out ──────────────────────────────────────────────────────────
  const handleCaseSignOut = useCallback(() => {
    if (!signOutUser.trim() || signOutPassword.length < 4) {
      setSignOutError('Please enter your username and password.');
      return;
    }
    setCaseSigned(true);
    setShowSignOutModal(false);
    showToast(`Case ${caseData.accession} signed out`);
    setTimeout(() => setShowPostSignOutModal(true), 400);
  }, [signOutUser, signOutPassword, caseData.accession]);

  // ── Post sign-out navigation ───────────────────────────────────────────────
  const handlePostSignOutNavigate = useCallback((choice: 'next' | 'worklist') => {
    try { localStorage.setItem(POST_SIGNOUT_PREF_KEY, choice); } catch { /* ignore */ }
    setPostSignOutPref(choice);
    setShowPostSignOutModal(false);
    navigate('/worklist', { state: { fromCaseId: caseId } });
  }, [navigate]);

  // ── Navigation guard ───────────────────────────────────────────────────────
  const guard = (dest: string, state?: Record<string, unknown>) => {
    if (hasUnsavedData) { setPendingNavigation(dest); setShowWarning(true); }
    else navigate(dest, state ? { state } : undefined);
  };
  const confirmNavigation = () => {
    if (pendingNavigation) { setHasUnsavedData(false); navigate(pendingNavigation, { state: { fromCaseId: caseId } }); }
  };

  useEffect(() => { const t = setTimeout(() => setIsLoaded(true), 100); return () => clearTimeout(t); }, []);

  
// ── AI Source Highlight Sync ───────────────────────────────────────────────
// When a synoptic field is focused, highlight and scroll to its AI source
// inside the narrative panel. Clears highlight on blur. Keeps provenance
// synchronized with field navigation and auto‑advance.
  useEffect(() => {
    if (!activeFieldSource) return;

    const el = document.querySelector('[data-ai-source="active"]');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeFieldSource]);


  
  // ── Voice: REPORTING context ───────────────────────────────────────────────
  useEffect(() => {
    mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.REPORTING);
    return () => mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
  }, []);

  // ── Voice: command listeners ───────────────────────────────────────────────
  useEffect(() => {
    // Tab navigation — respects the existing bulk-confirm flow via handleTabChange
    const nextTab = () => {
      setActiveSynopticTab(current => {
        const idx = SYNOPTIC_TAB_ORDER.indexOf(current);
        const next = SYNOPTIC_TAB_ORDER[Math.min(idx + 1, SYNOPTIC_TAB_ORDER.length - 1)];
        if (next !== current) handleTabChange(next);
        return current; // handleTabChange manages state
      });
    };

    const prevTab = () => {
      setActiveSynopticTab(current => {
        const idx = SYNOPTIC_TAB_ORDER.indexOf(current);
        const prev = SYNOPTIC_TAB_ORDER[Math.max(idx - 1, 0)];
        if (prev !== current) handleTabChange(prev);
        return current;
      });
    };

    const saveDraft    = () => handleSaveDraft();
    const signOut      = () => openFinalizeModal(false);
    const goBack       = () => guard('/worklist', { fromCaseId: caseId });
    const goForward    = () => navigate(1);
    const nextCase     = () => handleSaveAndNext();
    const prevCase     = () => guard('/worklist', { fromCaseId: caseId });

    // Dictation targets — VoiceProvider listens for these to enter dictate mode
    const enterGross     = () => window.dispatchEvent(new CustomEvent('VOICE_ACTION_ENTER_GROSS'));
    const enterMicro     = () => window.dispatchEvent(new CustomEvent('VOICE_ACTION_ENTER_MICRO'));
    const enterDiagnosis = () => window.dispatchEvent(new CustomEvent('VOICE_ACTION_ENTER_DIAGNOSIS'));
    const enterAddendum  = () => window.dispatchEvent(new CustomEvent('VOICE_ACTION_ENTER_ADDENDUM'));
    const openResources  = () => setIsResourcesOpen(true);

    window.addEventListener('PATHSCRIBE_NEXT_TAB',          nextTab);
    window.addEventListener('PATHSCRIBE_PREVIOUS_TAB',      prevTab);
    window.addEventListener('PATHSCRIBE_SAVE_DRAFT',        saveDraft);
    window.addEventListener('PATHSCRIBE_SIGN_OUT',          signOut);
    window.addEventListener('PATHSCRIBE_GO_BACK',           goBack);
    window.addEventListener('PATHSCRIBE_GO_FORWARD',        goForward);
    window.addEventListener('PATHSCRIBE_NAV_NEXT_CASE',     nextCase);
    window.addEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE', prevCase);
    window.addEventListener('PATHSCRIBE_ENTER_GROSS',          enterGross);
    window.addEventListener('PATHSCRIBE_ENTER_MICRO',          enterMicro);
    window.addEventListener('PATHSCRIBE_ENTER_DIAGNOSIS',      enterDiagnosis);
    window.addEventListener('PATHSCRIBE_ENTER_ADDENDUM',       enterAddendum);
    window.addEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',  openResources);

    return () => {
      window.removeEventListener('PATHSCRIBE_NEXT_TAB',          nextTab);
      window.removeEventListener('PATHSCRIBE_PREVIOUS_TAB',      prevTab);
      window.removeEventListener('PATHSCRIBE_SAVE_DRAFT',        saveDraft);
      window.removeEventListener('PATHSCRIBE_SIGN_OUT',          signOut);
      window.removeEventListener('PATHSCRIBE_GO_BACK',           goBack);
      window.removeEventListener('PATHSCRIBE_GO_FORWARD',        goForward);
      window.removeEventListener('PATHSCRIBE_NAV_NEXT_CASE',     nextCase);
      window.removeEventListener('PATHSCRIBE_NAV_PREVIOUS_CASE', prevCase);
      window.removeEventListener('PATHSCRIBE_ENTER_GROSS',          enterGross);
      window.removeEventListener('PATHSCRIBE_ENTER_MICRO',          enterMicro);
      window.removeEventListener('PATHSCRIBE_ENTER_DIAGNOSIS',      enterDiagnosis);
      window.removeEventListener('PATHSCRIBE_ENTER_ADDENDUM',       enterAddendum);
      window.removeEventListener('PATHSCRIBE_PAGE_OPEN_RESOURCES',  openResources);
    };
  }, [handleSaveDraft, handleSaveAndNext, navigate, guard, activeSynopticTab]);

  // ── Static data ────────────────────────────────────────────────────────────
  const quickLinks = {
    protocols:  [{ title: 'CAP Cancer Protocols', url: 'https://www.cap.org/protocols-and-guidelines' }, { title: 'WHO Classification', url: 'https://www.who.int/publications' }],
    references: [{ title: 'PathologyOutlines', url: 'https://www.pathologyoutlines.com' }, { title: 'UpToDate', url: 'https://www.uptodate.com' }],
    systems:    [{ title: 'Hospital LIS', url: '#' }, { title: 'Lab Management', url: '#' }],
  };

  const availableProtocols = [
    { id: 'breast_invasive',  name: 'CAP Breast Invasive Carcinoma' }, { id: 'breast_dcis', name: 'CAP Breast Ductal Carcinoma In Situ' },
    { id: 'breast_excision',  name: 'CAP Breast Excision' }, { id: 'colon_resection', name: 'CAP Colon Resection' },
    { id: 'colon_polyp',      name: 'CAP Colon Polyp' }, { id: 'prostate', name: 'CAP Prostatectomy' },
    { id: 'prostate_biopsy',  name: 'CAP Prostate Biopsy' }, { id: 'lung_resection', name: 'CAP Lung Resection' },
    { id: 'lung_biopsy',      name: 'CAP Lung Biopsy' }, { id: 'gastric_resection', name: 'CAP Gastric Resection' },
    { id: 'esophagus',        name: 'CAP Esophagus Resection' }, { id: 'pancreas', name: 'CAP Pancreatic Resection' },
    { id: 'thyroid',          name: 'CAP Thyroid' }, { id: 'melanoma', name: 'CAP Melanoma Excision' },
    { id: 'ovary',            name: 'CAP Ovary' }, { id: 'endometrium', name: 'CAP Endometrial Carcinoma' },
  ];

  const filteredProtocols = protocolSearch.trim() === ''
    ? availableProtocols
    : availableProtocols.filter(p => p.name.toLowerCase().includes(protocolSearch.toLowerCase())).slice(0, 8);

  const specimenIcon  = (s: string) => ({ complete: '✓', alert: '⚠' }[s] ?? '○');
  const specimenColor = (s: string) => ({ complete: '#10B981', alert: '#F59E0B' }[s] ?? '#64748b');

  const progressSteps = [
    { id: '1', label: 'Patient Info', status: 'completed' as const },
    { id: '2', label: 'Tumor Char.', status: 'completed' as const },
    { id: '3', label: 'Margins',     status: 'current'   as const },
    { id: '4', label: 'Biomarkers',  status: 'alert'     as const },
    { id: '5', label: 'Finalize',    status: 'pending'   as const },
  ];

  const stepCircle = (status: string): React.CSSProperties => {
    const b: React.CSSProperties = { width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '11px', marginBottom: '6px', border: '2px solid' };
    return status === 'completed' ? { ...b, background: '#0891B2', color: 'white', borderColor: '#0891B2' }
         : status === 'current'   ? { ...b, background: 'white', color: '#0891B2', borderColor: '#0891B2', boxShadow: '0 0 0 4px rgba(8,145,178,0.1)' }
         : status === 'alert'     ? { ...b, background: 'white', color: '#F59E0B', borderColor: '#fde047', boxShadow: '0 0 0 4px rgba(253,224,71,0.2)' }
         :                          { ...b, background: 'white', color: '#94a3b8', borderColor: '#e2e8f0' };
  };

  // ── renderField ────────────────────────────────────────────────────────────
  const renderField = (field: SynopticField, group: FieldGroup) => {
    if (field.type === 'comment') return null;
    const vStatus = field.verification ?? 'unverified';
    const isDirty = field.dirty ?? false;
    const isHigh  = (field.confidence ?? 0) >= 85;
    const bgColor     = isFinalized ? '#f8fafc' : vStatus === 'verified' ? '#f0fdf4' : vStatus === 'disputed' ? '#fef2f2' : 'white';
    const borderColor = isFinalized ? '#e2e8f0' : vStatus === 'verified' ? '#86efac' : vStatus === 'disputed' ? '#fca5a5' : '#e2e8f0';
    const isActiveSource = !isFinalized && activeFieldSource && field.aiSource && field.aiSource === activeFieldSource;
    const fieldInputRef = React.createRef<HTMLInputElement>();

    const renderVerificationBadge = () => {
      if (vStatus === 'verified') {
        return <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, background: '#bbf7d0', color: '#14532d', display: 'flex', alignItems: 'center', gap: '3px' }}>✓ AI Confirmed</span>;
      }
      if (vStatus === 'disputed') {
        return <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, background: '#fecaca', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '3px' }}>✎ Overridden</span>;
      }
      return <ConfidenceBadge confidence={field.confidence} isHigh={isHigh} aiSource={field.aiSource} />;
    };

    return (
      <div
        key={field.id}
        ref={el => { fieldRefs.current[field.id] = el; }}
        style={{
          padding: '8px', borderRadius: '6px', background: bgColor,
          border: `2px solid ${isActiveSource ? '#0891B2' : borderColor}`,
          marginBottom: '8px',
          boxShadow: isActiveSource ? '0 0 0 3px rgba(8,145,178,0.15)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: isFinalized ? '#94a3b8' : '#1e293b' }}>
              {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
            </span>
            {isDirty && !isFinalized && (
              <span style={{ fontSize: '10px', background: '#ede9fe', color: '#5b21b6', padding: '1px 5px', borderRadius: '6px', fontWeight: 600, flexShrink: 0 }}>edited</span>
            )}
            {isFinalized && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🔒</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {renderVerificationBadge()}
            {!isFinalized && field.confidence < 100 && (
              <>
                {vStatus !== 'disputed' && (
                  <button
                    title="Confirm AI — I've reviewed the source and the AI value is correct"
                    onClick={() => {
                      updateVerification(group, field.id, vStatus === 'verified' ? 'unverified' : 'verified');
                      if (vStatus !== 'verified') advanceToNextUnverifiedField(group, field.id);
                    }}
                    style={{ height: '24px', padding: '0 8px', borderRadius: '12px', border: '1.5px solid', background: vStatus === 'verified' ? '#10B981' : 'white', borderColor: vStatus === 'verified' ? '#10B981' : '#d1d5db', color: vStatus === 'verified' ? 'white' : '#6b7280', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { if (vStatus !== 'verified') { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}}
                    onMouseLeave={e => { if (vStatus !== 'verified') { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}}
                  >✓ Confirm</button>
                )}
                {!field.dirty && vStatus !== 'verified' && (
                  <button
                    title="Override — edit this field to correct the AI value"
                    onClick={() => setTimeout(() => fieldInputRef.current?.focus(), 50)}
                    style={{ height: '24px', padding: '0 8px', borderRadius: '12px', border: '1.5px solid', background: 'white', borderColor: '#d1d5db', color: '#6b7280', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}
                  >✎ Edit</button>
                )}
              </>
            )}
          </div>
        </div>
        <input
          ref={fieldInputRef}
          type="text"
          value={field.value}
          disabled={isFinalized}
          onChange={e => updateField(group, field.id, e.target.value)}
          onFocus={() => { if (field.aiSource) setActiveFieldSource(field.aiSource); setActiveFieldId(field.id); setActiveFieldGroup(group); }}
          onBlur={() => { setActiveFieldSource(null); setActiveFieldId(null); setActiveFieldGroup(null); }}
          style={{ width: '100%', padding: '8px', border: `2px solid ${borderColor}`, borderRadius: '6px', fontSize: '13px', background: isFinalized ? '#f1f5f9' : 'white', color: isFinalized ? '#94a3b8' : '#1e293b', cursor: isFinalized ? 'not-allowed' : 'text', boxSizing: 'border-box' }}
        />
        {field.aiSource && !isFinalized && (
          <div style={{ fontSize: '10px', marginTop: '4px', fontStyle: 'italic', color: isActiveSource ? '#0891B2' : '#94a3b8', fontWeight: isActiveSource ? 600 : 400, transition: 'color 0.15s' }}>
            {isActiveSource ? '◀ Highlighted in report — ' : 'AI source: '}
            {field.aiSource}
          </div>
        )}
      </div>
    );
  };

  // ── Unverified count on current tab ───────────────────────────────────────
  const unverifiedCountOnTab = React.useMemo(() => {
    if (!activeSynoptic) return 0;
    const fieldMap: Record<SynopticTab, SynopticField[]> = {
      tumor:      activeSynoptic.tumorFields,
      margins:    activeSynoptic.marginFields,
      biomarkers: activeSynoptic.biomarkerFields,
      codes:      [],
    };
    return (fieldMap[activeSynopticTab] ?? []).filter(
      f => f.type !== 'comment' && f.confidence < 100 && f.verification === 'unverified'
    ).length;
  }, [activeSynoptic, activeSynopticTab]);

  // ── Bulk confirm ───────────────────────────────────────────────────────────
  const bulkConfirmCurrentTab = useCallback(() => {
    if (!activeSynoptic) return;
    const groupMap: Record<SynopticTab, FieldGroup | null> = {
      tumor: 'tumorFields', margins: 'marginFields', biomarkers: 'biomarkerFields', codes: null,
    };
    const group = groupMap[activeSynopticTab];
    if (!group) return;
    setCaseData((prev: CaseData) => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, (node: SynopticReportNode) => ({
        ...node,
        [group]: (node[group] as SynopticField[]).map(f =>
          f.type !== 'comment' && f.confidence < 100 && f.verification === 'unverified'
            ? { ...f, verification: 'verified' as FieldVerification }
            : f
        ),
      })),
    }));
    setHasUnsavedData(true);
  }, [activeSynoptic, activeSynopticTab, activePath]);

  // ── Tab change with bulk-confirm intercept ─────────────────────────────────
  const handleTabChange = useCallback((tab: SynopticTab) => {
    if (tab === activeSynopticTab) return;
    if (!isFinalized && unverifiedCountOnTab > 0 && activeSynopticTab !== 'codes') {
      setPendingTabChange(tab);
      setShowBulkConfirmPrompt(true);
    } else {
      setActiveSynopticTab(tab);
    }
  }, [activeSynopticTab, isFinalized, unverifiedCountOnTab]);

  // ── Field refs for alert click navigation ──────────────────────────────────
  const fieldRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

// ── Auto-advance across groups (unified navigation) ─────────────────────────
// Uses FIELD_GROUP_ORDER to move through the synoptic in a predictable
// clinical sequence. Looks in the current group first, then subsequent groups.
  const advanceToNextUnverifiedField = useCallback(
    (currentGroup: FieldGroup, currentFieldId: string) => {
      if (!activeSynoptic) return;

      const focusField = (field: SynopticField) => {
        const el = fieldRefs.current[field.id];
        if (!el) return;

        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = el.querySelector('input');
        if (input) setTimeout(() => input.focus(), 200);
      };

      const groupIndex = FIELD_GROUP_ORDER.indexOf(currentGroup);
      if (groupIndex === -1) return;

      // 1. Look in the current group first
      const currentFields = (activeSynoptic[currentGroup] as SynopticField[]).filter(
        f => f.type !== 'comment'
      );
      const currentIdx = currentFields.findIndex(f => f.id === currentFieldId);

      for (let i = currentIdx + 1; i < currentFields.length; i++) {
        if (currentFields[i].verification !== 'verified') {
          focusField(currentFields[i]);
          return;
        }
      }

      // 2. Move to subsequent groups
      for (let g = groupIndex + 1; g < FIELD_GROUP_ORDER.length; g++) {
        const nextGroup = FIELD_GROUP_ORDER[g];
        const fields = activeSynoptic[nextGroup] as SynopticField[] | undefined;
        if (!fields) continue;

        const candidates = fields.filter(f => f.type !== 'comment');
        const next = candidates.find(f => f.verification !== 'verified');
        if (next) {
          focusField(next);
          return;
        }
      }

      // 3. No unverified fields left — workflow complete
    },
    [activeSynoptic, fieldRefs]
  );

  // ── View mode ──────────────────────────────────────────────────────────────
  const [synopticViewMode, setSynopticViewMode] = useState<'tabbed' | 'full'>('tabbed');
  const rightPanelScrollRef = useRef<HTMLDivElement>(null);

  // ── Field navigation: next unanswered / next required ─────────────────────
  type FieldLocator = { field: SynopticField; group: FieldGroup; tab: SynopticTab };

  const getAllFieldsInOrder = useCallback((): FieldLocator[] => {
    if (!activeSynoptic) return [];
    return [
      ...activeSynoptic.tumorFields.filter((f: SynopticField) => f.type !== 'comment').map((f: SynopticField) => ({ field: f, group: 'tumorFields' as FieldGroup, tab: 'tumor' as const })),
      ...activeSynoptic.marginFields.filter((f: SynopticField) => f.type !== 'comment').map((f: SynopticField) => ({ field: f, group: 'marginFields' as FieldGroup, tab: 'margins' as const })),
      ...activeSynoptic.biomarkerFields.filter((f: SynopticField) => f.type !== 'comment').map((f: SynopticField) => ({ field: f, group: 'biomarkerFields' as FieldGroup, tab: 'biomarkers' as const })),
    ];
  }, [activeSynoptic]);

  const navigateToField = useCallback((locator: FieldLocator) => {
    if (synopticViewMode === 'tabbed' && locator.tab !== activeSynopticTab) {
      setActiveSynopticTab(locator.tab);
    }
    setTimeout(() => {
      const el = fieldRefs.current[locator.field.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '3px solid #0891B2';
        el.style.outlineOffset = '2px';
        setTimeout(() => { if (el) { el.style.outline = ''; el.style.outlineOffset = ''; } }, 1800);
        const input = el.querySelector('input');
        if (input) setTimeout(() => input.focus(), 150);
      }
    }, 80);
  }, [synopticViewMode, activeSynopticTab]);

  const goToNextUnanswered = useCallback(() => {
    const all = getAllFieldsInOrder();
    if (!all.length) return;
    const firstEmpty = all.find(l => !l.field.value.trim());
    if (!firstEmpty) { showToast('All fields have been answered ✓'); return; }
    navigateToField(firstEmpty);
  }, [getAllFieldsInOrder, activeSynopticTab, navigateToField]);

  const goToNextRequired = useCallback(() => {
    const all = getAllFieldsInOrder();
    const firstEmpty = all.find(l => l.field.required && !l.field.value.trim());
    if (!firstEmpty) { showToast('All required fields answered ✓'); return; }
    navigateToField(firstEmpty);
  }, [getAllFieldsInOrder, navigateToField]);

  // ── Voice: confirm / edit / skip active field ──────────────────────────────
  const voiceConfirmField = useCallback(() => {
    if (!activeFieldId || !activeFieldGroup || !activeSynoptic) return;
    const fields = (activeSynoptic[activeFieldGroup] as SynopticField[]);
    const field = fields.find(f => f.id === activeFieldId);
    if (!field || field.type === 'comment' || field.verification === 'verified') return;
    updateVerification(activeFieldGroup, activeFieldId, 'verified');
    // Advance to next unverified after confirming
    advanceToNextUnverifiedField(activeFieldGroup, activeFieldId);
  }, [activeFieldId, activeFieldGroup, activeSynoptic, updateVerification, advanceToNextUnverifiedField]);

  const voiceEditField = useCallback(() => {
    if (!activeFieldId) return;
    const el = fieldRefs.current[activeFieldId];
    if (!el) return;
    const input = el.querySelector('input') as HTMLInputElement | null;
    if (input) { input.focus(); input.select(); }
  }, [activeFieldId]);

  const voiceSkipField = useCallback(() => {
    if (!activeFieldId || !activeFieldGroup) return;
    // Move to next unanswered field after the current one
    const all = getAllFieldsInOrder();
    const currentIdx = all.findIndex(l => l.field.id === activeFieldId);
    const next = all.slice(currentIdx + 1).find(l => !l.field.value.trim());
    if (next) navigateToField(next);
    else showToast('No more unanswered fields');
  }, [activeFieldId, activeFieldGroup, getAllFieldsInOrder, navigateToField, showToast]);

  // ── Voice: modal openers with auto-dictation ───────────────────────────────
  // Each handler opens the modal then starts a dictation session whose onText
  // appends plain text to the relevant comment. onDone stops dictation cleanly.

  const voiceOpenCaseComment = useCallback(() => {
    setShowCaseCommentModal(true);
    const existing = caseData.caseComments?.attending ?? '';
    let interimText = '';
    let committed = '';
    setTimeout(() => startDictation({
      fieldId:  'voice-case-comment',
      label:    'Case Comment',
      context:  'case comment',
      onText:   (t, isInterim) => {
        if (isInterim) {
          interimText = t;
          const preview = existing
            ? existing.replace(/<\/p>$/, '') + ' ' + committed + '<span style="color:#94a3b8">' + interimText + '</span></p>'
            : '<p>' + committed + '<span style="color:#94a3b8">' + interimText + '</span></p>';
          updateCaseComment('attending', preview);
        } else {
          interimText = '';
          committed += t;
          const appended = existing
            ? existing.replace(/<\/p>$/, '') + ' ' + committed + '</p>'
            : '<p>' + committed + '</p>';
          updateCaseComment('attending', appended);
        }
      },
      onDone:       () => stopDictation(),
      onCorrection: (_raw, corrected) => reportDictationCorrection(corrected),
    }), 300);
  }, [caseData.caseComments, startDictation, stopDictation, updateCaseComment]);

  const voiceOpenSpecimenComment = useCallback(() => {
    setShowReportCommentModal(true);
    const existing = activeSynoptic?.specimenComment ?? '';
    let interimText = '';
    let committed = '';
    setTimeout(() => startDictation({
      fieldId:  'voice-specimen-comment',
      label:    'Specimen Comment',
      context:  'specimen comment',
      onText:   (t, isInterim) => {
        if (isInterim) {
          interimText = t;
          const preview = existing
            ? existing.replace(/<\/p>$/, '') + ' ' + committed + '<span style="color:#94a3b8">' + interimText + '</span></p>'
            : '<p>' + committed + '<span style="color:#94a3b8">' + interimText + '</span></p>';
          updateSpecimenComment(preview);
        } else {
          interimText = '';
          committed += t;
          const appended = existing
            ? existing.replace(/<\/p>$/, '') + ' ' + committed + '</p>'
            : '<p>' + committed + '</p>';
          updateSpecimenComment(appended);
        }
      },
      onDone:       () => stopDictation(),
      onCorrection: (_raw, corrected) => reportDictationCorrection(corrected),
    }), 300);
  }, [activeSynoptic, startDictation, stopDictation, updateSpecimenComment]);

  const voiceOpenInternalNote = useCallback(() => {
    setVoiceOpenedNotes(true);
    setInternalNotesOpen(true);
  }, []);

  const voiceOpenAddSynoptic = useCallback(() => {
    setShowAddSynopticModal(true);
  }, []);

  const voiceOpenFlags = useCallback(() => {
    void openFlagManager();
  }, []);

  // ── Voice: field navigation + view toggles (defined after their dependencies) ──────
  useEffect(() => {
    const nextUnanswered = () => goToNextUnanswered();
    const nextRequired   = () => goToNextRequired();
    const confirmField   = () => voiceConfirmField();
    const editField      = () => voiceEditField();
    const skipField      = () => voiceSkipField();
    const fullView       = () => setSynopticViewMode('full');
    const tabbedView     = () => setSynopticViewMode('tabbed');
    const maxView        = () => setIsExpandedView(true);
    const minView        = () => setIsExpandedView(false);
    const previewReport  = () => setShowReportPreview(true);

    // Codes tab + specimen navigation
    const gotoCodes     = () => setActiveSynopticTab('codes');
    const selectSpecimen = (e: Event) => {
      const n = (e as CustomEvent).detail?.index as number | undefined;
      if (n !== undefined && n >= 0 && n < caseData.synoptics.length) {
        setActivePath([n, 0]);
        setExpandedSpecimens(new Set([n]));
        setActiveSynopticTab('tumor');
      }
    };

    // Similar cases / history panel
    const openHistory   = () => setIsSimilarCasesOpen(true);
    const closeHistory  = () => setIsSimilarCasesOpen(false);

    // Generic cancel — closes whichever modal/drawer is open (priority order)
    const cancelVoice = () => {
      if (internalNotesOpen)       { setInternalNotesOpen(false);      return; }
      if (showFlagManager)         { setShowFlagManager(false);        return; }
      if (showAddSynopticModal)    { setShowAddSynopticModal(false);   return; }
      if (showReportCommentModal)  { setShowReportCommentModal(false); return; }
      if (showCaseCommentModal)    { setShowCaseCommentModal(false);   return; }
      if (showAmendmentModal)      { setShowAmendmentModal(false);     return; }
      if (showFinalizeModal)       { setShowFinalizeModal(false);      return; }
      if (showReportPreview)       { setShowReportPreview(false);      return; }
      if (isSimilarCasesOpen)      { setIsSimilarCasesOpen(false);    return; }
      if (isExpandedView)          { setIsExpandedView(false);         return; }
    };

    // Post-finalization
    const addAddendum    = () => { setAmendmentMode('addendum'); setAmendmentText(''); setShowAmendmentModal(true); };
    const addAmendment   = () => { if (isFinalized) { setAmendmentMode('amendment'); setAmendmentText(''); setShowAmendmentModal(true); } };
    const signnoutNext   = () => openFinalizeModal(true);

    const openCaseComment     = () => voiceOpenCaseComment();
    const openSpecimenComment  = () => voiceOpenSpecimenComment();
    const openInternalNote     = () => voiceOpenInternalNote();
    const openAddSynoptic      = () => voiceOpenAddSynoptic();
    const openFlags            = () => voiceOpenFlags();

    window.addEventListener('PATHSCRIBE_GOTO_CODES',           gotoCodes);
    window.addEventListener('PATHSCRIBE_SELECT_SPECIMEN',       selectSpecimen);
    window.addEventListener('PATHSCRIBE_OPEN_HISTORY',          openHistory);
    window.addEventListener('PATHSCRIBE_CLOSE_HISTORY',         closeHistory);
    window.addEventListener('PATHSCRIBE_VOICE_CANCEL',          cancelVoice);
    window.addEventListener('PATHSCRIBE_ADD_ADDENDUM',          addAddendum);
    window.addEventListener('PATHSCRIBE_ADD_AMENDMENT',         addAmendment);
    window.addEventListener('PATHSCRIBE_SIGNOUT_NEXT',          signnoutNext);
    window.addEventListener('PATHSCRIBE_VOICE_CASE_COMMENT',     openCaseComment);
    window.addEventListener('PATHSCRIBE_VOICE_SPECIMEN_COMMENT', openSpecimenComment);
    window.addEventListener('PATHSCRIBE_VOICE_INTERNAL_NOTE',    openInternalNote);
    window.addEventListener('PATHSCRIBE_VOICE_ADD_SYNOPTIC',     openAddSynoptic);
    window.addEventListener('PATHSCRIBE_VOICE_FLAGS',            openFlags);
    window.addEventListener('PATHSCRIBE_NEXT_UNANSWERED',  nextUnanswered);
    window.addEventListener('PATHSCRIBE_NEXT_REQUIRED',    nextRequired);
    window.addEventListener('PATHSCRIBE_CONFIRM_FIELD',    confirmField);
    window.addEventListener('PATHSCRIBE_EDIT_FIELD',       editField);
    window.addEventListener('PATHSCRIBE_SKIP_FIELD',       skipField);
    window.addEventListener('PATHSCRIBE_FULL_VIEW',        fullView);
    window.addEventListener('PATHSCRIBE_TABBED_VIEW',      tabbedView);
    window.addEventListener('PATHSCRIBE_MAX_VIEW',         maxView);
    window.addEventListener('PATHSCRIBE_MIN_VIEW',         minView);
    window.addEventListener('PATHSCRIBE_PREVIEW_REPORT',   previewReport);

    return () => {
      window.removeEventListener('PATHSCRIBE_GOTO_CODES',           gotoCodes);
      window.removeEventListener('PATHSCRIBE_SELECT_SPECIMEN',       selectSpecimen);
      window.removeEventListener('PATHSCRIBE_OPEN_HISTORY',          openHistory);
      window.removeEventListener('PATHSCRIBE_CLOSE_HISTORY',         closeHistory);
      window.removeEventListener('PATHSCRIBE_VOICE_CANCEL',          cancelVoice);
      window.removeEventListener('PATHSCRIBE_ADD_ADDENDUM',          addAddendum);
      window.removeEventListener('PATHSCRIBE_ADD_AMENDMENT',         addAmendment);
      window.removeEventListener('PATHSCRIBE_SIGNOUT_NEXT',          signnoutNext);
      window.removeEventListener('PATHSCRIBE_VOICE_CASE_COMMENT',     openCaseComment);
      window.removeEventListener('PATHSCRIBE_VOICE_SPECIMEN_COMMENT', openSpecimenComment);
      window.removeEventListener('PATHSCRIBE_VOICE_INTERNAL_NOTE',    openInternalNote);
      window.removeEventListener('PATHSCRIBE_VOICE_ADD_SYNOPTIC',     openAddSynoptic);
      window.removeEventListener('PATHSCRIBE_VOICE_FLAGS',            openFlags);
      window.removeEventListener('PATHSCRIBE_NEXT_UNANSWERED',  nextUnanswered);
      window.removeEventListener('PATHSCRIBE_NEXT_REQUIRED',    nextRequired);
      window.removeEventListener('PATHSCRIBE_CONFIRM_FIELD',    confirmField);
      window.removeEventListener('PATHSCRIBE_EDIT_FIELD',       editField);
      window.removeEventListener('PATHSCRIBE_SKIP_FIELD',       skipField);
      window.removeEventListener('PATHSCRIBE_FULL_VIEW',        fullView);
      window.removeEventListener('PATHSCRIBE_TABBED_VIEW',      tabbedView);
      window.removeEventListener('PATHSCRIBE_MAX_VIEW',         maxView);
      window.removeEventListener('PATHSCRIBE_MIN_VIEW',         minView);
      window.removeEventListener('PATHSCRIBE_PREVIEW_REPORT',   previewReport);
    };
  }, [goToNextUnanswered, goToNextRequired, voiceConfirmField, voiceEditField, voiceSkipField,
      setSynopticViewMode, setIsExpandedView, setShowReportPreview,
      voiceOpenCaseComment, voiceOpenSpecimenComment, voiceOpenInternalNote,
      voiceOpenAddSynoptic, voiceOpenFlags,
      isFinalized, openFinalizeModal,
      setAmendmentMode, setAmendmentText, setShowAmendmentModal,
      caseData.synoptics, setActivePath, setExpandedSpecimens, setActiveSynopticTab,
      internalNotesOpen, showFlagManager, showAddSynopticModal,
      showReportCommentModal, showCaseCommentModal, showAmendmentModal,
      showFinalizeModal, showReportPreview, isSimilarCasesOpen, isExpandedView]);

  // ── Field counts ───────────────────────────────────────────────────────────
  const fieldCounts = React.useMemo(() => {
    if (!activeSynoptic) return { answered: 0, total: 0, requiredAnswered: 0, requiredTotal: 0 };
    const all = [
      ...activeSynoptic.tumorFields,
      ...activeSynoptic.marginFields,
      ...activeSynoptic.biomarkerFields,
    ].filter((f: SynopticField) => f.type !== 'comment');
    const answered         = all.filter(f => f.value.trim()).length;
    const total            = all.length;
    const requiredAnswered = all.filter(f => f.required && f.value.trim()).length;
    const requiredTotal    = all.filter(f => f.required).length;
    return { answered, total, requiredAnswered, requiredTotal };
  }, [activeSynoptic]);

  const tabs: { key: SynopticTab; label: string }[] = [
    { key: 'tumor',      label: `Tumor (${activeSynoptic?.tumorFields.filter((f: SynopticField) => f.type !== 'comment').length ?? 0})`      },
    { key: 'margins',    label: `Margins (${activeSynoptic?.marginFields.filter((f: SynopticField) => f.type !== 'comment').length ?? 0})`   },
    { key: 'biomarkers', label: `Biomarkers (${activeSynoptic?.biomarkerFields.filter((f: SynopticField) => f.type !== 'comment').length ?? 0})` },
    { key: 'codes',      label: `🏷 Codes (${activeSynoptic?.codes.length ?? 0})` },
  ];

  const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 };

  // ── Sidebar tree helpers ───────────────────────────────────────────────────
  const isPathActive   = (path: ActivePath) => JSON.stringify(activePath) === JSON.stringify(path);
  const isPathAncestor = (path: ActivePath) =>
    path.length < activePath.length &&
    path.every((v: number, i: number) => v === activePath[i]);

  const renderTreeNode = (node: SynopticReportNode, path: ActivePath, depth: number): React.ReactNode => {
    const isActive    = isPathActive(path);
    const isAncestor  = isPathAncestor(path);
    const isExpanded  = isActive || isAncestor;
    const hasChildren = node.children.length > 0;
    const nodeFinalized = node.status === 'finalized';
    const allFields = [...node.tumorFields, ...node.marginFields, ...node.biomarkerFields].filter((f: SynopticField) => f.type !== 'comment');
    const filled    = allFields.filter(f => f.value).length;
    const total     = allFields.length;
    const incomplete = total > 0 && filled < total;

    return (
      <div key={node.instanceId}>
        <div
          onClick={() => { setActivePath(path); setActiveSynopticTab('tumor'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: `6px 8px 6px ${12 + depth * 16}px`, borderRadius: '6px', marginBottom: '2px', cursor: 'pointer', background: isActive ? 'rgba(8,145,178,0.12)' : 'transparent', borderLeft: isActive ? '3px solid #0891B2' : '3px solid transparent', transition: 'all 0.12s' }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: '9px', color: '#94a3b8', width: '10px', flexShrink: 0, transition: 'transform 0.15s', transform: hasChildren && isExpanded ? 'rotate(90deg)' : 'none', visibility: hasChildren ? 'visible' : 'hidden' }}>▶</span>
          <span style={{ fontSize: '12px', flexShrink: 0 }}>{nodeFinalized ? '🔒' : depth === 0 ? '📋' : '↳'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: isActive ? 700 : 500, color: isActive ? '#0891B2' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.title}</div>
            {!nodeFinalized && total > 0 && (
              <div style={{ fontSize: '10px', color: incomplete ? '#92400e' : '#047857', marginTop: '1px' }}>{filled}/{total} fields</div>
            )}
          </div>
          {nodeFinalized
            ? <span style={{ fontSize: '10px', color: '#047857' }}>✓</span>
            : incomplete
              ? <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block' }} />
              : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0, display: 'inline-block' }} />
          }
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child: any, ci: number) => renderTreeNode(child, [...path, ci], depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const breadcrumb = getBreadcrumb(caseData.synoptics, activePath);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: "'Inter', sans-serif", opacity: isLoaded ? 1 : 0, transition: 'opacity 0.6s ease', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/main_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, filter: 'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)', zIndex: 1 }} />
      <SaveToast message={toastMsg} visible={toastVisible} />

      {/* Report Comment Modal */}
      {showReportCommentModal && activeSynoptic && (
        <ReportCommentModal
          specimenName={breadcrumb.join(' › ')}
          specimenId={activeSynoptic.instanceId}
          content={activeSynoptic.specimenComment}
          isFinalized={isFinalized}
          onChange={updateSpecimenComment}
          onClose={() => setShowReportCommentModal(false)}
        />
      )}

      {/* Case Comment Modal */}
      {showCaseCommentModal && (
        <CaseCommentModal
          accession={caseData.accession}
          caseComments={caseData.caseComments}
          onChangeAttending={html => updateCaseComment('attending', html)}
          onClose={() => setShowCaseCommentModal(false)}
        />
      )}

      {/* Similar Cases Panel */}
      {isSimilarCasesOpen && (
        <CasePanel
          isOpen={isSimilarCasesOpen}
          onClose={() => setIsSimilarCasesOpen(false)}
          patientName={caseData?.patient ?? 'Unknown Patient'}
          mrn={caseData?.mrn ?? '—'}
          patientHistory="S22-4471 (Mar 2022) — Core needle biopsy, left breast, 10 o'clock. Dx: Atypical ductal hyperplasia (ADH). ER+/PR+. Excision recommended; patient deferred. | S23-7809 (Nov 2023) — Excisional biopsy, left breast. Dx: Ductal carcinoma in situ (DCIS), intermediate grade, cribriform pattern, 8 mm. Margins clear (>2 mm). Radiation oncology referral placed."
          similarCases={mockSimilarCases}
          onRefineSearch={() => navigate('/search')}
        />
      )}

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Nav */}
        {!isExpandedView && (
          <NavBar
            onLogoClick={() => guard('/')}
            onLogout={() => setShowLogoutModal(true)}
            onProfileClick={() => setIsProfileOpen(!isProfileOpen)}
          />
        )}

        {/* Header */}
        {!isExpandedView && (
          <div style={{ background: 'white', padding: '8px 40px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
              {[['Home', '/'], ['Worklist', '/worklist']].map(([l, p]) => (
                <React.Fragment key={l}><span onClick={() => guard(p, p === '/worklist' ? { fromCaseId: caseId } : undefined)} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#0891B2')} onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>{l}</span><span style={{ color: '#cbd5e1' }}>›</span></React.Fragment>
              ))}
              <span style={{ color: '#0891B2', fontWeight: 600 }}>Case Report</span>
            </div>
            <div data-capture-hide="true" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Accession</div>
                  <div data-phi="accession" style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1 }}>{caseData.accession}</div>
                  <div style={{ marginTop: '5px', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '20px', background: caseStateMeta[caseState].bg, border: `1px solid ${caseStateMeta[caseState].border}` }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: caseStateMeta[caseState].dot, flexShrink: 0 }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: caseStateMeta[caseState].color, whiteSpace: 'nowrap' }}>{caseState}</span>
                  </div>
                </div>
                <div style={{ width: '1px', height: '40px', background: '#e2e8f0', flexShrink: 0 }} />
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div><div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Patient</div><div data-phi="name" style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{caseData.patient}</div></div>
                  <div><div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Gender</div><div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{caseData.gender}</div></div>
                  <div><div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Date of Birth</div><div data-phi="dob" style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{caseData.dob}</div></div>
                  <div><div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>MRN</div><div data-phi="mrn" style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{caseData.mrn}</div></div>
                </div>
                <div style={{ flexShrink: 0, padding: '4px 10px', borderRadius: '20px', background: '#d1fae5', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px' }}>✓</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#065f46' }}>Patient ID</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px' }}>
                {progressSteps.map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={stepCircle(step.status)}>{step.status === 'completed' ? '✓' : step.status === 'alert' ? '⚠' : step.id}</div>
                      <div style={{ fontSize: '7px', fontWeight: step.status === 'current' ? 600 : 500, color: step.status === 'alert' ? '#F59E0B' : step.status === 'current' ? '#1e293b' : '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap' }}>{step.label}</div>
                    </div>
                    {idx < progressSteps.length - 1 && <div style={{ width: '10px', height: '2px', background: idx < 2 ? '#0891B2' : '#e2e8f0', marginBottom: '10px' }} />}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ background: '#d1fae5', border: '1px solid #86efac', padding: '6px 14px', borderRadius: '8px' }}>
                {caseSigned
                  ? <div style={{ fontWeight: 700, color: '#065f46', fontSize: '12px' }}>✓ Case Signed Out</div>
                  : <><div style={{ fontWeight: 600, color: '#065f46', fontSize: '12px', marginBottom: '1px' }}>Confidence: {caseData.overallConfidence}%</div><div style={{ fontSize: '10px', color: '#047857' }}>{caseData.autoPopulated} auto-filled</div></>
                }
              </div>
            </div>
          </div>
        )}

        {/* ⭐ Validation Summary Panel ⭐ */}
        <ValidationSummaryPanel
          issues={validationSummary.allIssues}
          requiredMissing={validationSummary.requiredMissing}
          disputed={validationSummary.disputed}
          unverified={validationSummary.unverified}
          dirty={validationSummary.dirty}
          isReadyToFinalize={validationSummary.isReadyToFinalize}
          onJumpToField={scrollToField}
        />


        {/* Alert bar */}
        {!isExpandedView && (
          <div data-capture-hide="true" style={{ background: '#fef3c7', border: '1px solid #fde047', borderTop: 'none', flexShrink: 0 }}>
            <div
              onClick={() => {
                setActiveSynopticTab('tumor');
                setTimeout(() => {
                  const lviEntry = Object.entries(fieldRefs.current).find(([id]) => {
                    const allFields = activeSynoptic ? [...activeSynoptic.tumorFields, ...activeSynoptic.marginFields, ...activeSynoptic.biomarkerFields] : [];
                    const f = allFields.find(f => f.id === id);
                    return f && f.confidence < 75;
                  });
                  if (lviEntry) {
                    const el = lviEntry[1];
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.style.outline = '3px solid #f59e0b';
                      el.style.outlineOffset = '2px';
                      setTimeout(() => { if (el) { el.style.outline = ''; el.style.outlineOffset = ''; } }, 2000);
                    }
                  }
                }, 100);
              }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 40px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#92400e', fontSize: '12px' }}>
                ⚠️ Alert — Lymphovascular Invasion: AI confidence 68%. <span style={{ textDecoration: 'underline', fontWeight: 700 }}>Click to review field →</span>
              </div>
              <span style={{ fontSize: '12px', color: '#92400e', transform: isAlertExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} onClick={e => { e.stopPropagation(); setIsAlertExpanded(!isAlertExpanded); }}>▼</span>
            </div>
            {isAlertExpanded && <div style={{ padding: '0 40px 6px', color: '#78350f', fontSize: '11px', borderTop: '1px solid #fde047', paddingTop: '5px' }}>Review the <strong>Lymphovascular Invasion</strong> field in Tumor Characteristics. AI source: "Lymphovascular invasion is present" — verify against microscopic findings before finalizing.</div>}
          </div>
        )}

        {/* Main */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sidebar */}
          {!isExpandedView && (
            <div data-capture-hide="true" style={{ width: '260px', background: 'white', borderRight: '2px solid #e2e8f0', overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                onClick={() => setShowCaseCommentModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', marginBottom: '10px', cursor: 'pointer', background: hasCaseComment ? '#faf5ff' : '#f8fafc', border: `1.5px solid ${hasCaseComment ? '#d8b4fe' : '#e2e8f0'}`, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#faf5ff'; e.currentTarget.style.borderColor = '#d8b4fe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = hasCaseComment ? '#faf5ff' : '#f8fafc'; e.currentTarget.style.borderColor = hasCaseComment ? '#d8b4fe' : '#e2e8f0'; }}
              >
                <span style={{ fontSize: '14px', flexShrink: 0 }}>📋</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: hasCaseComment ? '#5b21b6' : '#64748b', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hasCaseComment ? 'Edit Case Comment' : '+ Add Case Comment'}
                  </div>
                  {hasCaseComment && <div style={{ fontSize: '10px', color: '#94a3b8' }}>Applies to entire case</div>}
                </div>
                {hasCaseComment && <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '6px', background: '#d1fae5', color: '#065f46', fontWeight: 700 }}>✓</span>}
              </div>

              <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '0 4px', marginBottom: '6px' }}>Specimens &amp; Reports</div>

              {caseData.synoptics.map((specimen: any, si: number) => {
                const isExpanded        = expandedSpecimens.has(si);
                const isActiveSpecimen  = activePath[0] === si;
                const specimenFinalized = specimen.reports.every((r: any) => r.status === 'finalized');
                return (
                  <div key={specimen.specimenId}>
                    <div
                      onClick={() => {
                        setExpandedSpecimens(prev => {
                          const next = new Set(prev);
                          if (next.has(si)) { next.delete(si); } else { next.add(si); }
                          return next;
                        });
                        if (!isActiveSpecimen && specimen.reports.length > 0) {
                          setActivePath([si, 0]);
                          setActiveSynopticTab('tumor');
                        }
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 8px', borderRadius: '8px', marginBottom: '2px', cursor: 'pointer', background: isActiveSpecimen ? '#f0f9ff' : 'transparent', border: `1.5px solid ${isActiveSpecimen ? '#bae6fd' : 'transparent'}`, transition: 'all 0.12s' }}
                      onMouseEnter={e => { if (!isActiveSpecimen) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isActiveSpecimen) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '9px', color: '#94a3b8', width: '10px', flexShrink: 0, transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                      <span style={{ fontSize: '14px', color: specimenColor(specimen.specimenStatus), flexShrink: 0 }}>{specimenIcon(specimen.specimenStatus)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Specimen {specimen.specimenId}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{specimen.specimenName}</div>
                      </div>
                      {specimenFinalized && <span style={{ fontSize: '10px', color: '#047857', flexShrink: 0 }}>🔒</span>}
                    </div>
                    {isExpanded && (
                      <div style={{ marginBottom: '6px' }}>
                        {specimen.reports.map((report: any, ri: number) => renderTreeNode(report, [si, ri], 0))}
                        {isActiveSpecimen && activeSynoptic && (
                          <div
                            onClick={e => { e.stopPropagation(); setShowReportCommentModal(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px 5px 24px', cursor: 'pointer', borderRadius: '6px' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontSize: '11px' }}>💬</span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: activeSynoptic.specimenComment && activeSynoptic.specimenComment !== '<p></p>' ? '#0891B2' : '#94a3b8', textDecoration: 'underline' }}>
                              {activeSynoptic.specimenComment && activeSynoptic.specimenComment !== '<p></p>' ? 'Edit comment' : '+ Add comment'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button onClick={() => setShowAddSynopticModal(true)}
                style={{ width: '100%', padding: '9px', borderRadius: '8px', background: 'rgba(8,145,178,0.08)', border: '2px dashed #0891B2', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer', marginTop: '8px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(8,145,178,0.08)'}
              >+ Add Synoptic</button>
            </div>
          )}

          {/* Split screen */}
          <div data-capture-hide="true" style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

            {/* Left: Patient Report (read-only from LIS) */}
            <div ref={reportPanelRef} style={{ width: '50%', background: 'white', borderRight: '3px solid #0891B2', overflowY: 'auto', padding: '12px 32px 32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 12px', borderBottom: '2px solid #0891B2', paddingBottom: '6px' }}>📋 Full Patient Report</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0369a1' }}>
                🔒 <span>Received from LIS — <strong>read-only</strong>. {activeFieldSource ? <strong style={{ color: '#0891B2' }}>Focus a field on the right to highlight its source.</strong> : 'Click a field on the right to highlight its source text.'}</span>
              </div>
              <div style={{ background: '#f0fdfa', borderRadius: '8px', padding: '16px', marginBottom: '20px', fontSize: '14px', border: '1px solid #0891B2' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><strong style={{ color: '#0E7490' }}>Accession:</strong> <span style={{ fontFamily: 'monospace', color: '#1e293b' }} data-phi="accession">{caseData.accession}</span></div>
                  <div><strong style={{ color: '#0E7490' }}>Patient:</strong> <span style={{ color: '#1e293b' }}>{caseData.patient}</span></div>
                  <div><strong style={{ color: '#0E7490' }}>DOB:</strong> <span style={{ color: '#1e293b' }} data-phi="dob">{caseData.dob}</span></div>
                  <div><strong style={{ color: '#0E7490' }}>MRN:</strong> <span style={{ color: '#1e293b' }} data-phi="mrn">{caseData.mrn}</span></div>
                </div>
              </div>
              {(() => {
                const activePhrase = activeFieldSource
                  ? activeFieldSource.replace(/^[^:]+:\s*[""]?/, '').replace(/[""]?$/, '').trim()
                  : null;
                const highlight = (text: string) => {
                  if (!activePhrase) return <>{text}</>;
                  const textLower   = text.toLowerCase();
                  const phraseLower = activePhrase.toLowerCase();
                  let idx = textLower.indexOf(phraseLower);
                  let matchLen = activePhrase.length;
                  if (idx === -1) {
                    const words = phraseLower.split(/\s+/).filter(Boolean);
                    let bestStart = -1, bestLen = 0;
                    for (let wi = 0; wi < words.length; wi++) {
                      for (let wj = words.length; wj > wi; wj--) {
                        const sub = words.slice(wi, wj).join(' ');
                        if (sub.length < 4) continue;
                        const si = textLower.indexOf(sub);
                        if (si !== -1 && sub.length > bestLen) { bestStart = si; bestLen = sub.length; break; }
                      }
                    }
                    if (bestStart !== -1) { idx = bestStart; matchLen = bestLen; }
                  }
                  if (idx === -1) return <>{text}</>;
                  return (<>{text.slice(0, idx)}<mark style={{ background: '#bfdbfe', color: '#1e3a5f', padding: '1px 3px', borderRadius: '3px', fontWeight: 700, outline: '2px solid #3b82f6' }}>{text.slice(idx, idx + matchLen)}</mark>{text.slice(idx + matchLen)}</>);
                };
                const lisReport = getMockReport(caseId) as FullReport | null;
                const grossText     = lisReport?.grossDescription       ?? '';
                const microText     = lisReport?.microscopicDescription ?? '';
                const clinicalText  = lisReport?.diagnosis              ?? '';
                const ancillaryText = lisReport?.ancillaryStudies       ?? '';
                return [
                  { title: 'CLINICAL HISTORY',     text: clinicalText   },
                  { title: 'GROSS DESCRIPTION',    text: grossText      },
                  { title: 'MICROSCOPIC FINDINGS', text: microText      },
                  ...(ancillaryText ? [{ title: 'ANCILLARY STUDIES', text: ancillaryText }] : []),
                ].map(s => (
                  <div key={s.title} style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '8px', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>{s.title}</h4>
                    <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>{highlight(s.text)}</p>
                  </div>
                ));
              })()}
            </div>

            {/* Expand button */}
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 100 }}>
              <button onClick={() => setIsExpandedView(!isExpandedView)}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0891B2', border: '3px solid white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0E7490'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0891B2'; e.currentTarget.style.transform = 'scale(1)'; }}
              >{isExpandedView ? '✕' : '⛶'}</button>
            </div>

            {/* Right: Synoptic checklist */}
            <div style={{ width: '50%', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 32px 0' }}>
                {breadcrumb.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {breadcrumb.map((crumb: string, i: number) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span style={{ color: '#cbd5e1', fontSize: '11px' }}>›</span>}
                        <span
                          onClick={() => { if (i < breadcrumb.length - 1) setActivePath(activePath.slice(0, i + 1 + (i === 0 ? 1 : i))); }}
                          style={{ fontSize: '11px', fontWeight: i === breadcrumb.length - 1 ? 700 : 400, color: i === breadcrumb.length - 1 ? '#0891B2' : '#64748b', cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default', textDecoration: i < breadcrumb.length - 1 ? 'underline' : 'none' }}
                        >{crumb}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '2px solid #0891B2', paddingBottom: '6px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>📝 {activeSynoptic?.title ?? 'Synoptic Checklist'}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isFinalized && activeSynoptic && (
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '10px', fontWeight: 600, background: fieldCounts.requiredAnswered === fieldCounts.requiredTotal ? '#d1fae5' : '#fef3c7', color: fieldCounts.requiredAnswered === fieldCounts.requiredTotal ? '#065f46' : '#92400e' }} title={`${fieldCounts.answered}/${fieldCounts.total} fields answered · ${fieldCounts.requiredAnswered}/${fieldCounts.requiredTotal} required`}>
                        {fieldCounts.requiredAnswered}/{fieldCounts.requiredTotal} req
                        {fieldCounts.answered < fieldCounts.total && ` · ${fieldCounts.answered}/${fieldCounts.total} total`}
                      </span>
                    )}
                    {isFinalized
                      ? <span style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>✓ Finalized</span>
                      : hasUnsavedData
                      ? <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>● Unsaved</span>
                      : <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#065f46', padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>✓ Saved</span>
                    }
                    <button
                      onClick={() => setSynopticViewMode(m => m === 'tabbed' ? 'full' : 'tabbed')}
                      title={synopticViewMode === 'tabbed' ? 'Switch to full synoptic view (all sections)' : 'Switch to tabbed view'}
                      style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: '1.5px solid #0891B2', background: synopticViewMode === 'full' ? '#0891B2' : 'white', color: synopticViewMode === 'full' ? 'white' : '#0891B2', cursor: 'pointer' }}
                    >{synopticViewMode === 'full' ? '⊟ Tabbed' : '⊞ Full View'}</button>
                  </div>
                </div>

                {!isFinalized && activeSynoptic && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', padding: '6px 10px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, flex: 1 }}>Jump to:</span>
                    <button onClick={goToNextUnanswered} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: '1.5px solid #0891B2', background: 'white', color: '#0891B2', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#e0f2fe'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Jump to the next unanswered field">→ Next Unanswered {fieldCounts.total - fieldCounts.answered > 0 ? `(${fieldCounts.total - fieldCounts.answered})` : '✓'}</button>
                    <button onClick={goToNextRequired} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, border: `1.5px solid ${fieldCounts.requiredAnswered < fieldCounts.requiredTotal ? '#dc2626' : '#10B981'}`, background: 'white', color: fieldCounts.requiredAnswered < fieldCounts.requiredTotal ? '#dc2626' : '#10B981', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = fieldCounts.requiredAnswered < fieldCounts.requiredTotal ? '#fef2f2' : '#f0fdf4'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Jump to the next unanswered required field">→ Next Required {fieldCounts.requiredTotal - fieldCounts.requiredAnswered > 0 ? `(${fieldCounts.requiredTotal - fieldCounts.requiredAnswered})` : '✓'}</button>
                  </div>
                )}

                <div style={{ display: synopticViewMode === 'full' ? 'none' : 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => handleTabChange(t.key)}
                      style={{ padding: '7px 13px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeSynopticTab === t.key ? '#0891B2' : 'white', border: `2px solid ${activeSynopticTab === t.key ? '#0891B2' : '#e2e8f0'}`, color: activeSynopticTab === t.key ? 'white' : '#64748b' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={rightPanelScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
                <style>{`.ProseMirror-menubar, [class*="toolbar"], [class*="Toolbar"] { min-height: 44px !important; }`}</style>
                {/* ─── Narrative Editor ─────────────────────────────────────────────── */}
                <section className="mt-6">
                  <h2 className="text-lg font-semibold mb-2">Narrative</h2>
                  <textarea
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    className="w-full h-40 p-3 border rounded-md font-mono text-sm"
                    placeholder="Enter narrative text here..."
                  />
                </section>

                {/* Full view */}
                {synopticViewMode === 'full' && activeSynoptic && (
                  <>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0891B2', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e0f2fe', paddingBottom: '6px' }}>Tumor Characteristics</h4>
                      {activeSynoptic.tumorFields.length > 0 ? activeSynoptic.tumorFields.map((f: SynopticField) => renderField(f, 'tumorFields')) : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No tumor fields for this specimen.</div>}
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0891B2', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e0f2fe', paddingBottom: '6px' }}>Margins</h4>
                      {activeSynoptic.marginFields.length > 0 ? activeSynoptic.marginFields.map((f: SynopticField) => renderField(f, 'marginFields')) : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No margin fields for this specimen.</div>}
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0891B2', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e0f2fe', paddingBottom: '6px' }}>Immunohistochemistry</h4>
                      {activeSynoptic.biomarkerFields.length > 0 ? activeSynoptic.biomarkerFields.map((f: SynopticField) => renderField(f, 'biomarkerFields')) : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No biomarker fields for this specimen.</div>}
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0891B2', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🏷 Codes</h4>
                        {isFinalized && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🔒 locked</span>}
                      </div>
                      <CodesPanel codes={activeSynoptic.codes} onRemove={removeCode} onVerify={updateCodeVerification} onAddToSpecimens={addCodesToSpecimens} allSpecimens={caseData.synoptics.map((s: any, i: number) => ({ index: i, id: s.specimenId, name: s.specimenName }))} activeSpecimenIndex={activeSpecimenIndex} readOnly={isFinalized} />
                    </div>
                  </>
                )}

                {/* Tabbed view */}
                {synopticViewMode === 'tabbed' && activeSynopticTab === 'tumor' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Tumor Characteristics</h4>
                    {activeSynoptic.tumorFields.length > 0 ? activeSynoptic.tumorFields.map((f: SynopticField) => renderField(f, 'tumorFields')) : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No tumor fields for this specimen.</div>}
                  </div>
                )}
                {synopticViewMode === 'tabbed' && activeSynopticTab === 'margins' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Margins</h4>
                    {activeSynoptic.marginFields.length > 0 ? activeSynoptic.marginFields.map((f: SynopticField) => renderField(f, 'marginFields')) : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No margin fields for this specimen.</div>}
                  </div>
                )}
                {synopticViewMode === 'tabbed' && activeSynopticTab === 'biomarkers' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Immunohistochemistry</h4>
                    {activeSynoptic.biomarkerFields.length > 0 ? activeSynoptic.biomarkerFields.map((f: SynopticField) => renderField(f, 'biomarkerFields')) : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No biomarker fields for this specimen.</div>}
                  </div>
                )}
                {synopticViewMode === 'tabbed' && activeSynopticTab === 'codes' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>SNOMED CT &amp; ICD Codes</h4>
                      {isFinalized && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🔒 locked</span>}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>CAP/RCPath system codes are locked. AI-assigned and manual codes can be removed by you.</p>
                    <CodesPanel codes={activeSynoptic.codes} onRemove={removeCode} onVerify={updateCodeVerification} onAddToSpecimens={addCodesToSpecimens} allSpecimens={caseData.synoptics.map((s: any, i: number) => ({ index: i, id: s.specimenId, name: s.specimenName }))} activeSpecimenIndex={activeSpecimenIndex} readOnly={isFinalized} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        {!isExpandedView && (
          <div style={{ background: 'white', padding: '10px 40px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            {isFinalized ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {caseSigned
                    ? <div style={{ color: '#047857', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '16px' }}>✓</span> Case {caseData.accession} signed out</div>
                    : allSynopticsFinalized
                    ? <div style={{ color: '#0891B2', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '16px' }}>🔒</span> All synoptics finalized — ready for sign-out</div>
                    : <div style={{ color: '#047857', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '16px' }}>🔒</span> {activeSynoptic?.title ?? 'Report'} finalized and locked</div>
                  }
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setShowReportPreview(true)} style={{ padding: '8px 16px', border: '1.5px solid #334155', borderRadius: '8px', background: 'white', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Preview the formatted pathology report">📄 Preview Report</button>
                  <button onClick={() => { setAmendmentMode('addendum'); setAmendmentText(''); setShowAmendmentModal(true); }} style={{ padding: '8px 16px', border: '1.5px solid #0891B2', borderRadius: '8px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Request an addendum to this finalized report">📎 Addendum Request</button>
                  {showAmendmentButton && (
                    <button onClick={() => { setAmendmentMode('amendment'); setAmendmentText(''); setShowAmendmentModal(true); }} style={{ padding: '8px 16px', border: '1.5px solid #d97706', borderRadius: '8px', background: 'white', color: '#d97706', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Request an amendment to this finalized report">✏️ Amendment</button>
                  )}
                  <button onClick={() => void openFlagManager()} style={{ padding: '8px 14px', border: '1.5px solid #f59e0b', borderRadius: '8px', background: 'white', color: '#b45309', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Manage flags">🚩 Flags</button>
                  <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
                  {allSynopticsFinalized && !caseSigned && (
                    <button onClick={() => { setSignOutUser(''); setSignOutPassword(''); setSignOutError(''); setShowSignOutModal(true); }} style={{ padding: '8px 20px', background: '#047857', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#065f46'} onMouseLeave={e => e.currentTarget.style.background = '#047857'}>✍️ Sign Out Case</button>
                  )}
                  {!allSynopticsFinalized && (
                    <button onClick={() => { const next = getNextUnfinalizedPath(); if (next) { setActivePath(next); setActiveSynopticTab('tumor'); } }} style={{ padding: '8px 20px', background: '#0891B2', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#0E7490'} onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}>Next Report →</button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ color: '#64748b', fontSize: '12px' }}>
                  {hasUnsavedData ? <span style={{ color: '#92400e', fontWeight: 600 }}>● Unsaved changes</span> : <span style={{ color: '#047857' }}>✓ All changes saved</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setShowReportPreview(true)} style={{ padding: '7px 12px', border: '1.5px solid #334155', borderRadius: '7px', background: 'white', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Preview the formatted pathology report">📄 Preview Report</button>
                  <button onClick={() => { setAmendmentMode('addendum'); setAmendmentText(''); setShowAmendmentModal(true); }} style={{ padding: '7px 12px', border: '1.5px solid #0891B2', borderRadius: '7px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Request an addendum">📎 Addendum</button>
                  {showAmendmentButton && (
                    <button onClick={() => { if (!isFinalized) return; setAmendmentMode('amendment'); setAmendmentText(''); setShowAmendmentModal(true); }} disabled={!isFinalized} style={{ padding: '7px 12px', border: `1.5px solid ${isFinalized ? '#d97706' : '#e2e8f0'}`, borderRadius: '7px', background: 'white', color: isFinalized ? '#d97706' : '#94a3b8', fontWeight: 600, fontSize: '12px', cursor: isFinalized ? 'pointer' : 'not-allowed', opacity: isFinalized ? 1 : 0.55 }} title={!isFinalized ? 'Amendment is only available after finalization' : lisIntegrationEnabled ? 'Amendment — PathScribe will notify LIS' : 'Request an amendment'} onMouseEnter={e => { if (isFinalized) e.currentTarget.style.background = '#fffbeb'; }} onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>✏️ Amendment</button>
                  )}
                  <button onClick={() => alert('Consultation Request — coming soon')} style={{ padding: '7px 12px', border: '1.5px solid #7c3aed', borderRadius: '7px', background: 'white', color: '#7c3aed', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Request consultation">🔬 Consult</button>
                  <button type="button" onClick={() => setIsSimilarCasesOpen(true)} style={{ padding: '7px 12px', border: '1.5px solid #0891b2', borderRadius: '7px', background: 'white', color: '#0891b2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Show similar cases">📋 History</button>
                  <button type="button" onClick={() => void openFlagManager()} style={{ padding: '7px 12px', border: '1.5px solid #f59e0b', borderRadius: '7px', background: 'white', color: '#b45309', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Manage flags">🚩 Flags</button>
                  <button type="button" onClick={() => setInternalNotesOpen(true)} style={{ padding: '7px 12px', border: '1.5px solid #8B5CF6', borderRadius: '7px', background: 'white', color: '#7C3AED', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Internal notes — not included in the formatted report">📝 Internal Notes</button>
                  <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
                  <button onClick={handleSaveDraft} style={{ padding: '7px 14px', border: '2px solid #0891B2', borderRadius: '7px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Save this report as a draft">💾 Save Draft</button>
                  <button onClick={handleSaveAndNext} style={{ padding: '7px 14px', border: '2px solid #0891B2', borderRadius: '7px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'white'} title="Save draft and advance to next unfinalized report">💾 Save &amp; Next</button>
                  <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
                  <button onClick={() => openFinalizeModal(false)} style={{ padding: '7px 16px', background: '#0891B2', color: 'white', borderRadius: '7px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#0E7490'} onMouseLeave={e => e.currentTarget.style.background = '#0891B2'} title="Finalize this synoptic (requires password)">🔒 Finalize</button>
                  <button onClick={() => openFinalizeModal(true)} style={{ padding: '7px 16px', background: '#0891B2', color: 'white', borderRadius: '7px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#0E7490'} onMouseLeave={e => e.currentTarget.style.background = '#0891B2'} title="Finalize and advance to next unfinalized report">🔒 Finalize &amp; Next</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Internal Notes Drawer */}
      {internalNotesOpen && (
        <InternalNotesDrawer
          accession={caseData.accession}
          userId={user?.id ?? 'u1'}
          userName={user?.name ?? 'Unknown'}
          onClose={() => { setInternalNotesOpen(false); setVoiceOpenedNotes(false); }}
          autoStartDictation={voiceOpenedNotes}
          onDictateText={(appendText, onDone) => {
            startDictation({
              fieldId: 'voice-internal-note',
              label:   'Internal Note',
              onText:  appendText,
              onDone:  () => { stopDictation(); onDone(); },
            });
          }}
        />
      )}

      {/* Report Preview */}
      {showReportPreview && <ReportPreviewModal caseData={caseData} onClose={() => setShowReportPreview(false)} />}

      {/* Flag Manager */}
      {showFlagManager && flagCaseData && (
        <FlagManagerModal
          caseData={flagCaseData}
          flagDefinitions={flagDefinitions}
          onApplyFlags={async (payload) => { const updated = await applyFlags(payload); setFlagCaseData(updated ?? null); }}
          onRemoveFlag={async (payload) => { const updated = await deleteFlags(payload); setFlagCaseData(updated ?? null); }}
          onClose={() => setShowFlagManager(false)}
        />
      )}

      {/* Add Synoptic Modal */}
      {showAddSynopticModal && (
        <div data-capture-hide="true" style={modalOverlay} onClick={() => setShowAddSynopticModal(false)}>
          <div style={{ width: '500px', backgroundColor: '#111', borderRadius: '20px', padding: '40px', border: '1px solid rgba(8,145,178,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0891B2', fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Add Synoptic Report</div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Select Specimen(s)</div>
              {caseData.synoptics.map((syn: any) => (
                <label key={syn.specimenId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: selectedSpecimens.includes(syn.specimenId) ? 'rgba(8,145,178,0.1)' : 'rgba(255,255,255,0.03)', border: `2px solid ${selectedSpecimens.includes(syn.specimenId) ? '#0891B2' : 'rgba(255,255,255,0.1)'}`, marginBottom: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedSpecimens.includes(syn.specimenId)} onChange={e => { if (e.target.checked) setSelectedSpecimens([...selectedSpecimens, syn.specimenId]); else setSelectedSpecimens(selectedSpecimens.filter(id => id !== syn.specimenId)); }} style={{ width: '18px', height: '18px' }} />
                  <div><div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>Specimen {syn.specimenId}</div><div style={{ color: '#94a3b8', fontSize: '12px' }}>{syn.specimenName}</div></div>
                </label>
              ))}
            </div>
            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Select Protocol</div>
              <input type="text" value={selectedProtocol ? availableProtocols.find(p => p.id === selectedProtocol)?.name ?? '' : protocolSearch} onChange={e => { setProtocolSearch(e.target.value); setSelectedProtocol(''); setShowProtocolDropdown(true); }} onFocus={() => setShowProtocolDropdown(true)} placeholder="🔍 Search protocols…"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: `2px solid ${selectedProtocol ? '#0891B2' : 'rgba(255,255,255,0.1)'}`, color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              {showProtocolDropdown && !selectedProtocol && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', maxHeight: '220px', overflowY: 'auto', background: '#1a1a1a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', zIndex: 100 }}>
                  {filteredProtocols.map(p => (
                    <div key={p.id} onClick={() => { setSelectedProtocol(p.id); setProtocolSearch(''); setShowProtocolDropdown(false); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><span data-phi="name">{p.name}</span></div>
                  ))}
                </div>
              )}
              {selectedProtocol && (
                <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(8,145,178,0.15)', border: '1px solid #0891B2', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#0891B2', fontSize: '13px', fontWeight: 600 }}>✓ {availableProtocols.find(p => p.id === selectedProtocol)?.name}</span>
                  <button onClick={() => { setSelectedProtocol(''); setProtocolSearch(''); }} style={{ background: 'none', border: 'none', color: '#0891B2', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', marginBottom: '24px', cursor: 'pointer' }}>
              <input type="checkbox" checked={learnPairing} onChange={e => setLearnPairing(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <div><div style={{ color: '#10B981', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>🤖 Learn this pairing</div><div style={{ color: '#6ee7b7', fontSize: '11px' }}>AI will suggest this protocol for similar specimens in future cases</div></div>
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowAddSynopticModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setShowAddSynopticModal(false); setSelectedSpecimens([]); setSelectedProtocol(''); setProtocolSearch(''); }} disabled={!selectedSpecimens.length || !selectedProtocol}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: (!selectedSpecimens.length || !selectedProtocol) ? 'rgba(8,145,178,0.2)' : '#0891B2', border: 'none', color: (!selectedSpecimens.length || !selectedProtocol) ? '#64748b' : '#fff', fontWeight: 600, fontSize: '15px', cursor: (!selectedSpecimens.length || !selectedProtocol) ? 'not-allowed' : 'pointer' }}>
                Add Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Password Modal */}
      {showFinalizeModal && (
        <div data-capture-hide="true" style={modalOverlay}>
          <div style={{ width: '420px', backgroundColor: '#fff', padding: '36px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Finalize {activeSynoptic?.title ?? 'Synoptic Report'}</h2>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5', fontSize: '13px' }}>Finalizing this report locks it for editing and creates an audit entry.<br />Enter your password to confirm.</p>
            <input type="password" autoFocus value={finalizePassword} onChange={e => { setFinalizePassword(e.target.value); setFinalizeError(''); }} onKeyDown={e => e.key === 'Enter' && handleFinalizeConfirm()} placeholder="Your password" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${finalizeError ? '#ef4444' : '#e2e8f0'}`, fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }} />
            {finalizeError && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 12px', textAlign: 'left' }}>{finalizeError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setShowFinalizeModal(false)} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'transparent', border: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleFinalizeConfirm} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#0891B2', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#0E7490'} onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}>🔒 Confirm &amp; Finalize{finalizeAndNext ? ' →' : ''}</button>
            </div>
          </div>
        </div>
      )}

      {/* Case Sign-Out Modal */}
      {showSignOutModal && (
        <div data-capture-hide="true" style={modalOverlay}>
          <div style={{ width: '460px', backgroundColor: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>✍️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Sign Out Case</h2>
            <p style={{ color: '#64748b', marginBottom: '6px', fontSize: '13px', lineHeight: '1.5' }}>All synoptic reports for <strong data-phi="accession">Case {caseData.accession}</strong> have been finalized.</p>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '13px', lineHeight: '1.5' }}>Enter your username and password to sign out this case from PathScribe.</p>
            <div style={{ textAlign: 'left', marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Username</label>
              <input type="text" autoFocus value={signOutUser} onChange={e => { setSignOutUser(e.target.value); setSignOutError(''); }} placeholder="Your username" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            <div style={{ textAlign: 'left', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Password</label>
              <input type="password" value={signOutPassword} onChange={e => { setSignOutPassword(e.target.value); setSignOutError(''); }} onKeyDown={e => e.key === 'Enter' && handleCaseSignOut()} placeholder="Your password" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }} />
            </div>
            {signOutError && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 8px', textAlign: 'left' }}>{signOutError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowSignOutModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'transparent', border: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCaseSignOut} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#047857', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#065f46'} onMouseLeave={e => e.currentTarget.style.background = '#047857'}>✍️ Sign Out Case</button>
            </div>
          </div>
        </div>
      )}

      {/* Post Sign-Out Navigation */}
      {showPostSignOutModal && (
        <div data-capture-hide="true" style={modalOverlay}>
          <div style={{ width: '440px', backgroundColor: '#fff', padding: '36px 40px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#d1fae5', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '22px' }}>✓</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Case Signed Out</h2>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '28px', lineHeight: 1.6 }}><strong data-phi="accession">{caseData.accession}</strong> has been signed out successfully. Where would you like to go next?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <button onClick={() => handlePostSignOutNavigate('next')} style={{ padding: '14px 20px', borderRadius: '10px', border: `2px solid ${postSignOutPref === 'next' ? '#0891B2' : '#e2e8f0'}`, background: postSignOutPref === 'next' ? '#f0f9ff' : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891B2'; e.currentTarget.style.background = '#f0f9ff'; }} onMouseLeave={e => { if (postSignOutPref !== 'next') { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; } }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>→</span>
                <div><div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Next Case</div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Continue to the next case in the worklist queue</div></div>
                {postSignOutPref === 'next' && <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#0891B2', background: '#e0f2fe', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>preferred</span>}
              </button>
              <button onClick={() => handlePostSignOutNavigate('worklist')} style={{ padding: '14px 20px', borderRadius: '10px', border: `2px solid ${postSignOutPref === 'worklist' ? '#0891B2' : '#e2e8f0'}`, background: postSignOutPref === 'worklist' ? '#f0f9ff' : 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#0891B2'; e.currentTarget.style.background = '#f0f9ff'; }} onMouseLeave={e => { if (postSignOutPref !== 'worklist') { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; } }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>☰</span>
                <div><div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Return to Worklist</div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Go back to the worklist to select a case</div></div>
                {postSignOutPref === 'worklist' && <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: '#0891B2', background: '#e0f2fe', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>preferred</span>}
              </button>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>Your choice is remembered for future sign-outs. You can change it at any time.</p>
          </div>
        </div>
      )}

      {/* SR-02: Tab-change bulk confirm prompt */}
      {showBulkConfirmPrompt && pendingTabChange && (
        <div data-capture-hide="true" style={{ ...modalOverlay, alignItems: 'flex-start', paddingTop: '120px' }}>
          <div style={{ width: '420px', backgroundColor: '#fff', padding: '28px 32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Confirm AI suggestions?</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
              There {unverifiedCountOnTab === 1 ? 'is' : 'are'} <strong>{unverifiedCountOnTab} unverified AI suggestion{unverifiedCountOnTab !== 1 ? 's' : ''}</strong> on the current tab. Accept all before switching?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { bulkConfirmCurrentTab(); setActiveSynopticTab(pendingTabChange); setShowBulkConfirmPrompt(false); setPendingTabChange(null); showToast(`${unverifiedCountOnTab} AI suggestion${unverifiedCountOnTab !== 1 ? 's' : ''} confirmed`); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#0891B2', border: 'none', color: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#0e7490'} onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}>✓ Accept All &amp; Switch</button>
              <button onClick={() => { setActiveSynopticTab(pendingTabChange); setShowBulkConfirmPrompt(false); setPendingTabChange(null); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'white', border: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#1e293b'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}>Skip &amp; Switch</button>
              <button onClick={() => { setShowBulkConfirmPrompt(false); setPendingTabChange(null); }} style={{ padding: '10px 14px', borderRadius: '8px', background: 'white', border: '1.5px solid #e2e8f0', color: '#94a3b8', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }} title="Stay on current tab">Cancel</button>
            </div>
          </div>
        </div>
      )}

{/* Extracted Modals */}
<FinalizeSynopticModal
  show={showFinalizeModal}
  overlayStyle={modalOverlay}
  activeSynoptic={activeSynoptic ?? null}
  finalizePassword={finalizePassword}
  finalizeError={finalizeError}
  finalizeAndNext={finalizeAndNext}
  onClose={() => setShowFinalizeModal(false)}
  onPasswordChange={(value) => {
    setFinalizePassword(value);
    setFinalizeError('');
  }}
  onConfirm={handleFinalizeConfirm}
/>

<CaseSignOutModal
  show={showSignOutModal}
  overlayStyle={modalOverlay}
  accession={caseData.accession}
  signOutUser={signOutUser}
  signOutPassword={signOutPassword}
  signOutError={signOutError}
  onClose={() => setShowSignOutModal(false)}
  onUserChange={(value) => {
    setSignOutUser(value);
    setSignOutError('');
  }}
  onPasswordChange={(value) => {
    setSignOutPassword(value);
    setSignOutError('');
  }}
  onConfirm={handleCaseSignOut}
/>

<AmendmentModal
  show={showAmendmentModal}
  overlayStyle={modalOverlay}
  amendmentMode={amendmentMode}
  amendmentText={amendmentText}
  activeSynopticTitle={activeSynoptic?.title ?? 'the report'}
  onModeChange={(mode) => setAmendmentMode(mode)}
  onTextChange={(value) => setAmendmentText(value)}
  onClose={() => setShowAmendmentModal(false)}
  onSubmit={() => {
    if (!amendmentText.trim()) return;
    setShowAmendmentModal(false);
    showToast(
      `${amendmentMode === 'amendment' ? 'Amendment' : 'Addendum'} request submitted`
    );
  }}
/>

      {/* Voice overlays — outside AppShell so mounted directly here */}
      <VoiceCommandOverlay showSuccess={import.meta.env.DEV} />
      <VoiceMissPrompt />

    </div>
  );
};

export default SynopticReportPage;

// src/pages/SynopticReportPage/SynopticReportPage.tsx
// ─────────────────────────────────────────────────────────────
// Orchestrator — assembles the full clinical workspace shell:
//
//   ┌─ NavBar ──────────────────────────────────────────────────┐
//   ├─ HeaderBar (accession, patient, sign-out) ────────────────┤
//   ├─ Sidebar │ LeftReportPanel │ RightSynopticPanel ──────────┤
//   └─ BottomActionBar ─────────────────────────────────────────┘
//
// RightSynopticPanel owns all synoptic state and rendering.
// This file is intentionally thin — layout + modal wiring only.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AddSynopticModal from './components/AddSynopticModal';
import NavBar             from '@/components/NavBar/NavBar';
import HeaderBar          from './components/HeaderBar';
import Sidebar            from './components/Sidebar';
import LeftReportPanel    from './components/LeftReportPanel';
import RightSynopticPanel, { type RightSynopticPanelHandle } from './components/RightSynopticPanel';
import BottomActionBar    from './components/BottomActionBar';

import AmendmentModal        from './modals/AmendmentModal';
import { CaseCommentModal }   from '../Synoptic/Comments/CaseCommentModal';
import PatientHistoryModal    from '../../components/CasePanel/PatientHistoryModal';
import FlagManagerModal       from '../../components/Config/System/FlagManagerModal';
import { AddCodeModal }       from '../Synoptic/Codes/AddCodeModal';
import { ReportCommentModal } from '../Synoptic/Comments/ReportCommentModal';
import CaseSignOutModal      from './modals/CaseSignOutModal';
import FinalizeSynopticModal from './modals/FinalizeSynopticModal';
import LogoutWarningModal    from './modals/LogoutWarningModal';
import UnsavedWarningModal   from './modals/UnsavedWarningModal';

import { useSynopticFinalize } from '../Synoptic/useSynopticFinalize';
import { useSynopticModals }   from '../Synoptic/useSynopticModals';
import { useSynopticToast }    from '../Synoptic/useSynopticToast';
import { useSynopticFlags }    from '../Synoptic/useSynopticFlags';
import { SaveToast }           from '../Synoptic/UI/SaveToast';

import { mockCaseService, countersignSynoptic } from '@/services/cases/mockCaseService';
import { useDirtyState } from '@/contexts/DirtyStateContext';
import { useLogout } from '@/hooks/useLogout';
import '@/pathscribe.css';

import type { Case } from '@/types/case/Case';
import type { MissingRequiredField, ReviewField } from './components/RightSynopticPanel';
import { AiReviewModal }  from './modals/AiReviewModal';
import { DelegateModal }  from '../Synoptic/Delegate/DelegateModal';
import CaseTeamModal     from './modals/CaseTeamModal';
import { mockActionRegistryService } from '@/services/actionRegistry/mockActionRegistryService';
import { PreFinalisationModal }    from './modals/PreFinalisationModal';
import { BiometricSetupWizard }    from '@/components/Biometric/BiometricSetupWizard';
import { useAuth }                 from '@/contexts/AuthContext';
import { useMessaging }           from '@/contexts/MessagingContext';
import { messageService }         from '@/services';

// ─── Shared overlay style (passed to all modals) ──────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 25000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const SynopticReportPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate   = useNavigate();
  const location   = useLocation();
  const handleLogout = useLogout();

  // ── Worklist state ─────────────────────────────────────────
  // WorklistTable passes the ordered case ID array through router state
  // so Previous / Next don't need a separate service call and the order
  // always matches what the user saw in the worklist.
  const routerWorklistIds: string[] = (location.state as any)?.worklistCaseIds ?? [];

  // ── Case data ──────────────────────────────────────────────
  const [caseData, setCaseData]     = useState<Case | null>(null);
  const [isLoaded, setIsLoaded]     = useState(false);
  const [activeTab, setActiveTab]       = useState('tumor');
  const { isDirty: hasUnsavedData, setDirty: setHasUnsavedData, pendingPath, confirmNavigate: confirmContextNavigate, cancelNavigate: cancelContextNavigate } = useDirtyState();
  const [activeSpecimenId, setActiveSpecimenId] = useState<string>('');
  const [showCaseCommentModal, setShowCaseCommentModal] = useState(false);
  const [showSpecimenCommentModal, setShowSpecimenCommentModal] = useState(false);
  const [activeSpecimenCommentId, setActiveSpecimenCommentId] = useState<string>('');
  const [hasCaseComment, setHasCaseComment] = useState(false);
  const [caseCommentAttending, setCaseCommentAttending] = useState('');
  const [specimenComments, setSpecimenComments] = useState<Record<string, string>>({});
  const [showAddSynopticModal, setShowAddSynopticModal] = useState(false);
  const [activeReportInstanceId, setActiveReportInstanceId] = useState<string>('');
  const [isAlertExpanded, setIsAlertExpanded] = useState(true);
  const [isSimilarCasesOpen, setIsSimilarCasesOpen] = useState(false);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [panelMode, setPanelMode] = useState<null | 'expanded'>(null);
  const [highlightText, setHighlightText] = useState<string | null>(null);
  const [worklistCases, setWorklistCases] = useState<string[]>([]);
  const [worklistIndex, setWorklistIndex] = useState(0);
  const [alertFieldId, setAlertFieldId] = useState<string | null>(null);
  
 
  
 
  const [availableProtocols, setAvailableProtocols] = useState<{id:string;name:string}[]>([]);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // ── Pre-finalisation review modal ──────────────────────────
  const [showPreFinalise, setShowPreFinalise]       = useState(false);
  const [preFinaliseAndNext, setPreFinaliseAndNext] = useState(false);

  // ── Countersign modal ──────────────────────────────────────
  const [showCountersignModal, setShowCountersignModal] = useState(false);
  const [countersignPassword, setCountersignPassword]   = useState('');
  const [countersignError, setCountersignError]         = useState('');

  // ── Auth / user identity for signing panel ─────────────────
  const { user, showBiometricWizard, setShowBiometricWizard } = useAuth();
  const { setMessages } = useMessaging();

  const [showDelegateModal, setShowDelegateModal]   = useState(false);
  const [delegateReturnTo,  setDelegateReturnTo]    = useState<'team' | null>(null);
  const [showTeamModal,     setShowTeamModal]       = useState(false);

  useEffect(() => {
    if (!caseId) return;

    // ── Worklist for Previous / Next ──────────────────────────
    // WorklistTable passes the ordered ID list via router state so the order
    // always matches what the user saw.  Fall back to a service fetch only
    // when the page is opened directly by URL (no router state present).
    if (routerWorklistIds.length > 0) {
      setWorklistCases(routerWorklistIds);
      setWorklistIndex(routerWorklistIds.indexOf(caseId));
    } else {
      mockCaseService.listCasesForUser('current').then((cases: any[]) => {
        const ids = cases.map((c: any) => c.id);
        setWorklistCases(ids);
        setWorklistIndex(ids.indexOf(caseId));
      }).catch(() => {});
    }

    setHasUnsavedData(false);
    mockCaseService.getCase(caseId).then((c) => {
      setCaseData(c ?? null);
      // Auto-select first specimen
      if (c?.specimens?.length) setActiveSpecimenId(c.specimens[0].id);
      // Set active report instance (new system) or fall back to legacy
      if (c?.synopticReports?.length) {
        setActiveReportInstanceId(c.synopticReports[0].instanceId);
      }
      // Load approved templates for Add Synoptic modal
      import('@/services/templates/templateService').then(m => 
        m.listTemplates('published').then(templates => 
          setAvailableProtocols(templates.map((t:any) => ({ id: t.id, name: t.name })))
        )
      );
      // Restore any persisted case comment
      const stored = c?.id ? localStorage.getItem(`ps_case_comment_${c.id}`) : null;
      if (stored) { setCaseCommentAttending(stored); setHasCaseComment(true); }
      setIsLoaded(true);
    }).catch(() => setIsLoaded(true));
  }, [caseId]);

  // ── Hooks ──────────────────────────────────────────────────
  const {
    showFinalizeModal,  setShowFinalizeModal,
    finalizePassword,   setFinalizePassword,
    finalizeError,
    showSignOutModal,   setShowSignOutModal,
    signOutUser,        setSignOutUser,
    signOutPassword,    setSignOutPassword,
    signOutError,
    setCaseSigned,
    showAmendmentModal, setShowAmendmentModal,
    amendmentText,      setAmendmentText,
    amendmentMode,      setAmendmentMode,
  } = useSynopticFinalize();

  const {
    showLogoutModal,  setShowLogoutModal,
    isProfileOpen,    setIsProfileOpen,
    } = useSynopticModals();

  const { toastMsg, toastVisible, showToast } = useSynopticToast();

  const {
    flagCaseData, setFlagCaseData: _setFlagCaseData,
    flagDefinitions,
    showFlagManager, setShowFlagManager,
    openFlagManager,
    onApplyFlags,
    onRemoveFlag,
  } = useSynopticFlags(caseId ?? '');

  // ── Navigation guard ───────────────────────────────────────
  const guard = useCallback((path: string, state?: object) => {
    if (hasUnsavedData) {
      setPendingNavigation(path);
      return;
    }
    navigate(path, state ? { state } : undefined);
  }, [hasUnsavedData, navigate]);

  // ── Browser unload guard — warns on tab close / browser back ──
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedData) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedData]);



  // ── Case navigation ────────────────────────────────────────
  const navigateToCase = useCallback((direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? worklistIndex + 1 : worklistIndex - 1;
    if (newIndex >= 0 && newIndex < worklistCases.length) {
      // Forward the worklist so the destination page also has working Prev/Next
      navigate(`/case/${worklistCases[newIndex]}/synoptic`, {
        state: { worklistCaseIds: worklistCases },
      });
    }
  }, [worklistCases, worklistIndex, navigate]);

  // ── Sign-out confirm ───────────────────────────────────────
  const handleSignOutConfirm = useCallback(() => {
    setCaseSigned(true);
    setShowSignOutModal(false);
    showToast('Case signed out successfully');
  }, [setCaseSigned, setShowSignOutModal, showToast]);

  // ── Synoptic panel ref — used to sweep verification at finalize ───────────
  const synopticPanelRef = React.useRef<RightSynopticPanelHandle>(null);
  const [missingFields,          setMissingFields]          = React.useState<MissingRequiredField[]>([]);
  const [showMissingWarning,     setShowMissingWarning]     = React.useState(false);
  const [reviewFields,           setReviewFields]           = React.useState<ReviewField[]>([]);
  const [showAiReview,           setShowAiReview]           = React.useState(false);
  const [finalizeAndNextPending, setFinalizeAndNextPending] = React.useState(false);
  const [deferredAmendmentContext, setDeferredAmendmentContext] = React.useState<{ title: string; prefill: string } | null>(null);

  // ── Finalize confirm ───────────────────────────────────────
  const handleFinalizeConfirm = useCallback(() => {
    // Sweep unverified AI suggestions → auto-confirmed before persisting
    if (synopticPanelRef.current) {
      const { verificationSummary } = synopticPanelRef.current.sweepAndGetFinalState();
      console.info('[PathScribe] Finalization sweep:', verificationSummary);
    }
    setShowFinalizeModal(false);

    // ── Countersign required — set to pending-countersign and notify attending ──
    if ((caseData as any)?.requiresCountersign) {
      // Set synoptic(s) to pending-countersign
      const updatedReports = (caseData?.synopticReports ?? []).map((r: any) => ({
        ...r, status: r.status === 'deferred' ? r.status : 'pending-countersign',
      }));
      const updatedCase = {
        ...caseData!,
        synopticReports: updatedReports,
        status: 'pending-countersign' as any,
        updatedAt: new Date().toISOString(),
      };
      setCaseData(updatedCase as any);

      // Notify attending via in-app message
      const attending = ((caseData as any).caseTeam ?? [])
        .find((m: any) => m.role === 'Attending');
      if (attending?.userId && user) {
        messageService.send({
          id:            '',
          senderId:      user.id,
          senderName:    user.name,
          recipientId:   attending.userId,
          recipientName: attending.name,
          subject:       `Countersign required — ${caseData?.accession?.fullAccession ?? caseData?.id}`,
          body:          `${user.name} has finalised the synoptic report for ${caseData?.accession?.fullAccession ?? caseData?.id} (${caseData?.patient?.firstName ?? ''} ${caseData?.patient?.lastName ?? ''}) and it is pending your countersignature before transmission to the LIS.`,
          timestamp:     new Date(),
          isRead:        false,
          isDeleted:     false,
          isUrgent:      false,
          caseNumber:    caseData?.accession?.fullAccession ?? '',
          thread:        [],
        }).then(result => {
          if (result.ok) setMessages(prev => [...prev, result.data]);
        }).catch(() => {});
      }
      showToast('Report pending countersignature — attending notified');
      return;
    }

    // Deferred synoptic on already-finalized case → trigger amendment flow
    const activeReport = caseData?.synopticReports?.find(
      r => r.instanceId === activeReportInstanceId
    ) as any;
    if (caseData?.status === 'finalized' && activeReport?.status === 'deferred') {
      const completedFields = Object.entries(activeReport.answers ?? {})
        .filter(([, v]) => v && (Array.isArray(v) ? (v as string[]).length > 0 : (v as string).trim()))
        .map(([k]) => k)
        .join(', ');
      const pendingNote = activeReport.deferredPending ? ` (${activeReport.deferredPending})` : '';
      setDeferredAmendmentContext({
        title: activeReport.templateName ?? 'Deferred Synoptic',
        prefill: `Amendment — completion of deferred synoptic${pendingNote}: ${activeReport.templateName ?? ''}.

Ancillary results now available. Completed fields: ${completedFields || 'see synoptic report'}.

Original report issued pending ancillary studies. This amendment incorporates the completed findings.`,
      });
      setAmendmentMode('amendment');
      setShowAmendmentModal(true);
    } else {
      showToast('Report finalized');
    }
  }, [setShowFinalizeModal, showToast, caseData, activeReportInstanceId, setAmendmentMode, setShowAmendmentModal]);

  // ── Countersign confirm ────────────────────────────────────
  const handleCountersignConfirm = useCallback(async () => {
    if (!countersignPassword.trim()) {
      setCountersignError('Password is required.');
      return;
    }
    if (countersignPassword.length < 3) {
      setCountersignError('Incorrect password.');
      return;
    }
    if (!caseData || !user) return;

    // Countersign all pending-countersign synoptics
    for (const r of (caseData.synopticReports ?? [])) {
      if ((r as any).status === 'pending-countersign') {
        await countersignSynoptic(caseData.id, r.instanceId, user.id);
      }
    }

    // Update local case state
    const updatedReports = (caseData.synopticReports ?? []).map((r: any) => ({
      ...r,
      status: r.status === 'pending-countersign' ? 'finalized' : r.status,
      countersignedBy: user.id,
      countersignedAt: new Date().toISOString(),
    }));
    setCaseData(prev => prev ? {
      ...prev,
      synopticReports: updatedReports,
      status: 'finalized' as any,
      countersignedBy: user.id,
      countersignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } : prev);

    setShowCountersignModal(false);
    setCountersignPassword('');
    showToast('Report countersigned and transmitted');
  }, [countersignPassword, caseData, user, setCaseData, showToast]);

  // ── Voice action listeners for finalise flow ───────────────
  // Must be AFTER handleFinalizeConfirm to avoid TDZ error
  useEffect(() => {
    const openPreFinalise   = () => { setPreFinaliseAndNext(false); setShowPreFinalise(true); };
    const finaliseAndNext   = () => { setPreFinaliseAndNext(true);  setShowPreFinalise(true); };
    const finaliseConfirm   = () => {
      setShowPreFinalise(prev => { if (prev) handleFinalizeConfirm(); return false; });
    };
    const finaliseCancel    = () => setShowPreFinalise(false);

    window.addEventListener('PATHSCRIBE_OPEN_PRE_FINALISE',  openPreFinalise);
    window.addEventListener('PATHSCRIBE_FINALISE_AND_NEXT',  finaliseAndNext);
    window.addEventListener('PATHSCRIBE_FINALISE_CONFIRM',   finaliseConfirm);
    window.addEventListener('PATHSCRIBE_FINALISE_CANCEL',    finaliseCancel);
    return () => {
      window.removeEventListener('PATHSCRIBE_OPEN_PRE_FINALISE', openPreFinalise);
      window.removeEventListener('PATHSCRIBE_FINALISE_AND_NEXT', finaliseAndNext);
      window.removeEventListener('PATHSCRIBE_FINALISE_CONFIRM',  finaliseConfirm);
      window.removeEventListener('PATHSCRIBE_FINALISE_CANCEL',   finaliseCancel);
    };
  }, [handleFinalizeConfirm]);

  // ── Amendment submit ───────────────────────────────────────
  const handleAmendmentSubmit = useCallback(() => {
    setShowAmendmentModal(false);
    showToast(`${amendmentMode === 'addendum' ? 'Addendum' : 'Amendment'} submitted`);
    setAmendmentText('');
  }, [amendmentMode, setAmendmentText, setShowAmendmentModal, showToast]);

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/main_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, filter: 'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)', zIndex: 1 }} />

      {/* Toast */}
      <SaveToast message={toastMsg} visible={toastVisible} />

      {/* Shell */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* NavBar */}
        <NavBar
          onLogoClick={() => guard('/')}
          onLogout={() => setShowLogoutModal(true)}
          onProfileClick={() => setIsProfileOpen(!isProfileOpen)}
        />

        {/* HeaderBar */}
        <HeaderBar
          caseData={caseData}
          onNavigate={guard}
          onSignOut={() => setShowSignOutModal(true)}
          aiConfidence={92}
        />

        {/* Alert bar — shown when there are unanswered required fields */}
        {(() => {
          const reports = caseData?.synopticReports ?? [];
          const activeReport = activeReportInstanceId
            ? reports.find(r => r.instanceId === activeReportInstanceId)
            : reports[0];
          const answers = activeReport?.answers ?? caseData?.synopticAnswers ?? {};
          void answers; // reserved for future required-field count display

          // Show alert if any answers exist but some required fields empty
          // For now show a contextual alert based on template
          const templateId = activeReport?.templateId ?? caseData?.synopticTemplateId;
          if (!templateId) return null;

          return (
            <div style={{ background: '#fef3c7', borderTop: 'none', borderBottom: '1px solid #fde047', flexShrink: 0 }}>
              <div
                onClick={() => setAlertFieldId('scroll_to_unanswered')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 40px', cursor: 'pointer', userSelect: 'none' as const }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#92400e', fontSize: '12px' }}>
                  ⚠️ Alert — Some required fields are incomplete.{' '}
                  <span style={{ textDecoration: 'underline', fontWeight: 700 }}>Click to review →</span>
                </div>
                <span
                  style={{ fontSize: '12px', color: '#92400e', transform: isAlertExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setIsAlertExpanded(a => !a); }}
                >▼</span>
              </div>
              {isAlertExpanded && (
                <div style={{ padding: '0 40px 6px', color: '#78350f', fontSize: '11px', borderTop: '1px solid #fde047', paddingTop: '5px' }}>
                  Review all <strong>required fields</strong> marked with * in the synoptic checklist. Ensure all required data elements are completed before finalizing.
                </div>
              )}
            </div>
          );
        })()}

        {/* Main body */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

          {/* Sidebar */}
          <Sidebar
            caseData={caseData}
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            activeSpecimenId={activeSpecimenId}
            onSelectSpecimen={setActiveSpecimenId}
            onAddSynoptic={() => setShowAddSynopticModal(true)}
            onOpenCaseComment={() => setShowCaseCommentModal(true)}
            onOpenSpecimenComment={(id) => { setActiveSpecimenCommentId(id); setShowSpecimenCommentModal(true); }}
            hasCaseComment={hasCaseComment}
            specimenComments={specimenComments}
            activeReportInstanceId={activeReportInstanceId}
            onSelectReport={(instanceId, specimenId) => {
              setActiveReportInstanceId(instanceId);
              setActiveSpecimenId(specimenId);
            }}
            onDeleteReport={(instanceId) => {
              if (!caseData) return;
              const remaining = (caseData.synopticReports ?? []).filter(r => r.instanceId !== instanceId);
              const updated: Case = {
                ...caseData,
                synopticReports: remaining,
                updatedAt: new Date().toISOString(),
              };
              setCaseData(updated);
              setHasUnsavedData(true);
              // If deleted the active report, switch to first remaining
              if (activeReportInstanceId === instanceId) {
                setActiveReportInstanceId(remaining[0]?.instanceId ?? '');
                setActiveSpecimenId(remaining[0]?.specimenId ?? '');
              }
            }}
          />

          {/* Left panel */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative', background: 'rgba(15,23,42,0.95)' }}>
            <LeftReportPanel caseData={caseData} highlightText={highlightText ?? undefined} />
          </div>

          {/* Expand button — zero-width divider, always on top */}
          <div style={{ position: 'relative', width: 0, zIndex: 200, display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setPanelMode(m => m ? null : 'expanded')}
              title="Full-screen review mode"
              style={{
                position: 'absolute', left: -16,
                width: 32, height: 32, borderRadius: '50%',
                background: '#0891B2', border: '2px solid rgba(255,255,255,0.2)',
                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.8)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0e7490')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0891B2')}
            >⤢</button>
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, minWidth: 0, background: 'rgba(15,23,42,0.95)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <RightSynopticPanel
                ref={synopticPanelRef}
                caseData={caseData}
                activeTab={activeTab}
                activeReportInstanceId={activeReportInstanceId}
                onReportInstanceChange={setActiveReportInstanceId}
                onCaseUpdate={(updated) => { setCaseData(updated); setHasUnsavedData(true); }}
                isDirty={hasUnsavedData}
                scrollToField={alertFieldId}
                onScrollComplete={() => setAlertFieldId(null)}
                onHighlight={setHighlightText}
              />
            </div>
          </div>
        </div>

        {/* ── Fullscreen review overlay ──────────────────────────────────────────── */}
        {panelMode === 'expanded' && caseData && (() => {
          const accession = caseData.accession?.fullAccession ?? caseData.accession?.accessionNumber ?? '';
          const patient   = caseData.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : '';
          const dob       = caseData.patient?.dateOfBirth ? new Date(caseData.patient.dateOfBirth).toLocaleDateString() : '';
          const sex       = caseData.patient?.sex ?? '';
          return (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', flexDirection: 'column', background: '#0a0f1e' }}
              onKeyDown={e => { if (e.key === 'Escape') setPanelMode(null); }}
              tabIndex={-1}
            >
              {/* Identity bar — two rows */}
              <div style={{ background: 'rgba(8,20,40,0.98)', borderBottom: '1px solid rgba(8,145,178,0.3)', flexShrink: 0 }}>

                {/* Row 1: patient identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', height: 34, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{accession}</span>
                  {patient && <><span style={{ color: '#334155' }}>·</span><span style={{ color: '#f1f5f9', fontWeight: 600 }}>{patient}</span></>}
                  {sex  && <><span style={{ color: '#334155' }}>·</span><span style={{ color: '#f1f5f9' }}>{sex}</span></>}
                  {dob  && <><span style={{ color: '#334155' }}>·</span><span style={{ color: '#94a3b8', fontSize: 11 }}>DOB</span><span style={{ color: '#f1f5f9', marginLeft: 3 }}>{dob}</span></>}
                </div>

                {/* Row 2: specimen pills — full width, overflows naturally */}
                {caseData.specimens && caseData.specimens.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 10px', overflowX: 'auto' }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0, textTransform: 'uppercase', marginRight: 4 }}>Specimen:</span>
                    {caseData.specimens.map((sp: any) => {
                      const reports  = (caseData.synopticReports ?? []).filter((r: any) => r.specimenId === sp.id);
                      const hasNone  = reports.length === 0;
                      const hasMulti = reports.length > 1;
                      const isActive = sp.id === activeSpecimenId;
                      const pillBorder  = hasNone ? '#d97706'  : '#0891B2';
                      const pillBg      = hasNone ? 'transparent' : isActive ? '#0891B2'              : 'transparent';
                      const pillColor   = hasNone ? '#fbbf24'  : isActive ? '#ffffff'               : '#7dd3fc';
                      const labelColor  = hasNone ? '#f59e0b'  : isActive ? '#ffffff'               : '#38bdf8';

                      return (
                        <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button
                            className={`ps-specimen-pill${hasNone ? ' warning' : ''}`}
                            onClick={() => {
                              setActiveSpecimenId(sp.id);
                              if (hasNone) { setShowAddSynopticModal(true); }
                              else if (!hasMulti) { setActiveReportInstanceId(reports[0].instanceId); }
                            }}
                            style={{
                              padding: '3px 12px', fontSize: 12, fontWeight: 600, flexShrink: 0,
                              borderRadius: 20,
                              border: `1.5px solid ${pillBorder}`,
                              background: pillBg, color: pillColor,
                              cursor: 'pointer', transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', gap: 4,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ color: labelColor, fontWeight: 800 }}>{sp.label}:</span>
                            <span>{sp.description}</span>
                            {hasNone && <span style={{ fontSize: 10 }}>⚠</span>}
                          </button>

                          {/* Dropdown — includes specimen letter for context */}
                          {hasMulti && (
                            <select
                              className="ps-specimen-pill"
                              value={isActive ? activeReportInstanceId : reports[0].instanceId}
                              onChange={e => {
                                setActiveSpecimenId(sp.id);
                                setActiveReportInstanceId(e.target.value);
                              }}
                              style={{
                                height: 24, fontSize: 11, fontWeight: 600,
                                maxWidth: 160, flexShrink: 0,
                                background: 'rgba(8,145,178,0.15)',
                                color: '#7dd3fc',
                                border: '1.5px solid #0891B2',
                                borderRadius: 20,
                                padding: '0 8px',
                                cursor: 'pointer', outline: 'none',
                              }}
                            >
                              {reports.map((r: any, i: number) => (
                                <option key={r.instanceId} value={r.instanceId}>
                                  {sp.label}: {r.templateId ? r.templateId.replace(/-/g, ' ') : `Report ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Panels */}
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <LeftReportPanel caseData={caseData} highlightText={highlightText ?? undefined} />
                </div>

                {/* Collapse button on the divider */}
                <div style={{ position: 'relative', width: 0, zIndex: 200, display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => setPanelMode(null)}
                    title="Exit full-screen (Esc)"
                    style={{
                      position: 'absolute', left: -16,
                      width: 32, height: 32, borderRadius: '50%',
                      background: '#0891B2', border: '2px solid rgba(255,255,255,0.2)',
                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.8)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0e7490')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0891B2')}
                  >⤡</button>
                </div>

                <div style={{ flex: 1, minWidth: 0, background: 'rgba(15,23,42,0.95)', overflowY: 'auto' }}>
                  <RightSynopticPanel
                    caseData={caseData}
                    activeTab={activeTab}
                    activeReportInstanceId={activeReportInstanceId}
                    onReportInstanceChange={setActiveReportInstanceId}
                    onCaseUpdate={(updated) => { setCaseData(updated); setHasUnsavedData(true); }}
                    scrollToField={alertFieldId}
                    onScrollComplete={() => setAlertFieldId(null)}
                    onHighlight={setHighlightText}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bottom action bar */}
        <BottomActionBar
          caseData={caseData}
          isDirty={hasUnsavedData}
          onSaveDraft={() => { setHasUnsavedData(false); showToast('Draft saved'); }}
          onSaveAndNext={() => { setHasUnsavedData(false); showToast('Draft saved'); navigateToCase('next'); }}
          onFinalize={() => {
            if (!synopticPanelRef.current) { setPreFinaliseAndNext(false); setShowPreFinalise(true); return; }
            const missing = synopticPanelRef.current.validateRequired();
            if (missing.length > 0) { setMissingFields(missing); setShowMissingWarning(true); return; }
            const uncertain = synopticPanelRef.current.getUncertainRequiredFields();
            if (uncertain.length > 0) { setReviewFields(uncertain); setFinalizeAndNextPending(false); setShowAiReview(true); return; }
            // Check for deferred synoptics — warn but allow
            const deferredReports = (caseData?.synopticReports ?? []).filter((r: any) => r.status === 'deferred');
            if (deferredReports.length > 0) {
              const names = deferredReports.map((r: any) => r.templateName).join(', ');
              if (!window.confirm(`${deferredReports.length} synoptic report(s) are marked deferred and will not be included in this sign-out:

${names}

These will require an addendum when ancillary results are available.

Proceed with sign-out?`)) return;
            }
            setPreFinaliseAndNext(false);
            setShowPreFinalise(true);
          }}
          onFinalizeAndNext={() => {
            if (!synopticPanelRef.current) { setPreFinaliseAndNext(true); setShowPreFinalise(true); return; }
            const missing = synopticPanelRef.current.validateRequired();
            if (missing.length > 0) { setMissingFields(missing); setShowMissingWarning(true); return; }
            const uncertain = synopticPanelRef.current.getUncertainRequiredFields();
            if (uncertain.length > 0) { setReviewFields(uncertain); setFinalizeAndNextPending(true); setShowAiReview(true); return; }
            setPreFinaliseAndNext(true);
            setShowPreFinalise(true);
          }}
          onSignOut={() => setShowSignOutModal(true)}
          onAddendumAmendment={() => { setAmendmentMode('addendum'); setShowAmendmentModal(true); }}
          onHistory={() => setIsSimilarCasesOpen(true)}
          onFlags={() => openFlagManager(caseData)}
          onDelegate={() => setShowDelegateModal(true)}
          onTeam={() => setShowTeamModal(true)}
          onCodes={() => setShowCodesModal(true)}
          onNextCase={() => { if (hasUnsavedData) { setPendingNavigation('next'); } else { navigateToCase('next'); } }}
          onPreviousCase={() => { if (hasUnsavedData) { setPendingNavigation('prev'); } else { navigateToCase('prev'); } }}
        />
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}

      <CaseSignOutModal
        show={showSignOutModal}
        overlayStyle={overlayStyle}
        accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
        signOutUser={signOutUser}
        signOutPassword={signOutPassword}
        signOutError={signOutError}
        onClose={() => setShowSignOutModal(false)}
        onUserChange={setSignOutUser}
        onPasswordChange={setSignOutPassword}
        onConfirm={handleSignOutConfirm}
      />

      {/* AI Review Mode — triage uncertain fields before finalize */}
      {showAiReview && (
        <AiReviewModal
          fields={reviewFields}
          finalizeAndNext={finalizeAndNextPending}
          onConfirm={(fieldId: string) => synopticPanelRef.current?.setFieldVerification(fieldId, 'verified')}
          onOverride={(fieldId: string) => synopticPanelRef.current?.setFieldVerification(fieldId, 'disputed')}
          onSkip={(_fieldId: string) => { /* stays unverified — auto-confirmed at sweep */ }}
          onComplete={(summary) => {
            console.info('[PathScribe] AI review summary:', summary);
            setShowAiReview(false);
            // Open pre-finalisation review (not the old password modal)
            setShowPreFinalise(true);
          }}
          onCancel={() => setShowAiReview(false)}
        />
      )}

      {/* Missing Required Fields Warning */}
      {showMissingWarning && (
        <div
          onClick={() => setShowMissingWarning(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 520, background: '#0f172a', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', overflow: 'hidden' }}
          >
            <div style={{ padding: '18px 24px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Cannot Finalise</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Required Fields Incomplete</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
                The following required fields must be completed before this report can be finalised:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                {missingFields.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8 }}>
                    <span style={{ fontSize: 14, color: '#f87171', flexShrink: 0 }}>✗</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5' }}>{f.fieldLabel}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{f.sectionTitle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{missingFields.length} field{missingFields.length !== 1 ? 's' : ''} need attention</span>
              <button
                onClick={() => setShowMissingWarning(false)}
                style={{ padding: '9px 20px', borderRadius: 8, background: '#0891B2', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Return and Fix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Countersign banner ───────────────────────────────── */}
      {(caseData as any)?.requiresCountersign && caseData?.status === 'pending-countersign' && (
        <div style={{
          position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 9000,
          background: 'rgba(245,158,11,0.12)', borderTop: '2px solid #f59e0b',
          padding: '12px 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: 14 }}>
              ⏳ Countersignature required
            </span>
            <span style={{ color: '#94a3b8', fontSize: 13, marginLeft: 12 }}>
              This report has been finalised and is pending your review and countersignature before LIS transmission.
            </span>
          </div>
          <button
            onClick={() => { setShowCountersignModal(true); setCountersignPassword(''); setCountersignError(''); }}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', border: '1.5px solid #f59e0b',
              background: 'rgba(245,158,11,0.15)', color: '#fbbf24', flexShrink: 0,
            }}
          >
            Countersign Report
          </button>
        </div>
      )}

      {/* ── Countersign modal ─────────────────────────────────── */}
      {showCountersignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>
              Countersign Report
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>
              You are countersigning <strong style={{ color: '#f1f5f9' }}>{caseData?.accession?.fullAccession}</strong> —&nbsp;
              {caseData?.patient?.firstName} {caseData?.patient?.lastName}.
              This confirms your clinical review and authorises LIS transmission.
            </p>
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#fbbf24' }}>
              ⚠ Countersignature constitutes a legal attestation. Ensure you have reviewed the complete report before proceeding.
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Password — confirm your identity (21 CFR Part 11)
              </label>
              <input
                type="password"
                value={countersignPassword}
                onChange={e => { setCountersignPassword(e.target.value); setCountersignError(''); }}
                placeholder="Enter your password"
                autoFocus
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
                  border: `1px solid ${countersignError ? '#ef4444' : '#334155'}`,
                  background: '#0f172a', color: '#f1f5f9', boxSizing: 'border-box' as const, outline: 'none',
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleCountersignConfirm(); }}
              />
              {countersignError && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>{countersignError}</p>}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCountersignModal(false)}
                style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid #334155', background: 'transparent', color: '#94a3b8' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCountersignConfirm}
                style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: '#f59e0b', color: '#000' }}
              >
                Countersign & Transmit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pre-finalisation review modal ─────────────────────── */}
      <PreFinalisationModal
        show={showPreFinalise}
        caseAccession={caseData?.accession?.fullAccession ?? ''}
        patientName={`${caseData?.patient?.firstName ?? ''} ${caseData?.patient?.lastName ?? ''}`}
        reportingMode={(caseData as any)?.reportingMode === 'pathscribe' ? 'pathscribe' : 'copilot'}
        synoptics={(caseData?.synopticReports ?? []).map((r: any) => {
          const specimen = caseData?.specimens?.find((s: any) => s.id === r.specimenId);
          const answered = Object.entries(r.answers ?? {}).filter(([, v]) =>
            v !== '' && v !== null && v !== undefined &&
            !(Array.isArray(v) && (v as any[]).length === 0)
          );
          return {
            instanceId:    r.instanceId,
            templateName:  r.templateName,
            specimenId:    r.specimenId,
            specimenLabel: specimen?.label ?? '?',
            specimenDesc:  specimen?.description ?? '',
            answers:       r.answers ?? {},
            fieldLabels:   {},
            fieldOrder:    Object.keys(r.answers ?? {}),
            answeredCount: answered.length,
            totalCount:    Object.keys(r.answers ?? {}).length,
            status:        r.status,
          };
        })}
        userId={user?.id ?? ''}
        userDisplayName={user?.name ?? ''}
        userCredentials={(user as any)?.credentials ?? ''}
        finalizeAndNext={preFinaliseAndNext}
        onConfirm={(_ordered, _excluded) => {
          setShowPreFinalise(false);
          handleFinalizeConfirm();
        }}
        onCancel={() => setShowPreFinalise(false)}
      />

      {/* ── Biometric setup wizard (first login) ──────────────── */}
      {showBiometricWizard && user && (
        <BiometricSetupWizard
          userId={user.id}
          userName={user.name}
          onComplete={() => setShowBiometricWizard(false)}
          onDismiss={() => setShowBiometricWizard(false)}
        />
      )}

      <FinalizeSynopticModal
        show={showFinalizeModal}
        overlayStyle={overlayStyle}
        activeSynoptic={null}
        finalizePassword={finalizePassword}
        finalizeError={finalizeError}
        finalizeAndNext={false}
        onClose={() => setShowFinalizeModal(false)}
        onPasswordChange={setFinalizePassword}
        onConfirm={handleFinalizeConfirm}
      />

      <AmendmentModal
        show={showAmendmentModal}
        overlayStyle={overlayStyle}
        amendmentMode={amendmentMode}
        amendmentText={amendmentText}
        activeSynopticTitle={caseData?.accession?.fullAccession ?? 'Case'}
        onModeChange={setAmendmentMode}
        onTextChange={setAmendmentText}
        onClose={() => { setShowAmendmentModal(false); setDeferredAmendmentContext(null); }}
        onSubmit={handleAmendmentSubmit}
        triggeredBySynopticTitle={deferredAmendmentContext?.title}
        prefillText={deferredAmendmentContext?.prefill}
      />

      <LogoutWarningModal
        show={showLogoutModal}
        overlayStyle={overlayStyle}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => { setShowLogoutModal(false); handleLogout(); }}
      />

      {/* Add Synoptic Modal */}
      {showAddSynopticModal && (
        <AddSynopticModal
          caseData={caseData}
          availableProtocols={availableProtocols}
          onClose={() => setShowAddSynopticModal(false)}
          onAdd={(newInstances, updatedCase) => {
            setCaseData(updatedCase);
            setHasUnsavedData(true);
            setActiveReportInstanceId(newInstances[0].instanceId);
            setActiveSpecimenId(newInstances[0].specimenId);
          }}
        />
      )}

      {/* Case Comment Modal */}
      {showCaseCommentModal && (
        <CaseCommentModal
          accession={caseData?.accession?.fullAccession ?? caseData?.accession?.accessionNumber ?? ''}
          caseComments={{ attending: caseCommentAttending }}
          onChangeAttending={(html) => {
            setCaseCommentAttending(html);
            setHasCaseComment(!!html && html !== '<p></p>');
            if (caseData?.id) localStorage.setItem(`ps_case_comment_${caseData.id}`, html);
          }}
          onClose={() => setShowCaseCommentModal(false)}
        />
      )}

      {/* Specimen / Report Comment Modal */}
      {showSpecimenCommentModal && activeSpecimenCommentId && (
        <ReportCommentModal
          specimenName={
            caseData?.specimens?.find(s => s.id === activeSpecimenCommentId)
              ? `Specimen ${caseData.specimens.find(s => s.id === activeSpecimenCommentId)!.label} › ${caseData.specimens.find(s => s.id === activeSpecimenCommentId)!.description}`
              : 'Specimen'
          }
          specimenId={activeSpecimenCommentId}
          content={specimenComments[activeSpecimenCommentId] ?? ''}
          isFinalized={false}
          onChange={(html) => {
            setSpecimenComments(prev => ({ ...prev, [activeSpecimenCommentId]: html }));
          }}
          onClose={() => setShowSpecimenCommentModal(false)}
        />
      )}

      {/* History — Similar Cases Panel */}
      {isSimilarCasesOpen && caseData && (
        <PatientHistoryModal
          patientName={`${caseData.patient.lastName}, ${caseData.patient.firstName}`}
          mrn={caseData.patient.mrn ?? ''}
          onClose={() => setIsSimilarCasesOpen(false)}
        />
      )}

      {/* Codes Modal */}
      {showCodesModal && caseData && (
        <AddCodeModal
          existingCodes={(caseData as any).codes ?? []}
          allSpecimens={(caseData.specimens ?? []).map((sp, i) => ({
            index: i,
            id: i + 1,
            name: `${sp.label}: ${sp.description ?? ''}`,
          }))}
          activeSpecimenIndex={0}
          caseText={{
            gross:       caseData.diagnostic?.grossDescription ?? '',
            microscopic: caseData.diagnostic?.microscopicDescription ?? '',
            ancillary:   caseData.diagnostic?.ancillaryStudies ?? '',
          }}
          synopticAnswers={
            (activeReportInstanceId
              ? caseData.synopticReports?.find(r => r.instanceId === activeReportInstanceId)?.answers
              : caseData.synopticReports?.[0]?.answers
            ) ?? caseData.synopticAnswers ?? {}
          }
          templateName={
            (activeReportInstanceId
              ? caseData.synopticReports?.find(r => r.instanceId === activeReportInstanceId)?.templateName
              : caseData.synopticReports?.[0]?.templateName
            ) ?? ''
          }
          narrativeText={
            // Pass narrative if Orchestrator mode generated one (stored on the report instance)
            (caseData.synopticReports?.find(r =>
              r.instanceId === activeReportInstanceId
            ) as any)?.narrativeContent ?? undefined
          }
          onAddToSpecimens={(codes, _specimenIndices) => {
            const newIcd    = codes.filter(c => c.system === 'ICD').map(c => c.code);
            const newSnomed = codes.filter(c => c.system === 'SNOMED').map(c => c.code);
            setCaseData(prev => prev ? {
              ...prev,
              coding: {
                icd10:  [...((prev as any).coding?.icd10  ?? []), ...newIcd],
                snomed: [...((prev as any).coding?.snomed ?? []), ...newSnomed],
              },
            } : prev);
            setShowCodesModal(false);
          }}
          onClose={() => setShowCodesModal(false)}
          originHospitalId={caseData?.originHospitalId}
        />
      )}

      {/* Flag Manager Modal */}
      {showFlagManager && flagCaseData && (
        <FlagManagerModal
          key={`flag-modal-${flagCaseData.id}`}
          caseData={{
            ...flagCaseData,
            accession: (flagCaseData.accession as any)?.fullAccession ?? (flagCaseData.accession as any)?.accessionNumber ?? flagCaseData.accession ?? '',
            flags: (flagCaseData as any).flags ?? [],
          } as any}
          flagDefinitions={flagDefinitions}
          onApplyFlags={onApplyFlags}
          onRemoveFlag={onRemoveFlag}
          onClose={() => {
            if (flagCaseData && caseData) {
              setCaseData(prev => prev ? {
                ...prev,
                caseFlags: (flagCaseData as any).flags ?? [],
                specimens: prev.specimens?.map(sp => {
                  const updated = flagCaseData.specimens?.find((s: any) => s.id === sp.id);
                  return updated ? { ...sp, specimenFlags: (updated as any).flags ?? [] } : sp;
                }),
              } : prev);
            }
            setShowFlagManager(false);
          }}
        />
      )}

      {/* Case Team Modal */}
      {showTeamModal && caseData && (
        <CaseTeamModal
          caseData={caseData}
          onClose={() => setShowTeamModal(false)}
          onUpdated={(updated) => { setCaseData(updated); }}
          onDelegate={() => { setShowTeamModal(false); setDelegateReturnTo('team'); setShowDelegateModal(true); }}
        />
      )}

      {/* Delegate Modal */}
      {showDelegateModal && (
        <DelegateModal
          isOpen={showDelegateModal}
          onClose={() => {
            setShowDelegateModal(false);
            if (delegateReturnTo === 'team') {
              setShowTeamModal(true);
              setDelegateReturnTo(null);
            }
          }}
          registry={mockActionRegistryService}
          caseId={caseId}
          currentUserId="PATH-001"
          onDelegated={() => {
            setShowDelegateModal(false);
            showToast('Case delegated successfully');
            if (delegateReturnTo === 'team') {
              setShowTeamModal(true);
              setDelegateReturnTo(null);
            }
          }}
          synopticInstances={(caseData?.synopticReports ?? []).map(r => ({
            instanceId: r.instanceId,
            specimenDescription: caseData?.specimens?.find(s => s.id === r.specimenId)?.description ?? r.specimenId,
            templateName: r.templateName,
          }))}
        />
      )}

      <UnsavedWarningModal
        show={!!pendingNavigation || !!pendingPath}
        overlayStyle={overlayStyle}
        onCancel={() => {
          setPendingNavigation(null);
          cancelContextNavigate();
        }}
        onConfirm={() => {
          setHasUnsavedData(false);
          // Handle context-level navigation (AppShell nav, breadcrumbs)
          if (pendingPath) {
            confirmContextNavigate();
          }
          // Handle local navigation (next/prev case)
          const dest = pendingNavigation;
          setPendingNavigation(null);
          if (dest === 'next') navigateToCase('next');
          else if (dest === 'prev') navigateToCase('prev');
          else if (dest) navigate(dest);
        }}
      />
    </div>
  );
};

export default SynopticReportPage;

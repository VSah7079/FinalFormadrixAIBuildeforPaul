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
import { mockActionRegistryService } from '../../services/actionRegistry/mockActionRegistryService';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import DelegateModal      from '../Synoptic/Delegate';
import NavBar             from '@/components/NavBar/NavBar';
import HeaderBar          from './components/HeaderBar';
import Sidebar            from './components/Sidebar';
import LeftReportPanel    from './components/LeftReportPanel';
import RightSynopticPanel from './components/RightSynopticPanel';
import BottomActionBar    from './components/BottomActionBar';

import AmendmentModal        from './modals/AmendmentModal';
import { CaseCommentModal }   from '../Synoptic/Comments/CaseCommentModal';
import CasePanel              from '../../components/CasePanel/CasePanel';
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

import { mockCaseService, getSimilarCases, getPatientHistory } from '@/services/cases/mockCaseService';
import { useLogout } from '@/hooks/useLogout';
import '@/pathscribe.css';

import type { Case, SynopticReportInstance } from '@/types/case/Case';

import { userService } from '@/services'; // Single source of truth
import type { StaffUser } from '@/services';

// ─── Shared overlay style (passed to all modals) ──────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.6)',
  zIndex: 1000,
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
  const [hasUnsavedData]                = useState(false);
  const [activeSpecimenId, setActiveSpecimenId] = useState<string>('');
  const [showCaseCommentModal, setShowCaseCommentModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
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
  const [selectedSpecimenIds, setSelectedSpecimenIds] = useState<string[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [protocolSearch, setProtocolSearch] = useState('');
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false);
  const [learnPairing, setLearnPairing] = useState(true);
  const [availableProtocols, setAvailableProtocols] = useState<{id:string;name:string}[]>([]);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [allStaff, setAllStaff] = useState<StaffUser[]>([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const result = await userService.getAll();
        if (result.ok) {
          // Save the raw data to match the StaffUser[] type
          setAllStaff(result.data);
        }
      } catch (err) {
        console.error("Failed to load staff:", err);
      }
    };
    fetchStaff();
  }, []);

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
    flagCaseData, setFlagCaseData,
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

  // ── Finalize confirm ───────────────────────────────────────
  const handleFinalizeConfirm = useCallback(() => {
    setShowFinalizeModal(false);
    showToast('Report finalized');
  }, [setShowFinalizeModal, showToast]);

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
                caseData={caseData}
                activeTab={activeTab}
                activeReportInstanceId={activeReportInstanceId}
                onReportInstanceChange={setActiveReportInstanceId}
                onCaseUpdate={setCaseData}
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
                    onCaseUpdate={setCaseData}
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
          onSaveDraft={() => showToast('Draft saved')}
          onSaveAndNext={() => { showToast('Draft saved'); navigateToCase('next'); }}
          onFinalize={() => setShowFinalizeModal(true)}
          onFinalizeAndNext={() => setShowFinalizeModal(true)}
          onSignOut={() => setShowSignOutModal(true)}
          onAddendumAmendment={() => { setAmendmentMode('addendum'); setShowAmendmentModal(true); }}
          onDelegate={() => setShowDelegateModal(true)}
          onHistory={() => setIsSimilarCasesOpen(true)}
          onFlags={() => openFlagManager(caseData)}
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
        onClose={() => setShowAmendmentModal(false)}
        onSubmit={handleAmendmentSubmit}
      />

      <LogoutWarningModal
        show={showLogoutModal}
        overlayStyle={overlayStyle}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={() => { setShowLogoutModal(false); handleLogout(); }}
      />

      {showDelegateModal && (
  <DelegateModal
    isOpen={showDelegateModal}
    registry={mockActionRegistryService}
    onClose={() => setShowDelegateModal(false)}
  />
)}
{/* Add Synoptic Modal */}
      {showAddSynopticModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowAddSynopticModal(false)}>
          <div style={{ width: '500px', backgroundColor: '#111', borderRadius: '20px', padding: '40px', border: '1px solid rgba(8,145,178,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0891B2', fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Add Synoptic Report</div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Select Specimen(s)</div>
              {(caseData?.specimens ?? []).map(spec => (
                <label key={spec.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: selectedSpecimenIds.includes(spec.id) ? 'rgba(8,145,178,0.1)' : 'rgba(255,255,255,0.03)', border: `2px solid ${selectedSpecimenIds.includes(spec.id) ? '#0891B2' : 'rgba(255,255,255,0.1)'}`, marginBottom: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedSpecimenIds.includes(spec.id)}
                    onChange={e => setSelectedSpecimenIds(prev => e.target.checked ? [...prev, spec.id] : prev.filter(id => id !== spec.id))}
                    style={{ width: '18px', height: '18px' }} />
                  <div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>Specimen {spec.label}</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>{spec.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Select Protocol</div>
              <input type="text"
                value={selectedProtocol ? (availableProtocols.find(p => p.id === selectedProtocol)?.name ?? '') : protocolSearch}
                onChange={e => { setProtocolSearch(e.target.value); setSelectedProtocol(''); setShowProtocolDropdown(true); }}
                onFocus={() => setShowProtocolDropdown(true)}
                placeholder="🔍 Search protocols…"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: `2px solid ${selectedProtocol ? '#0891B2' : 'rgba(255,255,255,0.1)'}`, color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              {showProtocolDropdown && !selectedProtocol && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', maxHeight: '220px', overflowY: 'auto', background: '#1a1a1a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', zIndex: 100 }}>
                  {availableProtocols
                    .filter(p => !protocolSearch.trim() || p.name.toLowerCase().includes(protocolSearch.toLowerCase()))
                    .map(p => (
                      <div key={p.id}
                        onClick={() => { setSelectedProtocol(p.id); setProtocolSearch(''); setShowProtocolDropdown(false); }}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {p.name}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* AI Learning Toggle - Added this section */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={learnPairing} 
                  onChange={(e) => setLearnPairing(e.target.checked)} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                  🤖 AI: Learn this specimen/protocol pairing
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowAddSynopticModal(false); setSelectedSpecimenIds([]); setSelectedProtocol(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                disabled={!selectedSpecimenIds.length || !selectedProtocol}
                onClick={async () => {
                  if (!caseData || !selectedProtocol || !selectedSpecimenIds.length) return;

                  if (learnPairing) {
                    console.log(`AI Training: Associating protocol ${selectedProtocol} with these specimens.`);
                  }

                  const now = new Date().toISOString();
                  const newInstances: SynopticReportInstance[] = selectedSpecimenIds.map(specId => ({
                    instanceId: `${specId}_${selectedProtocol}_${Date.now()}`,
                    specimenId: specId,
                    templateId: selectedProtocol,
                    templateName: availableProtocols.find(p => p.id === selectedProtocol)?.name ?? '',
                    answers: {},
                    status: 'draft',
                    createdAt: now,
                    updatedAt: now,
                  }));

                  const updated: Case = { 
                    ...caseData, 
                    synopticReports: [...(caseData.synopticReports ?? []), ...newInstances] 
                  };
                  
                  setCaseData(updated);
                  if (newInstances.length > 0) {
                    setActiveReportInstanceId(newInstances[0].instanceId);
                  }
                  setShowAddSynopticModal(false);
                }}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '10px', 
                  background: (!selectedSpecimenIds.length || !selectedProtocol) ? '#334155' : '#0891B2', 
                  color: '#fff', 
                  fontWeight: 600, 
                  cursor: (!selectedSpecimenIds.length || !selectedProtocol) ? 'not-allowed' : 'pointer',
                  border: 'none'
                }}
              >
                Add Report
              </button>
            </div>
          </div>
        </div>
      )}
      {showCaseCommentModal && (
        <CaseCommentModal
          accession={caseData?.accession?.fullAccession ?? ''}
          caseComments={{ attending: caseCommentAttending }}
          onChangeAttending={(html) => {
            setCaseCommentAttending(html);
            setHasCaseComment(!!html && html !== '<p></p>');
          }}
          onClose={() => setShowCaseCommentModal(false)}
        />
      )}

      {showSpecimenCommentModal && activeSpecimenCommentId && (
<ReportCommentModal
  specimenId={activeSpecimenCommentId}
  // Added these two missing props
  specimenName={caseData?.specimens?.find(s => s.id === activeSpecimenCommentId)?.description || 'Specimen'}
  isFinalized={caseData?.status === 'finalized'} 
  content={specimenComments[activeSpecimenCommentId] ?? ''}
  onChange={(html) => setSpecimenComments(prev => ({ ...prev, [activeSpecimenCommentId]: html }))}
  onClose={() => setShowSpecimenCommentModal(false)}
/>
      )}

      {isSimilarCasesOpen && (
        <CasePanel
  isOpen={isSimilarCasesOpen}
  onClose={() => setIsSimilarCasesOpen(false)}
  patientName={caseData?.patient ? `${caseData.patient.lastName}, ${caseData.patient.firstName}` : 'Unknown'}
  mrn={caseData?.patient?.mrn ?? ''}
  patientHistory={getPatientHistory(caseId ?? '')}
  similarCases={getSimilarCases(caseId ?? '')}
  // Added this missing required prop
  onRefineSearch={() => navigate('/search')}
/>
      )}

      {showCodesModal && caseData && (
        <AddCodeModal
          existingCodes={(caseData as any).codes ?? []}
          allSpecimens={(caseData.specimens ?? []).map((sp, i) => ({ index: i, id: i + 1, name: sp.label }))}
          activeSpecimenIndex={0}
          caseText={{ gross: '', microscopic: '', ancillary: '' }}
          synopticAnswers={{}}
          templateName=""
          onAddToSpecimens={(codes, _specimenIndices) => {
            setShowCodesModal(false);
            showToast('Codes added');
          }}
          onClose={() => setShowCodesModal(false)}
        />
      )}

      {showFlagManager && flagCaseData && (
        <FlagManagerModal
          caseData={flagCaseData as any}
          flagDefinitions={flagDefinitions}
          onApplyFlags={onApplyFlags}
          onRemoveFlag={onRemoveFlag}
          onClose={() => setShowFlagManager(false)}
        />
      )}

      <UnsavedWarningModal
        show={!!pendingNavigation}
        overlayStyle={overlayStyle}
        onCancel={() => setPendingNavigation(null)}
        onConfirm={() => {
          const dest = pendingNavigation;
          setPendingNavigation(null);
          if (dest) navigate(dest);
        }}
      />
    </div>
  );
};

export default SynopticReportPage;
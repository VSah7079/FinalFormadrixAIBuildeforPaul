import React, { useState, useEffect } from 'react';
import '../../../pathscribe.css';
import { IActionRegistryService } from '../../../services/actionRegistry/IActionRegistryService';
import { mockStaffDirectoryService } from '../../../services/staffDirectory/mockStaffDirectoryService';
import type { StaffMember } from '../../../services/staffDirectory/IStaffDirectoryService';
import { useSubspecialties } from '../../../contexts/useSubspecialties';
import { mockDelegationTypeService } from '../../../services/delegationTypes/mockDelegationTypeService';
import { loadDelegationTypes } from '../../../constants/delegationTypes';
import { delegateCase } from '../../../services/cases/mockCaseService';

interface Pool {
  id: string;
  name: string;
  subspecialty: string;
  memberCount: number;
}

interface SynopticOption {
  instanceId: string;
  specimenDescription: string;
  templateName: string;
}

interface DelegateModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: IActionRegistryService;
  caseId?: string;
  currentUserId?: string;
  onDelegated?: () => void;
  synopticInstances?: SynopticOption[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Available: { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  Busy:      { bg: 'rgba(251,146,60,0.12)',   color: '#fb923c' },
  Active:    { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
};

export const DelegateModal: React.FC<DelegateModalProps> = ({ isOpen, onClose, registry, caseId, currentUserId = 'PATH-001', onDelegated, synopticInstances = [] }) => {
  const { subspecialties } = useSubspecialties();
  const [searchTerm,         setSearchTerm]         = useState('');
  const [selectedId,         setSelectedId]         = useState<string | null>(null);
  const [tab,                setTab]                = useState<'individuals' | 'pools'>('individuals');
  const [confirming,         setConfirming]         = useState(false);
  const [delegationType,     setDelegationType]     = useState<string | null>(null);
  const [note,               setNote]               = useState('');
  const [step,               setStep]               = useState<'type' | 'recipient'>('type');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [delegationTypes, setDelegationTypes] = useState(() => loadDelegationTypes().filter((d: any) => d.active));
  const [staff,      setStaff]      = useState<StaffMember[]>([]);
  // Pools come directly from the subspecialties context (same source as Config UI)
  const contextPools: Pool[] = subspecialties
    .filter(s => s.active)
    .map(s => ({
      id: s.id,
      name: s.name,
      subspecialty: s.name,
      memberCount: s.userIds?.length ?? 0,
    }));
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm(''); setSelectedId(null); setConfirming(false); setDelegationType(null); setNote(''); setStep('type'); setSelectedInstanceId(null);
      // Load real data from services
      setLoading(true);
      Promise.all([
        mockStaffDirectoryService.listIndividuals(),
        mockDelegationTypeService.getActive(),
      ]).then(([individuals, typesResult]) => {
        setStaff(individuals);
        if (typesResult.ok) setDelegationTypes(typesResult.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = registry.onAction((actionId) => {
      if (actionId === 'CLOSE_MODAL' || actionId === 'NAVIGATE_BACK') onClose();
    });
    return () => unsubscribe();
  }, [isOpen, registry, onClose]);

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subspecialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPools = contextPools.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.subspecialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStaff = staff.find(s => s.id === selectedId);
  const selectedPool  = contextPools.find(p => p.id === selectedId);
  const selectedLabel = selectedStaff?.name ?? selectedPool?.name ?? null;

  const selectedDelegationType = delegationTypes.find(d => d.id === delegationType);

  const handleConfirm = async () => {
    if (!selectedLabel || !delegationType) return;
    setConfirming(true);
    try {
      if (caseId) {
        if (delegationType === 'SYNOPTIC_ASSIGN' && selectedInstanceId) {
          const { assignSynoptic } = await import('../../../services/cases/mockCaseService');
          await assignSynoptic(
            caseId, selectedInstanceId,
            selectedId ?? '', selectedLabel ?? '',
            currentUserId, true, note || undefined,
          );
        } else {
          const isPool = selectedPool !== undefined;
          await delegateCase(
            caseId, currentUserId, delegationType,
            isPool ? undefined   : (selectedId ?? undefined),
            isPool ? (selectedId ?? undefined) : undefined,
            isPool ? selectedLabel : undefined,
            note || undefined,
          );
        }
      }
      onDelegated?.();
      onClose();
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fm-overlay" onClick={onClose}>
      <div className="ps-research-modal fm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ps-research-header">
          <div>
            <div className="fm-eyebrow">Case Action · Step {step === 'type' ? '1 of 2' : '2 of 2'}</div>
            <div className="fm-title-row">
              <span style={{ fontSize: 20 }}>👤</span>
              <h2 className="fm-title">{step === 'type' ? 'Delegation Type' : 'Select Recipient'}</h2>
              {selectedDelegationType && step === 'recipient' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: 'rgba(8,145,178,0.12)', color: '#38bdf8', border: '1px solid rgba(8,145,178,0.2)' }}>
                  {selectedDelegationType.label}
                </span>
              )}
            </div>
          </div>
          <button className="ps-research-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Step 1 — Delegation Type */}
        {step === 'type' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Select the reason for delegation — this is recorded in the audit log and shown in My Contributions.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {delegationTypes.map(dt => {
                const isSelected = delegationType === dt.id;
                return (
                  <button
                    key={dt.id}
                    onClick={() => { setDelegationType(dt.id); setStep('recipient'); }}
                    className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span
                      className="fm-code-chip"
                      title={dt.id}
                      style={{ width: 76, minWidth: 76, flexShrink: 0, textAlign: 'center', fontSize: 9, letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: isSelected ? dt.color + '22' : undefined, color: isSelected ? dt.color : undefined }}
                    >
                      {dt.id.replace('_', ' ')}
                    </span>
                    <div className="fm-flag-info">
                      <div className="fm-flag-name-row">
                        <span className="fm-flag-name">{dt.label}</span>
                        {dt.transfersOwnership && (
                          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>transfers ownership</span>
                        )}
                        {dt.cptHint && (
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>CPT {dt.cptHint}</span>
                        )}
                      </div>
                      <div className="fm-flag-desc">{dt.description}</div>
                    </div>
                    {isSelected
                      ? <span className="fm-applied-text">✓ Selected</span>
                      : <span className="fm-apply-btn">Select</span>
                    }
                  </button>
                );
              })}

              {/* Synoptic picker — shown when SYNOPTIC_ASSIGN is selected */}
              {delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Select Synoptic to Assign
                  </div>
                  {synopticInstances.map(inst => {
                    const isSel = selectedInstanceId === inst.instanceId;
                    return (
                      <div
                        key={inst.instanceId}
                        className={'fm-flag-card' + (isSel ? ' applied' : '')}
                        onClick={() => setSelectedInstanceId(isSel ? null : inst.instanceId)}
                        style={{ cursor: 'pointer', marginBottom: 4 }}
                      >
                        <span className="fm-code-chip" style={{ width: 80, fontSize: 10, textAlign: 'center' }}>SYNOPTIC</span>
                        <div className="fm-flag-info">
                          <span className="fm-flag-name">{inst.specimenDescription}</span>
                          <span className="fm-flag-desc">{inst.templateName}</span>
                        </div>
                        {isSel
                          ? <span className="fm-applied-text">✓ Selected</span>
                          : <span className="fm-apply-btn">Select</span>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Recipient selection (existing body) */}
        {step === 'recipient' && (
          <div className="fm-body">
          {/* Left panel — tab switcher */}
          <div className="fm-left">
            <div className="fm-section-label" style={{ padding: '0 16px', marginBottom: 8 }}>Delegate to</div>

            <button
              className={'fm-target-row' + (tab === 'individuals' ? ' active' : '')}
              onClick={() => { setTab('individuals'); setSelectedId(null); }}
            >
              <span style={{ fontSize: 15 }}>👤</span>
              <span style={{ flex: 1 }}>Individual</span>
            </button>

            <button
              className={'fm-target-row' + (tab === 'pools' ? ' active' : '')}
              onClick={() => { setTab('pools'); setSelectedId(null); }}
            >
              <span style={{ fontSize: 15 }}>👥</span>
              <span style={{ flex: 1 }}>Pool / Queue</span>
            </button>

            <div className="fm-divider" />

            {/* Selected summary */}
            {selectedLabel && (
              <div style={{ padding: '12px 16px' }}>
                <div className="fm-section-label" style={{ marginBottom: 6 }}>Selected</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#38bdf8' }}>{selectedLabel}</div>
                {selectedStaff && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{selectedStaff.role}</div>
                )}
              </div>
            )}
          </div>

          {/* Right panel — search + list */}
          <div className="fm-right">

            {/* Search */}
            <div style={{ padding: '14px 16px 10px' }}>
              <div className="fm-search-wrap">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#64748b', flexShrink: 0 }}>
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  autoFocus
                  className="fm-search-input"
                  type="text"
                  placeholder={tab === 'individuals' ? 'Search by name or role…' : 'Search pools…'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="fm-search-clear" onClick={() => setSearchTerm('')}>✕</button>
                )}
              </div>
            </div>

            {/* Column header */}
            <div style={{ display: 'flex', gap: 8, padding: '4px 16px 8px', borderBottom: '1px solid rgba(30,41,59,0.9)' }}>
              <span className="fm-col-header" style={{ width: 120 }}>NAME</span>
              <span className="fm-col-header" style={{ flex: 1 }}>
                {tab === 'individuals' ? 'ROLE · STATUS' : 'MEMBERS'}
              </span>
              <span className="fm-col-header" style={{ width: 80, textAlign: 'right' }}>ACTION</span>
            </div>

            {/* List */}
            <div className="fm-flag-list">
              {loading && (
                <div className="fm-empty">
                  <div className="fm-empty-hint">Loading staff…</div>
                </div>
              )}
              {tab === 'individuals' && !loading && (
                filteredStaff.length === 0
                  ? (
                    <div className="fm-empty">
                      <div className="fm-empty-heading">No results for "{searchTerm}"</div>
                      <div className="fm-empty-hint">Try a different name or role</div>
                    </div>
                  )
                  : filteredStaff.map(staff => {
                    const isSelected = selectedId === staff.id;
                    const s = STATUS_STYLE[staff.status] ?? STATUS_STYLE.Active;
                    return (
                      <div
                        key={staff.id}
                        className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                        onClick={() => setSelectedId(isSelected ? null : staff.id)}
                      >
                        <span className="fm-code-chip" style={{ width: 80, minWidth: 80, flexShrink: 0, textAlign: 'center', fontSize: 9, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {staff.role}
                        </span>
                        <div className="fm-flag-info">
                          <div className="fm-flag-name-row">
                            <span className="fm-flag-name">{staff.name}</span>
                          </div>
                          <div className="fm-flag-desc">
                            <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>
                              {staff.status}
                            </span>
                          </div>
                        </div>
                        {isSelected
                          ? <span className="fm-applied-text">✓ Selected</span>
                          : <span className="fm-apply-btn">+ Select</span>
                        }
                      </div>
                    );
                  })
              )}

              {tab === 'pools' && !loading && (
                filteredPools.length === 0
                  ? (
                    <div className="fm-empty">
                      <div className="fm-empty-heading">No pools found</div>
                      <div className="fm-empty-hint">Try a different search term</div>
                    </div>
                  )
                  : filteredPools.map(pool => {
                    const isSelected = selectedId === pool.id;
                    return (
                      <div
                        key={pool.id}
                        className={'fm-flag-card' + (isSelected ? ' applied' : '')}
                        onClick={() => setSelectedId(isSelected ? null : pool.id)}
                      >
                        <span className="fm-code-chip" style={{ width: 108, textAlign: 'center', fontSize: 11 }}>
                          POOL
                        </span>
                        <div className="fm-flag-info">
                          <div className="fm-flag-name-row">
                            <span className="fm-flag-name">{pool.name}</span>
                          </div>
                          <div className="fm-flag-desc">{pool.memberCount} members available</div>
                        </div>
                        {isSelected
                          ? <span className="fm-applied-text">✓ Selected</span>
                          : <span className="fm-apply-btn">+ Select</span>
                        }
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
        )} {/* end step === 'recipient' */}

        {/* Footer */}
        <div className="fm-footer">
          <span className={'fm-footer-status' + (delegationType || selectedLabel ? ' dirty' : '')}>
            {step === 'type'
              ? (delegationType ? delegationTypes.find(d => d.id === delegationType)?.label : 'Select a delegation type')
              : (selectedLabel ? 'Delegating to: ' + selectedLabel : 'No recipient selected')
            }
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 'recipient' && (
              <button className="fm-btn-cancel" onClick={() => setStep('type')}>← Back</button>
            )}
            <button className="fm-btn-cancel" onClick={onClose}>Cancel</button>
            {step === 'type' ? (
              <button
                className="fm-btn-save"
                disabled={!delegationType}
                style={{ opacity: (!delegationType || (delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && !selectedInstanceId)) ? 0.5 : 1 }}
                onClick={() => {
                  if (delegationType === 'SYNOPTIC_ASSIGN' && synopticInstances.length > 0 && !selectedInstanceId) return;
                  setStep('recipient');
                }}
              >
                Next →
              </button>
            ) : (
              <>
                {/* Optional note field */}
                {selectedDelegationType?.requiresNote && (
                  <input
                    type="text"
                    placeholder="Add a note (required)…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', width: 200, outline: 'none' }}
                  />
                )}
                <button
                  className="fm-btn-save"
                  disabled={!selectedId || confirming || (selectedDelegationType?.requiresNote && !note)}
                  onClick={handleConfirm}
                  style={{ opacity: !selectedId || confirming ? 0.5 : 1 }}
                >
                  {confirming ? 'Delegating…' : 'Confirm Delegation'}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DelegateModal;

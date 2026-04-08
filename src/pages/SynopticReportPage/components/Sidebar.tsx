// src/pages/SynopticReportPage/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import ConfirmModal from '@/components/UI/ConfirmModal';
import type { Case } from '@/types/case/Case';

interface SidebarProps {
  caseData: Case | null;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  activeSpecimenId?: string;
  onSelectSpecimen?: (specimenId: string) => void;
  onAddSynoptic?: () => void;
  onOpenCaseComment?: () => void;
  onOpenSpecimenComment?: (specimenId: string) => void;
  hasCaseComment?: boolean;
  specimenComments?: Record<string, string>;
  activeReportInstanceId?: string;
  onSelectReport?: (instanceId: string, specimenId: string) => void;
  onDeleteReport?: (instanceId: string) => void;
}

type DotStatus = 'complete' | 'partial' | 'empty';

const StatusDot: React.FC<{ status: DotStatus }> = ({ status }) => {
  const color = status === 'complete' ? '#10b981' : status === 'partial' ? '#f59e0b' : '#334155';
  return (
    <span className="ps-status-dot-wrap">
      <span className="ps-status-dot" style={{ background: color }} />
    </span>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  caseData,
  activeSpecimenId,
  onSelectSpecimen,
  onAddSynoptic,
  onOpenCaseComment,
  onOpenSpecimenComment,
  hasCaseComment = false,
  specimenComments = {},
  activeReportInstanceId,
  onSelectReport,
  onDeleteReport,
}) => {
  const specimens = caseData?.specimens ?? [];
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Expand all specimens once caseData loads
  useEffect(() => {
    if (specimens.length > 0) {
      setExpandedIds(new Set(specimens.map(s => s.id)));
    }
  }, [caseData?.id]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div style={{
      width: '340px', flexShrink: 0,
      background: '#0d1829',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      overflowY: 'auto',
      padding: '16px 12px',
      display: 'flex', flexDirection: 'column', gap: '2px',
    }}>

      {/* ── Case Comment ── */}
      <div
        onClick={() => onOpenCaseComment?.()}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: '6px', marginBottom: '10px',
          cursor: 'pointer',
          background: hasCaseComment ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasCaseComment ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = hasCaseComment ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)'}
      >
        <span style={{ fontSize: '13px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>💬</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: hasCaseComment ? '#c4b5fd' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {hasCaseComment ? 'Edit Case Comment' : '+ Add Case Comment'}
          </div>
          {hasCaseComment && <div style={{ fontSize: '10px', color: '#6b7f99' }}>Applies to entire case</div>}
        </div>
        {hasCaseComment && (
          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 700 }}>✓</span>
        )}
      </div>

      {/* ── Section label ── */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '0 4px', marginBottom: '4px' }}>
        Specimens &amp; Reports
      </div>

      {specimens.map((specimen) => {
        const isExpanded  = expandedIds.has(specimen.id);
        const isActive    = activeSpecimenId === specimen.id;

        // Resolve report instances for this specimen
        const instances = (caseData?.synopticReports ?? []).filter(r => r.specimenId === specimen.id);
        // Legacy fallback
        const legacyId   = !instances.length && caseData?.synopticTemplateId;
        const allRows = instances.length > 0 ? instances : legacyId ? [{
          instanceId: '__legacy__',
          templateId: caseData!.synopticTemplateId!,
          templateName: (caseData!.synopticTemplateId!).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          answers: caseData?.synopticAnswers ?? {},
          status: 'draft' as const,
          specimenId: specimen.id,
          createdAt: '', updatedAt: '',
        }] : [];

        // Specimen dot: based on whether any of its instances have answers
        const specimenHasAnswers = allRows.some(r => Object.values(r.answers).some(v => v !== '' && !(Array.isArray(v) && !v.length)));
        const specimenDot: DotStatus = allRows.length === 0 ? 'empty' : specimenHasAnswers ? 'partial' : 'empty';

        return (
          <div key={specimen.id}>

            {/* Specimen row */}
            <div
              onClick={() => {
                if (allRows.length === 0) {
                  onSelectSpecimen?.(specimen.id);
                  onAddSynoptic?.();
                } else {
                  toggleExpand(specimen.id);
                  onSelectSpecimen?.(specimen.id);
                }
              }}
              title={`${specimen.label}: ${specimen.description}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 10px', borderRadius: '8px', marginBottom: '2px',
                cursor: 'pointer',
                background: isActive ? 'rgba(8,145,178,0.18)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(8,145,178,0.4)' : 'transparent'}`,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Expand arrow — only when specimen has reports */}
              <span style={{
                fontSize: '8px', color: '#94a3b8', flexShrink: 0,
                display: 'inline-block', transition: 'transform 0.15s',
                transform: isExpanded ? 'rotate(90deg)' : 'none',
                width: '10px', textAlign: 'center',
                visibility: allRows.length > 0 ? 'visible' : 'hidden',
              }}>▶</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#38bdf8' }}>{specimen.label}:</span>{' '}{specimen.description}
                </div>
              </div>

              {/* Comment bubble */}
              <span
                onClick={e => { e.stopPropagation(); onOpenSpecimenComment?.(specimen.id); }}
                title={specimenComments[specimen.id] && specimenComments[specimen.id] !== '<p></p>' ? 'Edit comment' : 'Add comment'}
                className="ps-specimen-comment-btn"
                style={{
                  opacity: specimenComments[specimen.id] && specimenComments[specimen.id] !== '<p></p>' ? 1 : 0.35,
                  color: specimenComments[specimen.id] && specimenComments[specimen.id] !== '<p></p>' ? '#38bdf8' : '#94a3b8',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#38bdf8'; }}
                onMouseLeave={e => {
                  const hasComment = !!(specimenComments[specimen.id] && specimenComments[specimen.id] !== '<p></p>');
                  e.currentTarget.style.opacity = hasComment ? '1' : '0.35';
                  e.currentTarget.style.color = hasComment ? '#38bdf8' : '#94a3b8';
                }}
              >💬</span>

              {/* Status dot — far right */}
              <span
                title={specimenDot === 'complete' ? 'Complete' : specimenDot === 'partial' ? 'In progress' : 'Not started'}
                className="ps-status-dot-wrap"
              >
                <StatusDot status={specimenDot} />
              </span>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ paddingLeft: '18px', marginBottom: '4px' }}>

                {/* Report instance rows */}
                {allRows.map(inst => {
                  const isActiveInst = activeReportInstanceId === inst.instanceId ||
                    (!activeReportInstanceId && inst.instanceId === '__legacy__');
                  const filledCount = Object.values(inst.answers).filter(v =>
                    v !== '' && !(Array.isArray(v) && !v.length)
                  ).length;
                  const instDot: DotStatus = filledCount > 0 ? 'partial' : 'empty';

                  return (
                    <div
                      key={inst.instanceId}
                      onClick={() => onSelectReport?.(inst.instanceId, specimen.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 8px', borderRadius: '5px', marginBottom: '1px',
                        cursor: 'pointer',
                        background: isActiveInst ? 'rgba(8,145,178,0.22)' : 'transparent',
                        border: `1px solid ${isActiveInst ? 'rgba(8,145,178,0.5)' : 'transparent'}`,
                      }}
                      onMouseEnter={e => { if (!isActiveInst) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (!isActiveInst) e.currentTarget.style.background = isActiveInst ? 'rgba(8,145,178,0.22)' : 'transparent'; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: isActiveInst ? '#7dd3fc' : '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inst.templateName}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {filledCount}/{filledCount > 0 ? filledCount + 2 : '?'} fields
                        </div>
                      </div>
                      <StatusDot status={instDot} />
                      {/* Delete button — only show on non-legacy instances */}
                      {inst.instanceId !== '__legacy__' && onDeleteReport && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmDeleteId(inst.instanceId);
                            setConfirmDeleteName(inst.templateName);
                          }}
                          title="Remove this synoptic report"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#64748b', fontSize: '13px', padding: '2px 4px',
                            borderRadius: '4px', lineHeight: 1, flexShrink: 0,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'none'; }}
                        >🗑</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── + Add Synoptic ── */}
      <button
        onClick={() => onAddSynoptic?.()}
        style={{
          width: '100%', padding: '10px', borderRadius: '8px', marginTop: '12px',
          background: 'rgba(8,145,178,0.12)',
          border: '1.5px dashed rgba(8,145,178,0.6)',
          color: '#38bdf8', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.22)'; e.currentTarget.style.borderColor = '#0891B2'; e.currentTarget.style.color = '#7dd3fc'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.12)'; e.currentTarget.style.borderColor = 'rgba(8,145,178,0.6)'; e.currentTarget.style.color = '#38bdf8'; }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Add Synoptic Report
      </button>
      <ConfirmModal
        show={!!confirmDeleteId}
        title="Remove Synoptic Report"
        message={`Remove "${confirmDeleteName}"? This cannot be undone until you save the case.`}
        confirmLabel="Remove"
        cancelLabel="Keep"
        danger
        onConfirm={() => {
          if (confirmDeleteId) onDeleteReport?.(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default Sidebar;

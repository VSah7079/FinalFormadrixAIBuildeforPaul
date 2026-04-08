// src/pages/SynopticReportPage/components/RightSynopticPanel.tsx
// Schema-driven synoptic field renderer — dark navy theme.

import React, { useImperativeHandle, forwardRef } from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Case } from '@/types/case/Case';
import type {
  EditorTemplate,
  EditorField,
  EditorSection,
  FieldOption,
} from '@/components/Config/Protocols/SynopticEditor';
import type { TemplateDetail } from '@/services/templates/templateService';
import { listTemplates, getTemplate } from '@/services/templates/templateService';
import { generateAiSuggestionsForReport, saveReportSuggestions, recordAiFeedback } from '@/services/cases/mockCaseService';
import { aiBehaviorService } from '@/services';
import { callAi } from '@/services/aiIntegration/aiProviderService';
import { getOrchestratorMode } from '@/components/Config/NarrativeTemplates';
import { narrativeTemplateConfig } from '@/components/Config/NarrativeTemplates/narrativeTemplateConfig';
import NarrativeEditor from '@/components/Editor/NarrativeEditor';

const AUTO_DRAFT_MS = 1800;

// ─── Helpers ──────────────────────────────────────────────────
type VisCond = EditorField['visibleWhen'];

function isVisible(cond: VisCond | undefined, ans: Record<string, string | string[]>): boolean {
  if (!cond) return true;
  const v = ans[cond.fieldId];
  if (!v) return false;
  return Array.isArray(v) ? v.includes(cond.answerId) : v === cond.answerId;
}

function buildPrompt(tpl: EditorTemplate, ans: Record<string, string | string[]>, c: Case): string {
  const lines: string[] = [];
  tpl.sections.forEach(sec => {
    if (!isVisible(sec.visibleWhen, ans)) return;
    lines.push(`\n### ${sec.title}`);
    sec.fields.forEach(f => {
      if (!isVisible(f.visibleWhen, ans)) return;
      const raw = ans[f.id]; if (!raw) return;
      const display = f.options?.length
        ? (Array.isArray(raw) ? raw : [raw]).map(id => f.options.find((o: FieldOption) => o.id === id)?.label ?? id).join(', ')
        : Array.isArray(raw) ? raw.join(', ') : raw;
      lines.push(`${f.label}: ${display}`);
    });
  });
  const instr = narrativeTemplateConfig.sections.filter(s => s.enabled).map(s => `- ${s.title}: ${s.aiInstruction}`).join('\n');
  return [`You are a pathology reporting assistant. Generate a professional narrative pathology report.`,
    `Rules: Do not invent findings. Use formal clinical prose.\n${instr}`,
    `Case: ${c.id}`, `Gross: ${c.diagnostic?.grossDescription ?? '—'}`,
    `Micro: ${c.diagnostic?.microscopicDescription ?? '—'}`,
    `Ancillary: ${c.diagnostic?.ancillaryStudies ?? '—'}`,
    `\n## Synoptic Data`, ...lines, `\nGenerate the full narrative report now.`].join('\n');
}

// ─── Input styles (dark theme) ────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 6,
  border: '1px solid #334155', background: '#0f172a',
  color: '#e2e8f0', fontSize: 13,
};

// ─── Single field renderer ────────────────────────────────────
interface AiSuggestion {
  value: string | string[];
  confidence: number;
  source: string;
  verification: 'unverified' | 'verified' | 'disputed';
}

const FieldRow: React.FC<{
  field: EditorField;
  value: string | string[];
  onChange: (id: string, v: string | string[]) => void;
  aiSuggestion?: AiSuggestion;
  onVerify?: (fieldId: string, v: 'verified' | 'disputed') => void;
  onLabelClick?: () => void;
  isActive?: boolean;
  aiAttempted?: boolean;
  isPulsing?: boolean;
  fieldRef?: (el: HTMLDivElement | null) => void;
  onFieldFocus?: (fieldId: string) => void;
}> = ({ field, value, onChange, aiSuggestion, onVerify, onLabelClick, isActive = false, aiAttempted = false, isPulsing = false, fieldRef, onFieldFocus }) => {
  const strVal = (value ?? '') as string;
  const arrVal = Array.isArray(value) ? value as string[] : [];
  const ai = aiSuggestion;
  const conf = ai?.confidence ?? 0;
  const isHighConf = conf >= 85;
  const isMedConf  = conf >= 50 && conf < 85;
  const vStatus = ai?.verification ?? 'unverified';

  // Derive user-filled-without-AI state
  const hasValue = Array.isArray(value) ? value.length > 0 : (value ?? '') !== '';
  const isManualEntry = !ai && aiAttempted && hasValue;

  const confBadgeStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
    background: vStatus === 'verified' ? 'rgba(16,185,129,0.2)'  :
                vStatus === 'disputed' ? 'rgba(251,191,36,0.15)' :
                isHighConf            ? 'rgba(16,185,129,0.2)'  :
                isMedConf             ? 'rgba(251,191,36,0.15)' :
                                        'rgba(148,163,184,0.12)',
    color:      vStatus === 'verified' ? '#34d399' :
                vStatus === 'disputed' ? '#fbbf24' :
                isHighConf            ? '#34d399' :
                isMedConf             ? '#fbbf24' :
                                        '#94a3b8',
  };

  const handleActivate = () => {
    onLabelClick?.();
    onFieldFocus?.(field.id);
  };

  return (
    <div
      ref={fieldRef}
      style={{
        marginBottom: 18,
        borderLeft: isPulsing              ? '3px solid #f59e0b'
                  : isActive && ai         ? '3px solid rgba(8,145,178,0.6)'
                  : isManualEntry          ? '3px solid rgba(168,85,247,0.5)'
                  : aiAttempted && !ai && !hasValue ? '3px solid rgba(100,116,139,0.3)'
                  : '3px solid transparent',
        paddingLeft: (ai || aiAttempted || isPulsing) ? 10 : 0,
        background: isPulsing ? 'rgba(245,158,11,0.06)' : 'transparent',
        borderRadius: isPulsing ? 6 : 2,
        outline: isPulsing ? '1px solid rgba(245,158,11,0.25)' : 'none',
        outlineOffset: '3px',
        transition: 'border-color 0.2s, background 0.4s ease, outline 0.4s ease',
      }}
      onFocus={() => { handleActivate(); onFieldFocus?.(field.id); }}
    >
      {/* Field header row — click anywhere to activate highlight */}
      <div
        onClick={handleActivate}
        style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', cursor: 'pointer' }}
      >
        <span
          style={{ color: isActive ? '#e2e8f0' : '#94a3b8', transition: 'color 0.15s' }}
          title={ai ? 'Click to highlight source in report' : 'Click to focus field'}
        >{field.label}</span>
        {field.required && <span style={{ color: '#f87171', fontSize: 10 }}>*</span>}

        {/* AI not found — attempted but no suggestion */}
        {!ai && aiAttempted && !hasValue && (
          <span
            title="AI analysed the report text but could not find evidence for this field. Fill in manually."
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'rgba(100,116,139,0.15)',
              border: '1px dashed rgba(100,116,139,0.5)',
              color: '#94a3b8',
              cursor: 'default',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>◌</span> AI: not found
          </span>
        )}

        {/* Manual entry — user filled a field AI missed */}
        {isManualEntry && (
          <span
            title="You filled this field manually — AI had no suggestion. This helps train the AI."
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'rgba(168,85,247,0.15)',
              border: '1px solid rgba(168,85,247,0.4)',
              color: '#c084fc',
              cursor: 'default',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 11 }}>✎</span> Manual — AI missed
          </span>
        )}

        {/* AI confidence + verification */}
        {ai && (
          <>
            <span
              style={{ ...confBadgeStyle, cursor: 'default' }}
            >
              {vStatus === 'verified' ? '✓ AI Confirmed' : vStatus === 'disputed' ? '✎ Overridden' : `${conf}%`}
            </span>
            {vStatus === 'unverified' && (
              <>
                <button
                  onClick={() => onVerify?.(field.id, 'verified')}
                  style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)', color: '#34d399', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; e.currentTarget.style.borderColor = '#10B981'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; }}
                >✓ Confirm</button>
                <button
                  onClick={() => onVerify?.(field.id, 'disputed')}
                  style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)', color: '#fbbf24', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; e.currentTarget.style.borderColor = '#f59e0b'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.08)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
                >✎ Override</button>
              </>
            )}
            {vStatus !== 'unverified' && (
              <button
                onClick={() => onVerify?.(field.id, vStatus === 'verified' ? 'disputed' : 'verified')}
                style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 8, cursor: 'pointer', border: '1px solid rgba(100,116,139,0.3)', background: 'transparent', color: '#64748b', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.3)'; }}
              >undo</button>
            )}
          </>
        )}
      </div>

      {field.type === 'text' && (
        <input type="text" value={strVal} onChange={e => onChange(field.id, e.target.value)} style={inputStyle} />
      )}
      {field.type === 'longtext' && (
        <textarea rows={3} value={strVal} onChange={e => onChange(field.id, e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
      )}
      {field.type === 'numeric' && (
        <input type="number" value={strVal} onChange={e => onChange(field.id, e.target.value)} style={{ ...inputStyle, width: '50%' }} />
      )}
      {field.type === 'dropdown' && (
        <select value={strVal} onChange={e => onChange(field.id, e.target.value)} style={inputStyle}>
          <option value="">— Select —</option>
          {field.options?.map((o: FieldOption) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
      {field.type === 'radio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {field.options?.map((o: FieldOption) => (
            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0', cursor: 'pointer' }}>
              <input type="radio" name={field.id} checked={strVal === o.id} onChange={() => onChange(field.id, o.id)}
                style={{ accentColor: '#0891B2' }} />
              {o.label}
            </label>
          ))}
        </div>
      )}
      {field.type === 'checkboxes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {field.options?.map((o: FieldOption) => (
            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0', cursor: 'pointer' }}>
              <input type="checkbox" checked={arrVal.includes(o.id)}
                onChange={e => {
                  const next = new Set(arrVal);
                  e.target.checked ? next.add(o.id) : next.delete(o.id);
                  onChange(field.id, Array.from(next));
                }}
                style={{ accentColor: '#0891B2' }} />
              {o.label}
            </label>
          ))}
        </div>
      )}

      {strVal && field.type === 'dropdown' && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#38bdf8' }}>
          ✓ {field.options?.find((o: FieldOption) => o.id === strVal)?.label ?? strVal}
        </div>
      )}

      {/* AI source citation */}
      {ai && vStatus === 'unverified' && (
        <div style={{ marginTop: 4, fontSize: 10, fontStyle: 'italic', color: '#64748b' }}>
          AI source: {ai.source}
        </div>
      )}
    </div>
  );
};

// ─── Template picker ──────────────────────────────────────────
interface TemplateOption { id: string; name: string; source: string; version: string; category: string; }

const TemplatePicker: React.FC<{ templates: TemplateOption[]; onSelect: (id: string) => void }> = ({ templates, onSelect }) => (
  <div style={{ padding: 24 }}>
    <h2 style={{ marginBottom: 4, color: '#e2e8f0' }}>Synoptic Report</h2>
    <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>No synoptic template is attached to this case.</p>
    {templates.length === 0
      ? <p style={{ fontSize: 12, color: '#64748b' }}>No approved synoptic templates are available.</p>
      : templates.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.2)', color: '#e2e8f0', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0891B2'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{t.source} · v{t.version} · {t.category}</div>
        </button>
      ))
    }
  </div>
);

// ─── Main component ───────────────────────────────────────────
// Handle exposed via ref for parent (SynopticReportPage) to call at finalize time
export interface ReviewField {
  fieldId:      string;
  fieldLabel:   string;
  sectionTitle: string;
  aiValue:      string | string[];
  confidence:   number;
  source:       string;
  verification: 'unverified' | 'verified' | 'disputed';
}

export interface MissingRequiredField {
  sectionId: string;
  sectionTitle: string;
  fieldId: string;
  fieldLabel: string;
}

export interface RightSynopticPanelHandle {
  /**
   * Validates required fields — call BEFORE sweepAndGetFinalState.
   * Returns list of missing required fields, empty array if all complete.
   */
  validateRequired(): MissingRequiredField[];

  /**
   * Returns required fields that are AI-suggested, unverified, and below
   * the confidence threshold — these need triage before finalization.
   */
  getUncertainRequiredFields(threshold?: number): ReviewField[];

  /**
   * Programmatically confirm or dispute a field from outside the panel.
   * Used by AiReviewModal to update verification state.
   */
  setFieldVerification(fieldId: string, v: 'verified' | 'disputed'): void;

  /**
   * Sweeps all unverified AI suggestions to 'verified' and returns the
   * final answers + suggestions state for persisting before finalization.
   * Fields the pathologist changed are already marked 'overridden'.
   * Fields without AI suggestions that were filled are already 'missed'.
   */
  sweepAndGetFinalState(): {
    answers: Record<string, string | string[]>;
    aiSuggestions: Record<string, AiSuggestion>;
    verificationSummary: {
      autoConfirmed: number;
      explicitConfirmed: number;
      overridden: number;
      missed: number;
      notFound: number;
    };
  };
}

interface RightSynopticPanelProps {
  caseData: Case | null;
  activeTab: string;
  activeReportInstanceId?: string;
  onReportInstanceChange?: (id: string) => void;
  onCaseUpdate?: (updated: Case) => void;
  isDirty?: boolean;
  scrollToField?: string | null;
  onScrollComplete?: () => void;
  onHighlight?: (source: string | null) => void;
}

// Module-level template cache — survives re-renders, cleared only on page reload
const TEMPLATE_CACHE = new Map<string, any>();

const RightSynopticPanel = forwardRef<RightSynopticPanelHandle, RightSynopticPanelProps>(({ caseData: initialCaseData, activeReportInstanceId, onCaseUpdate, isDirty, scrollToField, onScrollComplete, onHighlight }, ref) => {
  const orchestratorMode = React.useMemo(() => getOrchestratorMode(), []);

  const caseData = initialCaseData;
  const [templateDetail, setTemplateDetail] = React.useState<TemplateDetail | null>(null);
  const [answers, setAnswers]             = React.useState<Record<string, string | string[]>>({});
  const loadedAnswersRef = React.useRef<string>('');

  // Propagate answer changes to parent for dirty detection.
  // Skip if answers match what was loaded (not a user edit).
  React.useEffect(() => {
    if (!caseData || !activeReportInstanceId) return;
    const current = JSON.stringify(answers);
    if (current === loadedAnswersRef.current) return; // same as loaded — skip
    const updatedReports = (caseData.synopticReports ?? []).map(r =>
      r.instanceId === activeReportInstanceId
        ? { ...r, answers, updatedAt: new Date().toISOString() }
        : r
    );
    onCaseUpdate?.({ ...caseData, synopticReports: updatedReports, updatedAt: new Date().toISOString() });
  }, [answers]);
  const [availableTemplates, setAvailableTemplates] = React.useState<TemplateOption[]>([]);
  const [loading, setLoading]             = React.useState(true);
  const [error, setError]                 = React.useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = React.useState('');
  const [aiSuggestions, setAiSuggestions] = React.useState<Record<string, AiSuggestion>>({});
  const [activeFieldId, setActiveFieldId] = React.useState<string | null>(null);
  const [pulsingFieldId, setPulsingFieldId] = React.useState<string | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = React.useState(0); // 0 = show all until loaded

  // Orchestrator
  const [narrativeContent, setNarrativeContent] = React.useState('');
  const [isGenerating, setIsGenerating]         = React.useState(false);
  const [generateError, setGenerateError]       = React.useState<string | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt]   = React.useState<Date | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Jump to field helper — scrolls, activates, and pulses the field ────────
  const jumpToField = React.useCallback((fieldId: string, sectionId: string) => {
    setActiveSectionId(sectionId);
    setActiveFieldId(fieldId);
    setPulsingFieldId(fieldId);
    lastJumpedFieldId.current = fieldId;
    setTimeout(() => {
      const el = fieldRefs.current[fieldId];
      if (el) {
        // Scroll to the input itself so the answer field is centred, not the label
        const input = el.querySelector<HTMLElement>('input, select, textarea, [role="combobox"]');
        const scrollTarget = input ?? el;
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (input) input.focus();
      }
      setTimeout(() => setPulsingFieldId(null), 2000);
    }, 80);
  }, []);

  // ── Voice: next unanswered / next required ────────────────────────────────
  React.useEffect(() => {
    const handleNextUnanswered = () => {
      if (!templateDetail) return;
      const sections = templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers));
      const all: { fieldId: string; sectionId: string }[] = [];
      for (const sec of sections)
        for (const f of sec.fields)
          if (isVisible(f.visibleWhen, answers) && !answers[f.id])
            all.push({ fieldId: f.id, sectionId: sec.id });
      if (!all.length) return;
      const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
      const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
      jumpToField(next.fieldId, next.sectionId);
    };
    const handleNextRequired = () => {
      if (!templateDetail) return;
      const sections = templateDetail.template.sections.filter((s: any) => isVisible(s.visibleWhen, answers));
      const all: { fieldId: string; sectionId: string }[] = [];
      for (const sec of sections)
        for (const f of sec.fields)
          if (f.required && isVisible(f.visibleWhen, answers) && !answers[f.id])
            all.push({ fieldId: f.id, sectionId: sec.id });
      if (!all.length) return;
      const cur = all.findIndex(x => x.fieldId === lastJumpedFieldId.current);
      const next = all[cur >= 0 && cur < all.length - 1 ? cur + 1 : 0];
      jumpToField(next.fieldId, next.sectionId);
    };
    window.addEventListener('PATHSCRIBE_NEXT_UNANSWERED', handleNextUnanswered);
    window.addEventListener('PATHSCRIBE_NEXT_REQUIRED',   handleNextRequired);
    return () => {
      window.removeEventListener('PATHSCRIBE_NEXT_UNANSWERED', handleNextUnanswered);
      window.removeEventListener('PATHSCRIBE_NEXT_REQUIRED',   handleNextRequired);
    };
  }, [templateDetail, answers, jumpToField]);
  const fieldRefs        = React.useRef<Record<string, HTMLDivElement | null>>({});
  const lastJumpedFieldId    = React.useRef<string | null>(null);

  // Load confidence threshold from AI behavior config
  React.useEffect(() => {
    aiBehaviorService.get().then(res => {
      if (res.ok) setConfidenceThreshold(res.data.confidenceThreshold ?? 0);
    });
  }, []);

  // ── Expose sweep method to parent via ref ────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getUncertainRequiredFields(threshold?: number): ReviewField[] {
      const effectiveThreshold = threshold ?? confidenceThreshold ?? 75;
      if (!templateDetail) return [];
      const results: ReviewField[] = [];
      templateDetail.template.sections.forEach((sec: any) => {
        if (!isVisible(sec.visibleWhen, answers)) return;
        sec.fields.forEach((f: any) => {
          if (!f.required) return;
          if (!isVisible(f.visibleWhen, answers)) return;
          const sug = aiSuggestions[f.id];
          if (!sug) return;
          if (sug.verification !== 'unverified') return;
          if (sug.confidence >= effectiveThreshold) return; // high confidence — auto-confirm at finalize
          results.push({
            fieldId:      f.id,
            fieldLabel:   f.label,
            sectionTitle: sec.title,
            aiValue:      sug.value as string | string[],
            confidence:   sug.confidence,
            source:       sug.source ?? '',
            verification: sug.verification,
          });
        });
      });
      // Sort by confidence ascending — lowest confidence first
      return results.sort((a, b) => a.confidence - b.confidence);
    },

    setFieldVerification(fieldId: string, v: 'verified' | 'disputed') {
      setAiSuggestions(prev => {
        const sug = prev[fieldId];
        if (!sug) return prev;
        const next = { ...prev, [fieldId]: { ...sug, verification: v } };
        if (caseData && activeReportInstanceId) {
          saveReportSuggestions(caseData.id, activeReportInstanceId, next);
        }
        return next;
      });
    },

    validateRequired(): MissingRequiredField[] {
      if (!templateDetail) return [];
      const inst = caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any;

      // If assigned to someone else, block finalization
      if (inst?.assignedTo && inst.assignedTo !== 'PATH-001') { // TODO: replace with auth context
        return [{
          sectionId: '__assignment__',
          sectionTitle: 'Assignment',
          fieldId: '__assigned__',
          fieldLabel: `This synoptic is assigned to ${inst.assignedToName ?? inst.assignedTo} — they must finalise it`,
        }];
      }

      // If marked deferred, allow sign-out without required field validation
      if (inst?.status === 'deferred') return [];
      const missing: MissingRequiredField[] = [];
      templateDetail.template.sections.forEach((sec: any) => {
        if (!isVisible(sec.visibleWhen, answers)) return;
        sec.fields.forEach((f: any) => {
          if (!f.required) return;
          if (!isVisible(f.visibleWhen, answers)) return;
          const val = answers[f.id];
          const isEmpty = !val || (Array.isArray(val) ? val.length === 0 : val.toString().trim() === '');
          if (isEmpty) {
            missing.push({
              sectionId:    sec.id,
              sectionTitle: sec.title,
              fieldId:      f.id,
              fieldLabel:   f.label,
            });
          }
        });
      });
      return missing;
    },

    sweepAndGetFinalState() {
      // Auto-confirm all unverified suggestions — finalization IS confirmation
      const finalSuggestions = { ...aiSuggestions };
      let autoConfirmed = 0;
      let explicitConfirmed = 0;
      let overridden = 0;
      let missed = 0;
      let notFound = 0;

      Object.entries(finalSuggestions).forEach(([fieldId, sug]) => {
        if (sug.verification === 'unverified') {
          finalSuggestions[fieldId] = { ...sug, verification: 'verified' };
          autoConfirmed++;
        } else if (sug.verification === 'verified') {
          explicitConfirmed++;
        } else if (sug.verification === 'disputed') {
          overridden++;
        }
      });

      // Count fields filled without AI suggestion (missed)
      if (templateDetail) {
        templateDetail.template.sections.forEach((sec: any) => {
          sec.fields.forEach((f: any) => {
            if (!finalSuggestions[f.id]) {
              const hasValue = Array.isArray(answers[f.id])
                ? (answers[f.id] as string[]).length > 0
                : !!(answers[f.id]);
              if (hasValue) missed++;
              else notFound++;
            }
          });
        });
      }

      // Persist the swept state
      if (caseData && activeReportInstanceId) {
        saveReportSuggestions(caseData.id, activeReportInstanceId, finalSuggestions);
      }

      return {
        answers,
        aiSuggestions: finalSuggestions,
        verificationSummary: { autoConfirmed, explicitConfirmed, overridden, missed, notFound },
      };
    },
  }), [aiSuggestions, answers, templateDetail, caseData, activeReportInstanceId]);

  // Scroll logic
  React.useEffect(() => {
    if (!scrollToField || !templateDetail) return;
    const template = templateDetail.template;
    for (const sec of template.sections) {
      if (!isVisible(sec.visibleWhen, answers)) continue;
      const hasUnanswered = sec.fields.some(f =>
        f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]
      );
      if (hasUnanswered) {
        setActiveSectionId(sec.id);
        setTimeout(() => {
          const firstReqField = sec.fields.find(f =>
            f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]
          );
          if (firstReqField) {
            const el = fieldRefs.current[firstReqField.id];
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.outline = '2px solid #f59e0b';
              el.style.outlineOffset = '3px';
              setTimeout(() => { if (el) { el.style.outline = ''; el.style.outlineOffset = ''; } }, 2000);
            }
          }
          onScrollComplete?.();
        }, 150);
        break;
      }
    }
  }, [scrollToField]);

  // Load template
  // ── Effect 1: Load template list — only when case changes, not on every report switch
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!caseData) return;
      try {
        const approved = await listTemplates('approved');
        if (cancelled) return;
        setAvailableTemplates(approved.map((p: any) => ({
          id: p.id, name: p.name, source: p.source, version: p.version, category: p.category,
        })));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [initialCaseData?.id]);

  // ── Effect 2: Load active report + template — fast path uses cache
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!caseData) { setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        let templateId: string | undefined;
        let answersToLoad: Record<string, string | string[]> = {};
        let activeInst: any = null;

        if (activeReportInstanceId && caseData.synopticReports?.length) {
          const inst = caseData.synopticReports.find(r => r.instanceId === activeReportInstanceId);
          if (inst) { templateId = inst.templateId; answersToLoad = inst.answers ?? {}; activeInst = inst; }
        } else if (caseData.synopticReports?.length) {
          const first = caseData.synopticReports[0];
          templateId = first.templateId; answersToLoad = first.answers ?? {}; activeInst = first;
        } else if (caseData.synopticTemplateId) {
          templateId = caseData.synopticTemplateId;
          answersToLoad = caseData.synopticAnswers ?? {};
        }

        if (templateId) {
          // Use cache — avoids re-fetch when switching between reports with same template
          let detail = TEMPLATE_CACHE.get(templateId);
          if (!detail) {
            detail = await getTemplate(templateId);
            TEMPLATE_CACHE.set(templateId, detail);
          }
          if (cancelled) return;

          // Set everything atomically after the async work is done
          const suggestions: Record<string, AiSuggestion> = (activeInst as any)?.aiSuggestions ?? {};
          setAiSuggestions(suggestions);
          setAnswers(() => {
            const prefilled = { ...answersToLoad };
            Object.entries(suggestions).forEach(([fieldId, sug]) => {
              if (!prefilled[fieldId] || prefilled[fieldId] === '' ||
                 (Array.isArray(prefilled[fieldId]) && (prefilled[fieldId] as string[]).length === 0)) {
                prefilled[fieldId] = Array.isArray(sug.value) ? sug.value : sug.value;
              }
            });
            // Snapshot the AI-prefilled state as baseline — only if case is clean
            if (!isDirty) loadedAnswersRef.current = JSON.stringify(prefilled);
            return prefilled;
          });
          setTemplateDetail(detail);
          if (detail.template.sections.length > 0) setActiveSectionId(detail.template.sections[0].id);
        } else {
          if (cancelled) return;
          setAiSuggestions({});
          setAnswers(() => answersToLoad);
          if (!isDirty) loadedAnswersRef.current = JSON.stringify(answersToLoad); // snapshot only when clean
          setTemplateDetail(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load template');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialCaseData?.id, initialCaseData?.synopticTemplateId, initialCaseData?.synopticReports?.length, activeReportInstanceId]);

  // AI Narrative logic
  const generateNarrative = React.useCallback(async () => {
    if (!templateDetail || !caseData) return;
    setIsGenerating(true); setGenerateError(null);
    try {
      const { text } = await callAi({
        system: 'You are a board-certified pathologist assistant. Generate professional pathology report narrative. Never invent findings.',
        prompt: buildPrompt(templateDetail.template, answers, caseData),
      });
      setNarrativeContent(text);
      setLastGeneratedAt(new Date());
    } catch (e: any) { setGenerateError(e?.message); }
    finally { setIsGenerating(false); }
  }, [templateDetail, answers, caseData]);

  // Auto-draft trigger
  React.useEffect(() => {
    if (!orchestratorMode || !templateDetail || !caseData || Object.keys(answers).length === 0) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(generateNarrative, AUTO_DRAFT_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [answers, orchestratorMode, templateDetail, caseData, generateNarrative]);

  const setAnswer = React.useCallback((fieldId: string, value: string | string[]) => {
    setAnswers(prev => {
      const next = { ...prev, [fieldId]: value };
      templateDetail?.template.sections.forEach((sec: EditorSection) => {
        if (!isVisible(sec.visibleWhen, next)) sec.fields.forEach((f: EditorField) => delete next[f.id]);
        else sec.fields.forEach((f: EditorField) => { if (!isVisible(f.visibleWhen, next)) delete next[f.id]; });
      });
      return next;
    });

    // Fire 'missed' feedback when user fills a field the AI had no suggestion for
    // This is the most valuable training signal — tells us what AI is blind to
    if (!aiSuggestions[fieldId] && Object.keys(aiSuggestions).length > 0) {
      const hasValue = Array.isArray(value) ? value.length > 0 : value !== '';
      if (hasValue) {
        const fieldLabel = templateDetail?.template.sections
          .flatMap((s: EditorSection) => s.fields)
          .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;
        recordAiFeedback({
          timestamp:    new Date().toISOString(),
          caseId:       caseData?.id ?? '',
          instanceId:   activeReportInstanceId ?? '',
          templateId:   templateDetail?.template.id ?? '',
          fieldId,
          fieldLabel,
          aiValue:      '',
          aiConfidence: 0,
          userValue:    value,
          action:       'missed',
          source:       'AI had no suggestion for this field',
        });
      }
    }

    // Detect override vs revert-to-AI and persist + log feedback
    setAiSuggestions(prev => {
      const sug = prev[fieldId];
      if (!sug) return prev;

      const sugVal = Array.isArray(sug.value) ? sug.value.join(',') : String(sug.value);
      const newVal = Array.isArray(value) ? value.join(',') : String(value);
      const changed = sugVal !== newVal;

      let nextVerification = sug.verification;
      if (sug.verification === 'unverified' && changed) {
        nextVerification = 'disputed';
      } else if (sug.verification === 'disputed' && !changed) {
        nextVerification = 'unverified';
      }

      if (nextVerification === sug.verification) return prev; // no change

      const nextSuggestions = {
        ...prev,
        [fieldId]: { ...sug, verification: nextVerification },
      };

      // Persist the updated verification state to the case
      if (caseData && activeReportInstanceId) {
        saveReportSuggestions(caseData.id, activeReportInstanceId, nextSuggestions);
      }

      // Record feedback for AI learning when the user overrides
      if (nextVerification === 'disputed') {
        const fieldLabel = templateDetail?.template.sections
          .flatMap((s: EditorSection) => s.fields)
          .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;

        recordAiFeedback({
          timestamp:    new Date().toISOString(),
          caseId:       caseData?.id ?? '',
          instanceId:   activeReportInstanceId ?? '',
          templateId:   templateDetail?.template.id ?? '',
          fieldId,
          fieldLabel,
          aiValue:      sug.value,
          aiConfidence: sug.confidence,
          userValue:    value,
          action:       'overridden',
          source:       sug.source,
        });
      }

      return nextSuggestions;
    });
  }, [templateDetail, caseData, activeReportInstanceId]);

  // ── handleVerify must be before early returns (Rules of Hooks) ────────────
  const handleVerify = React.useCallback((fieldId: string, v: 'verified' | 'disputed') => {
    setAiSuggestions(prev => {
      const sug = prev[fieldId];
      if (!sug) return prev;

      const nextSuggestions = { ...prev, [fieldId]: { ...sug, verification: v } };

      // Confirm: snap answer back to the AI value
      if (v === 'verified') {
        setAnswers(ans => ({ ...ans, [fieldId]: sug.value as string | string[] }));
      }

      // Persist updated verification
      if (caseData && activeReportInstanceId) {
        saveReportSuggestions(caseData.id, activeReportInstanceId, nextSuggestions);
      }

      // Record feedback for AI learning
      const fieldLabel = templateDetail?.template.sections
        .flatMap((s: EditorSection) => s.fields)
        .find((f: EditorField) => f.id === fieldId)?.label ?? fieldId;

      recordAiFeedback({
        timestamp:    new Date().toISOString(),
        caseId:       caseData?.id ?? '',
        instanceId:   activeReportInstanceId ?? '',
        templateId:   templateDetail?.template.id ?? '',
        fieldId,
        fieldLabel,
        aiValue:      sug.value,
        aiConfidence: sug.confidence,
        userValue:    v === 'verified' ? sug.value : (answers[fieldId] ?? sug.value),
        action:       v === 'verified' ? 'confirmed' : 'overridden',
        source:       sug.source,
      });

      return nextSuggestions;
    });
  }, [caseData, activeReportInstanceId, templateDetail, answers]);

  // Removed the 'save' function and associated local state (isSaving, saveError, etc.)
  // since this is now controlled by the parent/BottomActionBar.

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontSize: 14 }}>
      Loading synoptic report…
    </div>
  );
  if (error) return <div style={{ padding: 24, color: '#f87171', fontSize: 13 }}>{error}</div>;
  if (!caseData) return <div style={{ padding: 24, color: '#64748b' }}>No case loaded.</div>;
  if (!templateDetail) return (
    <TemplatePicker templates={availableTemplates} onSelect={async id => {
      const detail = await getTemplate(id);
      const updated = { ...caseData, synopticTemplateId: id, synopticAnswers: {} };
      onCaseUpdate?.(updated);
      setTemplateDetail(detail);
      setAnswers({});
      setAiSuggestions({});
      if (detail.template.sections.length > 0) setActiveSectionId(detail.template.sections[0].id);

      // Trigger AI to auto-populate suggestions from the case text
      const allFields = detail.template.sections.flatMap((s: any) => s.fields);
      const suggestions = await generateAiSuggestionsForReport(caseData, id, allFields);
      if (Object.keys(suggestions).length > 0) {
        setAiSuggestions(suggestions);
        // Pre-fill answers with AI values (user can verify/override)
        setAnswers(prev => {
          const prefilled = { ...prev };
          Object.entries(suggestions).forEach(([fieldId, sug]) => {
            if (!prefilled[fieldId]) prefilled[fieldId] = sug.value as string | string[];
          });
          return prefilled;
        });
      }
    }} />
  );

  const template = templateDetail.template;
  const visibleSections = template.sections.filter((s: EditorSection) => isVisible(s.visibleWhen, answers));
  const activeSection = visibleSections.find(s => s.id === activeSectionId) ?? visibleSections[0];

  let total = 0, answered = 0, reqTotal = 0, reqAnswered = 0;
  visibleSections.forEach((s: EditorSection) => s.fields.forEach((f: EditorField) => {
    if (!isVisible(f.visibleWhen, answers)) return;
    total++;
    const has = answers[f.id] !== undefined && answers[f.id] !== '' && !(Array.isArray(answers[f.id]) && (answers[f.id] as string[]).length === 0);
    if (has) answered++;
    if (f.required) { reqTotal++; if (has) reqAnswered++; }
  }));

  const progressBadgeStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 10,
    background: reqAnswered === reqTotal ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
    color: reqAnswered === reqTotal ? '#10b981' : '#fbbf24',
    border: `1px solid ${reqAnswered === reqTotal ? 'rgba(16,185,129,0.3)' : 'rgba(251,191,36,0.3)'}`,
    display: 'flex', alignItems: 'center', gap: 8,
  };

  const OrchestratorLeft = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#e2e8f0' }}>AI Narrative Report</h3>
          {lastGeneratedAt && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Last generated {lastGeneratedAt.toLocaleTimeString()}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {generateError && <span style={{ fontSize: 11, color: '#f87171' }}>⚠ {generateError}</span>}
          <button onClick={generateNarrative} disabled={isGenerating}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(8,145,178,0.4)', background: 'rgba(8,145,178,0.15)',
              color: isGenerating ? '#64748b' : '#38bdf8', cursor: isGenerating ? 'not-allowed' : 'pointer' }}>
            {isGenerating ? '⏳ Generating…' : '↻ Regenerate'}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 10, fontStyle: 'italic' }}>
        Auto-drafts as you fill synoptic fields · Edit freely after generation
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <NarrativeEditor value={narrativeContent} onChange={setNarrativeContent}
          readOnly={isGenerating} minHeight="calc(100vh - 320px)"
          placeholder="AI-generated narrative will appear here…" />
      </div>
    </div>
  );

  const SectionFields = (sec: EditorSection) => (
    <div style={{ padding: '0 0 32px' }}>
      {sec.fields
        .filter((f: EditorField) => isVisible(f.visibleWhen, answers))
        .map((f: EditorField) => (
          <FieldRow
            key={f.id}
            field={f}
            value={answers[f.id] ?? ''}
            onChange={setAnswer}
            aiSuggestion={
              // Only pass suggestion if it meets the confidence threshold
              aiSuggestions[f.id]?.confidence >= confidenceThreshold
                ? aiSuggestions[f.id]
                : undefined
            }
            onVerify={handleVerify}
            isActive={activeFieldId === f.id}
            isPulsing={pulsingFieldId === f.id}
            fieldRef={el => { fieldRefs.current[f.id] = el; }}
            aiAttempted={
              // Show "AI: not found" if:
              // 1. AI ran for this report (other suggestions exist), AND
              // 2. Either no suggestion, or suggestion is below threshold
              Object.keys(aiSuggestions).length > 0 && (
                !aiSuggestions[f.id] ||
                aiSuggestions[f.id].confidence < confidenceThreshold
              )
            }
            onLabelClick={() => {
              setActiveFieldId(f.id);
              const source = aiSuggestions[f.id]?.source ?? null;
              onHighlight?.(source);
            }}
            onFieldFocus={(fid) => { lastJumpedFieldId.current = fid; }}
          />
        ))
      }
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderBottom: '2px solid #0891B2', paddingBottom: 6 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
            📝 {template.name}
          </h3>
          {/* Synoptic assignment badge */}
          {(() => {
            const inst = caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any;
            if (!inst?.assignedTo) return null;
            const isAssignee = inst.assignedTo === 'PATH-001'; // TODO: replace with auth context
            return (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: isAssignee ? 'rgba(6,182,212,0.15)' : 'rgba(100,116,139,0.15)',
                color: isAssignee ? '#22d3ee' : '#94a3b8',
                border: `1px solid ${isAssignee ? 'rgba(6,182,212,0.3)' : 'rgba(100,116,139,0.3)'}`,
              }}>
                {isAssignee ? '✎ Assigned to you' : `👤 ${inst.assignedToName ?? inst.assignedTo}`}
                {inst.requiresCountersign && !isAssignee ? ' · countersign required' : ''}
              </span>
            );
          })()}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {orchestratorMode && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(8,145,178,0.15)', color: '#38bdf8', border: '1px solid rgba(8,145,178,0.3)' }}>
                ⚡ Orchestrator
              </span>
            )}
            {/* Deferred status badge / toggle */}
            {(() => {
              const inst = caseData?.synopticReports?.find(r => r.instanceId === activeReportInstanceId) as any;
              const isDeferred = inst?.status === 'deferred';
              return (
                <button
                  title={isDeferred ? 'Marked as deferred — click to unmark' : 'Mark this synoptic as deferred (ancillary results pending)'}
                  onClick={() => {
                    if (!caseData || !activeReportInstanceId) return;
                    const idx = (caseData.synopticReports ?? []).findIndex(r => r.instanceId === activeReportInstanceId);
                    if (idx < 0) return;
                    const updated = { ...caseData };
                    const reports = [...(updated.synopticReports ?? [])];
                    reports[idx] = { ...reports[idx], status: isDeferred ? 'draft' : 'deferred' } as any;
                    updated.synopticReports = reports;
                    onCaseUpdate?.(updated as any);
                  }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                    background: isDeferred ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.08)',
                    border: `1px solid ${isDeferred ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.2)'}`,
                    color: isDeferred ? '#fbbf24' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {isDeferred ? '⏳ Deferred' : '⏳ Mark Deferred'}
                </button>
              );
            })()}
            <span style={progressBadgeStyle}>
              <span>{reqAnswered}/{reqTotal} req · {answered}/{total} total</span>
              <span style={{ display: 'inline-block', width: 48, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', verticalAlign: 'middle' }}>
                <span style={{ display: 'block', height: '100%', width: `${reqTotal > 0 ? (reqAnswered / reqTotal) * 100 : 0}%`, borderRadius: 2, background: reqAnswered === reqTotal ? '#10b981' : '#fbbf24', transition: 'width 0.4s ease' }} />
              </span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '5px 10px', background: 'rgba(8,145,178,0.06)', borderRadius: 8, border: '1px solid rgba(8,145,178,0.15)' }}>
          <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>Jump to:</span>
          <button
            onClick={() => {
              // Collect all unanswered fields across all visible sections in order
              const allUnanswered: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections) {
                for (const f of sec.fields) {
                  if (isVisible(f.visibleWhen, answers) && !answers[f.id]) {
                    allUnanswered.push({ fieldId: f.id, sectionId: sec.id });
                  }
                }
              }
              if (allUnanswered.length === 0) return;
              const currentIdx = allUnanswered.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              // Go to next after current; wrap to start if at end or not found
              const nextIdx = currentIdx >= 0 && currentIdx < allUnanswered.length - 1
                ? currentIdx + 1
                : 0;
              const next = allUnanswered[nextIdx];
              jumpToField(next.fieldId, next.sectionId);
            }}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: '1.5px solid #0891B2', background: 'transparent', color: '#38bdf8', cursor: 'pointer' }}>
            → Next Unanswered {total - answered > 0 ? `(${total - answered})` : '✓'}
          </button>
          <button
            onClick={() => {
              // Collect all unanswered required fields in order
              const allRequired: { fieldId: string; sectionId: string }[] = [];
              for (const sec of visibleSections) {
                for (const f of sec.fields) {
                  if (f.required && isVisible(f.visibleWhen, answers) && !answers[f.id]) {
                    allRequired.push({ fieldId: f.id, sectionId: sec.id });
                  }
                }
              }
              if (allRequired.length === 0) return;
              const currentIdx = allRequired.findIndex(x => x.fieldId === lastJumpedFieldId.current);
              const nextIdx = currentIdx >= 0 && currentIdx < allRequired.length - 1
                ? currentIdx + 1
                : 0;
              const next = allRequired[nextIdx];
              jumpToField(next.fieldId, next.sectionId);
            }}
            style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${reqAnswered < reqTotal ? '#dc2626' : '#10b981'}`,
              background: 'transparent',
              color: reqAnswered < reqTotal ? '#f87171' : '#10b981',
              cursor: 'pointer' }}>
            → Next Required {reqTotal - reqAnswered > 0 ? `(${reqTotal - reqAnswered})` : '✓'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {visibleSections.map((sec: EditorSection) => {
            const isActive = sec.id === (activeSectionId || visibleSections[0]?.id);
            const secAnswered = sec.fields.filter(f => isVisible(f.visibleWhen, answers) && answers[f.id]).length;
            const secTotal = sec.fields.filter(f => isVisible(f.visibleWhen, answers)).length;
            return (
              <button key={sec.id} onClick={() => setActiveSectionId(sec.id)}
                style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: isActive ? '#0891B2' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${isActive ? '#0891B2' : 'rgba(148,163,184,0.2)'}`,
                  color: isActive ? 'white' : '#cbd5e1',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(8,145,178,0.15)'; e.currentTarget.style.borderColor = 'rgba(8,145,178,0.5)'; e.currentTarget.style.color = '#7dd3fc'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'; e.currentTarget.style.color = '#cbd5e1'; }}}>
                {sec.title}
                {secTotal > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>
                    ({secAnswered}/{secTotal})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {orchestratorMode ? (
        <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: '0 0 55%', padding: '0 20px 20px', overflowY: 'auto' }}>
            {OrchestratorLeft}
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '0 24px 24px', overflowY: 'auto' }}>
            {activeSection && SectionFields(activeSection)}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {activeSection && (
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                {activeSection.title}
              </h4>
              {SectionFields(activeSection)}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

RightSynopticPanel.displayName = 'RightSynopticPanel';

export default RightSynopticPanel;
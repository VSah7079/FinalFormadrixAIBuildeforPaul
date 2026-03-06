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
 * State:
 *   All case data lives in local component state (caseData), hydrated from
 *   localStorage on mount via loadCase(). Saved back via saveCase() on draft
 *   save and on finalization.
 *
 * Config dependencies:
 *   Reads lisIntegrationEnabled and allowPathScribePostFinalActions from
 *   SystemConfigContext (contexts/SystemConfigContext.tsx), set via
 *   Configuration → System → LIS Integration. These control visibility of
 *   Amendment and Addendum buttons.
 *
 * Key sub-components:
 *   PathScribeEditor          ← rich text editor (specimen comments, case comments)
 *   CasePanel                 ← similar cases side panel
 *   FlagManagerModal          ← flag management overlay
 *   ReportCommentModal        ← specimen-level comment editor
 *   CaseCommentModal          ← case-level comment editor
 *   CommentModalShell         ← draggable modal wrapper for comment editors
 *   AddCodeModal              ← SNOMED/ICD code search and assignment
 *
 * Audit events (TODO: wire to useAuditLog when available):
 *   - Synoptic finalized (with pathologist ID + timestamp)
 *   - Case signed out (with pathologist ID + timestamp)
 *   - Addendum signed out
 *   - Amendment finalized
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { useLogout } from '@hooks/useLogout';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { HelpIcon, WarningIcon } from "../components/Icons";
import PathScribeEditor from '../components/Editor/PathScribeEditor';
import CasePanel from '../components/CasePanel/CasePanel';

// Flag definitions (from your existing flagsApi)
import { getFlags } from '../api/flagsApi';
import { FlagDefinition } from '../types/FlagDefinition';

// Case + specimen + flag instances (new runtime types)
import { CaseWithFlags } from '../types/flagsRuntime';

// Case flag instance API (in-memory backend)
import { 
  getCaseWithFlags, 
  applyFlags, 
  deleteFlags 
} from '../api/caseFlagsApi';

// Two-panel modal
import FlagManagerModal from '../components/Config/System/FlagManagerModal';

// ─── Storage key ──────────────────────────────────────────────────────────────
// Bump this version whenever the CaseData shape changes — old localStorage is discarded
const LS_VERSION = 'v2';
const LS_KEY = (caseId: string) => `pathscribe_case_${caseId}_${LS_VERSION}`;

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType   = 'text' | 'select' | 'comment';
type CaseRole    = 'attending' | 'resident';

const ROLE_META: Record<CaseRole, { label: string; color: string; bg: string; border: string }> = {
  attending: { label: 'Attending Pathologist', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  resident:  { label: 'Resident / Fellow',     color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
};

type CodeSource  = 'system' | 'ai' | 'manual';
type SpecimenStatus = 'complete' | 'alert' | 'pending';

type FieldVerification = 'unverified' | 'verified' | 'disputed';

interface SynopticField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  confidence: number;
  aiSource: string;
  value: string;
  aiValue: string;
  dirty: boolean;
  verification: FieldVerification;
}

interface MedicalCode {
  id: string;
  system: 'SNOMED' | 'ICD';
  code: string;
  display: string;
  source: CodeSource;
}

// ─── Synoptic report node (recursive tree) ───────────────────────────────────
// Each node is an independent instance of a CAP protocol module.
// Children are fixed by the protocol template — pathologists fill values only.

interface SynopticReportNode {
  instanceId: string;          // unique per node instance (uuid-like)
  templateId: string;          // e.g. "cap_erpr_1.0" — identifies the protocol
  title: string;               // display name, e.g. "ER/PR IHC Panel"
  status: 'draft' | 'finalized';
  tumorFields: SynopticField[];
  marginFields: SynopticField[];
  biomarkerFields: SynopticField[];
  specimenComment: string;
  codes: MedicalCode[];
  children: SynopticReportNode[];  // sub-reports called by this protocol
}

interface SpecimenSynoptic {
  specimenId: number;
  specimenName: string;
  specimenStatus: SpecimenStatus;
  specimenComment: string;
  reports: SynopticReportNode[];  // top-level reports for this specimen
}

interface CaseData {
  accession: string;
  patient: string;
  dob: string;
  mrn: string;
  protocol: string;
  overallConfidence: number;
  autoPopulated: string;
  caseComments: Partial<Record<CaseRole, string>>;
  synoptics: SpecimenSynoptic[];
}

// ─── Navigation: path through the tree ───────────────────────────────────────
// activePath = [specimenIndex, reportIndex, childIndex, grandchildIndex, ...]
// activePath[0] = which specimen
// activePath[1] = which top-level report within that specimen
// activePath[2+] = which child at each subsequent level
type ActivePath = number[];

// Helpers to traverse the tree by path
const getNodeAtPath = (synoptics: SpecimenSynoptic[], path: ActivePath): SynopticReportNode | null => {
  if (path.length < 2) return null;
  const specimen = synoptics[path[0]];
  if (!specimen || !Array.isArray(specimen.reports)) return null;
  let node: SynopticReportNode | undefined = specimen.reports[path[1]];
  for (let i = 2; i < path.length; i++) {
    if (!node || !Array.isArray(node.children)) return null;
    node = node.children[path[i]];
  }
  return node ?? null;
};

// Immutably update a node at the given path, returning new synoptics array
const updateNodeAtPath = (
  synoptics: SpecimenSynoptic[],
  path: ActivePath,
  updater: (node: SynopticReportNode) => SynopticReportNode
): SpecimenSynoptic[] => {
  if (path.length < 2) return synoptics;
  return synoptics.map((specimen, si) => {
    if (si !== path[0]) return specimen;
    const updateReports = (nodes: SynopticReportNode[], depth: number): SynopticReportNode[] =>
      nodes.map((node, ni) => {
        if (ni !== path[depth]) return node;
        if (depth === path.length - 1) return updater(node);
        return { ...node, children: updateReports(node.children, depth + 1) };
      });
    return { ...specimen, reports: updateReports(specimen.reports, 1) };
  });
};

// Cascade finalization to all descendants
const finalizeNodeAndChildren = (node: SynopticReportNode): SynopticReportNode => ({
  ...node,
  status: 'finalized',
  children: node.children.map(finalizeNodeAndChildren),
});

// Compute breadcrumb labels from path
const getBreadcrumb = (synoptics: SpecimenSynoptic[], path: ActivePath): string[] => {
  if (path.length === 0) return [];
  const crumbs: string[] = [];
  const specimen = synoptics[path[0]];
  if (!specimen) return crumbs;
  crumbs.push(specimen.specimenName);
  let node: SynopticReportNode | undefined = specimen.reports[path[1]];
  if (!node) return crumbs;
  crumbs.push(node.title);
  for (let i = 2; i < path.length; i++) {
    node = node?.children[path[i]];
    if (node) crumbs.push(node.title);
  }
  return crumbs;
};

// ─── Mock defaults ────────────────────────────────────────────────────────────

const makeMockCase = (caseId: string): CaseData => ({
  accession: caseId || 'S25-12345',
  patient: 'Smith, John',
  dob: '03/15/1965',
  mrn: '123456789',
  protocol: 'CAP Breast Protocol 4.3.0.1',
  overallConfidence: 89,
  autoPopulated: '12/14',
  caseComments: {
    attending: '<p><strong>Attending note:</strong> Case reviewed. Correlation with clinical history recommended.</p>',
    resident: '',
  },
  synoptics: [
    {
      specimenId: 1,
      specimenName: 'Left Breast Mastectomy',
      specimenStatus: 'complete',
      specimenComment: '',
      reports: [
        {
          instanceId: 'inst-1-1',
          templateId: 'cap_breast_invasive_4.3',
          title: 'Breast — Invasive Carcinoma',
          status: 'draft',
          specimenComment: '',
          codes: [
            { id: 'sys-1', system: 'SNOMED', code: '413448000', display: 'Invasive ductal carcinoma of breast', source: 'system' },
            { id: 'sys-2', system: 'ICD',    code: 'C50.512',   display: 'Malignant neoplasm of lower-outer quadrant of left female breast', source: 'system' },
            { id: 'ai-1',  system: 'SNOMED', code: '416940007', display: 'Lymphovascular invasion present', source: 'ai' },
          ],
          tumorFields: [
            { id: 'tumor_size',       label: 'Tumor Size',              type: 'text', required: true,  confidence: 94, aiSource: 'Gross: "2.3 x 1.8 x 1.5 cm"',            value: '2.3 cm',                  aiValue: '2.3 cm',                  dirty: false, verification: 'unverified' },
            { id: 'histologic_type',  label: 'Histologic Type',         type: 'text', required: true,  confidence: 98, aiSource: 'Diagnosis: "invasive ductal carcinoma"',  value: 'Invasive Ductal Carcinoma', aiValue: 'Invasive Ductal Carcinoma', dirty: false, verification: 'unverified' },
            { id: 'histologic_grade', label: 'Histologic Grade',        type: 'text', required: true,  confidence: 92, aiSource: 'Micro: "moderately differentiated"',       value: 'Grade 2',                  aiValue: 'Grade 2',                  dirty: false, verification: 'unverified' },
            { id: 'lvi',              label: 'Lymphovascular Invasion', type: 'text', required: true,  confidence: 68, aiSource: 'Micro: "Lymphovascular invasion present"', value: 'Present',                  aiValue: 'Present',                  dirty: false, verification: 'unverified' },
          ],
          marginFields: [
            { id: 'margin_status',  label: 'Margin Status',           type: 'text',    required: true,  confidence: 91, aiSource: 'Micro: "margins negative"',          value: 'Negative', aiValue: 'Negative', dirty: false, verification: 'unverified' },
            { id: 'closest_margin', label: 'Closest Margin Distance', type: 'text',    required: false, confidence: 87, aiSource: 'Micro: "closest margin...0.3 cm"',   value: '0.3 cm',   aiValue: '0.3 cm',   dirty: false, verification: 'unverified' },
          ],
          biomarkerFields: [],
          // ── Child modules called by this CAP protocol ──────────────────────
          children: [
            {
              instanceId: 'inst-1-1-1',
              templateId: 'cap_erpr_1.0',
              title: 'ER / PR IHC Panel',
              status: 'draft',
              specimenComment: '',
              codes: [
                { id: 'ai-2', system: 'SNOMED', code: '414737002', display: 'ER positive breast carcinoma', source: 'ai' },
                { id: 'ai-3', system: 'SNOMED', code: '414739004', display: 'PR positive breast carcinoma', source: 'ai' },
                { id: 'ai-5', system: 'ICD',    code: 'Z17.0',     display: 'Estrogen receptor positive status [ER+]', source: 'ai' },
              ],
              tumorFields: [],
              marginFields: [],
              biomarkerFields: [
                { id: 'er_status', label: 'ER Status', type: 'text', required: true,  confidence: 96, aiSource: 'IHC: "ER Positive"', value: 'Positive (95%, strong)',    aiValue: 'Positive (95%, strong)',    dirty: false, verification: 'unverified' },
                { id: 'pr_status', label: 'PR Status', type: 'text', required: true,  confidence: 95, aiSource: 'IHC: "PR Positive"', value: 'Positive (80%, moderate)', aiValue: 'Positive (80%, moderate)', dirty: false, verification: 'unverified' },
              ],
              children: [],
            },
            {
              instanceId: 'inst-1-1-2',
              templateId: 'cap_her2_1.0',
              title: 'HER2 IHC Panel',
              status: 'draft',
              specimenComment: '',
              codes: [
                { id: 'ai-4', system: 'SNOMED', code: '431396003', display: 'HER2 negative breast carcinoma', source: 'ai' },
              ],
              tumorFields: [],
              marginFields: [],
              biomarkerFields: [
                { id: 'her2_ihc',   label: 'HER2 IHC Score',  type: 'text', required: true,  confidence: 97, aiSource: 'IHC: "HER2 Negative"', value: '1+ (Negative)',  aiValue: '1+ (Negative)',  dirty: false, verification: 'unverified' },
                { id: 'her2_fish',  label: 'HER2 FISH Result', type: 'text', required: false, confidence: 0,  aiSource: '',                     value: '',               aiValue: '',               dirty: false, verification: 'unverified' },
              ],
              children: [],
            },
          ],
        },
      ],
    },
    {
      specimenId: 2,
      specimenName: 'Sentinel Lymph Nodes',
      specimenStatus: 'alert',
      specimenComment: '',
      reports: [
        {
          instanceId: 'inst-2-1',
          templateId: 'cap_lymphnode_1.0',
          title: 'Lymph Node — Sentinel',
          status: 'draft',
          specimenComment: '',
          codes: [],
          tumorFields: [
            { id: 'ln_status',  label: 'Lymph Node Status', type: 'text',    required: true,  confidence: 72, aiSource: 'Micro: "metastatic carcinoma"', value: 'Positive', aiValue: 'Positive', dirty: false, verification: 'unverified' },
            { id: 'ln_number',  label: 'Number of Nodes',   type: 'text',    required: true,  confidence: 85, aiSource: 'Gross: "3 lymph nodes"',        value: '3',         aiValue: '3',        dirty: false, verification: 'unverified' },
          ],
          marginFields: [],
          biomarkerFields: [],
          children: [],
        },
      ],
    },
    {
      specimenId: 3,
      specimenName: 'Additional Margins',
      specimenStatus: 'pending',
      specimenComment: '',
      reports: [
        {
          instanceId: 'inst-3-1',
          templateId: 'cap_margins_1.0',
          title: 'Additional Margins',
          status: 'draft',
          specimenComment: '',
          codes: [],
          tumorFields: [],
          marginFields: [
            { id: 'add_margin_status',  label: 'Margin Status',  type: 'text',    required: true,  confidence: 0,   aiSource: '', value: '', aiValue: '', dirty: false, verification: 'unverified' },
          ],
          biomarkerFields: [],
          children: [],
        },
      ],
    },
  ],
});

// Mock similar cases for the Similar Cases panel
const mockSimilarCases = [
  {
    accession: "S24-1122",
    diagnosis: "Invasive ductal carcinoma",
    similarity: 0.87,
    matchReason: "Diagnosis, morphology, ER/PR/HER2 profile",
  },
  {
    accession: "S23-9981",
    diagnosis: "Invasive lobular carcinoma",
    similarity: 0.74,
    matchReason: "Morphology, specimen type",
  }
];


// ─── localStorage helpers ─────────────────────────────────────────────────────

const isCaseDataValid = (data: unknown): data is CaseData => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.synoptics) || d.synoptics.length === 0) return false;
  // Must have the new tree shape: each specimen has a `reports` array
  return d.synoptics.every(
    (s: unknown) => s && typeof s === 'object' && Array.isArray((s as Record<string, unknown>).reports)
  );
};

const loadCase = (caseId: string): CaseData => {
  try {
    const raw = localStorage.getItem(LS_KEY(caseId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isCaseDataValid(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return makeMockCase(caseId);
};

const saveCase = (caseId: string, data: CaseData) => {
  try {
    localStorage.setItem(LS_KEY(caseId), JSON.stringify(data));
  } catch { /* ignore */ }
};


// ─── Code helpers ─────────────────────────────────────────────────────────────

const SOURCE_META: Record<CodeSource, { label: string; color: string; bg: string; removable: boolean }> = {
  system: { label: 'CAP/System', color: '#5b21b6', bg: '#ede9fe', removable: false },
  ai:     { label: 'AI',         color: '#0369a1', bg: '#e0f2fe', removable: true  },
  manual: { label: 'Manual',     color: '#065f46', bg: '#d1fae5', removable: true  },
};

const MOCK_CODES: Omit<MedicalCode, 'id' | 'source'>[] = [
  { system: 'SNOMED', code: '413448000', display: 'Invasive ductal carcinoma of breast'                            },
  { system: 'SNOMED', code: '416940007', display: 'Lymphovascular invasion present'                                },
  { system: 'SNOMED', code: '372064008', display: 'Nottingham grade 2 breast carcinoma'                            },
  { system: 'SNOMED', code: '414737002', display: 'ER positive breast carcinoma'                                   },
  { system: 'SNOMED', code: '414739004', display: 'PR positive breast carcinoma'                                   },
  { system: 'SNOMED', code: '431396003', display: 'HER2 negative breast carcinoma'                                 },
  { system: 'SNOMED', code: '24689008',  display: 'Total mastectomy'                                               },
  { system: 'SNOMED', code: '261665006', display: 'Sentinel lymph node biopsy'                                     },
  { system: 'ICD',    code: 'C50.512',   display: 'Malignant neoplasm of lower-outer quadrant of left female breast'},
  { system: 'ICD',    code: 'Z17.0',     display: 'Estrogen receptor positive status [ER+]'                        },
  { system: 'ICD',    code: 'C77.3',     display: 'Secondary malignant neoplasm of axillary lymph nodes'           },
  { system: 'ICD',    code: 'Z85.3',     display: 'Personal history of malignant neoplasm of breast'              },
];

// ─── CodeBadge ────────────────────────────────────────────────────────────────

const CodeBadge: React.FC<{ code: MedicalCode; onRemove?: (id: string) => void; readOnly?: boolean }> = ({ code, onRemove, readOnly }) => {
  const m = SOURCE_META[code.source];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'white', border: '1px solid #e2e8f0', marginBottom: '6px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '3px' }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: '#1e293b', background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px' }}>{code.code}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px', background: m.bg, color: m.color }}>{m.label}</span>
          {!m.removable && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🔒</span>}
        </div>
        <div style={{ fontSize: '13px', color: '#1e293b' }}>{code.display}</div>
      </div>
      {m.removable && onRemove && !readOnly && (
        <button onClick={() => onRemove(code.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '16px', padding: '0 2px', flexShrink: 0, lineHeight: 1 }} title="Remove">✕</button>
      )}
    </div>
  );
};

// ─── AddCodeModal ─────────────────────────────────────────────────────────────
// Command-palette style: instant search, keyboard nav, SNOMED/ICD toggle,
// specimen strip at bottom. One view, no steps, no page turns.

interface SpecimenOption { index: number; id: number; name: string; }

interface AddCodeModalProps {
  existingCodes: MedicalCode[];
  allSpecimens: SpecimenOption[];
  activeSpecimenIndex: number;
  onAddToSpecimens: (codes: Omit<MedicalCode, 'id' | 'source'>[], specimenIndices: number[]) => void;
  onClose: () => void;
}

const SYSTEM_META = {
  SNOMED: { label: 'SNOMED CT', color: '#0f766e', bg: '#f0fdfa', border: '#5eead4' },
  ICD:    { label: 'ICD-10',    color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
};

const AddCodeModal: React.FC<AddCodeModalProps> = ({
  existingCodes, allSpecimens, activeSpecimenIndex, onAddToSpecimens, onClose,
}) => {
  const [query,    setQuery]    = useState('');
  const [system,   setSystem]   = useState<'SNOMED' | 'ICD'>('SNOMED');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focused,  setFocused]  = useState<number>(-1);
  const [targetSpecimens, setTargetSpecimens] = useState<Set<number>>(new Set([activeSpecimenIndex]));
  const inputRef = React.useRef<HTMLInputElement>(null);

  const meta = SYSTEM_META[system];

  // Results — instant, no debounce needed for a small local dataset
  const results = React.useMemo(() => {
    const pool = MOCK_CODES.filter(c => c.system === system);
    if (!query.trim()) return pool.slice(0, 12);
    const q = query.toLowerCase();
    return pool.filter(c =>
      c.code.toLowerCase().includes(q) || c.display.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query, system]);

  const allPool = MOCK_CODES.filter(c => c.system === system);

  const toggleCode = (key: string) => setSelected(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });

  const toggleSpecimen = (idx: number) => setTargetSpecimens(prev => {
    const next = new Set(prev); next.has(idx) ? next.delete(idx) : next.add(idx); return next;
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter' && focused >= 0) {
      const r = results[focused];
      if (r && !existingCodes.some(c => c.code === r.code)) toggleCode(r.code);
    }
    if (e.key === 'Escape') onClose();
  };

  const handleAssign = () => {
    const codesToAdd = allPool.filter(r => selected.has(r.code));
    onAddToSpecimens(codesToAdd, Array.from(targetSpecimens));
    onClose();
  };

  const canAssign = selected.size > 0 && targetSpecimens.size > 0;

  // Switch system — clear selection
  const switchSystem = (s: 'SNOMED' | 'ICD') => {
    setSystem(s); setSelected(new Set()); setFocused(-1);
    inputRef.current?.focus();
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '580px', background: 'white', borderRadius: '16px', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '80vh' }}>

        {/* ── Search bar + system toggle ── */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
          {/* System toggle pill */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
              {(['SNOMED', 'ICD'] as const).map(s => (
                <button key={s} onClick={() => switchSystem(s)} style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: system === s ? SYSTEM_META[s].color : 'transparent', color: system === s ? 'white' : '#64748b' }}>
                  {s === 'SNOMED' ? 'SNOMED CT' : 'ICD-10'}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <span style={{ fontSize: '12px', color: meta.color, fontWeight: 600, marginLeft: '6px' }}>
                {selected.size} selected
              </span>
            )}
          </div>

          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px', pointerEvents: 'none' }}>🔍</span>
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setFocused(-1); }}
              onKeyDown={handleKeyDown}
              placeholder={system === 'SNOMED' ? 'Search SNOMED CT — code or term…' : 'Search ICD-10 — code or description…'}
              style={{ width: '100%', padding: '10px 12px 10px 36px', border: `1.5px solid ${meta.border}`, borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: meta.bg }}
            />
            {query && (
              <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0 }}>✕</button>
            )}
          </div>
        </div>

        {/* ── Results list ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No results for "{query}"</div>
          ) : results.map((r, i) => {
            const already = existingCodes.some(c => c.code === r.code && c.system === r.system);
            const isSel   = selected.has(r.code);
            const isFocus = focused === i;
            return (
              <div
                key={r.code}
                onClick={() => { if (!already) toggleCode(r.code); }}
                onMouseEnter={() => setFocused(i)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderLeft: `3px solid ${isSel ? meta.color : 'transparent'}`, background: isFocus && !isSel ? '#f8fafc' : isSel ? meta.bg : 'white', cursor: already ? 'default' : 'pointer', transition: 'background 0.1s', borderBottom: '1px solid #f8fafc' }}
              >
                {/* Checkbox */}
                <div style={{ width: 17, height: 17, borderRadius: 4, border: `2px solid ${already ? '#e2e8f0' : isSel ? meta.color : '#cbd5e1'}`, background: isSel ? meta.color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                  {isSel && <span style={{ color: 'white', fontSize: '10px', fontWeight: 900 }}>✓</span>}
                </div>
                {/* Code + label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '11px', color: meta.color, background: meta.bg, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${meta.color}33`, flexShrink: 0 }}>{r.code}</span>
                    <span style={{ fontSize: '13px', color: already ? '#94a3b8' : '#1e293b', fontWeight: isSel ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.display}</span>
                  </div>
                </div>
                {already && <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✓ Added</span>}
              </div>
            );
          })}
        </div>

        {/* ── Specimen strip ── */}
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 16px', background: '#f8fafc' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Assign to</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {allSpecimens.map(sp => {
              const checked   = targetSpecimens.has(sp.index);
              const isCurrent = sp.index === activeSpecimenIndex;
              return (
                <button
                  key={sp.index}
                  onClick={() => toggleSpecimen(sp.index)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: `1.5px solid ${checked ? '#0891B2' : '#e2e8f0'}`, background: checked ? '#e0f2fe' : 'white', color: checked ? '#0369a1' : '#64748b', cursor: 'pointer', transition: 'all 0.12s' }}
                  title={sp.name}
                >
                  {checked && <span style={{ fontSize: '10px' }}>✓</span>}
                  <span>Specimen {sp.id}</span>
                  {isCurrent && <span style={{ fontSize: '9px', opacity: 0.7 }}>★</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {canAssign
              ? <span style={{ color: '#1e293b' }}><strong>{selected.size}</strong> code{selected.size !== 1 ? 's' : ''} → <strong>{targetSpecimens.size}</strong> specimen{targetSpecimens.size !== 1 ? 's' : ''}</span>
              : 'Select codes above · ↑↓ to navigate · Enter to toggle'
            }
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ padding: '7px 14px', background: 'none', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>Cancel</button>
            <button onClick={handleAssign} disabled={!canAssign}
              style={{ padding: '7px 18px', background: canAssign ? meta.color : '#e2e8f0', color: canAssign ? 'white' : '#94a3b8', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: canAssign ? 'pointer' : 'default', transition: 'all 0.15s' }}>
              ✓ Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── CodesPanel ───────────────────────────────────────────────────────────────

const CodesPanel: React.FC<{
  codes: MedicalCode[];
  onRemove: (id: string) => void;
  onAddToSpecimens: (codes: Omit<MedicalCode, 'id' | 'source'>[], specimenIndices: number[]) => void;
  allSpecimens: SpecimenOption[];
  activeSpecimenIndex: number;
  readOnly?: boolean;
}> = ({ codes, onRemove, onAddToSpecimens, allSpecimens, activeSpecimenIndex, readOnly }) => {
  const [codeTab,  setCodeTab]  = useState<'SNOMED' | 'ICD'>('SNOMED');
  const [showModal, setShowModal] = useState(false);

  const displayed   = codes.filter(c => c.system === codeTab);
  const snomedCount = codes.filter(c => c.system === 'SNOMED').length;
  const icdCount    = codes.filter(c => c.system === 'ICD').length;

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '14px', fontSize: '11px' }}>
        {Object.entries(SOURCE_META).map(([k, v]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ padding: '1px 6px', borderRadius: '10px', background: v.bg, color: v.color, fontWeight: 700 }}>{v.label}</span>
            {k === 'system' ? '= CAP/RCPath (locked)' : k === 'ai' ? '= AI-assigned' : '= Manual (yours)'}
          </span>
        ))}
      </div>

      {/* View tabs (SNOMED / ICD) + single Add Code button */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
        {(['SNOMED', 'ICD'] as const).map(sys => (
          <button key={sys} onClick={() => setCodeTab(sys)}
            style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s', background: codeTab === sys ? (sys === 'SNOMED' ? '#0f766e' : '#0369a1') : 'white', color: codeTab === sys ? 'white' : (sys === 'SNOMED' ? '#0f766e' : '#0369a1'), borderColor: sys === 'SNOMED' ? '#0f766e' : '#0369a1' }}>
            {sys === 'SNOMED' ? 'SNOMED CT' : 'ICD-10'}
            <span style={{ fontSize: '10px', opacity: 0.8, marginLeft: '5px' }}>{sys === 'SNOMED' ? snomedCount : icdCount}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {!readOnly && (
          <button onClick={() => setShowModal(true)}
            style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, border: 'none', background: '#0891B2', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0e7490'}
            onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}>
            + Add Code
          </button>
        )}
      </div>

      {/* Code list */}
      <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
        {displayed.length === 0
          ? <div style={{ color: '#94a3b8', fontSize: '13px', padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
              No {codeTab === 'SNOMED' ? 'SNOMED CT' : 'ICD-10'} codes assigned.
              {!readOnly && <><br/><span style={{ color: '#0891B2', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowModal(true)}>+ Add one now</span></>}
            </div>
          : displayed.map(c => <CodeBadge key={c.id} code={c} onRemove={onRemove} readOnly={readOnly} />)
        }
      </div>

      {showModal && (
        <AddCodeModal
          existingCodes={codes}
          allSpecimens={allSpecimens}
          activeSpecimenIndex={activeSpecimenIndex}
          onAddToSpecimens={onAddToSpecimens}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

// ─── Comment Modal Shell ──────────────────────────────────────────────────────
// Shared draggable 3/4-page modal used by both comment modals.
// Drag by the header bar to reposition anywhere on screen.

const CommentModalShell: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footerLeft?: React.ReactNode;
  editorMode?: boolean;  // removes body padding so ruler renders flush
}> = ({ title, subtitle, onClose, children, footerLeft, editorMode }) => {
  // ── Drag state ────────────────────────────────────────────────────────────
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const dragging = React.useRef(false);
  const dragStart = React.useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    // Don't start drag if clicking the close button
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragging.current = true;
    const current = pos ?? { x: 0, y: 0 };
    dragStart.current = { mx: e.clientX, my: e.clientY, px: current.x, py: current.y };
  };

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // When pos is null the modal sits centred via flexbox (default).
  // Once dragged, we switch to absolute positioning.
  const isPositioned = pos !== null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        background: isPositioned ? 'transparent' : 'rgba(0,0,0,0.55)',
        backdropFilter: isPositioned ? 'none' : 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Once dragging has started, pointer events on the backdrop are off
        // so the backdrop-click-to-close doesn't fire while repositioning
        pointerEvents: 'auto',
      }}
    >
      {/* Invisible full-screen close layer — only active before first drag */}
      {!isPositioned && (
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      )}

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: isPositioned ? 'fixed' : 'relative',
          ...(isPositioned
            ? {
                left: `calc(50% + ${pos!.x}px)`,
                top:  `calc(50% + ${pos!.y}px)`,
                transform: 'translate(-50%, -50%)',
              }
            : {}),
          width: '75vw', height: '85vh',
          background: 'white', borderRadius: '16px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1,
          // Smooth drop shadow when dragging for depth feel
          transition: dragging.current ? 'none' : 'box-shadow 0.2s',
        }}
      >
        {/* Header — drag handle */}
        <div
          onMouseDown={onHeaderMouseDown}
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexShrink: 0,
            cursor: 'grab',
            background: '#f8fafc',
            borderRadius: '16px 16px 0 0',
            userSelect: 'none',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: subtitle ? '4px' : 0 }}>
              {/* Drag grip dots */}
              <span style={{ color: '#cbd5e1', fontSize: '14px', letterSpacing: '1px', flexShrink: 0 }}>⠿</span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
            </div>
            {subtitle && <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '22px' }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px', lineHeight: 1, padding: '2px 0 0 16px', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#475569'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: editorMode ? '0' : '20px 24px', display: 'flex', flexDirection: 'column', gap: editorMode ? '0' : '16px' }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#f8fafc' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '60%' }}>{footerLeft}</div>
          <button
            onClick={onClose}
            style={{ padding: '8px 22px', background: '#0891B2', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0e7490'}
            onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}
          >Save</button>
        </div>
      </div>
    </div>
  );
};

// ─── ReportCommentModal ───────────────────────────────────────────────────────

interface ReportCommentModalProps {
  specimenName: string;     // full breadcrumb string, e.g. "Left Breast Mastectomy › Breast — Invasive Carcinoma"
  specimenId: string;
  content: string;
  isFinalized: boolean;
  onChange: (html: string) => void;
  onClose: () => void;
}

const ReportCommentModal: React.FC<ReportCommentModalProps> = ({
  specimenName, specimenId, content, isFinalized, onChange, onClose,
}) => {
  const isEmpty = !content || content === '<p></p>';
  // Use first breadcrumb segment as the modal title, rest as context
  const parts = specimenName.split(' › ');
  const titleName = parts[0] ?? specimenName;
  return (
    <CommentModalShell
      title={`💬 ${titleName}`}
      subtitle={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {parts.length > 1 && <span style={{ color: '#94a3b8' }}>{parts.slice(1).join(' › ')}</span>}
          {isFinalized
            ? <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#94a3b8', fontWeight: 600 }}>🔒 Finalized — read only</span>
            : isEmpty
              ? <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>No comment yet — start typing below</span>
              : <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>✓ Comment saved — click to edit</span>
          }
        </div>
      }
      onClose={onClose}
      editorMode
      footerLeft="Sent to LIS on finalization. Protocol-defined fields are in the Tumor, Margins & Biomarkers tabs."
    >
      <PathScribeEditor
        key={`modal-report-comment-${specimenId}`}
        content={content}
        placeholder={`Start typing your report comment for ${titleName}…`}
        onChange={onChange}
        minHeight="480px"
        readOnly={isFinalized}
        showRulerDefault={true}
        macros={[]}
        approvedFonts={['Arial', 'Times New Roman', 'Calibri', 'Courier New']}
      />
    </CommentModalShell>
  );
};

// ─── CaseCommentModal ─────────────────────────────────────────────────────────

interface CaseCommentModalProps {
  accession: string;
  caseComments: Partial<Record<CaseRole, string>>;
  onChangeAttending: (html: string) => void;
  onClose: () => void;
}

const CaseCommentModal: React.FC<CaseCommentModalProps> = ({
  accession, caseComments, onChangeAttending, onClose,
}) => (
  <CommentModalShell
    title="📋 Case Comment"
    subtitle={<>Case {accession} — applies to the entire case, not tied to any specimen</>}
    onClose={onClose}
    footerLeft="TODO: Role Dictionary — will show your role's editable comment and other roles read-only."
  >
    {/* ── Attending (editable) ── */}
    {/* TODO: Replace with dynamic currentUserRole once Role/Capabilities Dictionary is built */}
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '10px', background: ROLE_META.attending.bg, color: ROLE_META.attending.color, border: `1px solid ${ROLE_META.attending.border}` }}>
          {ROLE_META.attending.label}
        </span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>— your comment</span>
        {(!caseComments?.attending || caseComments.attending === '<p></p>')
          ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>No comment yet — start typing below</span>
          : <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#d1fae5', color: '#065f46', fontWeight: 600 }}>✓ Comment saved — click to edit</span>
        }
      </div>
      <PathScribeEditor
        key="modal-case-comment-attending"
        content={caseComments?.attending ?? ''}
        placeholder="Enter attending pathologist case comment…"
        onChange={onChangeAttending}
        minHeight="320px"
        showRulerDefault={true}
        macros={[]}
        approvedFonts={['Arial', 'Times New Roman', 'Calibri', 'Courier New']}
      />
    </div>

    {/* ── Resident (read-only collapsible) ── */}
    <OtherRoleComment
      role="resident"
      meta={ROLE_META.resident}
      content={caseComments?.resident ?? ''}
      hasContent={!!(caseComments?.resident && caseComments.resident !== '<p></p>')}
    />
  </CommentModalShell>
);

// ─── OtherRoleComment ─────────────────────────────────────────────────────────
// Read-only collapsible panel showing another role's case comment.

const OtherRoleComment: React.FC<{
  role: CaseRole;
  meta: { label: string; color: string; bg: string; border: string };
  content: string;
  hasContent: boolean;
}> = ({ role: _role, meta, content, hasContent }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div style={{ marginBottom: '10px', border: `1px solid ${hasContent ? meta.border : '#e2e8f0'}`, borderRadius: '8px', overflow: 'hidden' }}>
      <div
        onClick={() => { if (hasContent) setExpanded(v => !v); }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: hasContent ? meta.bg : '#f8fafc', cursor: hasContent ? 'pointer' : 'default' }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: hasContent ? 'white' : '#e2e8f0', color: hasContent ? meta.color : '#94a3b8', border: `1px solid ${hasContent ? meta.border : '#e2e8f0'}` }}>
          {meta.label}
        </span>
        {hasContent
          ? <span style={{ fontSize: '11px', color: meta.color, fontWeight: 600, flex: 1 }}>● Has comment</span>
          : <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1 }}>No comment</span>
        }
        {hasContent && (
          <span style={{ fontSize: '12px', color: meta.color, transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
        )}
      </div>
      {expanded && hasContent && (
        <div
          style={{ padding: '12px 16px', borderTop: `1px solid ${meta.border}`, background: 'white', fontSize: '13px', lineHeight: '1.7', color: '#1e293b' }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
};

// ─── Save toast ───────────────────────────────────────────────────────────────

const SaveToast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <div style={{
    position: 'fixed', bottom: '90px', right: '40px', zIndex: 9999,
    background: '#1e293b', color: 'white', padding: '10px 18px',
    borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.25s ease, transform 0.25s ease',
    pointerEvents: 'none',
    display: 'flex', alignItems: 'center', gap: '8px',
  }}>
    <span style={{ color: '#10B981' }}>✓</span> {message}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const SynopticReportPage: React.FC = () => {
  const { caseId = 'S25-12345' } = useParams<{ caseId: string }>();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const handleLogout = useLogout();

  // ⭐ ACTIVE PATH — [specimenIdx, reportIdx, childIdx?, grandchildIdx?, ...]
  // Length >= 2 means a report node is selected.
  const [activePath, setActivePath] = useState<ActivePath>([0, 0]);
  // Which specimen rows are expanded in the sidebar
  const [expandedSpecimens, setExpandedSpecimens] = useState<Set<number>>(new Set([0]));

  // ⭐ FLAG MANAGER STATE
  const [flagCaseData,    setFlagCaseData]    = useState<CaseWithFlags | null>(null);
  const [flagDefinitions, setFlagDefinitions] = useState<FlagDefinition[]>([]);
  const [showFlagManager, setShowFlagManager] = useState(false);
  const [isSimilarCasesOpen, setIsSimilarCasesOpen] = useState(false);

  // Load flag data once on mount (or whenever caseId changes)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [cwd, defs] = await Promise.all([
          getCaseWithFlags(caseId),
          getFlags(),
        ]);
        if (!cancelled) {
          setFlagCaseData(cwd);
          setFlagDefinitions(defs);
        }
      } catch (e) {
        console.error('Failed to load flag data', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [caseId]);


  // ── Core page state ────────────────────────────────────────────────────────
  const [isLoaded, setIsLoaded]                         = useState(false);
  const [isProfileOpen, setIsProfileOpen]               = useState(false);
  const [isResourcesOpen, setIsResourcesOpen]           = useState(false);
  const [showAbout, setShowAbout]                       = useState(false);
  const [isAlertExpanded, setIsAlertExpanded]           = useState(true);
  const [activeSynopticTab, setActiveSynopticTab]       = useState<'tumor' | 'margins' | 'biomarkers' | 'codes'>('tumor');
  const [showReportCommentModal, setShowReportCommentModal] = useState(false);
  const [showCaseCommentModal,   setShowCaseCommentModal]   = useState(false);
  const [isExpandedView, setIsExpandedView]             = useState(false);
  const [showAddSynopticModal, setShowAddSynopticModal] = useState(false);
  const [_commentModal, _setCommentModal]                 = useState<{ field: SynopticField; group: FieldGroup; sectionLabel: string } | null>(null);
  const [selectedSpecimens, setSelectedSpecimens]       = useState<number[]>([]);
  const [selectedProtocol, setSelectedProtocol]         = useState('');
  const [protocolSearch, setProtocolSearch]             = useState('');
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false);
  const [learnPairing, setLearnPairing]                 = useState(true);
  const [showWarning, setShowWarning]                   = useState(false);
  const [pendingNavigation, setPendingNavigation]       = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal]           = useState(false);  
  const [hasUnsavedData, setHasUnsavedData]             = useState(false);

  // ── Active field source highlighting ──────────────────────────────────────
  // When a synoptic field is focused, activeFieldSource holds its aiSource string.
  // The left report panel uses this to dynamically highlight the matching phrase.
  const [activeFieldSource, setActiveFieldSource]       = useState<string | null>(null);
  const reportPanelRef                                  = useRef<HTMLDivElement>(null);

  // ── Finalize password modal ─────────────────────────────────────────────────
  const [showFinalizeModal, setShowFinalizeModal]       = useState(false);
  const [finalizeAndNext,   setFinalizeAndNext]         = useState(false);
  const [finalizePassword,  setFinalizePassword]        = useState('');
  const [finalizeError,     setFinalizeError]           = useState('');

  // ── Case sign-out modal (all synoptics finalized) ──────────────────────────
  const [showSignOutModal,  setShowSignOutModal]        = useState(false);
  const [signOutUser,       setSignOutUser]             = useState('');
  const [signOutPassword,   setSignOutPassword]         = useState('');
  const [signOutError,      setSignOutError]            = useState('');
  const [caseSigned,        setCaseSigned]              = useState(false);

  // ── Addendum modal ──────────────────────────────────────────────────────────
  const [showAddendumModal,  setShowAddendumModal]      = useState(false);
  const [addendumText,       setAddendumText]           = useState('');

  // ── LIS config — read from SystemConfigContext (set in Configuration → System → LIS) ──
  const { config: systemConfig } = useSystemConfig();
  const lisIntegrationEnabled          = systemConfig.lisIntegrationEnabled;
  const allowPathScribePostFinalActions = systemConfig.allowPathScribePostFinalActions;

  // Amendment is shown only when LIS integration is off (PathScribe owns the workflow).
  // When LIS is on, allowPathScribePostFinalActions controls Addendum/Amendment visibility.
  const showAmendmentButton = !lisIntegrationEnabled || allowPathScribePostFinalActions;
  const [toastMsg, setToastMsg]                         = useState('');
  const [toastVisible, setToastVisible]                 = useState(false);
  const toastTimer                                      = useRef<ReturnType<typeof setTimeout>>();

  // ── Case data (the whole thing lives here) ─────────────────────────────────
  const [caseData, setCaseData] = useState<CaseData>(() => loadCase(caseId));

  

  const activeSynoptic = getNodeAtPath(caseData.synoptics, activePath);
  const activeSpecimenIndex = activePath[0] ?? 0;
  const isFinalized = activeSynoptic?.status === 'finalized';

  // ── Auth role (replace with real auth role when available) ────────────────
  // user.role should come from AuthContext in production
  // TODO: Wire to Role/Capabilities dictionary when that module is built.
  // currentUserRole will come from AuthContext once user.role is defined.
  // const _rawRole = (user as any)?.role;
  // const currentUserRole: CaseRole = (Object.keys(ROLE_META) as CaseRole[]).includes(_rawRole)
  //   ? (_rawRole as CaseRole)
  //   : 'attending';

  // Derived helpers
  const hasCaseComment = Object.values(caseData.caseComments ?? {}).some(
    v => v && v !== '<p></p>'
  );

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastVisible(true);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800);
  };

  // ── Field update helpers ───────────────────────────────────────────────────
  type FieldGroup = 'tumorFields' | 'marginFields' | 'biomarkerFields';

  const updateField = useCallback((group: FieldGroup, fieldId: string, value: string) => {
    setCaseData(prev => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, node => ({
        ...node,
        [group]: (node[group] as SynopticField[]).map(f =>
          f.id === fieldId ? { ...f, value, dirty: value !== f.aiValue } : f
        ),
      })),
    }));
    setHasUnsavedData(true);
  }, [activePath]);

  const updateVerification = useCallback((group: FieldGroup, fieldId: string, verification: FieldVerification) => {
    setCaseData(prev => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, node => ({
        ...node,
        [group]: (node[group] as SynopticField[]).map(f =>
          f.id === fieldId ? { ...f, verification } : f
        ),
      })),
    }));
    setHasUnsavedData(true);
  }, [activePath]);

  const updateSpecimenComment = useCallback((html: string) => {
    setCaseData(prev => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, node => ({
        ...node, specimenComment: html,
      })),
    }));
    setHasUnsavedData(true);
  }, [activePath]);

  const updateCaseComment = useCallback((role: CaseRole, html: string) => {
    setCaseData(prev => ({
      ...prev,
      caseComments: { ...prev.caseComments, [role]: html },
    }));
    setHasUnsavedData(true);
  }, []);

  // ── Code helpers ───────────────────────────────────────────────────────────
  const removeCode = useCallback((codeId: string) => {
    setCaseData(prev => ({
      ...prev,
      synoptics: updateNodeAtPath(prev.synoptics, activePath, node => ({
        ...node, codes: node.codes.filter(c => c.id !== codeId),
      })),
    }));
    setHasUnsavedData(true);
  }, [activePath]);

  // Adds multiple codes to one or more specimens' active report nodes
  const addCodesToSpecimens = useCallback((
    codes: Omit<MedicalCode, 'id' | 'source'>[],
    specimenIndices: number[]
  ) => {
    setCaseData(prev => ({
      ...prev,
      synoptics: prev.synoptics.map((s, si) => {
        if (!specimenIndices.includes(si)) return s;
        // Add to first report of each targeted specimen
        return updateNodeAtPath([s], [0, 0], node => {
          const newCodes = codes
            .filter(c => !node.codes.some(ex => ex.code === c.code && ex.system === c.system))
            .map((c, j) => ({ ...c, id: `manual-${Date.now()}-${si}-${j}`, source: 'manual' as const }));
          return { ...node, codes: [...node.codes, ...newCodes] };
        })[0];
      }),
    }));
    setHasUnsavedData(true);
  }, []);

  // ── Derived: all synoptics finalized? ─────────────────────────────────────
  const allSynopticsFinalized = caseData.synoptics.every(spec =>
    spec.reports.every(r => r.status === 'finalized')
  );

  // ── Find the next unfinalized path after the current one ──────────────────
  const getNextUnfinalizedPath = useCallback((): ActivePath | null => {
    const all: ActivePath[] = [];
    const collectPaths = (nodes: SynopticReportNode[], pathSoFar: ActivePath) => {
      nodes.forEach((node, i) => {
        const p: ActivePath = [...pathSoFar, i];
        all.push(p);
        collectPaths(node.children, p);
      });
    };
    caseData.synoptics.forEach((spec, si) => collectPaths(spec.reports, [si]));
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

  // ── Save and advance to next unfinalized report ────────────────────────────
  const handleSaveAndNext = useCallback(() => {
    saveCase(caseId, caseData);
    setHasUnsavedData(false);
    showToast('Draft saved');
    const next = getNextUnfinalizedPath();
    if (next) { setActivePath(next); setActiveSynopticTab('tumor'); }
    else showToast('All reports up to date — no next unfinalized report');
  }, [caseId, caseData, getNextUnfinalizedPath]);

  // ── Open finalize password modal ───────────────────────────────────────────
  const openFinalizeModal = (andNext: boolean) => {
    setFinalizePassword('');
    setFinalizeError('');
    setFinalizeAndNext(andNext);
    setShowFinalizeModal(true);
  };

  // ── Confirm finalization (password check) ──────────────────────────────────
  const handleFinalizeConfirm = useCallback(() => {
    // Mock password check — in production validate against auth system
    if (finalizePassword.length < 4) {
      setFinalizeError('Incorrect password. Please try again.');
      return;
    }
    const updated: CaseData = {
      ...caseData,
      synoptics: updateNodeAtPath(caseData.synoptics, activePath, finalizeNodeAndChildren),
    };
    setCaseData(updated);
    saveCase(caseId, updated);
    setHasUnsavedData(false);
    setShowFinalizeModal(false);
    setFinalizePassword('');
    setFinalizeError('');
    showToast(`${activeSynoptic?.title ?? 'Report'} finalized`);

    // Check if all synoptics are now finalized
    const nowAllFinalized = updated.synoptics.every(spec =>
      spec.reports.every(r => r.status === 'finalized')
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
      if (next) { setActivePath(next); setActiveSynopticTab('tumor'); }
    }
  }, [finalizePassword, caseId, caseData, activePath, activeSynoptic, finalizeAndNext, caseSigned, getNextUnfinalizedPath]);

  // ── Case sign-out ──────────────────────────────────────────────────────────
  const handleCaseSignOut = useCallback(() => {
    if (!signOutUser.trim() || signOutPassword.length < 4) {
      setSignOutError('Please enter your username and password.');
      return;
    }
    setCaseSigned(true);
    setShowSignOutModal(false);
    showToast(`Case ${caseData.accession} signed out`);
  }, [signOutUser, signOutPassword, caseData.accession]);

  // ── Finalize — cascades to all children ───────────────────────────────────
  // (kept for internal use; UI now calls openFinalizeModal)
  

  // ── Navigation guard ───────────────────────────────────────────────────────
  const guard = (dest: string) => {
    if (hasUnsavedData) { setPendingNavigation(dest); setShowWarning(true); }
    else navigate(dest);
  };
  const confirmNavigation = () => {
    if (pendingNavigation) { setHasUnsavedData(false); navigate(pendingNavigation); }
  };

  useEffect(() => { const t = setTimeout(() => setIsLoaded(true), 100); return () => clearTimeout(t); }, []);

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
    { id: '3', label: 'Margins', status: 'current' as const },
    { id: '4', label: 'Biomarkers', status: 'alert' as const },
    { id: '5', label: 'Finalize', status: 'pending' as const },
  ];

  const stepCircle = (status: string): React.CSSProperties => {
    const b: React.CSSProperties = { width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '11px', marginBottom: '6px', border: '2px solid' };
    return status === 'completed' ? { ...b, background: '#0891B2', color: 'white', borderColor: '#0891B2' }
         : status === 'current'   ? { ...b, background: 'white', color: '#0891B2', borderColor: '#0891B2', boxShadow: '0 0 0 4px rgba(8,145,178,0.1)' }
         : status === 'alert'     ? { ...b, background: 'white', color: '#F59E0B', borderColor: '#fde047', boxShadow: '0 0 0 4px rgba(253,224,71,0.2)' }
         :                          { ...b, background: 'white', color: '#94a3b8', borderColor: '#e2e8f0' };
  };

  const iconBtn = (content: React.ReactNode, action: () => void, title: string, circle = false) => (
    <button onClick={action} title={title}
      style={{ width: '42px', height: '42px', borderRadius: circle ? '50%' : '8px', background: 'transparent', border: '2px solid #0891B2', color: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800 }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.1)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >{content}</button>
  );

  // ── renderField: type determines the component ─────────────────────────────
  const renderField = (field: SynopticField, group: FieldGroup) => {
    // Comment-type fields are hidden — case and specimen comments cover this
    if (field.type === 'comment') return null;
    const vStatus = field.verification ?? 'unverified';
    const isDirty = field.dirty ?? false;
    const isHigh = (field.confidence ?? 0) >= 85;
    const bgColor = isFinalized ? '#f8fafc' : vStatus === 'verified' ? '#f0fdf4' : vStatus === 'disputed' ? '#fef2f2' : 'white';
    const borderColor = isFinalized ? '#e2e8f0' : vStatus === 'verified' ? '#86efac' : vStatus === 'disputed' ? '#fca5a5' : '#e2e8f0';
    const isActiveSource = !isFinalized && activeFieldSource && field.aiSource && field.aiSource === activeFieldSource;
    const fieldInputRef = React.createRef<HTMLInputElement>();

    const renderVerificationBadge = () => {
      if (vStatus === 'verified') {
        return (
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, background: '#bbf7d0', color: '#14532d', display: 'flex', alignItems: 'center', gap: '3px' }}>
            ✓ AI Confirmed
          </span>
        );
      }
      if (vStatus === 'disputed') {
        return (
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, background: '#fecaca', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '3px' }}>
            ✎ Overridden
          </span>
        );
      }
      // unverified — show AI confidence score
      const badge = isHigh ? { bg: '#86efac', color: '#14532d' } : { bg: '#fde047', color: '#713f12' };
      return (
        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', fontWeight: 600, background: badge.bg, color: badge.color }}>
          {isHigh ? '✓' : '⚠'} {field.confidence}%
        </span>
      );
    };

    return (
      <div
        key={field.id}
        style={{
          padding: '8px', borderRadius: '6px', background: bgColor,
          border: `2px solid ${isActiveSource ? '#0891B2' : borderColor}`,
          marginBottom: '8px',
          boxShadow: isActiveSource ? '0 0 0 3px rgba(8,145,178,0.15)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          {/* Left: label + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: isFinalized ? '#94a3b8' : '#1e293b' }}>
              {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
            </span>
            {isDirty && !isFinalized && (
              <span style={{ fontSize: '10px', background: '#ede9fe', color: '#5b21b6', padding: '1px 5px', borderRadius: '6px', fontWeight: 600, flexShrink: 0 }}>edited</span>
            )}
            {isFinalized && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🔒</span>}
          </div>
          {/* Right: verification badge + action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            {renderVerificationBadge()}
            {!isFinalized && field.confidence < 100 && (
              <>
                <button
                  title="Confirm AI — I've reviewed the source and the AI value is correct"
                  onClick={() => updateVerification(group, field.id, vStatus === 'verified' ? 'unverified' : 'verified')}
                  style={{
                    height: '24px', padding: '0 8px', borderRadius: '12px', border: '1.5px solid',
                    background: vStatus === 'verified' ? '#10B981' : 'white',
                    borderColor: vStatus === 'verified' ? '#10B981' : '#d1d5db',
                    color: vStatus === 'verified' ? 'white' : '#6b7280',
                    cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '3px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (vStatus !== 'verified') { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981'; }}}
                  onMouseLeave={e => { if (vStatus !== 'verified') { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}}
                >✓ Confirm</button>
                <button
                  title="Override — The AI value is incorrect. Click to edit this field."
                  onClick={() => {
                    updateVerification(group, field.id, vStatus === 'disputed' ? 'unverified' : 'disputed');
                    // Auto-focus the input so the pathologist can immediately correct the value
                    setTimeout(() => fieldInputRef.current?.focus(), 50);
                  }}
                  style={{
                    height: '24px', padding: '0 8px', borderRadius: '12px', border: '1.5px solid',
                    background: vStatus === 'disputed' ? '#ef4444' : 'white',
                    borderColor: vStatus === 'disputed' ? '#ef4444' : '#d1d5db',
                    color: vStatus === 'disputed' ? 'white' : '#6b7280',
                    cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '3px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (vStatus !== 'disputed') { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}}
                  onMouseLeave={e => { if (vStatus !== 'disputed') { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#6b7280'; }}}
                >✎ Override</button>
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
          onFocus={() => { if (field.aiSource) setActiveFieldSource(field.aiSource); }}
          onBlur={() => setActiveFieldSource(null)}
          style={{
            width: '100%', padding: '8px', border: `2px solid ${borderColor}`,
            borderRadius: '6px', fontSize: '13px',
            background: isFinalized ? '#f1f5f9' : 'white',
            color: isFinalized ? '#94a3b8' : '#1e293b',
            cursor: isFinalized ? 'not-allowed' : 'text',
            boxSizing: 'border-box',
          }}
        />
        {field.aiSource && !isFinalized && (
          <div style={{
            fontSize: '10px', marginTop: '4px', fontStyle: 'italic',
            color: isActiveSource ? '#0891B2' : '#94a3b8',
            fontWeight: isActiveSource ? 600 : 400,
            transition: 'color 0.15s',
          }}>
            {isActiveSource ? '◀ Highlighted in report — ' : 'AI source: '}
            {field.aiSource}
          </div>
        )}
      </div>
    );
  };

  // ── Tab config ─────────────────────────────────────────────────────────────
  const tabs: { key: typeof activeSynopticTab; label: string }[] = [
    { key: 'tumor',      label: `Tumor (${activeSynoptic?.tumorFields.filter(f => f.type !== 'comment').length ?? 0})`      },
    { key: 'margins',    label: `Margins (${activeSynoptic?.marginFields.filter(f => f.type !== 'comment').length ?? 0})`   },
    { key: 'biomarkers', label: `Biomarkers (${activeSynoptic?.biomarkerFields.filter(f => f.type !== 'comment').length ?? 0})` },
    { key: 'codes',      label: `🏷 Codes (${activeSynoptic?.codes.length ?? 0})`         },
  ];

  const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 };

  // ── Sidebar tree helpers ───────────────────────────────────────────────────

  // Check if a given path is within the active path (for auto-expand)
  const isPathActive   = (path: ActivePath) => JSON.stringify(activePath) === JSON.stringify(path);
  const isPathAncestor = (path: ActivePath) =>
    path.length < activePath.length &&
    path.every((v, i) => v === activePath[i]);

  // Recursive tree node renderer
  const renderTreeNode = (
    node: SynopticReportNode,
    path: ActivePath,
    depth: number
  ): React.ReactNode => {
    const isActive   = isPathActive(path);
    const isAncestor = isPathAncestor(path);
    const isExpanded = isActive || isAncestor;
    const hasChildren = node.children.length > 0;
    const nodeFinalized = node.status === 'finalized';

    const allFields = [...node.tumorFields, ...node.marginFields, ...node.biomarkerFields]
      .filter(f => f.type !== 'comment');
    const filled  = allFields.filter(f => f.value).length;
    const total   = allFields.length;
    const incomplete = total > 0 && filled < total;

    return (
      <div key={node.instanceId}>
        <div
          onClick={() => { setActivePath(path); setActiveSynopticTab('tumor'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: `6px 8px 6px ${12 + depth * 16}px`,
            borderRadius: '6px',
            marginBottom: '2px',
            cursor: 'pointer',
            background: isActive ? 'rgba(8,145,178,0.12)' : 'transparent',
            borderLeft: isActive ? '3px solid #0891B2' : '3px solid transparent',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Expand/collapse chevron */}
          <span style={{
            fontSize: '9px', color: '#94a3b8', width: '10px', flexShrink: 0,
            transition: 'transform 0.15s',
            transform: hasChildren && isExpanded ? 'rotate(90deg)' : 'none',
            visibility: hasChildren ? 'visible' : 'hidden',
          }}>▶</span>

          {/* Node icon */}
          <span style={{ fontSize: '12px', flexShrink: 0 }}>
            {nodeFinalized ? '🔒' : depth === 0 ? '📋' : '↳'}
          </span>

          {/* Title + badge */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12px', fontWeight: isActive ? 700 : 500,
              color: isActive ? '#0891B2' : '#1e293b',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {node.title}
            </div>
            {!nodeFinalized && total > 0 && (
              <div style={{ fontSize: '10px', color: incomplete ? '#92400e' : '#047857', marginTop: '1px' }}>
                {filled}/{total} fields
              </div>
            )}
          </div>

          {/* Status dot */}
          {nodeFinalized
            ? <span style={{ fontSize: '10px', color: '#047857' }}>✓</span>
            : incomplete
              ? <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block' }} />
              : <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0, display: 'inline-block' }} />
          }
        </div>

        {/* Children — only render when expanded */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child, ci) =>
              renderTreeNode(child, [...path, ci], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Breadcrumb derived from activePath
  const breadcrumb = getBreadcrumb(caseData.synoptics, activePath);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: "'Inter', sans-serif", opacity: isLoaded ? 1 : 0, transition: 'opacity 0.6s ease', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Background — matches Home and Worklist */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/main_background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, filter: 'brightness(0.3) contrast(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.75) 100%)', zIndex: 1 }} />
      <SaveToast message={toastMsg} visible={toastVisible} />

      {/* ── Report Comment Modal ── */}
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

      {/* ── Case Comment Modal ── */}
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
          <nav style={{ padding: '10px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <img src="/pathscribe-logo-dark.svg" alt="PathScribe AI" style={{ height: '44px', cursor: 'pointer' }} onClick={() => guard('/')} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '20px' }}>
                <span style={{ fontSize: '17px', fontWeight: 600 }}>{user?.name || 'Dr. Johnson'}</span>
                <span style={{ fontSize: '12px', color: '#0891B2', fontWeight: 700 }}>MD, FCAP</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {iconBtn('DJ', () => setIsProfileOpen(!isProfileOpen), 'Profile', true)}
                {iconBtn(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, () => setIsResourcesOpen(!isResourcesOpen), 'Quick Links')}
                {iconBtn(<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>, () => setShowLogoutModal(true), 'Sign Out')}
              </div>
            </div>
          </nav>
        )}

        {/* Header */}
        {!isExpandedView && (
          <div style={{ background: 'white', padding: '8px 40px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
              {[['Home', '/'], ['Worklist', '/worklist']].map(([l, p]) => (
                <React.Fragment key={l}><span onClick={() => guard(p)} style={{ cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.color = '#0891B2')} onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>{l}</span><span style={{ color: '#cbd5e1' }}>›</span></React.Fragment>
              ))}
              <span style={{ color: '#0891B2', fontWeight: 600 }}>Case {caseData.accession}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '1px' }}>Synoptic Report</div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>Case {caseData.accession} · {caseData.protocol}</div>
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
              <div style={{ background: caseSigned ? '#d1fae5' : '#d1fae5', border: '1px solid #86efac', padding: '6px 14px', borderRadius: '8px' }}>
                {caseSigned
                  ? <div style={{ fontWeight: 700, color: '#065f46', fontSize: '12px' }}>✓ Case Signed Out</div>
                  : <>
                      <div style={{ fontWeight: 600, color: '#065f46', fontSize: '12px', marginBottom: '1px' }}>Confidence: {caseData.overallConfidence}%</div>
                      <div style={{ fontSize: '10px', color: '#047857' }}>{caseData.autoPopulated} auto-filled</div>
                    </>
                }
              </div>
            </div>
          </div>
        )}

        {/* Alert bar */}
        {!isExpandedView && (
          <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderTop: 'none', flexShrink: 0 }}>
            <div onClick={() => setIsAlertExpanded(!isAlertExpanded)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 40px', cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#92400e', fontSize: '12px' }}>⚠️ Alert — Lymphovascular Invasion: AI confidence 68%. Please verify.</div>
              <span style={{ fontSize: '12px', color: '#92400e', transform: isAlertExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </div>
            {isAlertExpanded && <div style={{ padding: '0 40px 6px', color: '#78350f', fontSize: '11px', borderTop: '1px solid #fde047', paddingTop: '5px' }}>Review the <strong>Lymphovascular Invasion</strong> field in Tumor Characteristics. AI source: "Lymphovascular invasion is present" — verify against microscopic findings before finalizing.</div>}
          </div>
        )}

        {/* Main */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sidebar */}
          {!isExpandedView && (
            <div style={{ width: '260px', background: 'white', borderRight: '2px solid #e2e8f0', overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

              {/* Case comment strip */}
              <div
                onClick={() => setShowCaseCommentModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '8px', marginBottom: '10px',
                  cursor: 'pointer',
                  background: hasCaseComment ? '#faf5ff' : '#f8fafc',
                  border: `1.5px solid ${hasCaseComment ? '#d8b4fe' : '#e2e8f0'}`,
                  transition: 'all 0.15s',
                }}
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

              {/* Specimens + report tree */}
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '0 4px', marginBottom: '6px' }}>
                Specimens &amp; Reports
              </div>

              {caseData.synoptics.map((specimen, si) => {
                const isExpanded = expandedSpecimens.has(si);
                const isActiveSpecimen = activePath[0] === si;
                const specimenFinalized = specimen.reports.every(r => r.status === 'finalized');

                return (
                  <div key={specimen.specimenId}>
                    {/* Specimen header row */}
                    <div
                      onClick={() => {
                        // Toggle expansion; if not yet active, also navigate to first report
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
                      style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '8px 8px', borderRadius: '8px', marginBottom: '2px',
                        cursor: 'pointer',
                        background: isActiveSpecimen ? '#f0f9ff' : 'transparent',
                        border: `1.5px solid ${isActiveSpecimen ? '#bae6fd' : 'transparent'}`,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (!isActiveSpecimen) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isActiveSpecimen) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Chevron */}
                      <span style={{ fontSize: '9px', color: '#94a3b8', width: '10px', flexShrink: 0, transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                      {/* Specimen status icon */}
                      <span style={{ fontSize: '14px', color: specimenColor(specimen.specimenStatus), flexShrink: 0 }}>{specimenIcon(specimen.specimenStatus)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Specimen {specimen.specimenId}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {specimen.specimenName}
                        </div>
                      </div>
                      {specimenFinalized && <span style={{ fontSize: '10px', color: '#047857', flexShrink: 0 }}>🔒</span>}
                    </div>

                    {/* Report tree — shown when specimen is expanded */}
                    {isExpanded && (
                      <div style={{ marginBottom: '6px' }}>
                        {specimen.reports.map((report, ri) =>
                          renderTreeNode(report, [si, ri], 0)
                        )}
                        {/* Report comment link for active specimen */}
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
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(8,145,178,0.08)'}>
                + Add Report
              </button>
            </div>
          )}

          {/* Split screen */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

            {/* Left: Patient Report (read-only from LIS) */}
            <div ref={reportPanelRef} style={{ width: '50%', background: 'white', borderRight: '3px solid #0891B2', overflowY: 'auto', padding: '12px 32px 32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 12px', borderBottom: '2px solid #0891B2', paddingBottom: '6px' }}>📋 Full Patient Report</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: '#0369a1' }}>
                🔒 <span>Received from LIS — <strong>read-only</strong>. {activeFieldSource ? <strong style={{ color: '#0891B2' }}>Focus a field on the right to highlight its source.</strong> : 'Click a field on the right to highlight its source text.'}</span>
              </div>
              <div style={{ background: '#f0fdfa', borderRadius: '8px', padding: '16px', marginBottom: '20px', fontSize: '14px', border: '1px solid #0891B2' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><strong style={{ color: '#0E7490' }}>Accession:</strong> <span style={{ fontFamily: 'monospace' }}>{caseData.accession}</span></div>
                  <div><strong style={{ color: '#0E7490' }}>Patient:</strong> {caseData.patient}</div>
                  <div><strong style={{ color: '#0E7490' }}>DOB:</strong> {caseData.dob}</div>
                  <div><strong style={{ color: '#0E7490' }}>MRN:</strong> {caseData.mrn}</div>
                </div>
              </div>
              {(() => {
                // Strip the "Section: " prefix from aiSource to get the bare phrase to highlight
                // e.g. 'Gross: "2.3 x 1.8 x 1.5 cm"' → '2.3 x 1.8 x 1.5 cm'
                // e.g. 'Micro: "Lymphovascular invasion present"' → 'Lymphovascular invasion present'
                const activePhrase = activeFieldSource
                  ? activeFieldSource.replace(/^[^:]+:\s*[""]?/, '').replace(/[""]?$/, '').trim()
                  : null;

                // Renders plain text with the active phrase highlighted in teal
                const highlight = (text: string) => {
                  if (!activePhrase) return <>{text}</>;
                  const idx = text.toLowerCase().indexOf(activePhrase.toLowerCase());
                  if (idx === -1) return <>{text}</>;
                  return (
                    <>
                      {text.slice(0, idx)}
                      <mark style={{ background: '#bfdbfe', color: '#1e3a5f', padding: '1px 3px', borderRadius: '3px', fontWeight: 700, outline: '2px solid #3b82f6' }}>
                        {text.slice(idx, idx + activePhrase.length)}
                      </mark>
                      {text.slice(idx + activePhrase.length)}
                    </>
                  );
                };

                const grossText = `Received fresh, labeled "left breast mastectomy" is a 450g specimen. Serially sectioned to reveal a 2.3 x 1.8 x 1.5 cm firm, white mass in the upper outer quadrant, 3 cm from the nipple. The tumor is 0.3 cm from the closest (anterior) margin. Representative sections submitted.`;
                const microText = `Sections show invasive ductal carcinoma, moderately differentiated (Nottingham grade 2: tubules 3, nuclei 2, mitoses 1). Invasive component measures 2.3 cm. Lymphovascular invasion is present. All margins negative, closest (anterior) 0.3 cm. No lymph nodes identified.`;
                const clinicalText = `59-year-old female with palpable mass in left breast. Core biopsy showed invasive ductal carcinoma, ER+/PR+/HER2-. Now presents for definitive surgical management.`;

                return [
                  { title: 'CLINICAL HISTORY', text: clinicalText },
                  { title: 'GROSS DESCRIPTION', text: grossText },
                  { title: 'MICROSCOPIC FINDINGS', text: microText },
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
                {/* Breadcrumb */}
                {breadcrumb.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {breadcrumb.map((crumb, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span style={{ color: '#cbd5e1', fontSize: '11px' }}>›</span>}
                        <span
                          onClick={() => {
                            // Clicking a breadcrumb crumb navigates to that level
                            if (i < breadcrumb.length - 1) setActivePath(activePath.slice(0, i + 1 + (i === 0 ? 1 : i)));
                          }}
                          style={{
                            fontSize: '11px',
                            fontWeight: i === breadcrumb.length - 1 ? 700 : 400,
                            color: i === breadcrumb.length - 1 ? '#0891B2' : '#64748b',
                            cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default',
                            textDecoration: i < breadcrumb.length - 1 ? 'underline' : 'none',
                          }}
                        >{crumb}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '2px solid #0891B2', paddingBottom: '6px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    📝 {activeSynoptic?.title ?? 'Synoptic Checklist'}
                  </h3>
                  {isFinalized
                    ? <span style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>✓ Finalized</span>
                    : hasUnsavedData
                    ? <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>● Unsaved changes</span>
                    : <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#065f46', padding: '3px 10px', borderRadius: '10px', fontWeight: 600 }}>✓ Saved</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveSynopticTab(t.key)}
                      style={{ padding: '7px 13px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeSynopticTab === t.key ? '#0891B2' : 'white', border: `2px solid ${activeSynopticTab === t.key ? '#0891B2' : '#e2e8f0'}`, color: activeSynopticTab === t.key ? 'white' : '#64748b' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
                <style>{`.ProseMirror-menubar, [class*="toolbar"], [class*="Toolbar"] { min-height: 44px !important; }`}</style>

                {activeSynopticTab === 'tumor' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Tumor Characteristics</h4>
                    {activeSynoptic.tumorFields.length > 0
                      ? activeSynoptic.tumorFields.map(f => renderField(f, 'tumorFields'))
                      : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No tumor fields for this specimen.</div>
                    }
                  </div>
                )}

                {activeSynopticTab === 'margins' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Margins</h4>
                    {activeSynoptic.marginFields.length > 0
                      ? activeSynoptic.marginFields.map(f => renderField(f, 'marginFields'))
                      : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No margin fields for this specimen.</div>
                    }
                  </div>
                )}

                {activeSynopticTab === 'biomarkers' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Immunohistochemistry</h4>
                    {activeSynoptic.biomarkerFields.length > 0
                      ? activeSynoptic.biomarkerFields.map(f => renderField(f, 'biomarkerFields'))
                      : <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px', textAlign: 'center' }}>No biomarker fields for this specimen.</div>
                    }
                  </div>
                )}

                {activeSynopticTab === 'codes' && activeSynoptic && (
                  <div style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>SNOMED CT &amp; ICD Codes</h4>
                      {isFinalized && <span style={{ fontSize: '10px', color: '#94a3b8' }}>🔒 locked</span>}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
                      CAP/RCPath system codes are locked. AI-assigned and manual codes can be removed by you.
                    </p>
                    <CodesPanel codes={activeSynoptic.codes} onRemove={removeCode} onAddToSpecimens={addCodesToSpecimens} allSpecimens={caseData.synoptics.map((s,i) => ({ index: i, id: s.specimenId, name: s.specimenName }))} activeSpecimenIndex={activeSpecimenIndex} readOnly={isFinalized} />
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
                    ? <div style={{ color: '#047857', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>✓</span> Case {caseData.accession} signed out
                      </div>
                    : allSynopticsFinalized
                    ? <div style={{ color: '#0891B2', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>🔒</span> All synoptics finalized — ready for sign-out
                      </div>
                    : <div style={{ color: '#047857', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px' }}>🔒</span> {activeSynoptic?.title ?? 'Report'} finalized and locked
                      </div>
                  }
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Addendum — always available on a finalized report */}
                  <button
                    onClick={() => { setAddendumText(''); setShowAddendumModal(true); }}
                    style={{ padding: '8px 16px', border: '1.5px solid #0891B2', borderRadius: '8px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Request an addendum to this finalized report"
                  >📎 Addendum Request</button>

                  <button onClick={() => setShowFlagManager(true)}
                    style={{ padding: '8px 14px', border: '1.5px solid #f59e0b', borderRadius: '8px', background: 'white', color: '#b45309', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Manage flags">🚩 Flags</button>

                  <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
                  <button onClick={() => guard('/worklist')} style={{ padding: '8px 18px', border: '2px solid #0891B2', borderRadius: '8px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>← Worklist</button>
                  {allSynopticsFinalized && !caseSigned && (
                    <button
                      onClick={() => { setSignOutUser(''); setSignOutPassword(''); setSignOutError(''); setShowSignOutModal(true); }}
                      style={{ padding: '8px 20px', background: '#047857', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#065f46'}
                      onMouseLeave={e => e.currentTarget.style.background = '#047857'}
                    >✍️ Sign Out Case</button>
                  )}
                  {!allSynopticsFinalized && (
                    <button onClick={() => { const next = getNextUnfinalizedPath(); if (next) { setActivePath(next); setActiveSynopticTab('tumor'); } }}
                      style={{ padding: '8px 20px', background: '#0891B2', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0E7490'}
                      onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}
                    >Next Report →</button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ color: '#64748b', fontSize: '12px' }}>
                  {hasUnsavedData
                    ? <span style={{ color: '#92400e', fontWeight: 600 }}>● Unsaved changes</span>
                    : <span style={{ color: '#047857' }}>✓ All changes saved</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

                  {/* ── Secondary actions ── */}
                  <button onClick={() => { setAddendumText(''); setShowAddendumModal(true); }}
                    style={{ padding: '7px 12px', border: '1.5px solid #0891B2', borderRadius: '7px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Request an addendum">📎 Addendum</button>

                  {/* Amendment — visible when LIS is off, or when LIS is on and post-final actions are allowed.
                      Configured in Configuration → System → LIS Integration. */}
                  {showAmendmentButton && (
                    <button onClick={() => alert('Amendment Request — coming soon')}
                      style={{ padding: '7px 12px', border: '1.5px solid #d97706', borderRadius: '7px', background: 'white', color: '#d97706', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      title={lisIntegrationEnabled ? 'Amendment — PathScribe will notify LIS' : 'Request an amendment'}>✏️ Amendment</button>
                  )}

                  <button onClick={() => alert('Consultation Request — coming soon')}
                    style={{ padding: '7px 12px', border: '1.5px solid #7c3aed', borderRadius: '7px', background: 'white', color: '#7c3aed', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf5ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Request consultation">🔬 Consult</button>

                  <button type="button" onClick={() => setIsSimilarCasesOpen(true)}
                    style={{ padding: '7px 12px', border: '1.5px solid #0891b2', borderRadius: '7px', background: 'white', color: '#0891b2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Show similar cases">🔍 Similar</button>

                  <button type="button" onClick={() => setShowFlagManager(true)}
                    style={{ padding: '7px 12px', border: '1.5px solid #f59e0b', borderRadius: '7px', background: 'white', color: '#b45309', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Manage flags">🚩 Flags</button>

                  <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

                  {/* ── Save group ── */}
                  <button onClick={handleSaveDraft}
                    style={{ padding: '7px 14px', border: '2px solid #0891B2', borderRadius: '7px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Save this report as a draft">💾 Save Draft</button>

                  <button onClick={handleSaveAndNext}
                    style={{ padding: '7px 14px', border: '2px solid #0891B2', borderRadius: '7px', background: 'white', color: '#0891B2', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    title="Save draft and advance to next unfinalized report">💾 Save &amp; Next</button>

                  <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

                  {/* ── Finalize group ── */}
                  <button onClick={() => openFinalizeModal(false)}
                    style={{ padding: '7px 16px', background: '#0891B2', color: 'white', borderRadius: '7px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0E7490'}
                    onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}
                    title="Finalize this synoptic (requires password)">🔒 Finalize</button>

                  <button onClick={() => openFinalizeModal(true)}
                    style={{ padding: '7px 16px', background: '#0891B2', color: 'white', borderRadius: '7px', border: 'none', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0E7490'}
                    onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}
                    title="Finalize and advance to next unfinalized report">🔒 Finalize &amp; Next</button>

                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {showFlagManager && flagCaseData && (
        <FlagManagerModal
          caseData={flagCaseData}
          flagDefinitions={flagDefinitions}
          onApplyFlags={async (payload) => {
            const updated = await applyFlags(payload);
            setFlagCaseData(updated ?? null);
          }}
          onRemoveFlag={async (payload) => {
            const updated = await deleteFlags(payload);
            setFlagCaseData(updated ?? null);
          }}
          onClose={() => setShowFlagManager(false)}
        />
      )}

      {showAddSynopticModal && (
        <div style={modalOverlay} onClick={() => setShowAddSynopticModal(false)}>
          <div style={{ width: '500px', backgroundColor: '#111', borderRadius: '20px', padding: '40px', border: '1px solid rgba(8,145,178,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0891B2', fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Add Synoptic Report</div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>Select Specimen(s)</div>
              {caseData.synoptics.map(syn => (
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
                    <div key={p.id} onClick={() => { setSelectedProtocol(p.id); setProtocolSearch(''); setShowProtocolDropdown(false); }}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(8,145,178,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{p.name}</div>
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

      {/* ── Finalize Password Modal ── */}
      {showFinalizeModal && (
        <div style={modalOverlay}>
          <div style={{ width: '420px', backgroundColor: '#fff', padding: '36px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Finalize {activeSynoptic?.title ?? 'Synoptic Report'}
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5', fontSize: '13px' }}>
              Finalizing this report locks it for editing and creates an audit entry.<br />
              Enter your password to confirm.
            </p>
            <input
              type="password"
              autoFocus
              value={finalizePassword}
              onChange={e => { setFinalizePassword(e.target.value); setFinalizeError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleFinalizeConfirm()}
              placeholder="Your password"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${finalizeError ? '#ef4444' : '#e2e8f0'}`, fontSize: '14px', marginBottom: '8px', boxSizing: 'border-box', outline: 'none' }}
            />
            {finalizeError && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 12px', textAlign: 'left' }}>{finalizeError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={() => setShowFinalizeModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'transparent', border: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleFinalizeConfirm}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#0891B2', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0E7490'}
                onMouseLeave={e => e.currentTarget.style.background = '#0891B2'}>
                🔒 Confirm &amp; Finalize{finalizeAndNext ? ' →' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Case Sign-Out Modal ── */}
      {showSignOutModal && (
        <div style={modalOverlay}>
          <div style={{ width: '460px', backgroundColor: '#fff', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>✍️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Sign Out Case</h2>
            <p style={{ color: '#64748b', marginBottom: '6px', fontSize: '13px', lineHeight: '1.5' }}>
              All synoptic reports for <strong>Case {caseData.accession}</strong> have been finalized.
            </p>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '13px', lineHeight: '1.5' }}>
              Enter your username and password to sign out this case from PathScribe.
            </p>
            <div style={{ textAlign: 'left', marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Username</label>
              <input
                type="text"
                autoFocus
                value={signOutUser}
                onChange={e => { setSignOutUser(e.target.value); setSignOutError(''); }}
                placeholder="Your username"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <div style={{ textAlign: 'left', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Password</label>
              <input
                type="password"
                value={signOutPassword}
                onChange={e => { setSignOutPassword(e.target.value); setSignOutError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleCaseSignOut()}
                placeholder="Your password"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `2px solid ${signOutError ? '#ef4444' : '#e2e8f0'}`, fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            {signOutError && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 8px', textAlign: 'left' }}>{signOutError}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowSignOutModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'transparent', border: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleCaseSignOut}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: '#047857', border: 'none', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#065f46'}
                onMouseLeave={e => e.currentTarget.style.background = '#047857'}>
                ✍️ Sign Out Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Addendum Request Modal ── */}
      {showAddendumModal && (
        <div style={modalOverlay} onClick={() => setShowAddendumModal(false)}>
          <div style={{ width: '520px', backgroundColor: '#fff', padding: '36px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '24px' }}>📎</span>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Addendum Request</h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px', lineHeight: '1.5' }}>
              An addendum is an official addition to a finalized report. Describe the reason for the addendum below. This will be reviewed and applied to <strong>{activeSynoptic?.title ?? 'the report'}</strong>.
            </p>
            <textarea
              autoFocus
              value={addendumText}
              onChange={e => setAddendumText(e.target.value)}
              placeholder="Describe the reason for the addendum and any changes required…"
              rows={6}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '13px', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button onClick={() => setShowAddendumModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'transparent', border: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!addendumText.trim()) return;
                  setShowAddendumModal(false);
                  showToast('Addendum request submitted');
                }}
                disabled={!addendumText.trim()}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: addendumText.trim() ? '#0891B2' : '#e2e8f0', border: 'none', color: addendumText.trim() ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: '14px', cursor: addendumText.trim() ? 'pointer' : 'not-allowed' }}
                onMouseEnter={e => { if (addendumText.trim()) e.currentTarget.style.background = '#0E7490'; }}
                onMouseLeave={e => { if (addendumText.trim()) e.currentTarget.style.background = '#0891B2'; }}>
                📎 Submit Addendum
              </button>
            </div>
          </div>
        </div>
      )}

      {showWarning && (
        <div style={modalOverlay}>
          <div style={{ width: '400px', backgroundColor: '#111', padding: '40px', borderRadius: '28px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Unsaved Changes</h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px', lineHeight: '1.6', fontSize: '15px' }}>You have unsaved changes. Leaving now will discard your current progress.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { setShowWarning(false); setPendingNavigation(null); }} style={{ padding: '16px', borderRadius: '12px', background: '#0891B2', border: 'none', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>← Keep Editing</button>
              <button onClick={() => { handleSaveDraft(); setShowWarning(false); if (pendingNavigation) navigate(pendingNavigation); }} style={{ padding: '16px', borderRadius: '12px', background: 'transparent', border: '2px solid #10B981', color: '#10B981', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>💾 Save & Leave</button>
              <button onClick={confirmNavigation} style={{ padding: '16px', borderRadius: '12px', background: 'transparent', border: '2px solid #F59E0B', color: '#F59E0B', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F59E0B'; }}>
                Leave & Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {isProfileOpen && (
        <div style={modalOverlay} onClick={() => setIsProfileOpen(false)}>
          <div style={{ width: '400px', backgroundColor: '#111', borderRadius: '20px', padding: '40px', border: '1px solid rgba(8,145,178,0.3)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0891B2', fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>User Preferences</div>
            <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { window.open('https://www.cap.org/', '_blank'); setIsProfileOpen(false); }} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontWeight: 600, fontSize: '15px', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.1)'; e.currentTarget.style.color = '#0891B2'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#cbd5e1'; }}><HelpIcon /> Support & Protocols</button>
              <button onClick={() => { setShowAbout(true); setIsProfileOpen(false); }} style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontWeight: 600, fontSize: '15px', cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(8,145,178,0.1)'; e.currentTarget.style.color = '#0891B2'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#cbd5e1'; }}><HelpIcon /> About PathScribe<span style={{ color: '#0891B2', fontSize: '0.6em', verticalAlign: 'super' }}>AI</span></button>
            </div>
            <button onClick={() => setIsProfileOpen(false)} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(8,145,178,0.15)', border: '1px solid rgba(8,145,178,0.3)', color: '#0891B2', fontWeight: 600, fontSize: '15px', cursor: 'pointer', width: '100%' }}>Close</button>
          </div>
        </div>
      )}

      {showAbout && (
        <div style={modalOverlay} onClick={() => setShowAbout(false)}>
          <div style={{ width: '400px', backgroundColor: 'rgba(220,220,220,0.75)', backdropFilter: 'blur(40px)', padding: '40px', borderRadius: '20px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.3)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px' }}>PathScribe<span style={{ color: '#0891B2', fontSize: '0.6em', verticalAlign: 'super' }}>AI</span></h2>
            <p style={{ color: '#3a3a3a', marginBottom: '8px', fontSize: '15px' }}>Version 1.0.0 | Build: 2026-02-14</p>
            <p style={{ color: '#5a5a5a', marginBottom: '30px', fontSize: '14px' }}>© 2026 PathScribe</p>
            <button onClick={() => setShowAbout(false)} style={{ padding: '12px 32px', borderRadius: '8px', background: 'rgba(160,160,160,0.5)', border: 'none', color: '#1a1a1a', fontWeight: 600, fontSize: '15px', cursor: 'pointer', width: '100%' }}>Close</button>
          </div>
        </div>
      )}

      {isResourcesOpen && (
        <div style={modalOverlay} onClick={() => setIsResourcesOpen(false)}>
          <div style={{ width: '500px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: '#111', borderRadius: '20px', padding: '40px', border: '1px solid rgba(8,145,178,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#0891B2', fontSize: '24px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>Quick Links</div>
            {Object.entries(quickLinks).map(([section, links]) => (
              <div key={section} style={{ marginBottom: '24px' }}>
                <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>{section}</div>
                {links.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => setIsResourcesOpen(false)}
                    style={{ display: 'block', color: '#cbd5e1', textDecoration: 'none', padding: '12px 16px', fontSize: '16px', borderRadius: '8px', marginBottom: '8px' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0891B2'; e.currentTarget.style.background = 'rgba(8,145,178,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
                  >→ {link.title}</a>
                ))}
              </div>
            ))}
            <button onClick={() => setIsResourcesOpen(false)} style={{ padding: '12px 24px', borderRadius: '10px', background: 'rgba(8,145,178,0.15)', border: '1px solid rgba(8,145,178,0.3)', color: '#0891B2', fontWeight: 600, fontSize: '15px', cursor: 'pointer', width: '100%' }}>Close</button>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div style={modalOverlay}>
          <div style={{ width: '400px', backgroundColor: '#111', padding: '40px', borderRadius: '28px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}><WarningIcon color="#F59E0B" /></div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Unsaved Data</h2>
            <p style={{ color: '#94a3b8', marginBottom: '30px', lineHeight: '1.6', fontSize: '15px' }}>You have unsaved changes. Logging out will discard your current progress.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ padding: '16px', borderRadius: '12px', background: '#0891B2', border: 'none', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>← Return to Page</button>
              <button onClick={() => { handleSaveDraft(); handleLogout(); }} style={{ padding: '16px', borderRadius: '12px', background: 'transparent', border: '2px solid #10B981', color: '#10B981', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>💾 Save & Log Out</button>
              <button onClick={handleLogout} style={{ padding: '16px', borderRadius: '12px', background: 'transparent', border: '2px solid #F59E0B', color: '#F59E0B', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.color = '#000'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#F59E0B'; }}>
                Log Out & Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SynopticReportPage;

// synopticUtils.ts
// ─────────────────────────────────────────────────────────────────────────────
// Pure utility functions and mock data for the Synoptic report workflow.
// No React imports — safe to import from anywhere.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  SynopticField, SynopticReportNode, SpecimenSynoptic,
  CaseData, ActivePath, MedicalCode, CodeSource, CaseRole } from './synopticTypes';
import { getMockReport, extractAiSynoptic } from '../../mock/mockReports';
import type { FullReport } from '../../mock/mockReports';

export const LS_VERSION = 'v4';
export const LS_KEY = (caseId: string) => `formedrix_case_${caseId}_${LS_VERSION}`;

export const getNodeAtPath = (synoptics: SpecimenSynoptic[], path: ActivePath): SynopticReportNode | null => {
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
export const updateNodeAtPath = (
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
export const finalizeNodeAndChildren = (node: SynopticReportNode): SynopticReportNode => ({
  ...node,
  status: 'finalized',
  children: node.children.map(finalizeNodeAndChildren),
});

// Compute breadcrumb labels from path
export const getBreadcrumb = (synoptics: SpecimenSynoptic[], path: ActivePath): string[] => {
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
// makeMockCase() derives all synoptic field values, codes, and AI metadata
// directly from the centralised mockReports.ts via extractAiSynoptic().
// No synoptic data is hardcoded here — the single source of truth is the
// FullReport in mockReports.ts, exactly as it will work in production when
// extractAiSynoptic() is replaced by a real POST /ai/extract call.

export const makeMockCase = (caseId: string): CaseData => {
  const report = getMockReport(caseId) as FullReport | null;
  const ai = report ? extractAiSynoptic(report) : null;

  // Fallback field for specimens with no AI extraction yet
  const emptyField = (id: string, label: string, required: boolean): SynopticField => ({
    id, label, type: 'text', required, confidence: 0, aiSource: '', value: '', aiValue: '', dirty: false, verification: 'unverified',
  });

  return {
    accession: caseId || 'S25-12345',
    patient:   report?.patientName ?? 'Smith, John',
    gender:    (report as any)?.gender   ?? 'Female',
    dob:       report?.dob         ?? '03/15/1965',
    mrn:       report?.mrn         ?? '123456789',
    protocol:  'CAP Breast Protocol 4.3.0.1',
    overallConfidence: ai?.overallConfidence ?? 89,
    autoPopulated:     ai ? `${ai.autoPopulatedCount}/${ai.totalFieldCount}` : '0/0',
    caseComments: {
      attending: '<p><strong>Attending note:</strong> Case reviewed. Correlation with clinical history recommended.</p>',
      resident:  '',
    },
    synoptics: [
      // ── Specimen 1: Primary tumour report ─────────────────────────────────
      {
        specimenId:      1,
        specimenName:    report?.specimens[0]?.type ?? 'Left Breast Mastectomy',
        specimenStatus:  ai?.specimenStatus ?? 'complete',
        specimenComment: '',
        reports: [
          {
            instanceId:      'inst-1-1',
            templateId:      'cap_breast_invasive_4.3',
            title:           'Breast — Invasive Carcinoma',
            status:          'draft',
            specimenComment: '',
            codes:           (ai?.codes ?? []) as MedicalCode[],
            tumorFields:     (ai?.tumorFields ?? []) as SynopticField[],
            marginFields:    (ai?.marginFields ?? []) as SynopticField[],
            biomarkerFields: [],
            children: [
              // ── ER / PR IHC Panel ──────────────────────────────────────────
              ...(ai?.erPrPanel ? [{
                instanceId:      'inst-1-1-1',
                templateId:      'cap_erpr_1.0',
                title:           'ER / PR IHC Panel',
                status:          'draft' as const,
                specimenComment: '',
                codes:           ai.erPrPanel.codes as MedicalCode[],
                tumorFields:     [],
                marginFields:    [],
                biomarkerFields: ai.erPrPanel.biomarkerFields as SynopticField[],
                children:        [],
              }] : []),
              // ── HER2 IHC Panel ─────────────────────────────────────────────
              ...(ai?.her2Panel ? [{
                instanceId:      'inst-1-1-2',
                templateId:      'cap_her2_1.0',
                title:           'HER2 IHC Panel',
                status:          'draft' as const,
                specimenComment: '',
                codes:           ai.her2Panel.codes as MedicalCode[],
                tumorFields:     [],
                marginFields:    [],
                biomarkerFields: ai.her2Panel.biomarkerFields as SynopticField[],
                children:        [],
              }] : []),
            ],
          },
        ],
      },
      // ── Specimen 2: Sentinel lymph nodes ────────────────────────────────────
      {
        specimenId:      2,
        specimenName:    'Sentinel Lymph Nodes',
        specimenStatus:  'alert',
        specimenComment: '',
        reports: [
          {
            instanceId:      'inst-2-1',
            templateId:      'cap_lymphnode_1.0',
            title:           'Lymph Node — Sentinel',
            status:          'draft',
            specimenComment: '',
            codes:           [],
            tumorFields: [
              emptyField('ln_status', 'Lymph Node Status', true),
              emptyField('ln_number', 'Number of Nodes',   true),
            ],
            marginFields:    [],
            biomarkerFields: [],
            children:        [],
          },
        ],
      },
      // ── Specimen 3: Additional margins ──────────────────────────────────────
      {
        specimenId:      3,
        specimenName:    'Additional Margins',
        specimenStatus:  'pending',
        specimenComment: '',
        reports: [
          {
            instanceId:      'inst-3-1',
            templateId:      'cap_margins_1.0',
            title:           'Additional Margins',
            status:          'draft',
            specimenComment: '',
            codes:           [],
            tumorFields:     [],
            marginFields:    [emptyField('add_margin_status', 'Margin Status', true)],
            biomarkerFields: [],
            children:        [],
          },
        ],
      },
    ],
  };
};

// Mock similar cases for the Similar Cases panel
export const mockSimilarCases = [
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

export const isCaseDataValid = (data: unknown): data is CaseData => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.synoptics) || d.synoptics.length === 0) return false;
  // Must have the new tree shape: each specimen has a `reports` array
  return d.synoptics.every(
    (s: unknown) => s && typeof s === 'object' && Array.isArray((s as Record<string, unknown>).reports)
  );
};

export const loadCase = (caseId: string): CaseData => {
  // Always overlay fresh PID from mockReports so cached data never shows stale fields
  const report = getMockReport(caseId) as FullReport | null;
  const pidOverride = report
    ? { patient: report.patientName, gender: (report as any).gender ?? 'Female', dob: report.dob, mrn: report.mrn }
    : {};
  try {
    const raw = localStorage.getItem(LS_KEY(caseId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isCaseDataValid(parsed)) return { ...parsed, ...pidOverride };
    }
  } catch { /* ignore */ }
  return makeMockCase(caseId);
};

export const saveCase = (caseId: string, data: CaseData) => {
  try {
    localStorage.setItem(LS_KEY(caseId), JSON.stringify(data));
  } catch { /* ignore */ }
};


// ─── Code helpers ─────────────────────────────────────────────────────────────

export const SOURCE_META: Record<CodeSource, { label: string; color: string; bg: string; removable: boolean }> = {
  system: { label: 'CAP/System', color: '#5b21b6', bg: '#ede9fe', removable: false },
  ai:     { label: 'AI',         color: '#0369a1', bg: '#e0f2fe', removable: true  },
  manual: { label: 'Manual',     color: '#065f46', bg: '#d1fae5', removable: true  },
};

export const MOCK_CODES: Omit<MedicalCode, 'id' | 'source'>[] = [
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

export const ROLE_META: Record<CaseRole, { label: string; color: string; bg: string; border: string }> = {
  attending: { label: 'Attending',  color: '#0891B2', bg: 'rgba(8,145,178,0.1)',  border: 'rgba(8,145,178,0.3)'  },
  resident:  { label: 'Resident',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)' },
};



// ─────────────────────────────────────────────────────────────────────────────
// systemActions.ts
// Single source of truth for ALL system actions in PathScribe AI.
// Used by:
//   - KeyboardShortcutsModal  (shortcut assignment)
//   - RoleDictionary          (permission assignment)
//   - Permission guards       (runtime access checks)
// ─────────────────────────────────────────────────────────────────────────────

export type ActionId =
  // Case Management
  | 'case.viewWorklist' | 'case.open' | 'case.create' | 'case.editDemographics'
  | 'case.assign' | 'case.reassign' | 'case.prioritize' | 'case.hold'
  | 'case.releaseHold' | 'case.archive' | 'case.delete'
  // Specimen
  | 'specimen.add' | 'specimen.edit' | 'specimen.remove'
  | 'specimen.applyFlag' | 'specimen.removeFlag' | 'specimen.assignSubspecialty'
  // Diagnosis & Sign-Out
  | 'diagnosis.grossDescription' | 'diagnosis.microscopicDescription'
  | 'diagnosis.enterDiagnosis' | 'diagnosis.enterAddendum'
  | 'diagnosis.signOut' | 'diagnosis.coSign' | 'diagnosis.amend' | 'diagnosis.revokeSignOut'
  // Reports
  | 'report.preview' | 'report.generate' | 'report.deliver'
  | 'report.redeliver' | 'report.viewHistory' | 'report.download'
  // AI Assistance
  | 'ai.diagnosisSuggest' | 'ai.grossAssist' | 'ai.macroSuggest'
  | 'ai.viewConfidence' | 'ai.override'
  // Reporting Editor
  | 'editor.insertMacro' | 'editor.insertTable' | 'editor.insertSignature'
  | 'editor.bold' | 'editor.italic' | 'editor.underline'
  | 'editor.bullets' | 'editor.numbering' | 'editor.increaseIndent' | 'editor.decreaseIndent'
  | 'editor.find' | 'editor.replace' | 'editor.selectAll'
  | 'editor.showRuler' | 'editor.toggleFormatting'
  // Client & Physician
  | 'client.view' | 'client.edit'
  | 'physician.view' | 'physician.edit' | 'physician.verify'
  // Configuration
  | 'config.access' | 'config.staff' | 'config.roles' | 'config.subspecialties'
  | 'config.specimens' | 'config.flags' | 'config.ai' | 'config.macros'
  | 'config.shortcuts' | 'config.lis' | 'config.auditLog'
  // QC
  | 'qc.configure' | 'qc.viewQueue' | 'qc.claimReview'
  | 'qc.submitReview' | 'qc.escalateDiscordance' | 'qc.viewDashboard' | 'qc.exportReport'
  // Billing (prebuilt — future release)
  | 'billing.viewCodes' | 'billing.editCodes' | 'billing.submitClaim'
  | 'billing.viewHistory' | 'billing.exportBatch'
  // System / Admin
  | '***REMOVED***.dashboard' | '***REMOVED***.reports' | '***REMOVED***.export'
  | '***REMOVED***.backups' | '***REMOVED***.eventLog' | '***REMOVED***.impersonate';

export interface SystemAction {
  id: ActionId;
  label: string;
  description?: string;
  /** Whether this action can have a keyboard shortcut assigned */
  shortcutable?: boolean;
  /** Prebuilt but not yet active in current release */
  prebuilt?: boolean;
}

export interface ActionGroup {
  id: string;
  title: string;
  actions: SystemAction[];
}

export const ACTION_GROUPS: ActionGroup[] = [
  {
    id: 'case',
    title: 'Case Management',
    actions: [
      { id: 'case.viewWorklist',      label: 'View Case Worklist' },
      { id: 'case.open',              label: 'Open / View Case' },
      { id: 'case.create',            label: 'Create New Case',            description: 'Manual accession', prebuilt: true },
      { id: 'case.editDemographics',  label: 'Edit Case Demographics' },
      { id: 'case.assign',            label: 'Assign Case' },
      { id: 'case.reassign',          label: 'Reassign Case' },
      { id: 'case.prioritize',        label: 'Prioritize / Escalate Case' },
      { id: 'case.hold',              label: 'Place Case On Hold' },
      { id: 'case.releaseHold',       label: 'Release Case From Hold' },
      { id: 'case.archive',           label: 'Archive Case' },
      { id: 'case.delete',            label: 'Delete Case',                description: 'Admin only' },
    ],
  },
  {
    id: 'specimen',
    title: 'Specimen',
    actions: [
      { id: 'specimen.add',                 label: 'Add Specimen' },
      { id: 'specimen.edit',                label: 'Edit Specimen Details' },
      { id: 'specimen.remove',              label: 'Remove Specimen' },
      { id: 'specimen.applyFlag',           label: 'Apply Flag to Specimen' },
      { id: 'specimen.removeFlag',          label: 'Remove Flag from Specimen' },
      { id: 'specimen.assignSubspecialty',  label: 'Assign to Subspecialty' },
    ],
  },
  {
    id: 'diagnosis',
    title: 'Diagnosis & Sign-Out',
    actions: [
      { id: 'diagnosis.grossDescription',        label: 'Enter Gross Description' },
      { id: 'diagnosis.microscopicDescription',  label: 'Enter Microscopic Description' },
      { id: 'diagnosis.enterDiagnosis',          label: 'Enter Diagnosis' },
      { id: 'diagnosis.enterAddendum',           label: 'Enter Addendum' },
      { id: 'diagnosis.signOut',                 label: 'Sign Out Case (Primary)' },
      { id: 'diagnosis.coSign',                  label: 'Co-Sign Case',             description: 'Resident / Fellow' },
      { id: 'diagnosis.amend',                   label: 'Amend Signed-Out Case' },
      { id: 'diagnosis.revokeSignOut',           label: 'Revoke Sign-Out' },
    ],
  },
  {
    id: 'report',
    title: 'Reports',
    actions: [
      { id: 'report.preview',      label: 'Preview Report' },
      { id: 'report.generate',     label: 'Generate / Print Report' },
      { id: 'report.deliver',      label: 'Deliver Report to Physician', description: 'Fax or email' },
      { id: 'report.redeliver',    label: 'Re-Deliver Report' },
      { id: 'report.viewHistory',  label: 'View Report History' },
      { id: 'report.download',     label: 'Download Report PDF' },
    ],
  },
  {
    id: 'ai',
    title: 'AI Assistance',
    actions: [
      { id: 'ai.diagnosisSuggest',  label: 'Use AI Diagnosis Suggestion' },
      { id: 'ai.grossAssist',       label: 'Use AI Gross Description Assist' },
      { id: 'ai.macroSuggest',      label: 'Use AI Macro Suggestion' },
      { id: 'ai.viewConfidence',    label: 'View AI Confidence Scores' },
      { id: 'ai.override',          label: 'Override AI Suggestion' },
    ],
  },
  {
    id: 'editor',
    title: 'Reporting Editor',
    actions: [
      { id: 'editor.insertMacro',       label: 'Insert Macro',                shortcutable: true },
      { id: 'editor.insertTable',       label: 'Insert Table',                shortcutable: true },
      { id: 'editor.insertSignature',   label: 'Insert Signature Line',       shortcutable: true },
      { id: 'editor.bold',              label: 'Bold',                        shortcutable: true },
      { id: 'editor.italic',            label: 'Italic',                      shortcutable: true },
      { id: 'editor.underline',         label: 'Underline',                   shortcutable: true },
      { id: 'editor.bullets',           label: 'Bullets',                     shortcutable: true },
      { id: 'editor.numbering',         label: 'Numbered List',               shortcutable: true },
      { id: 'editor.increaseIndent',    label: 'Increase Indent',             shortcutable: true },
      { id: 'editor.decreaseIndent',    label: 'Decrease Indent',             shortcutable: true },
      { id: 'editor.find',              label: 'Find',                        shortcutable: true },
      { id: 'editor.replace',           label: 'Replace',                     shortcutable: true },
      { id: 'editor.selectAll',         label: 'Select All',                  shortcutable: true },
      { id: 'editor.showRuler',         label: 'Show / Hide Ruler',           shortcutable: true },
      { id: 'editor.toggleFormatting',  label: 'Show / Hide Formatting Marks', shortcutable: true },
    ],
  },
  {
    id: 'clientPhysician',
    title: 'Client & Physician',
    actions: [
      { id: 'client.view',       label: 'View Client List' },
      { id: 'client.edit',       label: 'Add / Edit Client' },
      { id: 'physician.view',    label: 'View Physician Directory' },
      { id: 'physician.edit',    label: 'Add / Edit Physician' },
      { id: 'physician.verify',  label: 'Verify Physician Record' },
    ],
  },
  {
    id: 'config',
    title: 'Configuration',
    actions: [
      { id: 'config.access',         label: 'Access Configuration Module' },
      { id: 'config.staff',          label: 'Manage Staff' },
      { id: 'config.roles',          label: 'Manage Roles' },
      { id: 'config.subspecialties', label: 'Manage Subspecialties' },
      { id: 'config.specimens',      label: 'Manage Specimen Dictionary' },
      { id: 'config.flags',          label: 'Manage Flags' },
      { id: 'config.ai',             label: 'Manage AI Behavior Settings' },
      { id: 'config.macros',         label: 'Manage Macros' },
      { id: 'config.shortcuts',      label: 'Manage Keyboard Shortcuts' },
      { id: 'config.lis',            label: 'Manage LIS Integration Settings' },
      { id: 'config.auditLog',       label: 'View Audit Log' },
    ],
  },
  {
    id: 'qc',
    title: 'Quality Control',
    actions: [
      { id: 'qc.configure',            label: 'Configure QC Rules' },
      { id: 'qc.viewQueue',            label: 'View QC Queue' },
      { id: 'qc.claimReview',          label: 'Claim QC Review' },
      { id: 'qc.submitReview',         label: 'Submit QC Review' },
      { id: 'qc.escalateDiscordance',  label: 'Escalate Discordance' },
      { id: 'qc.viewDashboard',        label: 'View QC Dashboard' },
      { id: 'qc.exportReport',         label: 'Export QC Report' },
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    actions: [
      { id: 'billing.viewCodes',    label: 'View Billing Codes on Case',  prebuilt: true },
      { id: 'billing.editCodes',    label: 'Edit Billing Codes',          prebuilt: true },
      { id: 'billing.submitClaim',  label: 'Submit Claim',                prebuilt: true },
      { id: 'billing.viewHistory',  label: 'View Billing History',        prebuilt: true },
      { id: 'billing.exportBatch',  label: 'Export Billing Batch',        prebuilt: true },
    ],
  },
  {
    id: '***REMOVED***',
    title: 'System / Admin',
    actions: [
      { id: '***REMOVED***.dashboard',    label: 'View System Dashboard' },
      { id: '***REMOVED***.reports',      label: 'Run System Reports' },
      { id: '***REMOVED***.export',       label: 'Export Data' },
      { id: '***REMOVED***.backups',      label: 'Manage Backups' },
      { id: '***REMOVED***.eventLog',     label: 'View Error / Event Log' },
      { id: '***REMOVED***.impersonate',  label: 'Impersonate User',  description: 'Super ***REMOVED*** only' },
    ],
  },
];

// ─── Flat lookup map ──────────────────────────────────────────────────────────
export const ACTION_MAP: Record<ActionId, SystemAction> = {} as Record<ActionId, SystemAction>;
ACTION_GROUPS.forEach(g => g.actions.forEach(a => { ACTION_MAP[a.id] = a; }));

// ─── Shortcutable actions only (for KeyboardShortcutsModal) ──────────────────
export const SHORTCUT_GROUPS = ACTION_GROUPS
  .map(g => ({ ...g, actions: g.actions.filter(a => a.shortcutable) }))
  .filter(g => g.actions.length > 0);

// ─── Default role permission sets ────────────────────────────────────────────
export type PermissionSet = Partial<Record<ActionId, boolean>>;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionSet> = {
  Pathologist: {
    'case.viewWorklist': true, 'case.open': true, 'case.editDemographics': true,
    'case.assign': true, 'case.reassign': true, 'case.prioritize': true,
    'case.hold': true, 'case.releaseHold': true, 'case.archive': true,
    'specimen.add': true, 'specimen.edit': true, 'specimen.remove': true,
    'specimen.applyFlag': true, 'specimen.removeFlag': true, 'specimen.assignSubspecialty': true,
    'diagnosis.grossDescription': true, 'diagnosis.microscopicDescription': true,
    'diagnosis.enterDiagnosis': true, 'diagnosis.enterAddendum': true,
    'diagnosis.signOut': true, 'diagnosis.amend': true, 'diagnosis.revokeSignOut': true,
    'report.preview': true, 'report.generate': true, 'report.deliver': true,
    'report.redeliver': true, 'report.viewHistory': true, 'report.download': true,
    'ai.diagnosisSuggest': true, 'ai.grossAssist': true, 'ai.macroSuggest': true,
    'ai.viewConfidence': true, 'ai.override': true,
    'editor.insertMacro': true, 'editor.insertTable': true, 'editor.insertSignature': true,
    'editor.bold': true, 'editor.italic': true, 'editor.underline': true,
    'editor.bullets': true, 'editor.numbering': true, 'editor.increaseIndent': true,
    'editor.decreaseIndent': true, 'editor.find': true, 'editor.replace': true,
    'editor.selectAll': true, 'editor.showRuler': true, 'editor.toggleFormatting': true,
    'physician.view': true, 'client.view': true,
    'qc.viewQueue': true, 'qc.claimReview': true, 'qc.submitReview': true,
    'qc.escalateDiscordance': true, 'qc.viewDashboard': true,
  },
  Resident: {
    'case.viewWorklist': true, 'case.open': true, 'case.editDemographics': true,
    'case.prioritize': true, 'case.hold': true, 'case.releaseHold': true,
    'specimen.add': true, 'specimen.edit': true, 'specimen.applyFlag': true,
    'specimen.removeFlag': true, 'specimen.assignSubspecialty': true,
    'diagnosis.grossDescription': true, 'diagnosis.microscopicDescription': true,
    'diagnosis.enterDiagnosis': true, 'diagnosis.enterAddendum': true,
    'diagnosis.coSign': true,
    'report.preview': true, 'report.viewHistory': true, 'report.download': true,
    'ai.diagnosisSuggest': true, 'ai.grossAssist': true, 'ai.macroSuggest': true,
    'ai.viewConfidence': true, 'ai.override': true,
    'editor.insertMacro': true, 'editor.insertTable': true, 'editor.insertSignature': true,
    'editor.bold': true, 'editor.italic': true, 'editor.underline': true,
    'editor.bullets': true, 'editor.numbering': true, 'editor.increaseIndent': true,
    'editor.decreaseIndent': true, 'editor.find': true, 'editor.replace': true,
    'editor.selectAll': true, 'editor.showRuler': true, 'editor.toggleFormatting': true,
    'physician.view': true, 'client.view': true,
    'qc.viewQueue': true, 'qc.viewDashboard': true,
  },
  Admin: {
    'case.viewWorklist': true, 'case.assign': true, 'case.reassign': true,
    'case.archive': true, 'case.delete': true,
    'client.view': true, 'client.edit': true,
    'physician.view': true, 'physician.edit': true, 'physician.verify': true,
    'config.access': true, 'config.staff': true, 'config.roles': true,
    'config.subspecialties': true, 'config.specimens': true, 'config.flags': true,
    'config.ai': true, 'config.macros': true, 'config.shortcuts': true,
    'config.lis': true, 'config.auditLog': true,
    'qc.configure': true, 'qc.viewDashboard': true, 'qc.exportReport': true,
    '***REMOVED***.dashboard': true, '***REMOVED***.reports': true, '***REMOVED***.export': true,
    '***REMOVED***.backups': true, '***REMOVED***.eventLog': true,
  },
  Physician: {
    // Directory only — no app access
  },
};
